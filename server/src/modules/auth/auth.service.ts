import crypto from "node:crypto";

// Auth 100% mock — sem senha real, sem hash, sem banco. Existe só pra dar
// uma sessão consistente pro app logado funcionar (Sidebar, feed, etc.)
// nesta fase de scaffold. Trocar por auth de verdade (JWT/bcrypt/DB) antes
// de qualquer coisa ir pra produção — ver docs/ARCHITECTURE.md.
export interface Usuario {
  id: string;
  email: string;
  nome: string;
  primeiroNome: string;
  avatarUrl: string | null;
  admin: boolean;
}

const SESSOES = new Map<string, Usuario>(); // token -> usuário
const USUARIOS_POR_EMAIL = new Map<string, Usuario>();
const SENHAS = new Map<string, string>(); // userId -> senha em texto puro (mock, sem hash)

// Usuário demo sempre disponível — o middleware requireAuth cai pra ele
// quando não há cookie de sessão, pra ninguém precisar logar manualmente só
// pra ver o dashboard rodando (ver requireAuth em ../users abaixo).
export const USUARIO_DEMO: Usuario = {
  id: "demo",
  email: "raphael@academiadohabito.com.br",
  nome: "Raphael Silva",
  primeiroNome: "Raphael",
  avatarUrl: null,
  admin: true,
};
USUARIOS_POR_EMAIL.set(USUARIO_DEMO.email, USUARIO_DEMO);
SENHAS.set(USUARIO_DEMO.id, "123456");

function iniciais(nome: string) {
  return nome.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

// Orientadores que podem ver posts marcados como "Orientador" no feed de
// comunidade (ver community.store.ts) — lista fixa por enquanto, não existe
// papel de orientador no cadastro ainda. Mesmo par de e-mails do lado PHP
// real (EMAILS_ORIENTADORES em api/_feed.php) — manter os dois em sincronia.
const EMAILS_ORIENTADORES = new Set(["raphaelmellogarrido@gmail.com", "rsp.ren@gmail.com"]);

export function ehOrientador(email: string): boolean {
  return EMAILS_ORIENTADORES.has(email.trim().toLowerCase());
}

export function loginMock(email: string, nome?: string): { token: string; usuario: Usuario } {
  const emailNorm = email.trim().toLowerCase();
  let usuario = USUARIOS_POR_EMAIL.get(emailNorm);
  if (!usuario) {
    const nomeFinal = nome?.trim() || emailNorm.split("@")[0];
    usuario = {
      id: crypto.randomUUID(),
      email: emailNorm,
      nome: nomeFinal,
      primeiroNome: nomeFinal.split(" ")[0],
      avatarUrl: null,
      admin: false,
    };
    USUARIOS_POR_EMAIL.set(emailNorm, usuario);
  }
  const token = crypto.randomBytes(24).toString("hex");
  SESSOES.set(token, usuario);
  return { token, usuario };
}

export function logoutMock(token: string) {
  SESSOES.delete(token);
}

export function usuarioPorToken(token: string | undefined): Usuario | null {
  if (!token) return null;
  return SESSOES.get(token) ?? null;
}

// Atualiza os campos editáveis em Configurações -> Perfil. Muta o objeto em
// vez de recriar: SESSOES/USUARIOS_POR_EMAIL guardam a mesma referência, então
// a troca já reflete em qualquer requisição seguinte (Sidebar, /users/me etc).
export function atualizarPerfil(
  usuario: Usuario,
  dados: Partial<Pick<Usuario, "nome" | "primeiroNome" | "avatarUrl">>,
): Usuario {
  Object.assign(usuario, dados);
  return usuario;
}

export function senhaConfere(userId: string, senha: string): boolean {
  return (SENHAS.get(userId) ?? "123456") === senha;
}

export function alterarSenha(userId: string, novaSenha: string) {
  SENHAS.set(userId, novaSenha);
}

export { iniciais };
