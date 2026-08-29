import { Router } from "express";
import * as controller from "./alimentacao.controller.js";

const router = Router();

router.get("/status", controller.getStatus);

export default router;
