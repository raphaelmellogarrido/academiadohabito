import { HABITS, getHabitPorId } from "../habits/habits.data.js";

export interface UserHabit {
  userId: string;
  habitId: string;
  enrolled_at: string;
}

// Mock (spec do produto, 29/08): todo usuário cai matriculado só em
// "meditacao" — é o único hábito com conteúdo pronto hoje. Quando
// alimentacao/exercicio saírem de "em_breve", a matrícula vira uma ação real
// (POST aqui embaixo) em vez desse seed fixo.
const USER_HABITS: UserHabit[] = [{ userId: "demo", habitId: "meditacao", enrolled_at: "2026-01-01" }];

function seedParaUsuario(userId: string) {
  if (USER_HABITS.some((uh) => uh.userId === userId)) return;
  USER_HABITS.push({ userId, habitId: "meditacao", enrolled_at: new Date().toISOString() });
}

export function getHabitosDoUsuario(userId: string) {
  seedParaUsuario(userId); // todo usuário novo (mock) começa matriculado em meditação
  return USER_HABITS.filter((uh) => uh.userId === userId)
    .map((uh) => {
      const habit = getHabitPorId(uh.habitId);
      if (!habit) return null;
      return { ...habit, enrolled_at: uh.enrolled_at };
    })
    .filter((h): h is NonNullable<typeof h> => h !== null);
}

export function matricular(userId: string, habitId: string) {
  const habit = getHabitPorId(habitId);
  if (!habit || habit.status !== "ativo") return null;
  if (USER_HABITS.some((uh) => uh.userId === userId && uh.habitId === habitId)) return getHabitosDoUsuario(userId);
  USER_HABITS.push({ userId, habitId, enrolled_at: new Date().toISOString() });
  return getHabitosDoUsuario(userId);
}

export const _todosHabitosCatalogo = HABITS;
