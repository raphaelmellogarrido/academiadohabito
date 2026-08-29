// Catálogo de hábitos oferecidos pela Academia do Hábito. `status` é o único
// campo que decide se o card aparece com cadeado no Hub (ver
// docs/HABIT_LOGIC.md) — "ativo" tem conteúdo/rotas de verdade hoje, "em_breve"
// ainda não tem feature implementada (só o placeholder em
// client/src/features/{alimentacao,exercicio}).
export type HabitStatus = "ativo" | "em_breve";

export interface Habit {
  id: string;
  slug: string;
  nome: string;
  status: HabitStatus;
  icone: string;
}

export const HABITS: Habit[] = [
  { id: "meditacao", slug: "meditacao", nome: "Meditação", status: "ativo", icone: "🧘" },
  { id: "alimentacao", slug: "alimentacao", nome: "Alimentação", status: "em_breve", icone: "🥗" },
  { id: "exercicio", slug: "exercicio", nome: "Exercício", status: "em_breve", icone: "🏃" },
];

export function getHabitPorId(id: string): Habit | undefined {
  return HABITS.find((h) => h.id === id);
}
