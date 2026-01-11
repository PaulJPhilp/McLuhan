import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
	plugins: [
		react({
			tsDecorators: true,
		}),
	],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			"effect-artifact": path.resolve(
				__dirname,
				"node_modules/effect-artifact/dist/index.js",
			),
		},
	},
	server: {
		port: 5173,
		open: true,
	},
	build: {
		outDir: "dist",
		sourcemap: true,
		target: "ES2022",
	},
});
