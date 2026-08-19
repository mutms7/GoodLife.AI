/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("node:path");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");
const { app, BrowserWindow, Menu, ipcMain, shell } = require("electron");
const { autoUpdater } = require("electron-updater");

// Keep Chromium's GPU path available for WebGPU. These flags are harmless on
// machines where a particular backend is unavailable; WebLLM reports that
// capability honestly in the app's model gate.
app.commandLine.appendSwitch("ignore-gpu-blocklist");
app.commandLine.appendSwitch("enable-unsafe-webgpu");
app.commandLine.appendSwitch("enable-features", "Vulkan,UseSkiaRenderer");

let localServer;
let pendingAuthCallback;
let authRenderer;

function authCallbackFrom(argv) {
  return argv.find((value) => /^goodlife:\/\/auth-callback/i.test(value));
}

function deliverAuthCallback(url) {
  if (!url) return;
  if (authRenderer && !authRenderer.isDestroyed()) authRenderer.send("auth-callback", url);
  else pendingAuthCallback = url;
}

// The renderer announces readiness only after its callback listener exists.
// This avoids losing a deep link during startup or React hydration.
ipcMain.on("auth-renderer-ready", (event) => {
  authRenderer = event.sender;
  if (pendingAuthCallback) {
    authRenderer.send("auth-callback", pendingAuthCallback);
    pendingAuthCallback = undefined;
  }
});

// Windows emits enter-full-screen before isFullScreen() flips, so asking the
// window inside a transition handler answers with the state it just left. That
// inverted the button from the first press onward. The events already say which
// way the window went, so they are what we trust; the remembered value also
// keeps a fast second press from toggling against a reading that has not caught
// up yet.
const fullscreenByWindow = new WeakMap();

function isFullscreen(window) {
  return fullscreenByWindow.get(window) ?? window.isFullScreen();
}

function sendFullscreenState(window, fullscreen) {
  if (!window) return;
  fullscreenByWindow.set(window, fullscreen);
  if (window.isDestroyed()) return;
  window.webContents.send("fullscreen-changed", fullscreen);
}

ipcMain.handle("fullscreen-state", (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  return window ? isFullscreen(window) : false;
});
ipcMain.on("fullscreen-toggle", (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) return;
  window.setFullScreen(!isFullscreen(window));
});

async function startRenderer() {
  if (localServer) return localServer.url;
  const { default: worker } = await import(pathToFileURL(path.join(app.getAppPath(), "dist/server/index.js")).href);
  const { startDesktopServer } = await import(pathToFileURL(path.join(app.getAppPath(), "desktop/server.mjs")).href);
  const { portCandidates } = await import(pathToFileURL(path.join(app.getAppPath(), "desktop/ports.mjs")).href);
  const clientRoot = path.join(app.getAppPath(), "dist/client");
  const modelRoot = app.isPackaged
    ? path.join(process.resourcesPath, "model")
    : path.join(app.getAppPath(), "desktop/model");
  const portFile = path.join(app.getPath("userData"), "local-server-port.txt");
  let savedPort;
  try { savedPort = fs.readFileSync(portFile, "utf8").trim(); } catch { /* first launch */ }
  let lastError;
  for (const port of portCandidates(savedPort)) {
    try {
      localServer = await startDesktopServer({ clientRoot, modelRoot, worker, port });
      fs.mkdirSync(path.dirname(portFile), { recursive: true });
      fs.writeFileSync(portFile, String(port), "utf8");
      return localServer.url;
    } catch (error) {
      lastError = error;
      if (error?.code !== "EADDRINUSE") throw error;
    }
  }
  throw lastError ?? new Error("GoodLife.AI could not reserve a local port");
}

function configureUpdates() {
  if (!app.isPackaged) return;
  // electron-updater talks directly to GitHub Releases. A failed check is
  // deliberately non-fatal: the installed app remains usable offline.
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.on("update-downloaded", () => {
    try { autoUpdater.quitAndInstall(false, true); } catch (error) { console.warn("Could not install update", error); }
  });
  void autoUpdater.checkForUpdates().catch((error) => console.warn("Offline update check", error));
}

async function createWindow() {
  const origin = await startRenderer();
  const window = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 960,
    minHeight: 700,
    show: false,
    backgroundColor: "#f6f3ed",
    autoHideMenuBar: true,
    titleBarStyle: "hidden",
    titleBarOverlay: { color: "#f5ead8", symbolColor: "#201e1d", height: 34 },
    webPreferences: {
      preload: path.join(app.getAppPath(), "desktop/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });
  window.setMenuBarVisibility(false);
  window.on("enter-full-screen", () => sendFullscreenState(window, true));
  window.on("leave-full-screen", () => sendFullscreenState(window, false));
  window.webContents.on("before-input-event", (event, input) => {
    if (input.type === "keyDown" && input.key === "F11") {
      event.preventDefault();
      window.setFullScreen(!isFullscreen(window));
    }
  });
  window.once("ready-to-show", () => window.show());
  window.webContents.on("did-start-loading", () => {
    if (authRenderer === window.webContents) authRenderer = undefined;
  });
  window.webContents.on("render-process-gone", () => {
    if (authRenderer === window.webContents) authRenderer = undefined;
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(origin)) event.preventDefault();
  });
  await window.loadURL(`${origin}/app`);
  return window;
}

const hasSingleInstance = app.requestSingleInstanceLock();
if (!hasSingleInstance) {
  app.quit();
} else {
  app.setAsDefaultProtocolClient("goodlife");
  app.on("open-url", (event, url) => { event.preventDefault(); deliverAuthCallback(url); });
  pendingAuthCallback = authCallbackFrom(process.argv);
  app.on("second-instance", (_event, argv) => {
    deliverAuthCallback(authCallbackFrom(argv));
    const [window] = BrowserWindow.getAllWindows();
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
  });
  app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);
    if (process.argv.includes("--smoke-test")) {
      const origin = await startRenderer();
      for (const target of ["/app", "/model/resolve/main/mlc-chat-config.json", "/model/Qwen2-1.5B-Instruct-q4f16_1_cs1k-webgpu.wasm"]) {
        const response = await fetch(`${origin}${target}`, { method: target.endsWith(".wasm") ? "HEAD" : "GET" });
        if (!response.ok) throw new Error(`Packaged smoke test failed for ${target}: ${response.status}`);
      }
      localServer?.server.close();
      app.exit(0);
      return;
    }
    configureUpdates();
    await createWindow();
    app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) void createWindow(); });
  }).catch((error) => {
    console.error("GoodLife.AI failed to start", error);
    app.quit();
  });
}

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("before-quit", () => { localServer?.server.close(); });
