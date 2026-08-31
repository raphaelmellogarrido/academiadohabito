// Próximo encontro ao vivo — 1 registro global por hábito (mock: só
// meditação tem encontro hoje). `aoVivo`/`linkLive` são liberados pelo
// /admin quando a live realmente começa (troca o BTN "Aguardando" por
// "Entrar na live" pra todo mundo que reservou).
interface Reserva {
  nome: string;
  avatarUrl: string | null;
}

interface ProximoEncontro {
  id: string;
  titulo: string;
  dataISO: string; // data+hora de início, ISO com offset BRT
  duracaoMin: number;
  anfitriao: string;
  fotoAnfitriao: string | null;
  aoVivo: boolean;
  linkLive: string | null;
  checklist: string[];
  reservas: Map<string, Reserva>; // userId -> quem reservou
}

// Reservas "seed" (participantes de exemplo) pra pílula de avatares não
// nascer vazia — mesmo raciocínio do post/comentário seed em
// community.store.ts / aulas.comentarios.ts.
const ENCONTROS: Record<string, ProximoEncontro> = {
  meditacao: {
    id: "enc-1",
    titulo: "Meditação guiada com Dr. Renato",
    dataISO: "2026-09-06T20:00:00-03:00",
    duracaoMin: 60,
    anfitriao: "Dr. Renato",
    fotoAnfitriao: null,
    aoVivo: false,
    linkLive: null,
    checklist: ["Ambiente silencioso", "Fone de ouvido por perto", "Chegue 5 min antes"],
    reservas: new Map([
      ["seed-1", { nome: "Ana Souza", avatarUrl: null }],
      ["seed-2", { nome: "Bianca Lima", avatarUrl: null }],
    ]),
  },
};

function formatarEncontro(e: ProximoEncontro, userId: string) {
  return {
    id: e.id,
    titulo: e.titulo,
    dataISO: e.dataISO,
    duracaoMin: e.duracaoMin,
    anfitriao: e.anfitriao,
    fotoAnfitriao: e.fotoAnfitriao,
    aoVivo: e.aoVivo,
    linkLive: e.aoVivo ? e.linkLive : null,
    checklist: e.checklist,
    reservado: e.reservas.has(userId),
    totalReservas: e.reservas.size,
    reservasAvatares: [...e.reservas.values()].slice(0, 3),
  };
}

export function getProximoEncontro(habitId: string, userId: string) {
  const e = ENCONTROS[habitId];
  if (!e) return null;
  return formatarEncontro(e, userId);
}

export function alternarReserva(habitId: string, usuario: { id: string; nome: string; avatarUrl: string | null }) {
  const e = ENCONTROS[habitId];
  if (!e) return null;
  if (e.reservas.has(usuario.id)) e.reservas.delete(usuario.id);
  else e.reservas.set(usuario.id, { nome: usuario.nome, avatarUrl: usuario.avatarUrl });
  return formatarEncontro(e, usuario.id);
}

// Edição completa do card, feita no /admin (AdminPage.tsx) — cobre título,
// data, duração, anfitrião, checklist e o toggle "ao vivo" + link (antes
// eram 2 endpoints separados, liberar/encerrar; um editor geral cobre os
// dois casos sem duplicar rota). `checklist` chega como array (já dividido
// por linha no client).
export interface EncontroEdicao {
  titulo: string;
  dataISO: string;
  duracaoMin: number;
  anfitriao: string;
  aoVivo: boolean;
  linkLive: string | null;
  checklist: string[];
}

export function editarEncontro(habitId: string, patch: EncontroEdicao, usuarioId: string) {
  const e = ENCONTROS[habitId];
  if (!e) return null;
  e.titulo = patch.titulo;
  e.dataISO = patch.dataISO;
  e.duracaoMin = patch.duracaoMin;
  e.anfitriao = patch.anfitriao;
  e.aoVivo = patch.aoVivo;
  e.linkLive = patch.aoVivo ? patch.linkLive : null;
  e.checklist = patch.checklist;
  return formatarEncontro(e, usuarioId);
}
