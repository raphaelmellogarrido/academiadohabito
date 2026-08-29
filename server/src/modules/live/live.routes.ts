import { Router } from "express";
import { requireAuth } from "../users/users.middleware.js";
import { getProximoEncontro, alternarReserva, liberarLive, encerrarLive } from "./live.store.js";

export const liveRouter = Router();

liveRouter.get("/meditacao/lives/proxima", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  const encontro = getProximoEncontro("meditacao", usuario.id);
  if (!encontro) return res.status(404).json({ erro: "nenhum encontro agendado" });
  res.json({ ok: true, encontro });
});

liveRouter.post("/meditacao/lives/proxima/reservar", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  const encontro = alternarReserva("meditacao", usuario);
  if (!encontro) return res.status(404).json({ erro: "nenhum encontro agendado" });
  res.json({ ok: true, encontro });
});

// Admin (mock: exige usuario.admin) libera/encerra a live pra todo mundo.
liveRouter.post("/meditacao/lives/proxima/liberar", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  if (!usuario.admin) return res.status(403).json({ erro: "somente admin" });
  const { link = "" } = req.body ?? {};
  const encontro = liberarLive("meditacao", String(link));
  if (!encontro) return res.status(404).json({ erro: "nenhum encontro agendado" });
  res.json({ ok: true });
});

liveRouter.post("/meditacao/lives/proxima/encerrar", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  if (!usuario.admin) return res.status(403).json({ erro: "somente admin" });
  encerrarLive("meditacao");
  res.json({ ok: true });
});
