import path from "node:path";
import express from "express";
import cors from "cors";
import { authRouter } from "../modules/auth/auth.routes.js";
import { usersRouter } from "../modules/users/users.routes.js";
import { habitsRouter } from "../modules/habits/habits.routes.js";
import { userHabitsRouter } from "../modules/user-habits/user-habits.routes.js";
import { gamificationRouter } from "../modules/gamification/gamification.routes.js";
import { communityRouter } from "../modules/community/community.routes.js";
import { liveRouter } from "../modules/live/live.routes.js";
import { aulasRouter } from "../modules/aulas/aulas.routes.js";

export function criarApp() {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "2mb" }));

  // Fotos de perfil (server/storage/uploads/avatars) — exposto em /uploads/*;
  // vite.config.ts espelha esse prefixo no proxy de dev, igual /api.
  app.use("/uploads", express.static(path.join(process.cwd(), "server", "storage", "uploads")));

  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/habits", habitsRouter);
  // userHabitsRouter/gamificationRouter/communityRouter/liveRouter/aulasRouter
  // já declaram o caminho completo a partir daqui (ex: "/me/habitos",
  // "/meditacao/jornada") — ficam todos pendurados direto em /api.
  app.use("/api", userHabitsRouter);
  app.use("/api", gamificationRouter);
  app.use("/api", communityRouter);
  app.use("/api", liveRouter);
  app.use("/api", aulasRouter);

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  return app;
}
