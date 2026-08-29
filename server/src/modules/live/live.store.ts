// Próximo encontro ao vivo — 1 registro global por hábito (mock: só
// meditação tem encontro hoje). `aoVivo`/`linkLive` são liberados pelo
// /admin quando a live realmente começa (troca o BTN "Aguardando" por
// "Entrar na live" pra todo mundo que reservou).
interface ProximoEncontro {
  id: string;
  titulo: string;
  dataISO: string; // data+hora de início, ISO com offset BRT
  duracaoMin: number;
  anfitriao: string;
  fotoAnfitriao: string | null;
  aoVivo: boolean;
  linkLive: string | null;
  reservas: Set<string>;
}

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
    reservas: new Set(),
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
    reservado: e.reservas.has(userId),
    totalReservas: e.reservas.size,
  };
}

export function getProximoEncontro(habitId: string, userId: string) {
  const e = ENCONTROS[habitId];
  if (!e) return null;
  return formatarEncontro(e, userId);
}

export function alternarReserva(habitId: string, userId: string) {
  const e = ENCONTROS[habitId];
  if (!e) return null;
  if (e.reservas.has(userId)) e.reservas.delete(userId);
  else e.reservas.add(userId);
  return formatarEncontro(e, userId);
}

export function liberarLive(habitId: string, link: string) {
  const e = ENCONTROS[habitId];
  if (!e) return null;
  e.aoVivo = true;
  e.linkLive = link;
  return e;
}

export function encerrarLive(habitId: string) {
  const e = ENCONTROS[habitId];
  if (!e) return null;
  e.aoVivo = false;
  e.linkLive = null;
  return e;
}
