import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { LandingPage } from "../pages/Landing/LandingPage";
import { LoginPage } from "../pages/Login/LoginPage";
import { HubPage } from "../pages/Hub/HubPage";
import { MeditacaoDashboardPage } from "../features/meditacao/pages/MeditacaoDashboardPage";
import { AulasPage } from "../features/meditacao/pages/AulasPage";
import { ConfiguracoesPage } from "../features/configuracoes/pages/ConfiguracoesPage";
import { useUserHabits } from "../shared/hooks/useUserHabits";

// Rota inteligente (spec 29/08): GET /api/me/habitos decide o destino de
// "/app". 1 hábito matriculado -> redireciona direto pra ele (hoje sempre
// meditação). Mais de 1 -> mostra o Hub com os cards. 0 -> também Hub (ele
// sabe desenhar o estado vazio / cards bloqueados).
function RotaInteligente() {
  const { habitos, carregando } = useUserHabits();

  if (carregando) return <div className="carregando">Carregando…</div>;
  if (habitos && habitos.length === 1) {
    return <Navigate to={`/app/${habitos[0].slug}`} replace />;
  }
  return <HubPage habitos={habitos ?? []} />;
}

function EmBreve({ titulo }: { titulo: string }) {
  return (
    <div className="cartao" style={{ maxWidth: 480 }}>
      <p className="cartao-titulo">{titulo}</p>
      <p>Em construção.</p>
    </div>
  );
}

export const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/login", element: <LoginPage /> },
  {
    path: "/app",
    element: <AppLayout />,
    children: [
      { index: true, element: <RotaInteligente /> },
      { path: "meditacao", element: <MeditacaoDashboardPage /> },
      { path: "meditacao/aulas", element: <AulasPage /> },
      { path: "configuracoes", element: <ConfiguracoesPage /> },
      { path: "mensagens", element: <EmBreve titulo="Mensagens" /> },
      { path: "admin", element: <EmBreve titulo="Admin" /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
