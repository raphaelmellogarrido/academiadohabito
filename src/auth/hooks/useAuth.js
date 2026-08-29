// Stub — quando a sessão/JWT existir de verdade, este hook expõe
// { user, isAuthenticated, login, logout } pro resto do app. Login/sessão
// não é um "hábito" (não entra em src/habits/registry.js), por isso mora
// numa camada própria em vez de dentro de features/.
export function useAuth() {
  return {
    user: null,
    isAuthenticated: false,
  };
}
