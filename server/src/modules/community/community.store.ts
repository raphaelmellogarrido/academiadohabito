import { hojeBrasilISO } from "../gamification/gamification.store.js";
import { ehOrientador } from "../auth/auth.service.js";

// --- Feed (Dificuldade do dia / "o que sentiu na prática") -----------------
export type Reacao = "🙏" | "❤️" | "🔥";

// Post raiz e respostas (em qualquer profundidade) compartilham o mesmo shape —
// dá pra responder tanto ao post quanto a uma resposta, thread recursiva sem
// limite de nível (mesmo modelo do `parent_id` genérico usado no PHP real).
export interface NoComentario {
  id: string;
  userId: string;
  nome: string;
  avatarUrl: string | null;
  admin: boolean;
  texto: string;
  foto: string | null;
  visibilidade: Visibilidade;
  reacoes: Record<Reacao, number>;
  minhasReacoes: Record<string, Reacao[]>; // userId -> reações que já deu neste nó
  respostas: NoComentario[];
  criadoEm: string;
}

export type Humor = "calma" | "agitada" | "cansada" | "foco";

// publico = todo mundo vê; privado = só quem postou; orientador = só quem
// postou + ehOrientador(email) (ver auth.service.ts).
export type Visibilidade = "publico" | "privado" | "orientador";

export interface Post extends NoComentario {
  humor: Humor | null;
}

// Shape devolvido ao client, com as permissões calculadas pro usuário que
// está pedindo — mesmo padrão de paraCliente() em aulas.comentarios.ts.
// Editar visibilidade/texto é só do dono; excluir também aceita admin. Aplica
// recursivamente em cada resposta, não só na raiz.
function paraClienteNo<T extends NoComentario>(no: T, usuarioAtual: { id: string; admin: boolean }): T {
  return {
    ...no,
    respostas: no.respostas.map((r) => paraClienteNo(r, usuarioAtual)),
    podeEditar: no.userId === usuarioAtual.id,
    podeExcluir: no.userId === usuarioAtual.id || usuarioAtual.admin,
  };
}

function paraClientePost(post: Post, usuarioAtual: { id: string; admin: boolean }) {
  return paraClienteNo(post, usuarioAtual);
}

// Acha um nó (raiz ou resposta em qualquer profundidade) por id dentro de um post — usado
// por reagir/editar/visibilidade/responder/excluir, que agora podem mirar qualquer nó da árvore.
function encontrarNo(post: Post, id: string): NoComentario | null {
  if (post.id === id) return post;
  function buscar(lista: NoComentario[]): NoComentario | null {
    for (const no of lista) {
      if (no.id === id) return no;
      const achado = buscar(no.respostas);
      if (achado) return achado;
    }
    return null;
  }
  return buscar(post.respostas);
}

// Acha o pai direto de um nó (por id) dentro de um post — usado só por excluirPost
// pra saber de qual array `respostas` fazer o splice quando o nó não é a raiz.
function encontrarPai(post: Post, id: string): NoComentario | Post | null {
  function buscar(pai: NoComentario | Post): NoComentario | Post | null {
    for (const filho of pai.respostas) {
      if (filho.id === id) return pai;
      const achado = buscar(filho);
      if (achado) return achado;
    }
    return null;
  }
  return buscar(post);
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
    admin: false,
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

// Acha o post raiz (no array top-level FEED) que contém o nó `id`, seja ele a
// própria raiz ou uma resposta em qualquer profundidade — usado por
// reagir/responder/editarPost/alterarVisibilidade/excluirPost, que agora
// podem mirar qualquer nó da thread, não só o post.
function encontrarPostDoNo(id: string): Post | null {
  return FEED.find((p) => encontrarNo(p, id) !== null) ?? null;
}

// Scroll infinito: mais recentes primeiro, paginado por cursor (id do último
// post já recebido pelo client) — mesmo esquema de aulas.comentarios.ts,
// só que 20 por página (feed principal do dashboard, pode passar de 1000
// posts e não pode travar renderizando tudo de uma vez).
const PAGINA_FEED = 20;

export function listarFeed(cursor: string | null, usuarioAtual: { id: string; email: string; admin: boolean }) {
  const ordenados = [...FEED]
    .filter((p) => podeVerPost(p, usuarioAtual))
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm) || Number(b.id) - Number(a.id));
  const inicio = cursor ? ordenados.findIndex((p) => p.id === cursor) + 1 : 0;
  const pagina = ordenados.slice(inicio, inicio + PAGINA_FEED);
  const proximoCursor = inicio + PAGINA_FEED < ordenados.length ? pagina[pagina.length - 1]?.id ?? null : null;
  return { posts: pagina.map((p) => paraClientePost(p, usuarioAtual)), proximoCursor };
}

