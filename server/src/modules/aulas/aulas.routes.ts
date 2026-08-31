import { Router } from "express";
import { requireAuth } from "../users/users.middleware.js";
import { getCatalogo, getProgresso, marcarConcluida, desmarcarConcluida, localizarDiaEAulaIndex } from "./aulas.store.js";
import {
  listarComentarios,
  criarComentario,
  reagirComentario,
  responderComentario,
  editarComentario,
  alterarVisibilidadeComentario,
  excluirComentario,
  LIMITE_TEXTO,
  type Visibilidade,
} from "./aulas.comentarios.js";

const VISIBILIDADES: Visibilidade[] = ["publico", "privado", "orientador"];

export const aulasRouter = Router();

aulasRouter.get("/meditacao/aulas/catalogo", requireAuth, (_req, res) => {
  res.json({ ok: true, dias: getCatalogo() });
});

aulasRouter.get("/meditacao/aulas/progresso", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  res.json({ ok: true, ...getProgresso(usuario.id) });
});

aulasRouter.post("/meditacao/aulas/concluir", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  const arquivo = String(req.body?.arquivo ?? "");
  if (!arquivo) return res.status(400).json({ erro: "arquivo inválido" });
  const progresso = marcarConcluida(usuario.id, arquivo);
  if (!progresso) return res.status(400).json({ erro: "esse vídeo não está liberado agora" });
  res.json({ ok: true, ...progresso });
});

// arquivo vem na query string (não no corpo — api.delete() do client não
// manda body), mesmo padrão de .../comentarios/:id via DELETE.
aulasRouter.delete("/meditacao/aulas/concluir", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  const arquivo = typeof req.query.arquivo === "string" ? req.query.arquivo : "";
  if (!arquivo) return res.status(400).json({ erro: "arquivo inválido" });
  const progresso = desmarcarConcluida(usuario.id, arquivo);
  res.json({ ok: true, ...progresso });
});

aulasRouter.get("/meditacao/aulas/comentarios", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : null;
  res.json({ ok: true, ...listarComentarios(cursor, usuario) });
});

aulasRouter.post("/meditacao/aulas/comentarios", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  const { texto = "", foto = null, visibilidade = "publico", arquivo = "" } = req.body ?? {};
  if (!String(texto).trim() && !foto) return res.status(400).json({ erro: "comentário vazio" });
  if (String(texto).length > LIMITE_TEXTO) return res.status(400).json({ erro: `máximo ${LIMITE_TEXTO} caracteres` });
  const visibilidadeValida = VISIBILIDADES.includes(visibilidade) ? visibilidade : "publico";

  // Dia/aula ficam gravados a partir do vídeo que o client diz estar ativo
  // no momento do comentário (ver GET /meditacao/aulas/catalogo) — é o que
  // faz o badge "Dia X, Aula Y" no feed de aulas.
  const alvo = localizarDiaEAulaIndex(String(arquivo));
  if (!alvo) return res.status(400).json({ erro: "vídeo ativo inválido" });

  const comentario = criarComentario(usuario, alvo.dia, alvo.aulaIndex, String(texto), foto, visibilidadeValida);
  res.status(201).json({ ok: true, comentario });
});

aulasRouter.post("/meditacao/aulas/comentarios/:id/reagir", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  const { reacao } = req.body ?? {};
  if (!["🙏", "❤️", "🔥"].includes(reacao)) return res.status(400).json({ erro: "reação inválida" });
  const comentario = reagirComentario(String(req.params.id), usuario, reacao);
  if (!comentario) return res.status(404).json({ erro: "comentário não encontrado" });
  res.json({ ok: true, comentario });
});

// `id` pode ser o comentário raiz ou qualquer resposta dele em qualquer
// profundidade — mesmo contrato de responder no feed (community.routes.ts).
aulasRouter.post("/meditacao/aulas/comentarios/:id/responder", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  const { texto = "" } = req.body ?? {};
  if (!String(texto).trim()) return res.status(400).json({ erro: "resposta vazia" });
  const comentario = responderComentario(String(req.params.id), usuario, String(texto));
  if (!comentario) return res.status(404).json({ erro: "comentário não encontrado" });
  res.json({ ok: true, comentario });
});

aulasRouter.put("/meditacao/aulas/comentarios/:id", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  const { texto = "" } = req.body ?? {};
  if (!String(texto).trim()) return res.status(400).json({ erro: "texto vazio" });
  const resultado = editarComentario(String(req.params.id), usuario, String(texto));
  if (resultado === "nao_encontrado") return res.status(404).json({ erro: "comentário não encontrado" });
  if (resultado === "sem_permissao") return res.status(403).json({ erro: "sem permissão" });
  res.json({ ok: true, comentario: resultado });
});

aulasRouter.put("/meditacao/aulas/comentarios/:id/visibilidade", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  const { visibilidade } = req.body ?? {};
  if (!VISIBILIDADES.includes(visibilidade)) return res.status(400).json({ erro: "visibilidade inválida" });
  const resultado = alterarVisibilidadeComentario(String(req.params.id), usuario, visibilidade);
  if (resultado === "nao_encontrado") return res.status(404).json({ erro: "comentário não encontrado" });
  if (resultado === "sem_permissao") return res.status(403).json({ erro: "sem permissão" });
  res.json({ ok: true, comentario: resultado });
});

aulasRouter.delete("/meditacao/aulas/comentarios/:id", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  const resultado = excluirComentario(String(req.params.id), usuario);
  if (resultado === "nao_encontrado") return res.status(404).json({ erro: "comentário não encontrado" });
  if (resultado === "sem_permissao") return res.status(403).json({ erro: "sem permissão" });
  res.json({ ok: true, raizId: resultado.raizId, raiz: resultado.raiz });
});
