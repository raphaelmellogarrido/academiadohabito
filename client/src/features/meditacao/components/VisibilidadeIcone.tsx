import type { Visibilidade } from "../api/meditacaoApi";

// Ícone único (não os 3 juntos, ao contrário do VisibilityToggle do
// composer) mostrando a visibilidade atual de um post/comentário já
// publicado. Clicável só pelo dono (podeAlterar), ciclando direto pro
// próximo estado — sem menu — mesmo padrão de toggle que reações já usam.
const ORDEM: Visibilidade[] = ["publico", "privado", "orientador"];

const EMOJI: Record<Visibilidade, string> = {
  publico: "🌍",
  privado: "🔒",
  orientador: "🧘",
};

const TITULO: Record<Visibilidade, string> = {
  publico: "Público — clique para tornar privado",
  privado: "Privado — clique para restringir a orientadores",
  orientador: "Visível para orientadores — clique para tornar público",
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
  if (!podeAlterar) {
    return (
      <span className="cm-visibilidade-icone" title={TITULO[valor]}>
        {EMOJI[valor]}
      </span>
    );
  }

  const proximo = ORDEM[(ORDEM.indexOf(valor) + 1) % ORDEM.length];

  return (
    <button
      type="button"
      className="cm-visibilidade-icone is-clicavel"
      title={TITULO[valor]}
      onClick={() => onAlterar?.(proximo)}
    >
      {EMOJI[valor]}
    </button>
  );
}
