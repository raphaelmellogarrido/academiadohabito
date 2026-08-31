import type { DiaAulas, AulaProgressoArquivo } from "../api/meditacaoApi";

// Cópia client-side EXATA de server/src/modules/aulas/aulas.progressoDias.ts —
// o client precisa calcular o mesmo bloqueio pra desenhar cadeados/toast sem
// esperar round-trip a cada clique, mas o servidor SEMPRE revalida antes de
// aceitar uma conclusão (fonte da verdade real). Qualquer mudança de regra
// aqui tem que ser replicada lá também (e no espelho PHP em api/_aulas.php).

export function isoLocal(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function dataLocalDeIso(iso: string): Date {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

// Pausa obrigatória (pedido do cliente): a cada 3 dias de curso CONCLUÍDOS, o
// aluno espera DIAS_PAUSA_OBRIGATORIA dias corridos antes do próximo dia
// liberar — dias 1,2,3 -> pausa de 4 dias -> 4,5,6 -> pausa -> 7,8,9 -> ...
// `diaAlvo` é "dia de retomada" (exige a pausa inteira, em vez do 1-dia-de-
// calendário do caso geral) quando diaAlvo > 1 e diaAlvo % 3 === 1 (dias 4,
// 7, 10, ...) — dia 1 fica de fora da conta porque é coberto pela exceção
// Dia0->Dia1 (libera no mesmo dia), não por esta regra. Mesmo algoritmo do
// projeto irmão (renato_de_paula/src/pages/comunidade/components/progressoDias.js).
export const DIAS_PAUSA_OBRIGATORIA = 4;

function ehDiaDeRetomadaAposPausa(diaAlvo: number): boolean {
  return diaAlvo > 1 && diaAlvo % 3 === 1;
}

// Diferença em dias corridos entre duas datas ISO locais (YYYY-MM-DD) —
// positiva quando isoRecente é depois de isoAntigo.
function diferencaEmDias(isoRecente: string, isoAntigo: string): number {
  const ms = dataLocalDeIso(isoRecente).getTime() - dataLocalDeIso(isoAntigo).getTime();
  return Math.round(ms / 86400000);
}

// Dias corridos que ainda faltam pra pausa obrigatória terminar e liberar
// `diaAlvo` — só faz sentido quando ehDiaDeRetomadaAposPausa(diaAlvo) é true
// (chamado internamente por podeAssistir). 0 = pausa já cumprida.
function diasRestantesPausa(diaAlvo: number, ultimoDiaCompletadoData: string | null, hojeServidor: string): number {
  if (!ehDiaDeRetomadaAposPausa(diaAlvo) || !ultimoDiaCompletadoData) return 0;
  const passados = diferencaEmDias(hojeServidor, ultimoDiaCompletadoData);
  return Math.max(0, DIAS_PAUSA_OBRIGATORIA - passados);
}

function dataDoVideo(progressoPorArquivo: Record<string, AulaProgressoArquivo>, arquivo: string): string | null {
  return progressoPorArquivo[arquivo]?.completadoEm ?? null;
}

function diaEstaCompleto(diaObj: DiaAulas | undefined, progressoPorArquivo: Record<string, AulaProgressoArquivo>): boolean {
  if (!diaObj?.videos?.length) return false;
  return diaObj.videos.every((v) => !!progressoPorArquivo[v.arquivo]?.assistida);
}

export function calcularMaxDiaCompleto(dias: DiaAulas[], progressoPorArquivo: Record<string, AulaProgressoArquivo>): number {
  let max = -1;
  for (const diaObj of dias) {
    if (diaEstaCompleto(diaObj, progressoPorArquivo)) {
      max = diaObj.dia;
    } else {
      break;
    }
  }
  return max;
}

export function calcularUltimoDiaCompletadoData(
  dias: DiaAulas[],
  progressoPorArquivo: Record<string, AulaProgressoArquivo>,
  maxDiaCompleto: number,
): string | null {
  if (maxDiaCompleto < 0) return null;
  const diaObj = dias.find((d) => d.dia === maxDiaCompleto);
  if (!diaObj) return null;

  let maiorData: string | null = null;
  for (const v of diaObj.videos) {
    const dataCompleta = dataDoVideo(progressoPorArquivo, v.arquivo);
    if (dataCompleta && (!maiorData || dataCompleta > maiorData)) {
      maiorData = dataCompleta;
    }
  }
  return maiorData ? maiorData.slice(0, 10) : null;
}

function videoAnteriorAssistido(
  dias: DiaAulas[],
  progressoPorArquivo: Record<string, AulaProgressoArquivo>,
  diaAlvo: number,
  videoIndexAlvo: number,
): boolean {
  if (videoIndexAlvo <= 0) return true;
  const diaObj = dias.find((d) => d.dia === diaAlvo);
  const anterior = diaObj?.videos?.[videoIndexAlvo - 1];
  return anterior ? !!progressoPorArquivo[anterior.arquivo]?.assistida : false;
}

export type MotivoBloqueio = "ordem" | "calendario" | "sequencia" | "verificando" | "pausa";

export interface ResultadoBloqueio {
  liberado: boolean;
  motivo: MotivoBloqueio | null;
  // Só preenchido quando motivo === "pausa" — dias corridos até liberar.
  diasRestantes?: number;
}

export interface OpcoesPodeAssistir {
  dias: DiaAulas[];
  progressoPorArquivo: Record<string, AulaProgressoArquivo>;
  maxDiaCompleto: number;
  ultimoDiaCompletadoData: string | null;
  hojeServidor: string;
  // false enquanto o GET de progresso ainda não confirmou nesta sessão —
  // trava qualquer liberação por calendário (fail-closed) em vez de assumir
  // liberado por falta de confirmação.
  verificado?: boolean;
}

export function podeAssistir(diaAlvo: number, videoIndexAlvo: number, opcoes: OpcoesPodeAssistir): ResultadoBloqueio {
  const { dias, progressoPorArquivo, maxDiaCompleto, ultimoDiaCompletadoData, hojeServidor, verificado = true } = opcoes;

  if (diaAlvo === 0) {
    if (videoIndexAlvo === 0) return { liberado: true, motivo: null };
    const ok = videoAnteriorAssistido(dias, progressoPorArquivo, diaAlvo, videoIndexAlvo);
    return ok ? { liberado: true, motivo: null } : { liberado: false, motivo: "ordem" };
  }

  if (diaAlvo <= maxDiaCompleto) {
    return { liberado: true, motivo: null };
  }

  if (diaAlvo === maxDiaCompleto + 1) {
    if (maxDiaCompleto === 0) {
      if (videoIndexAlvo === 0) return { liberado: true, motivo: null };
      const ok = videoAnteriorAssistido(dias, progressoPorArquivo, diaAlvo, videoIndexAlvo);
      return ok ? { liberado: true, motivo: null } : { liberado: false, motivo: "ordem" };
    }

    if (maxDiaCompleto >= 1) {
      if (!verificado) {
        return { liberado: false, motivo: "verificando" };
      }

      // PAUSA OBRIGATÓRIA (3 dias faz, 4 dias pausa): dias de retomada (4, 7,
      // 10, ...) substituem o "1 dia de calendário" geral abaixo por
      // DIAS_PAUSA_OBRIGATORIA dias corridos inteiros desde a conclusão do
      // dia anterior.
      if (ehDiaDeRetomadaAposPausa(diaAlvo)) {
        const restantes = diasRestantesPausa(diaAlvo, ultimoDiaCompletadoData, hojeServidor);
        if (restantes > 0) {
          return { liberado: false, motivo: "pausa", diasRestantes: restantes };
        }
        if (videoIndexAlvo === 0) return { liberado: true, motivo: null };
        const ok = videoAnteriorAssistido(dias, progressoPorArquivo, diaAlvo, videoIndexAlvo);
        return ok ? { liberado: true, motivo: null } : { liberado: false, motivo: "ordem" };
      }

      if (ultimoDiaCompletadoData && ultimoDiaCompletadoData < hojeServidor) {
        if (videoIndexAlvo === 0) return { liberado: true, motivo: null };
        const ok = videoAnteriorAssistido(dias, progressoPorArquivo, diaAlvo, videoIndexAlvo);
        return ok ? { liberado: true, motivo: null } : { liberado: false, motivo: "ordem" };
      }
      return { liberado: false, motivo: "calendario" };
    }

    return { liberado: false, motivo: "sequencia" };
  }

  return { liberado: false, motivo: "sequencia" };
}
