// Parser mínimo de cookies — evita depender do pacote cookie-parser só pra
// ler 1 cookie de sessão mock. res.cookie() (setar) já vem de graça no
// Express core, só a LEITURA de req.headers.cookie precisa disso.
export function parseCookies(header?: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const parte of header.split(";")) {
    const idx = parte.indexOf("=");
    if (idx === -1) continue;
    const nome = parte.slice(0, idx).trim();
    const valor = parte.slice(idx + 1).trim();
    if (nome) out[nome] = decodeURIComponent(valor);
  }
  return out;
}
