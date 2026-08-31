import { useState } from "react";
import { meditacaoApi, type Desafio } from "../api/meditacaoApi";
import { usePolling } from "../../../shared/hooks/usePolling";

export function DesafiosSemana() {
  const [desafios, setDesafios] = useState<Desafio[] | null>(null);

  // Poll a cada 10s (mais devagar que o Feed — ver comentário em
  // useMeditacaoDashboard.ts sobre carga na hospedagem compartilhada).
  usePolling(async () => {
    const r = await meditacaoApi.desafios();
    setDesafios(r.desafios);
  }, 10000);

  async function alternar(id: string) {
    const r = await meditacaoApi.alternarDesafio(id);
    setDesafios(r.desafios);
  }

  if (!desafios) return null;

  return (
    <div className="cartao">
      <p className="cartao-titulo">🔥 Desafios da semana</p>
      <ul className="cm-desafios">
        {desafios.map((d) => (
          <li key={d.id} className={d.concluido ? "is-concluido" : ""}>
            <label>
              {/* Cada desafio é independente — `name` próprio evita virar um
                  grupo exclusivo de rádio (só o visual de círculo é de rádio,
                  o comportamento continua "alternar individualmente"). */}
              <input type="radio" name={`desafio-${d.id}`} checked={d.concluido} onChange={() => alternar(d.id)} />
              <span>{d.texto}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
