import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useAuth } from "../../shared/hooks/useAuth";
import { ErrorBoundary } from "../../shared/ui/ErrorBoundary";
import "./layout.css";

// Coluna 1 do grid de 4 colunas (sidebar|feed|col3|col4) — as outras 3
// ficam por conta de cada página de hábito (ex: MeditacaoDashboardPage),
// igual ComunidadeLayout.jsx (sidebar) + Dashboard.jsx (3-col) no app antigo.
export function AppLayout() {
  const { usuario, carregando, sair, atualizarUsuario } = useAuth();
  const { pathname } = useLocation();

  if (carregando) return <div className="carregando">Carregando…</div>;
  if (!usuario) return <div className="carregando">Não autenticado.</div>;

  return (
    <div className="cm-shell">
      <Sidebar usuario={usuario} onSair={sair} />
      <main className="cm-conteudo">
        {/* key={pathname} remonta o boundary ao trocar de rota, então um erro
            numa página não deixa as próximas presas em tela de fallback. */}
        <ErrorBoundary key={pathname}>
          <Suspense fallback={<div className="carregando">Carregando…</div>}>
            <Outlet context={{ usuario, atualizarUsuario }} />
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}
