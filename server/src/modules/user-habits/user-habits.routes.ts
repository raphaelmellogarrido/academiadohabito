import { Router } from "express";
import { requireAuth } from "../users/users.middleware.js";
import { getHabitosDoUsuario, matricular } from "./user-habits.store.js";

export const userHabitsRouter = Router();

// Rota inteligente do client (routes.tsx) decide /app/:slug vs Hub a partir
// desta lista — ver docs/HABIT_LOGIC.md.
userHabitsRouter.get("/me/habitos", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  res.json({ ok: true, habitos: getHabitosDoUsuario(usuario.id) });
});

userHabitsRouter.post("/me/habitos/:habitId/matricular", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  const habitos = matricular(usuario.id, String(req.params.habitId));
  if (!habitos) return res.status(400).json({ erro: "hábito indisponível para matrícula" });
  res.json({ ok: true, habitos });
});
