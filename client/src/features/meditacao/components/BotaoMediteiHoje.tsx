export function BotaoMediteiHoje({
  jaMarcouHoje,
  marcando,
  onClick,
}: {
  jaMarcouHoje: boolean;
  marcando: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`cm-btn-mediteihoje ${jaMarcouHoje ? "is-feito" : ""}`}
      onClick={onClick}
      disabled={jaMarcouHoje || marcando}
    >
      {jaMarcouHoje ? "🪷 Você meditou hoje" : marcando ? "Salvando…" : "🧘 Meditei hoje"}
    </button>
  );
}
