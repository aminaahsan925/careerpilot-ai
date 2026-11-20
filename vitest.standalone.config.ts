/**
 * Standalone vitest config — bypasses the TanStack Start Vite plugin,
 * which crashes vitest at startup with:
 *   TypeError: Cannot read properties of undefined (reading 'client')
 * Run with: npm test
 */
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { defineConfig } from "vitest/config";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root,
  resolve: {
    alias: {
      "@": resolve(root, "src"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
