import "dotenv/config";
import { createApp } from "./app.js";
import { env } from "./core/config/env.js";

const app = createApp();

app.listen(env.port, () => {
  console.log(`API rodando em http://localhost:${env.port}`);
});
