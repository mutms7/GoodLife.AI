/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge, ipcRenderer } = require("electron");

// A small, read-only marker lets the shared React app select packaged model
// assets while the web build keeps WebLLM's remote defaults.
contextBridge.exposeInMainWorld("goodlifeDesktop", Object.freeze({
  isDesktop: true,
  modelBasePath: "/model/resolve/main/",
  modelWasmPath: "/model/Qwen2-1.5B-Instruct-q4f16_1_cs1k-webgpu.wasm",
  toggleFullscreen() {
    ipcRenderer.send("fullscreen-toggle");
  },
  getFullscreen() {
    return ipcRenderer.invoke("fullscreen-state");
  },
  onFullscreenChange(handler) {
    const listener = (_event, fullscreen) => handler(Boolean(fullscreen));
    ipcRenderer.on("fullscreen-changed", listener);
    return () => ipcRenderer.removeListener("fullscreen-changed", listener);
  },
  onAuthCallback(handler) {
    const listener = (_event, url) => handler(url);
    ipcRenderer.on("auth-callback", listener);
    ipcRenderer.send("auth-renderer-ready");
    return () => ipcRenderer.removeListener("auth-callback", listener);
  },
}));
