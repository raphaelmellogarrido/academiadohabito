import { api } from "../../../shared/lib/apiClient";

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

export interface Encontro {
  id: string;
  titulo: string;
  dataISO: string;
  duracaoMin: number;
  anfitriao: string;
  fotoAnfitriao: string | null;
  aoVivo: boolean;
  linkLive: string | null;
  reservado: boolean;
  totalReservas: number;
}

export interface Desafio {
  id: string;
  texto: string;
  concluido: boolean;
}

export interface Post {
  id: string;
  userId: string;
  nome: string;
  avatarUrl: string | null;
  texto: string;
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
  diaAtual: number;
  texto: string;
  criadoEm: string;
}

export const meditacaoApi = {
  sequencia: () => api.get<{ ok: true } & Sequencia>("/meditacao/sequencia"),
  jornada: () => api.get<{ ok: true } & Jornada>("/meditacao/jornada"),
  meditandoJunto: () => api.get<{ ok: true } & Pulso>("/meditacao/meditando-junto"),
  mediteiHoje: () =>
    api.post<{ ok: true; jaMarcado: boolean; sequencia: Sequencia; jornada: Jornada }>("/meditacao/meditei-hoje"),

  proximoEncontro: () => api.get<{ ok: true; encontro: Encontro }>("/meditacao/lives/proxima"),
  reservar: () => api.post<{ ok: true; encontro: Encontro }>("/meditacao/lives/proxima/reservar"),

  desafios: () => api.get<{ ok: true; desafios: Desafio[] }>("/meditacao/desafios"),
  alternarDesafio: (id: string) => api.post<{ ok: true; desafios: Desafio[] }>(`/meditacao/desafios/${id}/alternar`),

  frase: () => api.get<{ ok: true; frase: string; autor: string }>("/meditacao/frase"),

  feed: () => api.get<{ ok: true; posts: Post[] }>("/meditacao/feed"),
  postar: (texto: string, foto: string | null, publico: boolean) =>
    api.post<{ ok: true; post: Post }>("/meditacao/feed", { texto, foto, publico }),
  reagir: (postId: string, reacao: "🙏" | "❤️" | "🔥") =>
    api.post<{ ok: true; post: Post }>(`/meditacao/feed/${postId}/reagir`, { reacao }),
  responder: (postId: string, texto: string) =>
    api.post<{ ok: true; post: Post }>(`/meditacao/feed/${postId}/responder`, { texto }),

  aulasProgresso: () => api.get<{ ok: true } & AulaProgresso>("/meditacao/aulas/progresso"),
  aulasConcluirDia: (dia: number) => api.post<{ ok: true } & AulaProgresso>("/meditacao/aulas/concluir", { dia }),
  aulasComentarios: (cursor: string | null) =>
    api.get<{ ok: true; comentarios: AulaComentario[]; proximoCursor: string | null }>(
      `/meditacao/aulas/comentarios${cursor ? `?cursor=${cursor}` : ""}`,
    ),
  aulasComentar: (texto: string) =>
    api.post<{ ok: true; comentario: AulaComentario }>("/meditacao/aulas/comentarios", { texto }),
};
