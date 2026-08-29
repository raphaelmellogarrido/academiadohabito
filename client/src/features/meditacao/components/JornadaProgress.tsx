import type { Jornada } from "../api/meditacaoApi";

export function JornadaProgress({ jornada }: { jornada: Jornada }) {
  return (
    <div className="cartao">
      <p className="cartao-titulo">Sua Jornada</p>
      <div className="cm-jornada-topo">
        <strong>
          {jornada.totalAssistidos}/{jornada.totalAulas}
        </strong>
        <span>{jornada.percentual}%</span>
      </div>
      <div className="cm-jornada-barra">
        <div className="cm-jornada-barra-fill" style={{ width: `${jornada.percentual}%` }} />
      </div>
      <p className="cm-jornada-msg">{jornada.mensagem}</p>
    </div>
  );
}
