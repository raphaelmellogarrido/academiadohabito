import type { NextFunction, Request, Response } from "express";
import { parseCookies } from "../../common/cookies.js";
import { usuarioPorToken, USUARIO_DEMO } from "../auth/auth.service.js";

const COOKIE = "ah_session";

// Middleware de auth mock: lê o cookie de sessão criado em POST /api/auth/login.
// Sem cookie válido, cai pro USUARIO_DEMO em vez de 401 — assim o app inteiro
// (Sidebar, dashboard, feed) já roda "logado" sem precisar passar pela tela
// de login primeiro, útil nesta fase de scaffold/demo. Trocar por 401 real
// quando a autenticação de verdade entrar (ver docs/ARCHITECTURE.md).
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = parseCookies(req.headers.cookie).ah_session;
  const usuario = usuarioPorToken(token) ?? USUARIO_DEMO;
  (req as any).usuario = usuario;
  next();
}

export { COOKIE };
