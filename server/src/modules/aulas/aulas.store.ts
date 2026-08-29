import { hojeBrasilISO, TOTAL_AULAS } from "../gamification/gamification.store.js";

// Progresso da trilha de vídeo-aulas (dias 1..TOTAL_DIAS) — modelo separado
// do check-in diário do dashboard (gamification.store): aqui o avanço é por
// aula assistida/concluída, com bloqueio em blocos de 3 dias (regra de
// produto: 3 dias liberados, depois pausa obrigatória até o dia seguinte).
export const TOTAL_DIAS = TOTAL_AULAS;
const TAMANHO_BLOCO = 3;

interface ProgressoAulas {
  diasConcluidos: Set<number>;
  ultimaConclusaoISO: string | null; // data (BRT) do último dia concluído
}

const PROGRESSO = new Map<string, ProgressoAulas>();

function getOrInit(userId: string): ProgressoAulas {
  let p = PROGRESSO.get(userId);
  if (!p) {
    p = { diasConcluidos: new Set(), ultimaConclusaoISO: null };
    PROGRESSO.set(userId, p);
  }
  return p;
}

export type StatusJornada = "concluido" | "praticar" | "pausa";

export interface AulaProgresso {
  totalDias: number;
  diaAtual: number; // dia em foco (próximo a assistir, ou o último concluído se bloqueado)
  diaMaximoLiberado: number; // maior dia que o usuário pode selecionar/concluir agora
  diasConcluidos: number[];
  bloqueado: boolean;
  status: StatusJornada;
  mensagem: string;
  percentual: number;
}

export function getProgresso(userId: string): AulaProgresso {
  const p = getOrInit(userId);
  const diaMaxConcluido = p.diasConcluidos.size ? Math.max(...p.diasConcluidos) : 0;
  const hoje = hojeBrasilISO();
  const concluiuHoje = p.ultimaConclusaoISO === hoje;

  // Pausa obrigatória: terminou um bloco de 3 dias hoje e a jornada ainda não
  // acabou -> trava o próximo dia até virar a data (BRT).
  const fimDeBloco = diaMaxConcluido > 0 && diaMaxConcluido % TAMANHO_BLOCO === 0;
  const jornadaCompleta = diaMaxConcluido >= TOTAL_DIAS;
  const bloqueado = !jornadaCompleta && fimDeBloco && concluiuHoje;

  const diaAtual = Math.min(diaMaxConcluido + (jornadaCompleta ? 0 : 1), TOTAL_DIAS);
  const diaMaximoLiberado = bloqueado ? diaMaxConcluido : diaAtual;

  let status: StatusJornada;
  let mensagem: string;
  if (jornadaCompleta) {
    status = "concluido";
    mensagem = "Jornada completa! Continue mantendo a prática diária. ✨";
  } else if (bloqueado) {
    status = "pausa";
    mensagem = "Pausa obrigatória — volte amanhã";
  } else if (concluiuHoje) {
    status = "concluido";
    mensagem = "Dia concluído";
  } else {
    status = "praticar";
    mensagem = "Hora de praticar";
  }

  return {
    totalDias: TOTAL_DIAS,
    diaAtual,
    diaMaximoLiberado,
    diasConcluidos: [...p.diasConcluidos].sort((a, b) => a - b),
    bloqueado,
    status,
    mensagem,
    percentual: Math.round((diaMaxConcluido / TOTAL_DIAS) * 100),
  };
}

// Retorna null quando o dia pedido não é o dia liberado no momento (bloqueado
// ou tentativa de pular aula) — a rota traduz isso pra 400.
export function concluirDia(userId: string, dia: number): AulaProgresso | null {
  const atual = getProgresso(userId);
  if (dia !== atual.diaMaximoLiberado || atual.bloqueado) return null;
  const p = getOrInit(userId);
  p.diasConcluidos.add(dia);
  p.ultimaConclusaoISO = hojeBrasilISO();
  return getProgresso(userId);
}
