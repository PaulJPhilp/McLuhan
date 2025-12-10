import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "happy-dom",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      all: true,
      lines: 90,
      functions: 90,
      branches: 90,
      statements: 90,
    },
    include: ["src/**/*.test.ts"],
  },
  optimizeDeps: {
    exclude: ["bun:test"],
  },
  ssr: {
    noExternal: ["bun:test"],
  },
});
