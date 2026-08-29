import { Router } from "express";
import { requireAuth } from "./users.middleware.js";
import { atualizarPerfil, senhaConfere, alterarSenha } from "../auth/auth.service.js";
import { uploadAvatar, urlPublicaAvatar } from "./avatar.upload.js";

export const usersRouter = Router();

usersRouter.get("/me", requireAuth, (req, res) => {
  res.json({ ok: true, usuario: (req as any).usuario });
});

// multipart (nome, primeiroNome, foto?) — chamado manualmente em vez de
// pendurado na cadeia de middlewares pra poder responder erro de
// tipo/tamanho do multer como 400 (em vez do 500 padrão do Express).
usersRouter.put("/me/perfil", requireAuth, (req, res) => {
  uploadAvatar.single("foto")(req, res, (erro) => {
    if (erro) return res.status(400).json({ erro: erro.message ?? "falha no upload" });

    const usuario = (req as any).usuario;
    const { nome, primeiroNome } = req.body ?? {};
    const dados: Parameters<typeof atualizarPerfil>[1] = {};
    if (typeof nome === "string" && nome.trim()) dados.nome = nome.trim();
    if (typeof primeiroNome === "string" && primeiroNome.trim()) dados.primeiroNome = primeiroNome.trim();
    if (req.file) dados.avatarUrl = urlPublicaAvatar(req.file.filename);

    res.json({ ok: true, usuario: atualizarPerfil(usuario, dados) });
  });
});

usersRouter.put("/me/senha", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  const { senhaAtual = "", novaSenha = "", confirmarNovaSenha = "" } = req.body ?? {};

  if (!senhaConfere(usuario.id, String(senhaAtual))) {
    return res.status(400).json({ erro: "senha atual incorreta" });
  }
  if (String(novaSenha).length < 6) {
    return res.status(400).json({ erro: "a nova senha precisa ter ao menos 6 caracteres" });
  }
  if (novaSenha !== confirmarNovaSenha) {
    return res.status(400).json({ erro: "confirmação não confere com a nova senha" });
  }

  alterarSenha(usuario.id, String(novaSenha));
  res.json({ ok: true });
});
