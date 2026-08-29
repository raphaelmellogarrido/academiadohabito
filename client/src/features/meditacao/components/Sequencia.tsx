import { Check } from "lucide-react";
import type { Sequencia as SequenciaTipo } from "../api/meditacaoApi";

export function Sequencia({ sequencia }: { sequencia: SequenciaTipo }) {
  return (
    <div className="cartao">
      <div className="cm-sequencia-cabecalho">
        <span className="cartao-titulo cm-sequencia-titulo">🏃‍♂️ Sequência</span>
        <span className="cm-sequencia-badge">{sequencia.streak} DIAS SEGUIDOS</span>
      </div>
      <div className="cm-sequencia-bolinhas">
        {sequencia.bolinhas.map((b) => (
          <div key={b.iso} className={`cm-bolinha ${b.concluido ? "is-feita" : ""} ${b.hoje ? "is-hoje" : ""}`}>
            <span className="cm-bolinha-dot">{b.concluido && <Check size={12} strokeWidth={3} />}</span>
            <span className="cm-bolinha-label">{b.label}</span>
          </div>
        ))}
      </div>
      <p className="cm-sequencia-rodape">🌱 A consistência é o segredo</p>
    </div>
  );
}
