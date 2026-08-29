import { Router } from "express";
import { loginMock, logoutMock } from "./auth.service.js";
import { requireAuth, COOKIE } from "../users/users.middleware.js";
import { parseCookies } from "../../common/cookies.js";

export const authRouter = Router();

authRouter.post("/login", (req, res) => {
  const { email, nome } = req.body ?? {};
  if (!email || typeof email !== "string") {
    return res.status(400).json({ erro: "email é obrigatório" });
  }
  const { token, usuario } = loginMock(email, nome);
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: "lax", maxAge: 30 * 24 * 60 * 60 * 1000 });
  res.json({ ok: true, usuario });
});

authRouter.post("/logout", (req, res) => {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (token) logoutMock(token);
  res.clearCookie(COOKIE);
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ ok: true, usuario: (req as any).usuario });
});
