// Handler de erro global — deve ser o último `app.use(...)` montado em
// server/app.js, depois de todos os routers.
export function errorHandler(err, req, res, _next) {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Erro interno" });
}
