import { useEffect, useState } from "react";
import { meditacaoApi, type Desafio } from "../api/meditacaoApi";

export function DesafiosSemana() {
  const [desafios, setDesafios] = useState<Desafio[] | null>(null);

  useEffect(() => {
    meditacaoApi.desafios().then((r) => setDesafios(r.desafios));
  }, []);

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
