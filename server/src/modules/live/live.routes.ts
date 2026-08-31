import { Router } from "express";
import { requireAuth } from "../users/users.middleware.js";
import { getProximoEncontro, alternarReserva, editarEncontro, type EncontroEdicao } from "./live.store.js";

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

// Admin (mock: exige usuario.admin) edita o card inteiro — título, data,
// duração, anfitrião, checklist e o toggle "ao vivo"/link. Substitui os
// antigos /liberar e /encerrar (sem uso no client) por um único editor
// geral; o dashboard vê a mudança no próprio poll de 3s (ProximoEncontro.tsx).
liveRouter.put("/meditacao/lives/proxima", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  if (!usuario.admin) return res.status(403).json({ erro: "somente admin" });
  const patch = req.body as EncontroEdicao;
  const encontro = editarEncontro("meditacao", patch, usuario.id);
  if (!encontro) return res.status(404).json({ erro: "nenhum encontro agendado" });
  res.json({ ok: true, encontro });
});
