import { Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import AppLayout from "../shared/components/Layout/AppLayout.jsx";
import LoginPage from "../auth/pages/LoginPage.jsx";
import { HABITS } from "../habits/registry.js";

// Rotas de hábito são geradas a partir do registry — nenhum hábito é
// hardcoded aqui. Ver src/habits/registry.js.
const habitRoutes = HABITS.map(({ path, HomePage }) => ({
  path: path.replace(/^\//, ""),
  element: (
    <Suspense fallback={<div>Carregando...</div>}>
      <HomePage />
    </Suspense>
  ),
}));

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to={HABITS[0].path} replace /> },
      ...habitRoutes,
    ],
  },
]);
