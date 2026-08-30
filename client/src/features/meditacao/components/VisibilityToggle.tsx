import type { Visibilidade } from "../api/meditacaoApi";
export type { Visibilidade };

const OPCOES: { id: Visibilidade; label: string; icone: string }[] = [
  { id: "publico", label: "Público", icone: "🌍" },
  { id: "privado", label: "Privado", icone: "🔒" },
  { id: "orientador", label: "Orientador", icone: "🧘" },
];

export function VisibilityToggle({
  value,
  onChange,
}: {
  value: Visibilidade;
  onChange: (v: Visibilidade) => void;
}) {
  const idx = OPCOES.findIndex((o) => o.id === value);

  return (
    <div className="cm-visibility-toggle">
      <div className="cm-visibility-indicador" style={{ left: `calc(${idx} * 33.333% + 4px)` }} />
      {OPCOES.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`cm-visibility-opcao${value === opt.id ? " is-ativa" : ""}`}
        >
          <span>{opt.icone}</span>
          {opt.label}
        </button>
      ))}
    </div>
  );
}
