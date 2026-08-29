import { api } from "../../../shared/lib/apiClient";
import type { Usuario } from "../../../shared/hooks/useAuth";

export const configuracoesApi = {
  salvarPerfil: (form: FormData) => api.putForm<{ ok: true; usuario: Usuario }>("/users/me/perfil", form),
  alterarSenha: (dados: { senhaAtual: string; novaSenha: string; confirmarNovaSenha: string }) =>
    api.put<{ ok: true }>("/users/me/senha", dados),
};
