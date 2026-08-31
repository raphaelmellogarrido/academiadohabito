// Comentários da página de Aulas — diferente do feed de comunidade do
// dashboard (community.store.ts), mas segue o mesmo formato de reações
// (🙏❤️🔥), o mesmo union de visibilidade e o mesmo modelo de thread
// recursiva (comentário raiz e respostas em qualquer profundidade
// compartilham o shape `NoComentario`) pra manter a UI consistente entre os
// dois. Comentário de admin (usuario.admin no momento da criação) recebe
// destaque visual no client, em qualquer nível.
export type Reacao = "🙏" | "❤️" | "🔥";
export type Visibilidade = "publico" | "privado" | "orientador";

export interface NoComentario {
  id: string;
  userId: string;
  nome: string;
  admin: boolean;
  texto: string;
  foto: string | null;
  visibilidade: Visibilidade;
  reacoes: Record<Reacao, number>;
  minhasReacoes: Record<string, Reacao[]>; // userId -> reações que já deu neste nó
  respostas: NoComentario[];
  criadoEm: string;
}

export interface AulaComentario extends NoComentario {
  diaAtual: number;
}

const LIMITE_TEXTO = 140;
const PAGINA = 15;

let seq = 1;
const proximoId = () => String(seq++);

const COMENTARIOS: AulaComentario[] = [
  {
    id: proximoId(),
    userId: "demo",
    nome: "Raphael Silva",
    admin: false,
    diaAtual: 3,
    texto: "Essa aula sobre respiração mudou minha semana 🙏",
    foto: null,
    visibilidade: "publico",
    reacoes: { "🙏": 2, "❤️": 0, "🔥": 0 },
    minhasReacoes: {},
    respostas: [],
    criadoEm: new Date().toISOString(),
  },
  {
    id: proximoId(),
    userId: "admin-seed",
    nome: "Dr. Renato",
    admin: true,
    diaAtual: 3,
    texto: "Bem-vindos à aula de hoje! Lembrem-se: não existe meditação perfeita, existe meditação praticada. 🪷",
    foto: null,
    visibilidade: "publico",
    reacoes: { "🙏": 24, "❤️": 7, "🔥": 7 },
    minhasReacoes: {},
    respostas: [],
    criadoEm: new Date().toISOString(),
  },
];

// Editar texto/visibilidade é só do dono; excluir também aceita admin (mesmo
// contrato de excluirPost em community.store.ts). Aplica recursivamente em
// cada resposta, não só na raiz.
function paraClienteNo<T extends NoComentario>(no: T, usuarioAtual: { id: string; admin: boolean }): T {
  return {
    ...no,
    respostas: no.respostas.map((r) => paraClienteNo(r, usuarioAtual)),
    podeEditar: no.userId === usuarioAtual.id,
    podeExcluir: no.userId === usuarioAtual.id || usuarioAtual.admin,
  } as T;
}

function paraCliente(c: AulaComentario, usuarioAtual: { id: string; admin: boolean }) {
  return paraClienteNo(c, usuarioAtual);
}

// Acha um nó (raiz ou resposta em qualquer profundidade) por id dentro de um
// comentário raiz — usado por reagir/editar/visibilidade/responder/excluir,
// que agora podem mirar qualquer nó da árvore (mesmo padrão de
// community.store.ts).
function encontrarNo(raiz: AulaComentario, id: string): NoComentario | null {
  if (raiz.id === id) return raiz;
  function buscar(lista: NoComentario[]): NoComentario | null {
    for (const no of lista) {
      if (no.id === id) return no;
      const achado = buscar(no.respostas);
      if (achado) return achado;
    }
    return null;
  }
  return buscar(raiz.respostas);
}

// Acha o pai direto de um nó (por id) — usado só por excluirComentario pra
// saber de qual array `respostas` fazer o splice quando o nó não é a raiz.
function encontrarPai(raiz: AulaComentario, id: string): NoComentario | AulaComentario | null {
  function buscar(pai: NoComentario | AulaComentario): NoComentario | AulaComentario | null {
    for (const filho of pai.respostas) {
      if (filho.id === id) return pai;
      const achado = buscar(filho);
      if (achado) return achado;
    }
    return null;
  }
  return buscar(raiz);
}

// Acha o comentário raiz (no array top-level COMENTARIOS) que contém o nó
// `id`, seja ele a própria raiz ou uma resposta em qualquer profundidade.
function encontrarRaizDoNo(id: string): AulaComentario | null {
  return COMENTARIOS.find((c) => encontrarNo(c, id) !== null) ?? null;
}

// Scroll infinito: mais recentes primeiro, paginado por cursor (id do último
// item já recebido pelo client).
export function listarComentarios(cursor: string | null, usuarioAtual: { id: string; admin: boolean }) {
  const ordenados = [...COMENTARIOS].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm) || Number(b.id) - Number(a.id));
  const inicio = cursor ? ordenados.findIndex((c) => c.id === cursor) + 1 : 0;
  const pagina = ordenados.slice(inicio, inicio + PAGINA);
  const proximoCursor = inicio + PAGINA < ordenados.length ? pagina[pagina.length - 1]?.id ?? null : null;
  return { comentarios: pagina.map((c) => paraCliente(c, usuarioAtual)), proximoCursor };
}

