import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MIME = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

export function safeFile(root, pathname) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return null; }
  const candidate = path.resolve(root, `.${decoded}`);
  const relative = path.relative(root, candidate);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative) ? candidate : null;
}

async function assetResponse(root, pathname) {
  const filename = safeFile(root, pathname);
  if (!filename) return new Response("Not found", { status: 404 });
  try {
    const info = await stat(filename);
    if (!info.isFile()) return new Response("Not found", { status: 404 });
    return new Response(await (await import("node:fs/promises")).readFile(filename), {
      headers: { "content-type": MIME[path.extname(filename).toLowerCase()] ?? "application/octet-stream" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

async function pipeFile(response, file, contentType, headOnly = false) {
  const info = await stat(file);
  const cacheControl = path.basename(file) === "sw.js" ? "no-cache" : "public, max-age=31536000, immutable";
  response.writeHead(200, { "content-type": contentType, "content-length": info.size, "cache-control": cacheControl });
  if (headOnly) return response.end();
  createReadStream(file).pipe(response);
}

/** Start the bundled Vinext worker behind a fixed localhost origin. Keeping
 * the port and Electron userData directory stable means localStorage, Cache
 * Storage and WebLLM's model cache survive restarts and upgrades. */
export async function startDesktopServer({ clientRoot, modelRoot, worker, port = 47823 }) {
  const server = http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
      const pathname = requestUrl.pathname;
      const modelPath = pathname.startsWith("/model/resolve/main/")
        ? pathname.slice("/model/resolve/main/".length)
        : pathname.startsWith("/model/") ? pathname.slice("/model/".length) : null;
      if (modelPath !== null) {
        const modelFile = safeFile(modelRoot, `/${modelPath}`);
        if (!modelFile) return response.writeHead(404).end();
        try {
          await pipeFile(response, modelFile, MIME[path.extname(modelFile).toLowerCase()] ?? "application/octet-stream", request.method === "HEAD");
        } catch { response.writeHead(404).end(); }
        return;
      }

      // Vite's browser assets are immutable and do not need to pass through
      // the RSC worker. The worker still handles HTML and route data.
      if (pathname !== "/" && (pathname.startsWith("/assets/") || pathname === "/sw.js" || pathname.startsWith("/favicon") || pathname.startsWith("/icon-") || pathname.startsWith("/manifest"))) {
        const file = safeFile(clientRoot, pathname);
        if (file) {
          try { await pipeFile(response, file, MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream", request.method === "HEAD"); } catch { response.writeHead(404).end(); }
          return;
        }
      }

      const headers = new Headers();
      for (const [name, value] of Object.entries(request.headers)) {
        if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(",") : value);
      }
      const webRequest = new Request(`http://127.0.0.1:${port}${request.url ?? "/"}`, { method: request.method, headers });
      const webResponse = await worker.fetch(webRequest, {
        ASSETS: { fetch: async (assetRequest) => assetResponse(clientRoot, new URL(assetRequest.url).pathname) },
      }, { waitUntil() {}, passThroughOnException() {} });
      response.writeHead(webResponse.status, Object.fromEntries(webResponse.headers));
      response.end(Buffer.from(await webResponse.arrayBuffer()));
    } catch (error) {
      console.error("Desktop renderer request failed", error);
      if (!response.headersSent) response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end("GoodLife.AI could not render this page.");
    }
  });

  await new Promise((resolve, reject) => {
    const onError = (error) => { server.off("listening", onListening); reject(error); };
    const onListening = () => { server.off("error", onError); resolve(); };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, "127.0.0.1");
  });
  return { server, url: `http://127.0.0.1:${port}` };
}

export function packagedPath(relative) {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), relative);
}
