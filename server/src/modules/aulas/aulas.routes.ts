import { Router } from "express";
import { requireAuth } from "../users/users.middleware.js";
import { getProgresso, concluirDia } from "./aulas.store.js";
import { listarComentarios, criarComentario, LIMITE_TEXTO } from "./aulas.comentarios.js";

export const aulasRouter = Router();

aulasRouter.get("/meditacao/aulas/progresso", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  res.json({ ok: true, ...getProgresso(usuario.id) });
});

aulasRouter.post("/meditacao/aulas/concluir", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  const dia = Number(req.body?.dia);
  if (!Number.isInteger(dia)) return res.status(400).json({ erro: "dia inválido" });
  const progresso = concluirDia(usuario.id, dia);
  if (!progresso) return res.status(400).json({ erro: "esse dia não está liberado agora" });
  res.json({ ok: true, ...progresso });
});

aulasRouter.get("/meditacao/aulas/comentarios", requireAuth, (req, res) => {
  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : null;
  res.json({ ok: true, ...listarComentarios(cursor) });
});

aulasRouter.post("/meditacao/aulas/comentarios", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  const { texto = "" } = req.body ?? {};
  if (!String(texto).trim()) return res.status(400).json({ erro: "comentário vazio" });
  if (String(texto).length > LIMITE_TEXTO) return res.status(400).json({ erro: `máximo ${LIMITE_TEXTO} caracteres` });
  const diaAtual = getProgresso(usuario.id).diaAtual;
  const comentario = criarComentario(usuario, diaAtual, String(texto));
  res.status(201).json({ ok: true, comentario });
});