export function criarPost(
  usuario: { id: string; nome: string; avatarUrl: string | null; admin: boolean },
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
    admin: usuario.admin,
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
  return paraClientePost(post, usuario);
}

export function reagir(id: string, usuarioAtual: { id: string; email: string; admin: boolean }, reacao: Reacao) {
  const post = encontrarPostDoNo(id);
  if (!post || !podeVerPost(post, usuarioAtual)) return null;
  const no = encontrarNo(post, id)!;
  const userId = usuarioAtual.id;
  const minhas = no.minhasReacoes[userId] ?? [];
  if (minhas.includes(reacao)) {
    no.reacoes[reacao] = Math.max(0, no.reacoes[reacao] - 1);
    no.minhasReacoes[userId] = minhas.filter((r) => r !== reacao);
  } else {
    no.reacoes[reacao] += 1;
    no.minhasReacoes[userId] = [...minhas, reacao];
  }
  return paraClientePost(post, usuarioAtual);
}

// `id` é o nó (post ou resposta em qualquer profundidade) que está sendo
// respondido — a nova resposta entra em `no.respostas`, recursivo sem limite.
export function responder(id: string, usuario: { id: string; nome: string; email: string; admin: boolean }, texto: string) {
  const post = encontrarPostDoNo(id);
  if (!post || !podeVerPost(post, usuario)) return null;
  const no = encontrarNo(post, id)!;
  const resposta: NoComentario = {
    id: proximoId(),
    userId: usuario.id,
    nome: usuario.nome,
    avatarUrl: null,
    admin: usuario.admin,
    texto: texto.slice(0, 140),
    foto: null,
    visibilidade: "publico",
    reacoes: { "🙏": 0, "❤️": 0, "🔥": 0 },
    minhasReacoes: {},
    respostas: [],
    criadoEm: new Date().toISOString(),
  };
  no.respostas.push(resposta);
  return paraClientePost(post, usuario);
}

// Só o dono edita texto/visibilidade; excluir aceita dono OU admin (mesmo
// contrato de excluirComentario em aulas.comentarios.ts). Vale pra qualquer
// nó da thread, não só a raiz.
export function editarPost(id: string, usuario: { id: string; admin: boolean }, texto: string) {
  const post = encontrarPostDoNo(id);
  if (!post) return "nao_encontrado" as const;
  const no = encontrarNo(post, id)!;
  if (no.userId !== usuario.id) return "sem_permissao" as const;
  no.texto = texto.slice(0, 140);
  return paraClientePost(post, usuario);
}

// Resposta não tem visibilidade própria: ela sempre segue a do post raiz
// (client nem mostra o seletor pra nivel > 0 — ver ComentarioBloco.tsx), então
// aqui recusa mudar visibilidade de qualquer nó que não seja a raiz da thread.
export function alterarVisibilidade(id: string, usuario: { id: string; admin: boolean }, visibilidade: Visibilidade) {
  const post = encontrarPostDoNo(id);
  if (!post) return "nao_encontrado" as const;
  if (post.id !== id) return "sem_permissao" as const;
  if (post.userId !== usuario.id) return "sem_permissao" as const;
  post.visibilidade = visibilidade;
  return paraClientePost(post, usuario);
}

// Apagar a raiz derruba a thread inteira (raiz: null); apagar uma resposta
// aninhada só remove ela (e suas próprias respostas) da árvore, devolvendo o
// restante já atualizado — ver contrato em meditacaoApi.ts::excluirPost.
export function excluirPost(id: string, usuario: { id: string; admin: boolean }) {
  const post = encontrarPostDoNo(id);
  if (!post) return "nao_encontrado" as const;
  const no = encontrarNo(post, id)!;
  if (no.userId !== usuario.id && !usuario.admin) return "sem_permissao" as const;

  if (post.id === id) {
    const idx = FEED.findIndex((p) => p.id === id);
    FEED.splice(idx, 1);
    return { raizId: post.id, raiz: null } as const;
  }

  const pai = encontrarPai(post, id)!;
  pai.respostas = pai.respostas.filter((r) => r.id !== id);
  return { raizId: post.id, raiz: paraClientePost(post, usuario) } as const;
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
