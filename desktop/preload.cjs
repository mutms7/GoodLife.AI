/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge, ipcRenderer } = require("electron");

// A small, read-only marker lets the shared React app select packaged model
// assets while the web build keeps WebLLM's remote defaults.
contextBridge.exposeInMainWorld("goodlifeDesktop", Object.freeze({
  isDesktop: true,
  modelBasePath: "/model/resolve/main/",
  modelWasmPath: "/model/Qwen2-1.5B-Instruct-q4f16_1_cs1k-webgpu.wasm",
  onAuthCallback(handler) {
    const listener = (_event, url) => handler(url);
    ipcRenderer.on("auth-callback", listener);
    ipcRenderer.send("auth-renderer-ready");
    return () => ipcRenderer.removeListener("auth-callback", listener);
  },
}));
