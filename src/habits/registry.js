// Fonte única de verdade de "quais hábitos existem" no app.
//
// Router (src/app/router.jsx) e o menu do layout (src/shared/components/Layout)
// iteram HABITS em vez de terem cada rota/link hardcoded — adicionar um hábito
// novo não exige tocar em nenhum dos dois, só registrar aqui.
//
// Veja docs/como-adicionar-um-habito.md para o passo a passo completo.

import { lazy } from "react";

export const HABITS = [
  {
    id: "meditacao",
    label: "Meditação",
    path: "/meditacao",
    color: "#6C63FF",
    HomePage: lazy(() => import("../features/meditacao/pages/MeditacaoHomePage.jsx")),
  },
  {
    id: "alimentacao",
    label: "Alimentação",
    path: "/alimentacao",
    color: "#22C55E",
    HomePage: lazy(() => import("../features/alimentacao/pages/AlimentacaoHomePage.jsx")),
  },
  {
    id: "exercicio",
    label: "Exercício",
    path: "/exercicio",
    color: "#F97316",
    HomePage: lazy(() => import("../features/exercicio/pages/ExercicioHomePage.jsx")),
  },
];

export function getHabitById(id) {
  return HABITS.find((habit) => habit.id === id);
}
