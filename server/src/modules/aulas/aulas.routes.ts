import { Router } from "express";
import { requireAuth } from "../users/users.middleware.js";
import { getProgresso, concluirDia } from "./aulas.store.js";
import {
  listarComentarios,
  criarComentario,
  reagirComentario,
  excluirComentario,
  LIMITE_TEXTO,
} from "./aulas.comentarios.js";

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
  const usuario = (req as any).usuario;
  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : null;
  res.json({ ok: true, ...listarComentarios(cursor, usuario.id) });
});

aulasRouter.post("/meditacao/aulas/comentarios", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  const { texto = "", foto = null, publico = true } = req.body ?? {};
  if (!String(texto).trim() && !foto) return res.status(400).json({ erro: "comentário vazio" });
  if (String(texto).length > LIMITE_TEXTO) return res.status(400).json({ erro: `máximo ${LIMITE_TEXTO} caracteres` });
  const diaAtual = getProgresso(usuario.id).diaAtual;
  const comentario = criarComentario(usuario, diaAtual, String(texto), foto, Boolean(publico));
  res.status(201).json({ ok: true, comentario });
});

aulasRouter.post("/meditacao/aulas/comentarios/:id/reagir", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  const { reacao } = req.body ?? {};
  if (!["🙏", "❤️", "🔥"].includes(reacao)) return res.status(400).json({ erro: "reação inválida" });
  const comentario = reagirComentario(String(req.params.id), usuario.id, reacao);
  if (!comentario) return res.status(404).json({ erro: "comentário não encontrado" });
  res.json({ ok: true, comentario });
});

aulasRouter.delete("/meditacao/aulas/comentarios/:id", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  const resultado = excluirComentario(String(req.params.id), usuario);
  if (resultado === "nao_encontrado") return res.status(404).json({ erro: "comentário não encontrado" });
  if (resultado === "sem_permissao") return res.status(403).json({ erro: "sem permissão" });
  res.json({ ok: true });
});
