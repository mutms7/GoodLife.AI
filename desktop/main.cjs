/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("node:path");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");
const { app, BrowserWindow, shell } = require("electron");
const { autoUpdater } = require("electron-updater");

// Keep Chromium's GPU path available for WebGPU. These flags are harmless on
// machines where a particular backend is unavailable; WebLLM reports that
// capability honestly in the app's model gate.
app.commandLine.appendSwitch("ignore-gpu-blocklist");
app.commandLine.appendSwitch("enable-unsafe-webgpu");
app.commandLine.appendSwitch("enable-features", "Vulkan,UseSkiaRenderer");

let localServer;

async function startRenderer() {
  if (localServer) return localServer.url;
  const { default: worker } = await import(pathToFileURL(path.join(app.getAppPath(), "dist/server/index.js")).href);
  const { startDesktopServer } = await import(pathToFileURL(path.join(app.getAppPath(), "desktop/server.mjs")).href);
  const { portCandidates } = await import(pathToFileURL(path.join(app.getAppPath(), "desktop/ports.mjs")).href);
  const clientRoot = path.join(app.getAppPath(), "dist/client");
  const modelRoot = path.join(process.resourcesPath, "model");
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
    webPreferences: {
      preload: path.join(app.getAppPath(), "desktop/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });
  window.once("ready-to-show", () => window.show());
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
  app.on("second-instance", () => {
    const [window] = BrowserWindow.getAllWindows();
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
  });
  app.whenReady().then(async () => {
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