export function criarComentario(
  usuario: { id: string; nome: string; admin: boolean },
  diaAtual: number,
  texto: string,
  foto: string | null = null,
  visibilidade: Visibilidade = "publico",
) {
  const comentario: AulaComentario = {
    id: proximoId(),
    userId: usuario.id,
    nome: usuario.nome,
    admin: usuario.admin,
    diaAtual,
    texto: texto.slice(0, LIMITE_TEXTO),
    foto,
    visibilidade,
    reacoes: { "🙏": 0, "❤️": 0, "🔥": 0 },
    minhasReacoes: {},
    respostas: [],
    criadoEm: new Date().toISOString(),
  };
  COMENTARIOS.push(comentario);
  return paraCliente(comentario, usuario);
}

export function reagirComentario(id: string, usuarioAtual: { id: string; admin: boolean }, reacao: Reacao) {
  const raiz = encontrarRaizDoNo(id);
  if (!raiz) return null;
  const no = encontrarNo(raiz, id)!;
  const userId = usuarioAtual.id;
  const minhas = no.minhasReacoes[userId] ?? [];
  if (minhas.includes(reacao)) {
    no.reacoes[reacao] = Math.max(0, no.reacoes[reacao] - 1);
    no.minhasReacoes[userId] = minhas.filter((r) => r !== reacao);
  } else {
    no.reacoes[reacao] += 1;
    no.minhasReacoes[userId] = [...minhas, reacao];
  }
  return paraCliente(raiz, usuarioAtual);
}

// `id` é o nó (comentário raiz ou resposta em qualquer profundidade) que
// está sendo respondido — a nova resposta entra em `no.respostas`, recursivo
// sem limite de nível (mesmo contrato de responder/community.store.ts).
export function responderComentario(id: string, usuario: { id: string; nome: string; admin: boolean }, texto: string) {
  const raiz = encontrarRaizDoNo(id);
  if (!raiz) return null;
  const no = encontrarNo(raiz, id)!;
  const resposta: NoComentario = {
    id: proximoId(),
    userId: usuario.id,
    nome: usuario.nome,
    admin: usuario.admin,
    texto: texto.slice(0, LIMITE_TEXTO),
    foto: null,
    visibilidade: "publico",
    reacoes: { "🙏": 0, "❤️": 0, "🔥": 0 },
    minhasReacoes: {},
    respostas: [],
    criadoEm: new Date().toISOString(),
  };
  no.respostas.push(resposta);
  return paraCliente(raiz, usuario);
}

export function editarComentario(id: string, usuario: { id: string; admin: boolean }, texto: string) {
  const raiz = encontrarRaizDoNo(id);
  if (!raiz) return "nao_encontrado" as const;
  const no = encontrarNo(raiz, id)!;
  if (no.userId !== usuario.id) return "sem_permissao" as const;
  no.texto = texto.slice(0, LIMITE_TEXTO);
  return paraCliente(raiz, usuario);
}

// Resposta não tem visibilidade própria: ela sempre segue a do comentário raiz
// (client nem mostra o seletor pra nivel > 0 — ver ComentarioBloco.tsx), então
// aqui recusa mudar visibilidade de qualquer nó que não seja a raiz da thread.
export function alterarVisibilidadeComentario(id: string, usuario: { id: string; admin: boolean }, visibilidade: Visibilidade) {
  const raiz = encontrarRaizDoNo(id);
  if (!raiz) return "nao_encontrado" as const;
  if (raiz.id !== id) return "sem_permissao" as const;
  if (raiz.userId !== usuario.id) return "sem_permissao" as const;
  raiz.visibilidade = visibilidade;
  return paraCliente(raiz, usuario);
}

// Apagar a raiz derruba a thread inteira (raiz: null); apagar uma resposta
// aninhada só remove ela (e suas próprias respostas) da árvore, devolvendo o
// restante já atualizado — ver contrato em meditacaoApi.ts::aulasExcluirComentario.
export function excluirComentario(id: string, usuario: { id: string; admin: boolean }) {
  const raiz = encontrarRaizDoNo(id);
  if (!raiz) return "nao_encontrado" as const;
  const no = encontrarNo(raiz, id)!;
  if (no.userId !== usuario.id && !usuario.admin) return "sem_permissao" as const;

  if (raiz.id === id) {
    const idx = COMENTARIOS.findIndex((c) => c.id === id);
    COMENTARIOS.splice(idx, 1);
    return { raizId: raiz.id, raiz: null } as const;
  }

  const pai = encontrarPai(raiz, id)!;
  pai.respostas = pai.respostas.filter((r) => r.id !== id);
  return { raizId: raiz.id, raiz: paraCliente(raiz, usuario) } as const;
}

export { LIMITE_TEXTO };
