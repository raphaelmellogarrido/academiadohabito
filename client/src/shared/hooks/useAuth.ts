import { useEffect, useState } from "react";
import { api } from "../lib/apiClient";

export interface Usuario {
  id: string;
  email: string;
  nome: string;
  primeiroNome: string;
  avatarUrl: string | null;
  admin: boolean;
}

// requireAuth no server cai pro usuário demo quando não há sessão -> este
// hook NUNCA fica em erro/vazio de verdade em dev; existe pra já deixar o
// contrato pronto pro dia em que o login virar obrigatório de fato.
export function useAuth() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api
      .get<{ ok: true; usuario: Usuario }>("/users/me")
      .then((r) => setUsuario(r.usuario))
      .catch(() => setUsuario(null))
      .finally(() => setCarregando(false));
  }, []);

  async function sair() {
    await api.post("/auth/logout");
    setUsuario(null);
    window.location.href = "/login";
  }

  // Usado por Configurações (perfil/senha) pra refletir a resposta do server
  // na Sidebar sem precisar de reload — ver ConfiguracoesPage.tsx.
  function atualizarUsuario(patch: Partial<Usuario>) {
    setUsuario((atual) => (atual ? { ...atual, ...patch } : atual));
  }

  return { usuario, carregando, sair, atualizarUsuario };
}
