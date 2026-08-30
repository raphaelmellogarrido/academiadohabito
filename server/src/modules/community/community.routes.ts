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
  getFrase,
  editarFrase,
  type Visibilidade,
} from "./community.store.js";

export const communityRouter = Router();

communityRouter.get("/meditacao/feed", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  res.json({ ok: true, posts: listarFeed(usuario) });
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
  res.json({ ok: true });
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

communityRouter.get("/meditacao/frase", requireAuth, (_req, res) => {
  res.json({ ok: true, ...getFrase() });
});

// Sem checagem de admin de verdade ainda (mock); front só expõe o form no
// hamburguer/admin do usuário demo (admin:true). Endpoint fica aberto a
// qualquer autenticado por ora — ver docs/HABIT_LOGIC.md (pendências).
communityRouter.put("/meditacao/frase", requireAuth, (req, res) => {
  const { frase = "", autor = "" } = req.body ?? {};
  if (!String(frase).trim()) return res.status(400).json({ erro: "frase vazia" });
  res.json({ ok: true, ...editarFrase(String(frase), String(autor)) });
});
