// Stub — lógica real de sessão/JWT entra aqui quando o app tiver usuários
// de verdade. Login/sessão não é um "hábito" (não mora em server/features/),
// por isso tem sua própria camada de topo.
export async function login({ email, password } = {}) {
  throw Object.assign(new Error("Login ainda não implementado"), { status: 501 });
}

export async function logout() {
  return true;
}
