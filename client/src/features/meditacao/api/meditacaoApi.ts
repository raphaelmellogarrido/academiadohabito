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

export type Humor = "calma" | "agitada" | "cansada" | "foco";

export interface Post {
  id: string;
  userId: string;
  nome: string;
  avatarUrl: string | null;
  texto: string;
  humor: Humor | null;
  foto: string | null;
  publico: boolean;
  reacoes: Record<"🙏" | "❤️" | "🔥", number>;
  minhasReacoes: Record<string, string[]>;
  respostas: { id: string; userId: string; nome: string; texto: string; criadoEm: string }[];
  criadoEm: string;
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

export interface AulaComentario {
  id: string;
  userId: string;
  nome: string;
  admin: boolean;
  diaAtual: number;
  texto: string;
  foto: string | null;
  publico: boolean;
  reacoes: Record<"🙏" | "❤️" | "🔥", number>;
  minhasReacoes: Record<string, string[]>;
  podeExcluir: boolean;
  criadoEm: string;
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

  feed: () =>
    ehProducaoReal
      ? api.get<{ ok: true; posts: Post[] }>("/feed.php")
      : api.get<{ ok: true; posts: Post[] }>("/meditacao/feed"),
  postar: (texto: string, foto: string | null, publico: boolean, humor: Humor | null = null) =>
    ehProducaoReal
      ? api.post<{ ok: true; post: Post }>("/feed.php", { texto, foto, publico, humor })
      : api.post<{ ok: true; post: Post }>("/meditacao/feed", { texto, foto, publico, humor }),
  reagir: (postId: string, reacao: "🙏" | "❤️" | "🔥") =>
    ehProducaoReal
      ? api.post<{ ok: true; post: Post }>("/feed-reagir.php", { id: postId, reacao })
      : api.post<{ ok: true; post: Post }>(`/meditacao/feed/${postId}/reagir`, { reacao }),
  responder: (postId: string, texto: string) =>
    ehProducaoReal
      ? api.post<{ ok: true; post: Post }>("/feed-responder.php", { id: postId, texto })
      : api.post<{ ok: true; post: Post }>(`/meditacao/feed/${postId}/responder`, { texto }),

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
  aulasComentar: (texto: string, foto: string | null = null, publico: boolean = true) =>
    ehProducaoReal
      ? api.post<{ ok: true; comentario: AulaComentario }>("/aulas-comentarios.php", { texto, foto, publico })
      : api.post<{ ok: true; comentario: AulaComentario }>("/meditacao/aulas/comentarios", { texto, foto, publico }),
  aulasReagir: (id: string, reacao: "🙏" | "❤️" | "🔥") =>
    ehProducaoReal
      ? api.post<{ ok: true; comentario: AulaComentario }>("/aulas-comentario-reagir.php", { id, reacao })
      : api.post<{ ok: true; comentario: AulaComentario }>(`/meditacao/aulas/comentarios/${id}/reagir`, { reacao }),
  aulasExcluirComentario: (id: string) =>
    ehProducaoReal
      ? api.delete<{ ok: true }>(`/aulas-comentario-excluir.php?id=${id}`)
      : api.delete<{ ok: true }>(`/meditacao/aulas/comentarios/${id}`),
};
