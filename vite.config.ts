import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { visualizer } from "rollup-plugin-visualizer";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), visualizer({ open: true, gzipSize: true })],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      src: resolve(__dirname, "./src"),
    },
  },
  server: {
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
    include: [
      "@tiptap/react",
      "@tiptap/core",
      "@tiptap/pm/state",
      "@tiptap/pm/model",
      "@tiptap/starter-kit",
      "@tiptap/extensions",
      "@tiptap/extension-list",
      "@tiptap/extension-table",
      "@tiptap/extension-table-of-contents",
      "@tiptap/extension-text-align",
      "@tiptap/extension-text-style",
      "@tiptap/extension-typography",
      "@tiptap/extension-highlight",
      "@tiptap/extension-subscript",
      "@tiptap/extension-superscript",
      "@tiptap/extension-unique-id",
      "@tiptap/extension-collaboration",
      "@tiptap/extension-collaboration-caret",
      "@hocuspocus/provider",
      "yjs",
      "lucide-react",
    ],
  },
});
