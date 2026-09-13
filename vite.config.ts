import { defineConfig } from "vitest/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const header = readFileSync(resolve(__dirname, "userscript/header.txt"), "utf8").trim();

export default defineConfig({
  plugins: [{
    name: "userscript-header",
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type === "chunk") output.code = `${header}\n${output.code}`;
      }
    },
  }],
  build: {
    lib: { entry: resolve(__dirname, "src/main.ts"), name: "NovelUI", formats: ["iife"], fileName: () => "novel-ui-renderer.user.js" },
    outDir: "dist",
    emptyOutDir: true,
    minify: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
  test: { environment: "jsdom" },
});
