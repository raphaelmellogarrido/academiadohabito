import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Todo fetch do client pra /api/* em dev cai no Express (server/index.js).
      "/api": "http://localhost:3001",
    },
  },
});
