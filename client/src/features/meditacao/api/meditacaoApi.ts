import { api } from "../../../shared/lib/apiClient";
import { ehProducaoReal } from "../../../shared/lib/ambiente";

// "Meditando junto" e "Sequência" já estão ligados no banco real
// (u790959747_comunidade na Hostinger) — só em produção, via api/*.php (PHP,
// ver pasta na raiz do projeto). academiadohabito.com.br hoje é hospedagem
// PHP/HTML "clássica" (sem Node App), então o server/src (Express/TS) não
// roda lá; em dev continua tudo mock por server/src/modules/gamification,
// como o resto do app. Remover ehProducaoReal quando o Node passar a rodar
// em produção também (ver docs/ARCHITECTURE.md).

export interface Bolinha {
  iso: string;
  label: string;
  concluido: boolean;
  hoje: boolean;
}

export interface Sequencia {
  streak: number;
  bolinhas: Bolinha[];
}

export interface Jornada {
  totalAssistidos: number;
  totalAulas: number;
  percentual: number;
  jornadaCompleta: boolean;
  mensagem: string;
}

export interface Pulso {
  hojeCheckins: number;
  partilhasHoje: number;
  totalPresenca: number;
}

export interface ReservaAvatar {
  nome: string;
  avatarUrl: string | null;
}

export interface Encontro {
  id: string;
  titulo: string;
  dataISO: string;
  duracaoMin: number;
  anfitriao: string;
  fotoAnfitriao: string | null;
  aoVivo: boolean;
  linkLive: string | null;
  checklist: string[];
  reservado: boolean;
  totalReservas: number;
  reservasAvatares: ReservaAvatar[];
}

export interface Desafio {
  id: string;
  texto: string;
  concluido: boolean;
}

// Campos editáveis do encontro no /admin — mesmos campos de `Encontro`
// menos os calculados por aluno (reservado/totalReservas/reservasAvatares,
// que o servidor recalcula sozinho e devolve na resposta).
export interface EncontroEdicao {
  titulo: string;
  dataISO: string;
  duracaoMin: number;
  anfitriao: string;
  aoVivo: boolean;
  linkLive: string | null;
  checklist: string[];
}

export type Humor = "calma" | "agitada" | "cansada" | "foco";

// publico = todo mundo vê; privado = só quem postou; orientador = só quem
// postou + admins (ver EMAILS_ORIENTADORES em community.store.ts/_feed.php).
export type Visibilidade = "publico" | "privado" | "orientador";

// Um nó de comentário/resposta — post raiz e respostas (em qualquer profundidade)
// compartilham exatamente esse shape, já que agora é possível responder tanto ao
// post quanto a uma resposta (thread recursiva, sem limite de nível).
export interface NoComentario {
  id: string;
  userId: string;
  nome: string;
  avatarUrl: string | null;
  admin: boolean;
  texto: string;
  foto: string | null;
  visibilidade: Visibilidade;
  reacoes: Record<"🙏" | "❤️" | "🔥", number>;
  minhasReacoes: Record<string, string[]>;
  respostas: NoComentario[];
  podeEditar: boolean;
  podeExcluir: boolean;
  criadoEm: string;
}

export interface Post extends NoComentario {
  humor: Humor | null;
}

export interface AulaProgresso {
  totalDias: number;
  diaAtual: number;
  diaMaximoLiberado: number;
  diasConcluidos: number[];
  bloqueado: boolean;
  status: "concluido" | "praticar" | "pausa";
  mensagem: string;
  percentual: number;
}

export interface AulaComentario extends NoComentario {
  diaAtual: number;
}

