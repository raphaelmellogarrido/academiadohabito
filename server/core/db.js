import mysql from "mysql2/promise";
import { env } from "./config/env.js";

// Pool único do server — todo feature/service importa este pool em vez de
// abrir conexão própria. Cada feature é dona das suas próprias tabelas
// (migrations/CREATE TABLE ficam dentro de server/features/<habito>/), não
// deste arquivo.
export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: 5,
});
