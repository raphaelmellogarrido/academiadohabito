import { Router } from "express";
import { HABITS } from "./habits.data.js";

export const habitsRouter = Router();

// Catálogo completo (inclui os "em_breve") — usado pelo Hub pra desenhar os
// cards bloqueados ao lado dos hábitos em que o usuário já está matriculado.
habitsRouter.get("/", (_req, res) => {
  res.json({ ok: true, habitos: HABITS });
});