export const meditacaoApi = {
  sequencia: () =>
    ehProducaoReal
      ? api.get<{ ok: true } & Sequencia>("/sequencia.php")
      : api.get<{ ok: true } & Sequencia>("/meditacao/sequencia"),
  jornada: () =>
    ehProducaoReal
      ? api.get<{ ok: true } & Jornada>("/jornada.php")
      : api.get<{ ok: true } & Jornada>("/meditacao/jornada"),
  meditandoJunto: () =>
    ehProducaoReal
      ? api.get<{ ok: true } & Pulso>("/pulso.php")
      : api.get<{ ok: true } & Pulso>("/meditacao/meditando-junto"),
  mediteiHoje: () =>
    ehProducaoReal
      ? api.post<{ ok: true; jaMarcado: boolean; sequencia: Sequencia; jornada: Jornada }>("/meditei-hoje.php")
      : api.post<{ ok: true; jaMarcado: boolean; sequencia: Sequencia; jornada: Jornada }>("/meditacao/meditei-hoje"),

  proximoEncontro: () =>
    ehProducaoReal
      ? api.get<{ ok: true; encontro: Encontro }>("/encontro.php")
      : api.get<{ ok: true; encontro: Encontro }>("/meditacao/lives/proxima"),
  reservar: () =>
    ehProducaoReal
      ? api.post<{ ok: true; encontro: Encontro }>("/encontro-reservar.php")
      : api.post<{ ok: true; encontro: Encontro }>("/meditacao/lives/proxima/reservar"),
  // Admin only (ver AdminPage.tsx) — servidor exige e-mail em
  // EMAILS_ORIENTADORES (PHP)/usuario.admin (mock), 403 caso contrário.
  editarEncontro: (patch: EncontroEdicao) =>
    ehProducaoReal
      ? api.put<{ ok: true; encontro: Encontro }>("/encontro-editar.php", patch)
      : api.put<{ ok: true; encontro: Encontro }>("/meditacao/lives/proxima", patch),

  desafios: () =>
    ehProducaoReal
      ? api.get<{ ok: true; desafios: Desafio[] }>("/desafios.php")
      : api.get<{ ok: true; desafios: Desafio[] }>("/meditacao/desafios"),
  alternarDesafio: (id: string) =>
    ehProducaoReal
      ? api.post<{ ok: true; desafios: Desafio[] }>("/desafios-alternar.php", { id })
      : api.post<{ ok: true; desafios: Desafio[] }>(`/meditacao/desafios/${id}/alternar`),

  frase: () =>
    ehProducaoReal
      ? api
          .get<{ ok: true; frase: string; subfrase: string }>("/frase.php")
          .then(({ ok, frase, subfrase }) => ({ ok, frase, autor: subfrase }))
      : api.get<{ ok: true; frase: string; autor: string }>("/meditacao/frase"),
  // Admin only (ver AdminPage.tsx) — mesma checagem de editarEncontro acima.
  editarFrase: (frase: string, autor: string) =>
    ehProducaoReal
      ? api
          .put<{ ok: true; frase: string; subfrase: string }>("/frase-editar.php", { frase, subfrase: autor })
          .then(({ ok, frase, subfrase }) => ({ ok, frase, autor: subfrase }))
      : api.put<{ ok: true; frase: string; autor: string }>("/meditacao/frase", { frase, autor }),

  feed: () =>
    ehProducaoReal
      ? api.get<{ ok: true; posts: Post[] }>("/feed.php")
      : api.get<{ ok: true; posts: Post[] }>("/meditacao/feed"),
  postar: (texto: string, foto: string | null, visibilidade: Visibilidade, humor: Humor | null = null) =>
    ehProducaoReal
      ? api.post<{ ok: true; post: Post }>("/feed.php", { texto, foto, visibilidade, humor })
      : api.post<{ ok: true; post: Post }>("/meditacao/feed", { texto, foto, visibilidade, humor }),
  reagir: (postId: string, reacao: "🙏" | "❤️" | "🔥") =>
    ehProducaoReal
      ? api.post<{ ok: true; post: Post }>("/feed-reagir.php", { id: postId, reacao })
      : api.post<{ ok: true; post: Post }>(`/meditacao/feed/${postId}/reagir`, { reacao }),
  // `id` pode ser o post raiz ou qualquer resposta dele em qualquer profundidade —
  // o servidor resolve a raiz internamente e devolve a árvore inteira atualizada.
  responder: (id: string, texto: string) =>
    ehProducaoReal
      ? api.post<{ ok: true; post: Post }>("/feed-responder.php", { id, texto })
      : api.post<{ ok: true; post: Post }>(`/meditacao/feed/${id}/responder`, { texto }),
  editarPost: (id: string, texto: string) =>
    ehProducaoReal
      ? api.put<{ ok: true; post: Post }>("/feed-editar.php", { id, texto })
      : api.put<{ ok: true; post: Post }>(`/meditacao/feed/${id}`, { texto }),
  alterarVisibilidadePost: (id: string, visibilidade: Visibilidade) =>
    ehProducaoReal
      ? api.put<{ ok: true; post: Post }>("/feed-visibilidade.php", { id, visibilidade })
      : api.put<{ ok: true; post: Post }>(`/meditacao/feed/${id}/visibilidade`, { visibilidade }),
  // Apagar a raiz derruba a thread inteira (raiz: null, client remove da lista);
  // apagar uma resposta aninhada devolve a árvore restante (client substitui pelo raizId).
  excluirPost: (id: string) =>
    ehProducaoReal
      ? api.delete<{ ok: true; raizId: string; raiz: Post | null }>(`/feed-excluir.php?id=${id}`)
      : api.delete<{ ok: true; raizId: string; raiz: Post | null }>(`/meditacao/feed/${id}`),

  aulasProgresso: () =>
    ehProducaoReal
      ? api.get<{ ok: true } & AulaProgresso>("/aulas-progresso.php")
      : api.get<{ ok: true } & AulaProgresso>("/meditacao/aulas/progresso"),
  aulasConcluirDia: (dia: number) =>
    ehProducaoReal
      ? api.post<{ ok: true } & AulaProgresso>("/aulas-concluir.php", { dia })
      : api.post<{ ok: true } & AulaProgresso>("/meditacao/aulas/concluir", { dia }),
  aulasComentarios: (cursor: string | null) =>
    ehProducaoReal
      ? api.get<{ ok: true; comentarios: AulaComentario[]; proximoCursor: string | null }>(
          `/aulas-comentarios.php${cursor ? `?cursor=${cursor}` : ""}`,
        )
      : api.get<{ ok: true; comentarios: AulaComentario[]; proximoCursor: string | null }>(
          `/meditacao/aulas/comentarios${cursor ? `?cursor=${cursor}` : ""}`,
        ),
  aulasComentar: (texto: string, foto: string | null = null, visibilidade: Visibilidade = "publico") =>
    ehProducaoReal
      ? api.post<{ ok: true; comentario: AulaComentario }>("/aulas-comentarios.php", {
          texto,
          foto,
          publico: visibilidade === "publico",
        })
      : api.post<{ ok: true; comentario: AulaComentario }>("/meditacao/aulas/comentarios", { texto, foto, visibilidade }),
  aulasReagir: (id: string, reacao: "🙏" | "❤️" | "🔥") =>
    ehProducaoReal
      ? api.post<{ ok: true; comentario: AulaComentario }>("/aulas-comentario-reagir.php", { id, reacao })
      : api.post<{ ok: true; comentario: AulaComentario }>(`/meditacao/aulas/comentarios/${id}/reagir`, { reacao }),
  // `id` pode ser o comentário raiz ou qualquer resposta dele — mesmo contrato de responder/excluirPost acima.
  aulasResponder: (id: string, texto: string) =>
    ehProducaoReal
      ? api.post<{ ok: true; comentario: AulaComentario }>("/aulas-comentario-responder.php", { id, texto })
      : api.post<{ ok: true; comentario: AulaComentario }>(`/meditacao/aulas/comentarios/${id}/responder`, { texto }),
  aulasExcluirComentario: (id: string) =>
    ehProducaoReal
      ? api.delete<{ ok: true; raizId: string; raiz: AulaComentario | null }>(`/aulas-comentario-excluir.php?id=${id}`)
      : api.delete<{ ok: true; raizId: string; raiz: AulaComentario | null }>(`/meditacao/aulas/comentarios/${id}`),
  aulasEditarComentario: (id: string, texto: string) =>
    ehProducaoReal
      ? api.put<{ ok: true; comentario: AulaComentario }>("/aulas-comentario-editar.php", { id, texto })
      : api.put<{ ok: true; comentario: AulaComentario }>(`/meditacao/aulas/comentarios/${id}`, { texto }),
  aulasAlterarVisibilidadeComentario: (id: string, visibilidade: Visibilidade) =>
    ehProducaoReal
      ? api.put<{ ok: true; comentario: AulaComentario }>("/aulas-comentario-visibilidade.php", { id, visibilidade })
      : api.put<{ ok: true; comentario: AulaComentario }>(`/meditacao/aulas/comentarios/${id}/visibilidade`, { visibilidade }),
};
