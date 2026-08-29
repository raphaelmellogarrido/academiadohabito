import "dotenv/config";
import { criarApp } from "./common/app.js";

const PORTA = Number(process.env.PORT) || 3001;
const app = criarApp();

app.listen(PORTA, () => {
  console.log(`[academiadohabito] server rodando em http://localhost:${PORTA}`);
});
