import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "tsup";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const orchestraEntry = path.resolve(__dirname, "../orchestra-ai-runtime/src/index.ts");

/** Preload must be CJS: Electron's sandboxed preload VM runs the file as a script and rejects ESM `import`. */
export default defineConfig([
  {
    entry: { main: "electron/main.ts" },
    format: "esm",
    platform: "node",
    target: "node20",
    outDir: "dist-electron",
    clean: true,
    sourcemap: true,
    dts: false,
    treeshake: true,
    splitting: false,
    external: ["electron"],
    esbuildOptions(options) {
      options.alias = {
        ...options.alias,
        "@orchestra-ai-runtime": orchestraEntry,
      };
      return options;
    },
  },
  {
    entry: { preload: "electron/preload.ts" },
    format: "cjs",
    platform: "node",
    target: "node20",
    outDir: "dist-electron",
    clean: false,
    sourcemap: true,
    dts: false,
    treeshake: true,
    splitting: false,
    external: ["electron"],
  },
]);
