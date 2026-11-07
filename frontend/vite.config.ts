import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// Vite config — https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  css: {
    // Jangan ikut memakai postcss.config.mjs milik Next.js di folder induk;
    // Tailwind v4 di sini sudah ditangani oleh plugin @tailwindcss/vite.
    postcss: {},
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    // Port 5173 agar tidak bentrok dengan backend (port 3000)
    port: 5173,
    proxy: {
      // Semua request ke /api diteruskan ke backend Next.js,
      // jadi frontend cukup memanggil fetch("/api/...") tanpa masalah CORS.
      "/api": {
        target: process.env.BACKEND_URL ?? "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
