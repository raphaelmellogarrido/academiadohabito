import { hojeBrasilISO } from "../gamification/gamification.store.js";
import { montarCatalogo, type DiaAulas } from "./aulas.catalogo.js";
import {
  podeAssistir,
  calcularMaxDiaCompleto,
  calcularUltimoDiaCompletadoData,
  type ProgressoArquivo,
} from "./aulas.progressoDias.js";

// Progresso da trilha de vídeo-aulas — por VÍDEO (não mais por dia em blocos
// de 3): cada dia libera inteiro (todos os vídeos daquele dia) de uma vez,
// controlado por progressoDias.ts::podeAssistir (calendário BRT + pausa
// obrigatória 3-faz/4-pausa). Catálogo real vem do filesystem (ver
// aulas.catalogo.ts) — carregado uma vez e cacheado em memória (a pasta de
// vídeos não muda em runtime).
let catalogoCache: DiaAulas[] | null = null;
export function getCatalogo(): DiaAulas[] {
  if (!catalogoCache) catalogoCache = montarCatalogo();
  return catalogoCache;
}

const PROGRESSO = new Map<string, Map<string, ProgressoArquivo>>(); // userId -> arquivo -> progresso

function getOrInit(userId: string): Map<string, ProgressoArquivo> {
  let p = PROGRESSO.get(userId);
  if (!p) {
    p = new Map();
    PROGRESSO.set(userId, p);
  }
  return p;
}

function totalVideos(dias: DiaAulas[]): number {
  return dias.reduce((soma, d) => soma + d.videos.length, 0);
}

// Acha o dia (objeto do catálogo) e o índice de POSIÇÃO do vídeo dentro dele
// a partir do nome do arquivo — usado tanto pra validar a conclusão quanto
// pra resolver dia/aulaIndex quando um comentário é criado.
function localizarVideo(dias: DiaAulas[], arquivo: string): { diaObj: DiaAulas | null; videoIndex: number } {
  for (const d of dias) {
    const idx = d.videos.findIndex((v) => v.arquivo === arquivo);
    if (idx !== -1) return { diaObj: d, videoIndex: idx };
  }
  return { diaObj: null, videoIndex: -1 };
}

// Usado por aulas.routes.ts pra montar o comentário com dia + aulaIndex
// (1-based, na ordem exibida) a partir do arquivo ativo no client.
export function localizarDiaEAulaIndex(arquivo: string): { dia: number; aulaIndex: number } | null {
  const { diaObj, videoIndex } = localizarVideo(getCatalogo(), arquivo);
  if (!diaObj) return null;
  return { dia: diaObj.dia, aulaIndex: videoIndex + 1 };
}

export interface AulaProgresso {
  totalDias: number;
  totalVideos: number;
  totalConcluidos: number;
  diaMaximoLiberado: number; // maior dia que dá pra assistir agora (calendário + ordem)
  diasConcluidos: number[]; // dias 100% assistidos
  jornadaCompleta: boolean;
  percentual: number;
  progressoPorArquivo: Record<string, ProgressoArquivo>;
  // Data de HOJE (YYYY-MM-DD, fuso Brasília) segundo o SERVIDOR — o client
  // usa essa data (não o relógio do navegador) pra calcular podeAssistir
  // localmente, evitando que alguém adiante o relógio do sistema pra
  // "liberar" o próximo dia na UI (o servidor sempre revalida de qualquer
  // forma antes de aceitar marcarConcluida, mas isso evita a UI mentir).
  hoje: string;
}

export function getProgresso(userId: string): AulaProgresso {
  const dias = getCatalogo();
  const mapa = getOrInit(userId);
  const progressoPorArquivo = Object.fromEntries(mapa);
  const maxDiaCompleto = calcularMaxDiaCompleto(dias, progressoPorArquivo);
  const totalConcluidosVal = [...mapa.values()].filter((v) => v.assistida).length;

  const ultimoDia = dias.length ? dias[dias.length - 1].dia : 0;
  const jornadaCompleta = dias.length > 0 && maxDiaCompleto >= ultimoDia;
  const diaMaximoLiberado = jornadaCompleta ? ultimoDia : Math.min(Math.max(maxDiaCompleto + 1, 0), ultimoDia);
  const diasConcluidos = maxDiaCompleto >= 0 ? dias.filter((d) => d.dia <= maxDiaCompleto).map((d) => d.dia) : [];
  const total = totalVideos(dias);

  return {
    totalDias: dias.length,
    totalVideos: total,
    totalConcluidos: totalConcluidosVal,
    diaMaximoLiberado,
    diasConcluidos,
    jornadaCompleta,
    percentual: total > 0 ? Math.round((totalConcluidosVal / total) * 100) : 0,
    progressoPorArquivo,
    hoje: hojeBrasilISO(),
  };
}

// Servidor revalida o bloqueio antes de aceitar a conclusão (mesmo espírito
// de concluirDia no modelo antigo) — evita que uma chamada direta à API
// (sem passar pela UI, que já desabilita o botão) marque um vídeo ainda
// bloqueado. Retorna null quando o vídeo não existe no catálogo ou está
// bloqueado agora.
export function marcarConcluida(userId: string, arquivo: string): AulaProgresso | null {
  const dias = getCatalogo();
  const { diaObj, videoIndex } = localizarVideo(dias, arquivo);
  if (!diaObj) return null;

  const mapa = getOrInit(userId);
  const progressoPorArquivo = Object.fromEntries(mapa);
  const maxDiaCompleto = calcularMaxDiaCompleto(dias, progressoPorArquivo);
  const ultimoDiaCompletadoData = calcularUltimoDiaCompletadoData(dias, progressoPorArquivo, maxDiaCompleto);
  const bloqueio = podeAssistir(diaObj.dia, videoIndex, {
    dias,
    progressoPorArquivo,
    maxDiaCompleto,
    ultimoDiaCompletadoData,
    hojeServidor: hojeBrasilISO(),
  });
  if (!bloqueio.liberado) return null;

  mapa.set(arquivo, { assistida: true, progresso: 100, completadoEm: new Date().toISOString() });
  return getProgresso(userId);
}

// Desmarcar não precisa de gate (mesma regra do projeto antigo: sempre pode
// desfazer uma marca já feita).
export function desmarcarConcluida(userId: string, arquivo: string): AulaProgresso {
  getOrInit(userId).delete(arquivo);
  return getProgresso(userId);
}
