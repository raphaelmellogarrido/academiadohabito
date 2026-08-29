import { useEffect, useState } from "react";
import { meditacaoApi } from "../api/meditacaoApi";

export function FraseSemana() {
  const [frase, setFrase] = useState<{ frase: string; autor: string } | null>(null);

  useEffect(() => {
    meditacaoApi.frase().then((r) => setFrase({ frase: r.frase, autor: r.autor }));
  }, []);

  if (!frase) return null;

  return (
    <div className="cartao cm-frase">
      <p className="cartao-titulo">💬 Frase da semana</p>
      <blockquote>“{frase.frase}”</blockquote>
      <p className="cm-frase-autor">— {frase.autor}</p>
    </div>
  );
}
