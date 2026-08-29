// Comentários da página de Aulas — só texto/emoji (sem foto), diferente do
// feed de comunidade do dashboard (community.store.ts). Guarda o "diaAtual"
// do usuário no momento do comentário pra exibir "Nome • Dia N" no feed.
export interface AulaComentario {
  id: string;
  userId: string;
  nome: string;
  diaAtual: number;
  texto: string;
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
    diaAtual: 3,
    texto: "Essa aula sobre respiração mudou minha semana 🙏",
    criadoEm: new Date().toISOString(),
  },
];

// Scroll infinito: mais recentes primeiro, paginado por cursor (id do último
// item já recebido pelo client).
export function listarComentarios(cursor: string | null) {
  const ordenados = [...COMENTARIOS].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm) || Number(b.id) - Number(a.id));
  const inicio = cursor ? ordenados.findIndex((c) => c.id === cursor) + 1 : 0;
  const pagina = ordenados.slice(inicio, inicio + PAGINA);
  const proximoCursor = inicio + PAGINA < ordenados.length ? pagina[pagina.length - 1]?.id ?? null : null;
  return { comentarios: pagina, proximoCursor };
}

export function criarComentario(usuario: { id: string; nome: string }, diaAtual: number, texto: string) {
  const comentario: AulaComentario = {
    id: proximoId(),
    userId: usuario.id,
    nome: usuario.nome,
    diaAtual,
    texto: texto.slice(0, LIMITE_TEXTO),
    criadoEm: new Date().toISOString(),
  };
  COMENTARIOS.push(comentario);
  return comentario;
}

export { LIMITE_TEXTO };
