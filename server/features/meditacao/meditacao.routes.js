import { Router } from "express";
import * as controller from "./meditacao.controller.js";

// Hábito de referência: qualquer hábito novo copia esta pasta (routes,
// controller, service) e renomeia. Ver docs/como-adicionar-um-habito.md.
const router = Router();

router.get("/status", controller.getStatus);

export default router;
