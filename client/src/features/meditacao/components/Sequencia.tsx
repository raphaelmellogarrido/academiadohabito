import type { Sequencia as SequenciaTipo } from "../api/meditacaoApi";

export function Sequencia({ sequencia }: { sequencia: SequenciaTipo }) {
  return (
    <div className="cartao">
      <p className="cartao-titulo">Sequência</p>
      <div className="cm-sequencia-numero">
        {sequencia.streak} <span>{sequencia.streak === 1 ? "dia" : "dias"}</span>
      </div>
      <div className="cm-sequencia-bolinhas">
        {sequencia.bolinhas.map((b) => (
          <div key={b.iso} className={`cm-bolinha ${b.concluido ? "is-feita" : ""} ${b.hoje ? "is-hoje" : ""}`}>
            <span className="cm-bolinha-dot" />
            <span className="cm-bolinha-label">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
