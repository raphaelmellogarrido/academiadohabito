import type { ResultadoBloqueio } from "../lib/progressoDias";

// Anel/barra de progresso da trilha inteira (vídeos concluídos / total) —
// mesma ideia do MVP anterior, só que a contagem agora é por vídeo real
// (não por "dia" tratado como 1 aula). Sem banner de pausa obrigatória (não
// existe essa regra aqui, ver docs/HABIT_LOGIC.md).
export function JornadaAulas({
  totalConcluidos,
  totalVideos,
  percentual,
  jornadaCompleta,
  bloqueio,
}: {
  totalConcluidos: number;
  totalVideos: number;
  percentual: number;
  jornadaCompleta: boolean;
  bloqueio: ResultadoBloqueio | null | undefined;
}) {
  const mensagem = jornadaCompleta
    ? "Jornada completa! 🎉"
    : bloqueio && !bloqueio.liberado && bloqueio.motivo === "calendario"
      ? "Você já completou seu dia — volte amanhã"
      : bloqueio && !bloqueio.liberado && bloqueio.motivo === "pausa"
        ? "Pausa obrigatória — volte em breve"
        : "Hora de praticar";

  return (
    <div className="cartao">
      <p className="cartao-titulo">Sua Jornada</p>
      <div className="cm-jornada-topo">
        <strong>
          {totalConcluidos}/{totalVideos}
        </strong>
        <span>{percentual}%</span>
      </div>
      <div className="cm-jornada-barra">
        <div className="cm-jornada-barra-fill" style={{ width: `${percentual}%` }} />
      </div>
      <p
        className={`cm-jornada-msg ${
          jornadaCompleta
            ? "cm-jornada-status--concluido"
            : bloqueio && !bloqueio.liberado && bloqueio.motivo === "pausa"
              ? "cm-jornada-status--pausa"
              : "cm-jornada-status--praticar"
        }`}
      >
        {mensagem}
      </p>
    </div>
  );
}
