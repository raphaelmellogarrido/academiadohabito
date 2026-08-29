import { Router } from "express";
import { requireAuth } from "../users/users.middleware.js";
import { getPartilhasHojeCount } from "../community/community.store.js";
import {
  getSequencia,
  getJornada,
  getMeditandoJuntoPulso,
  marcarMeditouHoje,
} from "./gamification.store.js";

export const gamificationRouter = Router();

gamificationRouter.get("/meditacao/sequencia", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  res.json({ ok: true, ...getSequencia(usuario.id, "meditacao") });
});

gamificationRouter.get("/meditacao/jornada", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  res.json({ ok: true, ...getJornada(usuario.id, "meditacao") });
});

gamificationRouter.get("/meditacao/meditando-junto", requireAuth, (_req, res) => {
  const pulso = getMeditandoJuntoPulso("meditacao");
  res.json({ ok: true, ...pulso, partilhasHoje: getPartilhasHojeCount() });
});

gamificationRouter.post("/meditacao/meditei-hoje", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  const resultado = marcarMeditouHoje(usuario.id, "meditacao");
  res.json({ ok: true, ...resultado });
});
