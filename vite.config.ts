// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import path from "node:path";
import { loadEnv } from "vite";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Load non-VITE_ env vars into process.env for server routes (never exposed to the client).
Object.assign(process.env, loadEnv(process.env["NODE_ENV"] ?? "development", process.cwd(), ""));

// Static (GitHub Pages) build: `VITE_BASE=/hotshot-play/ vite build` renders the app as a
// client-only SPA under that base path. Server functions are not available in that mode.
const base = process.env["VITE_BASE"] ?? "/";
const isStatic = base !== "/";
const basepath = base.replace(/\/$/, "");

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    ...(isStatic
      ? {
          router: { basepath },
          spa: { enabled: true, maskPath: "/", prerender: { outputPath: "/index.html" } },
        }
      : {}),
  },
  ...(isStatic ? { nitro: false } : {}),
  vite: {
    base,
    resolve: {
      alias: {
        "entities/lib/decode.js": path.resolve(
          import.meta.dirname,
          "node_modules/entities/lib/decode.js",
        ),
        "entities/lib/encode.js": path.resolve(
          import.meta.dirname,
          "node_modules/entities/lib/encode.js",
        ),
        entities: path.resolve(import.meta.dirname, "node_modules/entities"),
      },
    },
  },
});
