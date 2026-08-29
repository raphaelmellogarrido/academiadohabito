import express from "express";
import cors from "cors";
import authRoutes from "./auth/auth.routes.js";
import meditacaoRoutes from "./features/meditacao/meditacao.routes.js";
import alimentacaoRoutes from "./features/alimentacao/alimentacao.routes.js";
import exercicioRoutes from "./features/exercicio/exercicio.routes.js";
import { errorHandler } from "./core/middleware/errorHandler.js";

// Monta o Express e todos os routers. server/index.js só chama app.listen —
// mantém a app testável (importável sem abrir porta) e o bootstrap fino.
//
// Adicionar um hábito novo = importar o router dele e adicionar uma linha
// `app.use("/api/<habito>", ...)` aqui. Ver docs/como-adicionar-um-habito.md.
export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use("/api/auth", authRoutes);
  app.use("/api/meditacao", meditacaoRoutes);
  app.use("/api/alimentacao", alimentacaoRoutes);
  app.use("/api/exercicio", exercicioRoutes);

  app.use(errorHandler);

  return app;
}
