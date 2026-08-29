import type { AulaProgresso } from "../api/meditacaoApi";

const LABEL_STATUS: Record<AulaProgresso["status"], string> = {
  concluido: "Dia concluído",
  praticar: "Hora de praticar",
  pausa: "Pausa obrigatória — volte amanhã",
};

export function JornadaAulas({ progresso }: { progresso: AulaProgresso }) {
  const totalAssistidos = progresso.diasConcluidos.length;
  return (
    <div className="cartao">
      <p className="cartao-titulo">Sua Jornada</p>
      <div className="cm-jornada-topo">
        <strong>
          {totalAssistidos}/{progresso.totalDias}
        </strong>
        <span>{progresso.percentual}%</span>
      </div>
      <div className="cm-jornada-barra">
        <div className="cm-jornada-barra-fill" style={{ width: `${progresso.percentual}%` }} />
      </div>
      <p className={`cm-jornada-msg cm-jornada-status--${progresso.status}`}>{LABEL_STATUS[progresso.status]}</p>
    </div>
  );
}
