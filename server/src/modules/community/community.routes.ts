import { Router } from "express";
import { requireAuth } from "../users/users.middleware.js";
import {
  listarFeed,
  criarPost,
  reagir,
  responder,
  getDesafiosDaSemana,
  alternarDesafio,
  getFrase,
  editarFrase,
} from "./community.store.js";

export const communityRouter = Router();

communityRouter.get("/meditacao/feed", requireAuth, (_req, res) => {
  res.json({ ok: true, posts: listarFeed() });
});

communityRouter.post("/meditacao/feed", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  const { texto = "", foto = null, publico = true } = req.body ?? {};
  if (!String(texto).trim() && !foto) return res.status(400).json({ erro: "post vazio" });
  const post = criarPost(usuario, String(texto), foto, Boolean(publico));
  res.status(201).json({ ok: true, post });
});

communityRouter.post("/meditacao/feed/:id/reagir", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  const { reacao } = req.body ?? {};
  if (!["🙏", "❤️", "🔥"].includes(reacao)) return res.status(400).json({ erro: "reação inválida" });
  const post = reagir(String(req.params.id), usuario.id, reacao);
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
