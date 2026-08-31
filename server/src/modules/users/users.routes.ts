import { Router } from "express";
import { requireAuth } from "./users.middleware.js";
import { atualizarPerfil, alterarSenha } from "../auth/auth.service.js";
import { uploadAvatar, urlPublicaAvatar } from "./avatar.upload.js";

// Mesma regra de força aplicada no client (CardConta.tsx) e no lado PHP real
// (senha-alterar.php) — 8+ caracteres, com maiúscula, minúscula e número.
const SENHA_FORTE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

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

    const nomeTrim = typeof nome === "string" ? nome.trim() : "";
    const primeiroNomeTrim = typeof primeiroNome === "string" ? primeiroNome.trim() : "";
    if (!nomeTrim || nomeTrim.length > 30) {
      return res.status(400).json({ erro: "nome completo precisa ter entre 1 e 30 caracteres" });
    }
    if (!primeiroNomeTrim || primeiroNomeTrim.length > 14) {
      return res.status(400).json({ erro: "primeiro nome precisa ter entre 1 e 14 caracteres" });
    }

    const dados: Parameters<typeof atualizarPerfil>[1] = { nome: nomeTrim, primeiroNome: primeiroNomeTrim };
    if (req.file) dados.avatarUrl = urlPublicaAvatar(req.file.filename);

    res.json({ ok: true, usuario: atualizarPerfil(usuario, dados) });
  });
});

// Sem "senha atual" — quem já tem sessão válida (requireAuth) pode trocar
// direto (mesmo padrão do lado PHP real, ver senha-alterar.php).
usersRouter.put("/me/senha", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  const { novaSenha = "", confirmarNovaSenha = "" } = req.body ?? {};

  if (!SENHA_FORTE.test(String(novaSenha))) {
    return res.status(400).json({ erro: "a nova senha precisa ter 8+ caracteres, com maiúscula, minúscula e número" });
  }
  if (novaSenha !== confirmarNovaSenha) {
    return res.status(400).json({ erro: "confirmação não confere com a nova senha" });
  }

  alterarSenha(usuario.id, String(novaSenha));
  res.json({ ok: true });
});
