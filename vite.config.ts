import { defineConfig, type Plugin } from "vite";
import { readFileSync } from "node:fs";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { visualizer } from "rollup-plugin-visualizer";
import { VitePWA } from "vite-plugin-pwa";

const DAY = 60 * 60 * 24;

// Set by the Tauri CLI while it runs the dev server or the build for the
// desktop app (src-tauri). The app has no service worker (the app itself is
// installed, and pages load from the bundled files), and the bundle report
// shouldn't pop a browser tab on every desktop build.
const isDesktop = !!process.env.TAURI_ENV_PLATFORM;

// lucide-react/dynamic.mjs ends with a sourceMappingURL comment for a .map
// file the package doesn't ship. It's served unbundled in dev (see
// optimizeDeps.exclude), so Vite tries to read that map and logs
// "Failed to load source map" on every start. Load it without the comment.
// Dev only; nothing changes in the build.
function lucideDynamicWithoutSourcemap(): Plugin {
  return {
    name: "folio:lucide-dynamic-no-sourcemap",
    apply: "serve",
    enforce: "pre",
    load(id) {
      const file = id.split("?")[0].replace(/\\/g, "/");
      if (!file.endsWith("/lucide-react/dynamic.mjs")) return null;
      const code = readFileSync(file, "utf8").replace(
        /\n\/\/# sourceMappingURL=.*$/m,
        "",
      );
      return { code, map: null };
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    lucideDynamicWithoutSourcemap(),
    // Service worker: Folio opens with no connection.
    //   • The built app (JS, CSS, fonts, icons) is precached on the first
    //     visit, so a reload works offline.
    //   • Any in-app URL (/page/…, /t/…) falls back to the cached index.html;
    //     the router takes it from there.
    //   • Public files in Supabase Storage (images, covers) and Google Fonts:
    //     served from cache, refreshed in the background.
    //   • Everything else (Supabase REST/Auth/Realtime, Hocuspocus, uploads)
    //     goes straight to the network; offline data comes from IndexedDB
    //     (query-persistence.ts, offline-doc-cache.ts), not from here.
    // "prompt": a new deploy waits until the person reloads (UpdatePrompt),
    // so nobody is reloaded mid-sentence. Off in dev.
    VitePWA({
      // Off in the desktop app: no service worker is registered, and the
      // update prompt's hook (virtual:pwa-register) does nothing there.
      disable: isDesktop,
      registerType: "prompt",
      injectRegister: false,
      manifest: false,
      devOptions: { enabled: false },
      workbox: {
        globPatterns: [
          "**/*.{js,mjs,css,html,svg,png,jpg,webp,ico,woff,woff2}",
        ],
        // ~1,600 one-icon Lucide chunks (see build.output.chunkFileNames):
        // precaching them would mean 1,600 downloads on the first visit.
        // They're cached when first shown instead (runtimeCaching below).
        globIgnores: ["assets/icons/**"],
        // The icon font (~5 MB) and the PDF worker are larger than
        // workbox's 2 MB default; without this they'd be left out and
        // missing offline.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/threads-api\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin && url.pathname.startsWith("/assets/icons/"),
            handler: "CacheFirst",
            options: {
              // v2: before /assets/ was left out of the SPA rewrite
              // (vercel.json), a missing icon chunk came back as index.html
              // with a 200 and was cached as the icon. A new name leaves
              // that poisoned cache behind.
              cacheName: "folio-icons-v2",
              expiration: { maxEntries: 2000, maxAgeSeconds: 365 * DAY },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.hostname.endsWith(".supabase.co") &&
              url.pathname.startsWith("/storage/v1/object/public/"),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "folio-public-files",
              expiration: { maxEntries: 300, maxAgeSeconds: 30 * DAY },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.origin === "https://fonts.googleapis.com",
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-css" },
          },
          {
            urlPattern: ({ url }) => url.origin === "https://fonts.gstatic.com",
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 365 * DAY },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
    !isDesktop && visualizer({ open: true, gzipSize: true }),
  ],
  build: {
    rollupOptions: {
      output: {
        // One-icon chunks from lucide-react/dynamic go in their own folder,
        // so the service worker can leave them out of its precache.
        chunkFileNames: (chunk) =>
          chunk.facadeModuleId?.includes("/lucide-react/dist/esm/icons/")
            ? "assets/icons/[name]-[hash].js"
            : "assets/[name]-[hash].js",
        // Big libraries get their own chunks, so a page that doesn't need
        // one doesn't download it, and they stay cached across deploys.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (
            id.includes("/mathjs/") ||
            id.includes("/decimal.js/") ||
            id.includes("/complex.js/") ||
            id.includes("/fraction.js/")
          )
            return "vendor-mathjs";
          // Babel's small helpers are shared by mathjs and the router. Left
          // alone, Rollup puts them in vendor-mathjs, and the app then has to
          // download all of mathjs at start just to reach them.
          if (id.includes("/@babel/runtime/")) return "vendor-babel-runtime";
          if (id.includes("/lodash")) return "vendor-lodash";
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      src: resolve(__dirname, "./src"),
    },
  },
  // The desktop app's dev window loads http://localhost:5173
  // (src-tauri/tauri.conf.json): keep Tauri's logs on screen and fail
  // instead of moving to another port.
  clearScreen: !isDesktop,
  server: {
    strictPort: isDesktop,
    // Dev only. The database (and its ~350 files and stylesheets) loads
    // lazily, so the first database you open used to wait while Vite compiled
    // every one of them. Warmup compiles them in the background as soon as the
    // dev server starts, so that first open only has to download them.
    warmup: {
      clientFiles: [
        "./src/features/database/nodes/database-node/database-node-view.tsx",
        "./src/features/database/nodes/database-record-node-view/database-record-node-view.tsx",
        "./src/features/database/nodes/database-node/database-cell-node-view.tsx",
      ],
    },
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/threads-api": {
        target: "http://localhost:3002",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/threads-api/, ""),
      },
    },
  },
  optimizeDeps: {
    // NOT pre-bundled: lucide-react/dynamic holds a lazy import for every
    // Lucide icon. Bundled together with lucide-react, the bundler split all
    // ~1,670 icons into separate shared files, and every plain
    // `import { X } from "lucide-react"` then loaded ALL of them on startup
    // (~1,800 requests, the long spinner in dev). Served as-is instead, it
    // only fetches the icons actually shown.
    exclude: ["lucide-react/dynamic"],
    // Pre-bundle every dependency the app imports, up front. Anything left
    // out is found later, when a lazily loaded part of the app (a database,
    // the formula editor, code blocks…) first imports it: Vite then
    // re-optimizes and RELOADS the page mid-load (content shows, goes
    // blank, then loads again).
    include: [
      "@codemirror/autocomplete",
      "@codemirror/commands",
      "@codemirror/language",
      "@codemirror/state",
      "@codemirror/view",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/utilities",
      "@floating-ui/dom",
      "@floating-ui/react",
      "@hocuspocus/provider",
      "@lezer/highlight",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-popover",
      "@supabase/supabase-js",
      "@tanstack/query-async-storage-persister",
      "@tanstack/react-location",
      "@tanstack/react-query",
      "@tanstack/react-query-devtools",
      "@tanstack/react-query-persist-client",
      "@tanstack/react-virtual",
      "@tiptap/core",
      "@tiptap/extension-code-block-lowlight",
      "@tiptap/extension-collaboration",
      "@tiptap/extension-collaboration-caret",
      "@tiptap/extension-document",
      "@tiptap/extension-drag-handle",
      "@tiptap/extension-emoji",
      "@tiptap/extension-highlight",
      "@tiptap/extension-horizontal-rule",
      "@tiptap/extension-image",
      "@tiptap/extension-list",
      "@tiptap/extension-mention",
      "@tiptap/extension-node-range",
      "@tiptap/extension-paragraph",
      "@tiptap/extension-placeholder",
      "@tiptap/extension-subscript",
      "@tiptap/extension-superscript",
      "@tiptap/extension-table",
      "@tiptap/extension-table-of-contents",
      "@tiptap/extension-text",
      "@tiptap/extension-text-align",
      "@tiptap/extension-text-style",
      "@tiptap/extension-typography",
      "@tiptap/extension-unique-id",
      "@tiptap/extension-youtube",
      "@tiptap/extensions",
      "@tiptap/pm/model",
      "@tiptap/pm/state",
      "@tiptap/pm/tables",
      "@tiptap/pm/view",
      "@tiptap/react",
      "@tiptap/react/menus",
      "@tiptap/starter-kit",
      "@tiptap/suggestion",
      "@tiptap/y-tiptap",
      "clsx",
      "diff",
      "docx",
      "highlight.js/lib/languages/bash",
      "highlight.js/lib/languages/c",
      "highlight.js/lib/languages/cpp",
      "highlight.js/lib/languages/css",
      "highlight.js/lib/languages/go",
      "highlight.js/lib/languages/java",
      "highlight.js/lib/languages/javascript",
      "highlight.js/lib/languages/json",
      "highlight.js/lib/languages/markdown",
      "highlight.js/lib/languages/python",
      "highlight.js/lib/languages/rust",
      "highlight.js/lib/languages/scss",
      "highlight.js/lib/languages/sql",
      "highlight.js/lib/languages/typescript",
      "highlight.js/lib/languages/xml",
      "highlight.js/lib/languages/yaml",
      "i18next",
      "i18next-browser-languagedetector",
      "katex",
      "lodash",
      "lowlight",
      "lucide-react",
      "marked",
      "mathjs",
      "nanoid",
      "pdfjs-dist",
      "prosemirror-state",
      "prosemirror-tables",
      "react",
      "react-dom",
      "react-dom/client",
      "react-hotkeys-hook",
      "react-i18next",
      "react/jsx-dev-runtime",
      "react/jsx-runtime",
      "tippy.js",
      "use-debounce",
      "uuid",
      "y-protocols/awareness",
      "yjs",
    ],
  },
});
