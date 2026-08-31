import { api } from "../../../shared/lib/apiClient";
import { ehProducaoReal } from "../../../shared/lib/ambiente";
import type { Usuario } from "../../../shared/hooks/useAuth";

// Em produção real (PHP/Hostinger) não existe upload multipart — todo envio
// de imagem já é data-URI num corpo JSON, mesmo formato que feed.php aceita
// pro campo `foto` (ver perfil-atualizar.php). O mock (Node/Express) continua
// em FormData/multer (avatar.upload.ts), então essa conversão só roda no
// branch de produção.
function blobParaDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result as string);
    leitor.onerror = () => reject(leitor.error ?? new Error("falha ao ler imagem"));
    leitor.readAsDataURL(blob);
  });
}

export const configuracoesApi = {
  salvarPerfil: async (dados: { nome: string; primeiroNome: string; avatarBlob: Blob | null }) => {
    if (ehProducaoReal) {
      const avatarDataUri = dados.avatarBlob ? await blobParaDataUri(dados.avatarBlob) : undefined;
      return api.put<{ ok: true; usuario: Usuario }>("/perfil-atualizar.php", {
        nome: dados.nome,
        primeiroNome: dados.primeiroNome,
        avatarDataUri,
      });
    }
    const form = new FormData();
    form.append("nome", dados.nome);
    form.append("primeiroNome", dados.primeiroNome);
    if (dados.avatarBlob) form.append("foto", dados.avatarBlob, "avatar.jpg");
    return api.putForm<{ ok: true; usuario: Usuario }>("/users/me/perfil", form);
  },
  // Sem "senha atual" — quem já tem sessão válida pode trocar direto (ver
  // senha-alterar.php / users.routes.ts).
  alterarSenha: (dados: { novaSenha: string; confirmarNovaSenha: string }) =>
    ehProducaoReal
      ? api.put<{ ok: true }>("/senha-alterar.php", dados)
      : api.put<{ ok: true }>("/users/me/senha", dados),
};
