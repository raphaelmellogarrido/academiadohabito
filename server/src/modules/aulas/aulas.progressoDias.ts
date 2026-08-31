import type { DiaAulas } from "./aulas.catalogo.js";

// Porta EXATAMENTE o `podeAssistir` de
// renato_de_paula/src/pages/comunidade/components/progressoDias.js — bloqueio
// por DIA (não por vídeo): cada dia libera inteiro (vídeos em ordem) de uma
// vez, Dia 0 -> Dia 1 pode ser feito no mesmo dia (exceção pedida pelo
// cliente), e a partir daí só libera um dia novo por dia de calendário (BRT),
// EXCETO nos "dias de retomada" (4, 7, 10, ...), que exigem a pausa
// obrigatória de DIAS_PAUSA_OBRIGATORIA dias corridos (regra pedida pelo
// cliente, mesmo algoritmo do projeto irmão). Dias já completados continuam
// sempre revisitáveis, em qualquer ordem. Espelhado em
// client/.../lib/progressoDias.ts e api/_aulas.php::podeAssistirAula —
// qualquer mudança de regra aqui precisa ir pros três lugares.

export interface ProgressoArquivo {
  assistida: boolean;
  progresso: number;
  completadoEm: string | null; // ISO datetime completo, ou null
}

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
// `diaAlvo` é "dia de retomada" quando diaAlvo > 1 e diaAlvo % 3 === 1 (dias
// 4, 7, 10, ...) — dia 1 fica de fora, coberto pela exceção Dia0->Dia1.
export const DIAS_PAUSA_OBRIGATORIA = 4;

function ehDiaDeRetomadaAposPausa(diaAlvo: number): boolean {
  return diaAlvo > 1 && diaAlvo % 3 === 1;
}

// Diferença em dias corridos entre duas datas ISO locais (YYYY-MM-DD).
function diferencaEmDias(isoRecente: string, isoAntigo: string): number {
  const ms = dataLocalDeIso(isoRecente).getTime() - dataLocalDeIso(isoAntigo).getTime();
  return Math.round(ms / 86400000);
}

// Dias corridos que ainda faltam pra pausa obrigatória terminar e liberar
// `diaAlvo`. 0 = pausa já cumprida.
function diasRestantesPausa(diaAlvo: number, ultimoDiaCompletadoData: string | null, hojeServidor: string): number {
  if (!ehDiaDeRetomadaAposPausa(diaAlvo) || !ultimoDiaCompletadoData) return 0;
  const passados = diferencaEmDias(hojeServidor, ultimoDiaCompletadoData);
  return Math.max(0, DIAS_PAUSA_OBRIGATORIA - passados);
}

function dataDoVideo(progressoPorArquivo: Record<string, ProgressoArquivo>, arquivo: string): string | null {
  return progressoPorArquivo[arquivo]?.completadoEm ?? null;
}

// Dia "completo" = TODOS os vídeos do dia (contagem real do catálogo, não
// hardcoded) estão com assistida=true.
function diaEstaCompleto(diaObj: DiaAulas | undefined, progressoPorArquivo: Record<string, ProgressoArquivo>): boolean {
  if (!diaObj?.videos?.length) return false;
  return diaObj.videos.every((v) => !!progressoPorArquivo[v.arquivo]?.assistida);
}

// Maior dia 100% concluído a partir do Dia 0, ou -1 se nem o Dia 0 foi
// concluído. `dias` precisa vir ordenado por número do dia.
export function calcularMaxDiaCompleto(dias: DiaAulas[], progressoPorArquivo: Record<string, ProgressoArquivo>): number {
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

// Data (YYYY-MM-DD local) em que o dia `maxDiaCompleto` foi concluído — maior
// completadoEm entre os vídeos desse dia. null se ainda não há dia completo.
export function calcularUltimoDiaCompletadoData(
  dias: DiaAulas[],
  progressoPorArquivo: Record<string, ProgressoArquivo>,
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
  // completadoEm é datetime completo ISO — só a parte da data importa pra
  // comparar com "hoje" (isoLocal, "YYYY-MM-DD").
  return maiorData ? maiorData.slice(0, 10) : null;
}

// Vídeo anterior (mesmo dia, índice de POSIÇÃO na ordem real do catálogo) já
// foi assistido?
function videoAnteriorAssistido(
  dias: DiaAulas[],
  progressoPorArquivo: Record<string, ProgressoArquivo>,
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
  progressoPorArquivo: Record<string, ProgressoArquivo>;
  maxDiaCompleto: number;
  ultimoDiaCompletadoData: string | null;
  hojeServidor: string;
  // Client-side: false enquanto o GET de progresso do servidor ainda não
  // confirmou nesta sessão — trava qualquer liberação por calendário
  // (fail-closed) em vez de assumir liberado por falta de confirmação.
  // Server-side é sempre true (a própria store é a fonte da verdade).
  verificado?: boolean;
}

/**
 * podeAssistir(diaAlvo, videoIndexAlvo) — mesmas regras de
 * progressoDias.js, motivo só é usado quando liberado===false:
 *  - "ordem"       -> assista o vídeo anterior pra liberar.
 *  - "calendario"  -> já completou o dia hoje, volta amanhã.
 *  - "pausa"       -> em pausa obrigatória (3-faz/4-pausa), diasRestantes traz a contagem.
 *  - "sequencia"   -> tentando pular 2+ dias.
 *  - "verificando" -> sem confirmação do servidor ainda (client only).
 */
export function podeAssistir(diaAlvo: number, videoIndexAlvo: number, opcoes: OpcoesPodeAssistir): ResultadoBloqueio {
  const { dias, progressoPorArquivo, maxDiaCompleto, ultimoDiaCompletadoData, hojeServidor, verificado = true } = opcoes;

  // DIA 0 SEMPRE LIVRE — mas em ordem dentro do próprio dia.
  if (diaAlvo === 0) {
    if (videoIndexAlvo === 0) return { liberado: true, motivo: null };
    const ok = videoAnteriorAssistido(dias, progressoPorArquivo, diaAlvo, videoIndexAlvo);
    return ok ? { liberado: true, motivo: null } : { liberado: false, motivo: "ordem" };
  }

  // REASSISTIR DIAS JÁ COMPLETADOS: sempre pode, qualquer ordem.
  if (diaAlvo <= maxDiaCompleto) {
    return { liberado: true, motivo: null };
  }

  // TENTANDO AVANÇAR 1 DIA (o próximo depois do último completo).
  if (diaAlvo === maxDiaCompleto + 1) {
    // EXCEÇÃO DIA 0 -> DIA 1: libera mesmo no mesmo dia que terminou o Dia 0.
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

      // REGRA GERAL: 1 dia novo por dia de calendário — só libera se o
      // último dia completado foi ANTES de hoje (comparação de DATE).
      if (ultimoDiaCompletadoData && ultimoDiaCompletadoData < hojeServidor) {
        if (videoIndexAlvo === 0) return { liberado: true, motivo: null };
        const ok = videoAnteriorAssistido(dias, progressoPorArquivo, diaAlvo, videoIndexAlvo);
        return ok ? { liberado: true, motivo: null } : { liberado: false, motivo: "ordem" };
      }
      return { liberado: false, motivo: "calendario" };
    }

    // maxDiaCompleto === -1 não deveria cair aqui (diaAlvo seria 0, já
    // tratado acima) — defensivo.
    return { liberado: false, motivo: "sequencia" };
  }

  // TENTANDO PULAR 2 DIAS OU MAIS.
  return { liberado: false, motivo: "sequencia" };
}
