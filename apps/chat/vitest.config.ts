import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [
		react({
			tsDecorators: true,
		}),
	],
	test: {
		environment: "happy-dom",
		globals: true,
		include: ["src/**/*.test.{ts,tsx}", "__tests__/**/*.test.{ts,tsx}"],
		exclude: ["node_modules", "dist"],
		setupFiles: ["./src/__tests__/setup.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html", "lcov"],
			exclude: [
				"node_modules/",
				"src/__tests__/",
				"**/*.test.{ts,tsx}",
				"**/*.config.{ts,js}",
				"dist/",
			],
		},
		testTimeout: 10000,
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
