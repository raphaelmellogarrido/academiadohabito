// Único lugar que decide "isto é produção real (academiadohabito.com.br)
// ou não" — localhost, preview, etc. caem todos no mock Node. Usado por
// todo endpoint que já foi migrado pra ponte PHP (ver docs/ARCHITECTURE.md):
// LoginPage.tsx, useAuth.ts, meditacaoApi.ts. Extraído daqui em vez de
// repetido em cada arquivo pra não desalinhar se o domínio mudar um dia.
export const ehProducaoReal =
  typeof window !== "undefined" && window.location.hostname.endsWith("academiadohabito.com.br");
