import { useEffect, useState } from "react";
import { api } from "../lib/apiClient";
import { ehProducaoReal } from "../lib/ambiente";

export interface Usuario {
  id: string;
  email: string;
  nome: string;
  primeiroNome: string;
  avatarUrl: string | null;
  admin: boolean;
}

// Em dev, requireAuth no server cai pro usuário demo quando não há sessão ->
// este hook nunca fica em erro/vazio de verdade em localhost. Em produção
// (ehProducaoReal) já é login real via api/me.php: sem sessão válida dá 401
// mesmo, e o catch abaixo deixa `usuario: null` — quem usa este hook decide
// o que fazer (redirecionar pro /login, ex.).
export function useAuth() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (ehProducaoReal
      ? api.get<{ ok: true; usuario: Usuario }>("/me.php")
      : api.get<{ ok: true; usuario: Usuario }>("/users/me")
    )
      .then((r) => setUsuario(r.usuario))
      .catch(() => setUsuario(null))
      .finally(() => setCarregando(false));
  }, []);

  async function sair() {
    await api.post(ehProducaoReal ? "/logout.php" : "/auth/logout");
    setUsuario(null);
    window.location.href = "/login";
  }

  // Usado por Configurações (perfil/senha) pra refletir a resposta do server
  // na TopBar sem precisar de reload — ver ConfiguracoesPage.tsx.
  function atualizarUsuario(patch: Partial<Usuario>) {
    setUsuario((atual) => (atual ? { ...atual, ...patch } : atual));
  }

  return { usuario, carregando, sair, atualizarUsuario };
}
