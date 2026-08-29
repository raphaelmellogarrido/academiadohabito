// Centraliza leitura de process.env no server — resto do backend importa
// daqui em vez de ler process.env espalhado pelo código.
export const env = {
  port: Number(process.env.PORT) || 3001,
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  sessionSecret: process.env.SESSION_SECRET,
};
