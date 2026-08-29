// Stub — quando sessão/JWT existir de verdade, este middleware valida o
// request e popula req.user, retornando 401 se não autenticado. Por ora só
// deixa passar, pra rotas poderem já declarar `app.use(requireAuth)` sem
// bloquear o desenvolvimento das outras camadas.
export function requireAuth(req, res, next) {
  next();
}
