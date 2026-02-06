import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import pkg from "./package.json";
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === "production" ? `/${pkg.name}` : "/",
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
