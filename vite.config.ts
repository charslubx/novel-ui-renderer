import { defineConfig } from "vitest/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const header = readFileSync(resolve(__dirname, "userscript/header.txt"), "utf8").trim();

export default defineConfig({
  build: {
    lib: { entry: resolve(__dirname, "src/main.ts"), name: "NovelUI", formats: ["iife"], fileName: () => "novel-ui-renderer.user.js" },
    outDir: "dist",
    emptyOutDir: true,
    minify: false,
    rollupOptions: { output: { banner: header, inlineDynamicImports: true } },
  },
  test: { environment: "jsdom" },
});
