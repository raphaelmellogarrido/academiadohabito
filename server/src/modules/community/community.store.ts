import { hojeBrasilISO } from "../gamification/gamification.store.js";
import { ehOrientador } from "../auth/auth.service.js";

// --- Feed (Dificuldade do dia / "o que sentiu na prática") -----------------
export type Reacao = "🙏" | "❤️" | "🔥";

export interface Resposta {
  id: string;
  userId: string;
  nome: string;
  texto: string;
  criadoEm: string;
}

export type Humor = "calma" | "agitada" | "cansada" | "foco";

// publico = todo mundo vê; privado = só quem postou; orientador = só quem
// postou + ehOrientador(email) (ver auth.service.ts).
export type Visibilidade = "publico" | "privado" | "orientador";

export interface Post {
  id: string;
  userId: string;
  nome: string;
  avatarUrl: string | null;
  texto: string;
  humor: Humor | null;
  foto: string | null;
  visibilidade: Visibilidade;
  reacoes: Record<Reacao, number>;
  minhasReacoes: Record<string, Reacao[]>; // userId -> reações que já deu neste post
  respostas: Resposta[];
  criadoEm: string;
}

// Único ponto que decide se `usuarioAtual` pode ver `post` — usado tanto pra
// filtrar o feed quanto pra barrar reagir/responder num post que ele nem
// deveria enxergar (mesma checagem dos dois lados, igual condVisibilidadeSql
// no PHP real).
function podeVerPost(post: Post, usuarioAtual: { id: string; email: string }): boolean {
  if (post.visibilidade === "publico") return true;
  if (post.userId === usuarioAtual.id) return true;
  if (post.visibilidade === "orientador") return ehOrientador(usuarioAtual.email);
  return false;
}

let seq = 1;
const proximoId = () => String(seq++);

const FEED: Post[] = [
  {
    id: proximoId(),
    userId: "demo",
    nome: "Raphael Silva",
    avatarUrl: null,
    texto: "Hoje a mente estava agitada, mas os 10 minutos valeram cada segundo. 🙏",
    humor: "agitada",
    foto: null,
    visibilidade: "publico",
    reacoes: { "🙏": 3, "❤️": 1, "🔥": 0 },
    minhasReacoes: {},
    respostas: [],
    criadoEm: new Date().toISOString(),
  },
];

export function listarFeed(usuarioAtual: { id: string; email: string }) {
  return [...FEED]
    .filter((p) => podeVerPost(p, usuarioAtual))
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
}

export function criarPost(
  usuario: { id: string; nome: string; avatarUrl: string | null },
  texto: string,
  foto: string | null,
  visibilidade: Visibilidade,
  humor: Humor | null = null,
) {
  const post: Post = {
    id: proximoId(),
    userId: usuario.id,
    nome: usuario.nome,
    avatarUrl: usuario.avatarUrl,
    texto: texto.slice(0, 140),
    humor,
    foto,
    visibilidade,
    reacoes: { "🙏": 0, "❤️": 0, "🔥": 0 },
    minhasReacoes: {},
    respostas: [],
    criadoEm: new Date().toISOString(),
  };
  FEED.push(post);
  return post;
}

export function reagir(postId: string, usuarioAtual: { id: string; email: string }, reacao: Reacao) {
  const post = FEED.find((p) => p.id === postId);
  if (!post || !podeVerPost(post, usuarioAtual)) return null;
  const userId = usuarioAtual.id;
  const minhas = post.minhasReacoes[userId] ?? [];
  if (minhas.includes(reacao)) {
    post.reacoes[reacao] = Math.max(0, post.reacoes[reacao] - 1);
    post.minhasReacoes[userId] = minhas.filter((r) => r !== reacao);
  } else {
    post.reacoes[reacao] += 1;
    post.minhasReacoes[userId] = [...minhas, reacao];
  }
  return post;
}

export function responder(postId: string, usuario: { id: string; nome: string; email: string }, texto: string) {
  const post = FEED.find((p) => p.id === postId);
  if (!post || !podeVerPost(post, usuario)) return null;
  const resposta: Resposta = {
    id: proximoId(),
    userId: usuario.id,
    nome: usuario.nome,
    texto: texto.slice(0, 280),
    criadoEm: new Date().toISOString(),
  };
  post.respostas.push(resposta);
  return post;
}

// Consumido pelo módulo de gamificação (meditando-junto -> partilhasHoje) —
// import cruzado deliberado, os dois módulos moram no mesmo processo/mock.
export function getPartilhasHojeCount() {
  const hoje = hojeBrasilISO();
  return FEED.filter((p) => p.criadoEm.slice(0, 10) === hoje).length;
}

// --- Desafios da semana (definidos no /admin, marcados por usuário) --------
interface Desafio {
  id: string;
  texto: string;
}

const DESAFIOS_SEMANA: Desafio[] = [
  { id: "1", texto: "Medite 5 minutos antes de checar o celular" },
  { id: "2", texto: "Faça 1 refeição sem tela por perto" },
  { id: "3", texto: "Durma 30 minutos mais cedo em 1 dia" },
];

// chave = `${userId}:${semanaISO}` -> Set<desafioId concluído>
const CONCLUIDOS = new Map<string, Set<string>>();

function semanaAtualISO(): string {
  const hoje = new Date(hojeBrasilISO());
  const primeiraQuinta = new Date(hoje.getFullYear(), 0, 4);
  const semana =
    1 +
    Math.round(
      ((hoje.getTime() - primeiraQuinta.getTime()) / 86400000 -
        3 +
        ((primeiraQuinta.getDay() + 6) % 7)) /
        7,
    );
  return `${hoje.getFullYear()}-W${semana}`;
}

export function getDesafiosDaSemana(userId: string) {
  const chave = `${userId}:${semanaAtualISO()}`;
  const feitos = CONCLUIDOS.get(chave) ?? new Set();
  return DESAFIOS_SEMANA.map((d) => ({ ...d, concluido: feitos.has(d.id) }));
}

export function alternarDesafio(userId: string, desafioId: string) {
  if (!DESAFIOS_SEMANA.some((d) => d.id === desafioId)) return null;
  const chave = `${userId}:${semanaAtualISO()}`;
  const feitos = CONCLUIDOS.get(chave) ?? new Set<string>();
  if (feitos.has(desafioId)) feitos.delete(desafioId);
  else feitos.add(desafioId);
  CONCLUIDOS.set(chave, feitos);
  return getDesafiosDaSemana(userId);
}

// --- Frase da semana (editável no /admin) -----------------------------------
const FRASE = { frase: "A calma que você procura não está lá fora. Ela mora na sua respiração.", autor: "Dr. Renato" };

export function getFrase() {
  return { ...FRASE };
}

export function editarFrase(frase: string, autor: string) {
  FRASE.frase = frase;
  FRASE.autor = autor;
  return { ...FRASE };
}
