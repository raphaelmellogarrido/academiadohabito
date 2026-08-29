import { NavLink, Outlet } from "react-router-dom";
import { HABITS } from "../../../habits/registry.js";

// Shell visual do app logado: menu de hábitos + área de conteúdo (Outlet).
// O menu vem do registry — nenhum hábito é hardcoded aqui.
export default function AppLayout() {
  return (
    <div>
      <nav>
        <ul>
          {HABITS.map((habit) => (
            <li key={habit.id}>
              <NavLink to={habit.path} style={{ color: habit.color }}>
                {habit.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
