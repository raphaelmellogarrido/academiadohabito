import { Router } from "express";
import * as controller from "./exercicio.controller.js";

const router = Router();

router.get("/status", controller.getStatus);

export default router;
