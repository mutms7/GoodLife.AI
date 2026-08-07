/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge } = require("electron");

// A small, read-only marker lets the shared React app select packaged model
// assets while the web build keeps WebLLM's remote defaults.
contextBridge.exposeInMainWorld("goodlifeDesktop", Object.freeze({
  isDesktop: true,
  modelBasePath: "/model/resolve/main/",
  modelWasmPath: "/model/Qwen2-1.5B-Instruct-q4f16_1_cs1k-webgpu.wasm",
}));
