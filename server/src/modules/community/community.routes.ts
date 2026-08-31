import { Router } from "express";
import { requireAuth } from "../users/users.middleware.js";
import {
  listarFeed,
  criarPost,
  reagir,
  responder,
  editarPost,
  alterarVisibilidade,
  excluirPost,
  getDesafiosDaSemana,
  alternarDesafio,
  getDesafiosSemanaAdmin,
  editarDesafiosSemana,
  resetarDesafios,
  getFrase,
  editarFrase,
  type Visibilidade,
} from "./community.store.js";

export const communityRouter = Router();

communityRouter.get("/meditacao/feed", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : null;
  res.json({ ok: true, ...listarFeed(cursor, usuario) });
});

const HUMORES = ["calma", "agitada", "cansada", "foco"];
const VISIBILIDADES: Visibilidade[] = ["publico", "privado", "orientador"];

communityRouter.post("/meditacao/feed", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  const { texto = "", foto = null, visibilidade = "publico", humor = null } = req.body ?? {};
  if (!String(texto).trim() && !foto) return res.status(400).json({ erro: "post vazio" });
  const humorValido = HUMORES.includes(humor) ? humor : null;
  const visibilidadeValida = VISIBILIDADES.includes(visibilidade) ? visibilidade : "publico";
  const post = criarPost(usuario, String(texto), foto, visibilidadeValida, humorValido);
  res.status(201).json({ ok: true, post });
});

communityRouter.post("/meditacao/feed/:id/reagir", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  const { reacao } = req.body ?? {};
  if (!["🙏", "❤️", "🔥"].includes(reacao)) return res.status(400).json({ erro: "reação inválida" });
  const post = reagir(String(req.params.id), usuario, reacao);
  if (!post) return res.status(404).json({ erro: "post não encontrado" });
  res.json({ ok: true, post });
});

communityRouter.post("/meditacao/feed/:id/responder", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  const { texto = "" } = req.body ?? {};
  if (!String(texto).trim()) return res.status(400).json({ erro: "resposta vazia" });
  const post = responder(String(req.params.id), usuario, String(texto));
  if (!post) return res.status(404).json({ erro: "post não encontrado" });
  res.json({ ok: true, post });
});

communityRouter.put("/meditacao/feed/:id", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  const { texto = "" } = req.body ?? {};
  if (!String(texto).trim()) return res.status(400).json({ erro: "texto vazio" });
  const resultado = editarPost(String(req.params.id), usuario, String(texto));
  if (resultado === "nao_encontrado") return res.status(404).json({ erro: "post não encontrado" });
  if (resultado === "sem_permissao") return res.status(403).json({ erro: "sem permissão" });
  res.json({ ok: true, post: resultado });
});

communityRouter.put("/meditacao/feed/:id/visibilidade", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  const { visibilidade } = req.body ?? {};
  if (!VISIBILIDADES.includes(visibilidade)) return res.status(400).json({ erro: "visibilidade inválida" });
  const resultado = alterarVisibilidade(String(req.params.id), usuario, visibilidade);
  if (resultado === "nao_encontrado") return res.status(404).json({ erro: "post não encontrado" });
  if (resultado === "sem_permissao") return res.status(403).json({ erro: "sem permissão" });
  res.json({ ok: true, post: resultado });
});

communityRouter.delete("/meditacao/feed/:id", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  const resultado = excluirPost(String(req.params.id), usuario);
  if (resultado === "nao_encontrado") return res.status(404).json({ erro: "post não encontrado" });
  if (resultado === "sem_permissao") return res.status(403).json({ erro: "sem permissão" });
  res.json({ ok: true, raizId: resultado.raizId, raiz: resultado.raiz });
});

communityRouter.get("/meditacao/desafios", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  res.json({ ok: true, desafios: getDesafiosDaSemana(usuario.id) });
});

communityRouter.post("/meditacao/desafios/:id/alternar", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  const desafios = alternarDesafio(usuario.id, String(req.params.id));
  if (!desafios) return res.status(404).json({ erro: "desafio não encontrado" });
  res.json({ ok: true, desafios });
});

// Admin (/app/admin, CardDesafiosAdmin.tsx) edita os textos dos desafios da
// semana e pode zerar a marcação de todo mundo — mesmo padrão 403 de
// /meditacao/frase abaixo.
communityRouter.get("/meditacao/desafios/admin", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  if (!usuario.admin) return res.status(403).json({ erro: "somente admin" });
  res.json({ ok: true, textos: getDesafiosSemanaAdmin() });
});

communityRouter.put("/meditacao/desafios", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  if (!usuario.admin) return res.status(403).json({ erro: "somente admin" });
  const { textos } = req.body ?? {};
  if (!Array.isArray(textos) || !textos.some((t) => String(t).trim())) {
    return res.status(400).json({ erro: "lista vazia" });
  }
  res.json({ ok: true, textos: editarDesafiosSemana(textos.map(String)) });
});

// Zera a marcação de TODOS os usuários (não só quem chamou) — usado depois
// de trocar os textos acima, ou só pra recomeçar a semana na mão.
communityRouter.post("/meditacao/desafios/resetar", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  if (!usuario.admin) return res.status(403).json({ erro: "somente admin" });
  resetarDesafios();
  res.json({ ok: true });
});

communityRouter.get("/meditacao/frase", requireAuth, (_req, res) => {
  res.json({ ok: true, ...getFrase() });
});

// Admin (/app/admin, AdminPage.tsx) edita a frase da semana — dashboard vê
// a mudança no próprio poll de 3s (FraseSemana.tsx).
communityRouter.put("/meditacao/frase", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  if (!usuario.admin) return res.status(403).json({ erro: "somente admin" });
  const { frase = "", autor = "" } = req.body ?? {};
  if (!String(frase).trim()) return res.status(400).json({ erro: "frase vazia" });
  res.json({ ok: true, ...editarFrase(String(frase), String(autor)) });
});
