import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Visibilidade } from "../api/meditacaoApi";

// Dropdown de visibilidade de um post/comentário já publicado (dono clica
// no ícone atual e escolhe direto entre as 3 opções — antes ciclava pro
// próximo estado num único clique, sem mostrar as opções).
const ORDEM: Visibilidade[] = ["publico", "privado", "orientador"];

const EMOJI: Record<Visibilidade, string> = {
  publico: "🌍",
  privado: "🔒",
  orientador: "🧘‍♂️",
};

const LABEL: Record<Visibilidade, string> = {
  publico: "Público",
  privado: "Privado",
  orientador: "Orientador",
};

const TITULO: Record<Visibilidade, string> = {
  publico: "Público — visível pra comunidade toda",
  privado: "Privado — só você vê",
  orientador: "Visível só pra orientadores",
};

export function VisibilidadeIcone({
  valor,
  podeAlterar,
  onAlterar,
}: {
  valor: Visibilidade;
  podeAlterar: boolean;
  onAlterar?: (novo: Visibilidade) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const raizRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown ao clicar fora dele — mesmo padrão do emoji picker do composer.
  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(e: MouseEvent) {
      if (raizRef.current && !raizRef.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [aberto]);

  if (!podeAlterar) {
    return (
      <span className="cm-visibilidade-icone" title={TITULO[valor]}>
        {EMOJI[valor]}
      </span>
    );
  }

  function escolher(nova: Visibilidade) {
    setAberto(false);
    if (nova !== valor) onAlterar?.(nova);
  }

  return (
    <div className="cm-visibilidade-dropdown" ref={raizRef}>
      <button
        type="button"
        className="cm-visibilidade-icone is-clicavel"
        title={TITULO[valor]}
        onClick={() => setAberto((v) => !v)}
      >
        {EMOJI[valor]}
        <ChevronDown size={12} className={`cm-visibilidade-seta${aberto ? " is-aberta" : ""}`} />
      </button>
      {aberto && (
        <div className="cm-visibilidade-menu">
          {ORDEM.map((opt) => (
            <button
              key={opt}
              type="button"
              className={`cm-visibilidade-opcao${opt === valor ? " is-ativa" : ""}`}
              onClick={() => escolher(opt)}
            >
              <span>{EMOJI[opt]}</span>
              {LABEL[opt]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
