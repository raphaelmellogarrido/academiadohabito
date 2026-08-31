import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite roda com root=client (index.html + src/ moram lá) — server/ é o
// backend Express, separado, iniciado por `npm run server` (ver package.json).
export default defineConfig({
  root: "client",
  publicDir: "public",
  plugins: [react()],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      // Todo fetch do client pra /api/* em dev cai no Express (server/src/index.ts).
      "/api": "http://localhost:3001",
      // Fotos de perfil servidas estaticamente pelo Express (ver common/app.ts).
      "/uploads": "http://localhost:3001",
      // Vídeos do curso de meditação, também servidos estaticamente (ver
      // common/app.ts e aulas.catalogo.ts::pastaCursoMeditacao).
      "/curso-meditacao-raiz": "http://localhost:3001",
    },
  },
});
