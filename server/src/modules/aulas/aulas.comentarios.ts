// Comentários da página de Aulas — diferente do feed de comunidade do
// dashboard (community.store.ts), mas segue o mesmo formato de reações
// (🙏❤️🔥) e o mesmo union de visibilidade pra manter a UI consistente entre
// os dois. Comentário de admin (usuario.admin no momento da criação) recebe
// destaque visual no client.
export type Reacao = "🙏" | "❤️" | "🔥";
export type Visibilidade = "publico" | "privado" | "orientador";

export interface AulaComentario {
  id: string;
  userId: string;
  nome: string;
  admin: boolean;
  diaAtual: number;
  texto: string;
  foto: string | null;
  visibilidade: Visibilidade;
  reacoes: Record<Reacao, number>;
  minhasReacoes: Record<string, Reacao[]>; // userId -> reações que já deu neste comentário
  criadoEm: string;
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
    criadoEm: new Date().toISOString(),
  },
];

// Editar texto/visibilidade é só do dono; excluir também aceita admin (mesmo
// contrato de excluirPost em community.store.ts).
function paraCliente(c: AulaComentario, usuarioAtual: { id: string; admin: boolean }) {
  return {
    ...c,
    podeEditar: c.userId === usuarioAtual.id,
    podeExcluir: c.userId === usuarioAtual.id || usuarioAtual.admin,
  };
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
    criadoEm: new Date().toISOString(),
  };
  COMENTARIOS.push(comentario);
  return paraCliente(comentario, usuario);
}

export function reagirComentario(id: string, usuarioAtual: { id: string; admin: boolean }, reacao: Reacao) {
  const comentario = COMENTARIOS.find((c) => c.id === id);
  if (!comentario) return null;
  const userId = usuarioAtual.id;
  const minhas = comentario.minhasReacoes[userId] ?? [];
  if (minhas.includes(reacao)) {
    comentario.reacoes[reacao] = Math.max(0, comentario.reacoes[reacao] - 1);
    comentario.minhasReacoes[userId] = minhas.filter((r) => r !== reacao);
  } else {
    comentario.reacoes[reacao] += 1;
    comentario.minhasReacoes[userId] = [...minhas, reacao];
  }
  return paraCliente(comentario, usuarioAtual);
}

export function editarComentario(id: string, usuario: { id: string; admin: boolean }, texto: string) {
  const comentario = COMENTARIOS.find((c) => c.id === id);
  if (!comentario) return "nao_encontrado" as const;
  if (comentario.userId !== usuario.id) return "sem_permissao" as const;
  comentario.texto = texto.slice(0, LIMITE_TEXTO);
  return paraCliente(comentario, usuario);
}

export function alterarVisibilidadeComentario(id: string, usuario: { id: string; admin: boolean }, visibilidade: Visibilidade) {
  const comentario = COMENTARIOS.find((c) => c.id === id);
  if (!comentario) return "nao_encontrado" as const;
  if (comentario.userId !== usuario.id) return "sem_permissao" as const;
  comentario.visibilidade = visibilidade;
  return paraCliente(comentario, usuario);
}

export function excluirComentario(id: string, usuario: { id: string; admin: boolean }) {
  const idx = COMENTARIOS.findIndex((c) => c.id === id);
  if (idx === -1) return "nao_encontrado" as const;
  const comentario = COMENTARIOS[idx];
  if (comentario.userId !== usuario.id && !usuario.admin) return "sem_permissao" as const;
  COMENTARIOS.splice(idx, 1);
  return "ok" as const;
}

export { LIMITE_TEXTO };
