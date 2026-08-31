import { useState } from "react";
import { meditacaoApi } from "../api/meditacaoApi";
import { usePolling } from "../../../shared/hooks/usePolling";

export function FraseSemana() {
  const [frase, setFrase] = useState<{ frase: string; autor: string } | null>(null);

  // Poll a cada 10s: edição feita no admin (ver AdminPage.tsx) aparece pra
  // todo mundo em até 10s (mais devagar que o Feed — ver comentário em
  // useMeditacaoDashboard.ts sobre carga na hospedagem compartilhada).
  usePolling(async () => {
    const r = await meditacaoApi.frase();
    setFrase({ frase: r.frase, autor: r.autor });
  }, 10000);

  if (!frase) return null;

  return (
    <div className="cartao cm-frase">
      <p className="cartao-titulo">💬 Frase da semana</p>
      <blockquote>“{frase.frase}”</blockquote>
      <p className="cm-frase-autor">— {frase.autor}</p>
    </div>
  );
}
