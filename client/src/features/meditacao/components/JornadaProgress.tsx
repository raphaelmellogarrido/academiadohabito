import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { meditacaoApi, type AulaProgresso, type Jornada } from "../api/meditacaoApi";

// Janela de dias mostrada nas pílulas — alguns antes e depois do dia atual,
// limitada ao total de aulas (mesma faixa que já aparece em CardDia/AulasPage).
function janelaDeDias(diaAtual: number, totalDias: number) {
  const inicio = Math.max(1, diaAtual - 2);
  const fim = Math.min(totalDias, inicio + 5);
  return Array.from({ length: fim - inicio + 1 }, (_, i) => inicio + i);
}

export function JornadaProgress({ jornada, jaMarcouHoje }: { jornada: Jornada; jaMarcouHoje: boolean }) {
  const [progresso, setProgresso] = useState<AulaProgresso | null>(null);

  useEffect(() => {
    meditacaoApi.aulasProgresso().then(setProgresso);
  }, []);

  const dias = progresso ? janelaDeDias(progresso.diaAtual, progresso.totalDias) : [];
  const mostrarCta = !jaMarcouHoje && !jornada.jornadaCompleta;

  return (
    <div className="cartao">
      <div className="cm-jornada-cabecalho">
        <span className="cartao-titulo cm-jornada-titulo">🚀 Sua Jornada</span>
        {jaMarcouHoje && <span className="cm-badge-lilas">Dia de curso concluído</span>}
        {mostrarCta && (
          <Link className="cm-jornada-cta" to="/app/meditacao/aulas">
            Bora pra aula?
          </Link>
        )}
      </div>

      <div className="cm-jornada-anel-wrap">
        <div
          className="cm-jornada-anel"
          style={{
            background: `conic-gradient(from -90deg, var(--cor-roxo) 0deg, #c3aee6 ${jornada.percentual * 3.6}deg, var(--cor-creme) 0deg)`,
          }}
        >
          <div className="cm-jornada-anel-centro">
            <strong>
              {jornada.totalAssistidos}/{jornada.totalAulas}
            </strong>
            <span>{jornada.percentual}% da jornada</span>
          </div>
        </div>
      </div>

      {/* {dias.length > 0 && (
        <div className="cm-jornada-dias">
          {dias.map((d) => (
            <div key={d} className={`cm-jornada-dia ${progresso?.diasConcluidos.includes(d) ? "is-feito" : ""}`}>
              <span className="cm-jornada-dia-dot">{progresso?.diasConcluidos.includes(d) && <Check size={11} strokeWidth={3} />}</span>
              <span className="cm-jornada-dia-label">{d}</span>
            </div>
          ))}
        </div>
      )} */}

      {!mostrarCta && <p className="cm-jornada-msg">{jornada.mensagem}</p>}
    </div>
  );
}
