import { Link } from "react-router-dom";
import type { HabitoUsuario } from "../../shared/hooks/useUserHabits";
import "./hub.css";

// Só é renderizado quando useUserHabits() devolve !== 1 hábito matriculado
// (ver RotaInteligente em app/routes.tsx). Hoje nunca acontece em prod (todo
// mundo tem exatamente "meditacao"), mas o componente precisa existir pro
// dia em que alimentacao/exercicio saírem de "em_breve".
export function HubPage({ habitos }: { habitos: HabitoUsuario[] }) {
  return (
    <div className="hub">
      <h1>Escolha seu hábito</h1>
      <div className="hub-grid">
        {habitos.map((h) => (
          <Link key={h.id} to={`/app/${h.slug}`} className="hub-card">
            <span className="hub-card-icone">{h.icone}</span>
            <strong>{h.nome}</strong>
          </Link>
        ))}
        {habitos.length === 0 && <p>Nenhum hábito matriculado ainda.</p>}
      </div>
    </div>
  );
}
