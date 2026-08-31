// Tempo máximo de espera por qualquer request antes de desistir — sem isso,
// um backend PHP/MySQL pendurado (conexão lenta no hosting compartilhado)
// deixa o fetch nunca resolver/rejeitar, o que trava pra sempre qualquer
// hook que só faz setCarregando(false) no .finally() da Promise (useAuth,
// useUserHabits, useAulas etc.) — a tela fica presa em "Carregando…" sem
// nenhum erro no console até o usuário dar refresh.
const TIMEOUT_PADRAO_MS = 15000;

function comTimeout(init: RequestInit | undefined, timeoutMs: number): { init: RequestInit; cancelar: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    init: { ...init, signal: controller.signal },
    cancelar: () => clearTimeout(timer),
  };
}

function erroDeTimeout(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

// Fetch wrapper único do client — sempre credentials:"include" (cookie
// ah_session) e sempre prefixado com /api (proxy do Vite -> :3001 em dev).
async function request<T>(path: string, init?: RequestInit, timeoutMs = TIMEOUT_PADRAO_MS): Promise<T> {
  const { init: initComSinal, cancelar } = comTimeout(init, timeoutMs);
  try {
    const res = await fetch(`/api${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...init?.headers },
      ...initComSinal,
    });
    const corpo = await res.json().catch(() => null);
    if (!res.ok) throw new Error(corpo?.erro ?? `Erro ${res.status}`);
    return corpo as T;
  } catch (e) {
    if (erroDeTimeout(e)) throw new Error("Tempo de resposta esgotado, tente novamente.");
    throw e;
  } finally {
    cancelar();
  }
}

// Variante multipart (upload de arquivo, ex: foto de perfil) — sem
// Content-Type manual, o browser define o boundary do multipart sozinho.
// Timeout mais alto porque é upload de arquivo (avatar), não uma leitura.
async function requestForm<T>(path: string, init: RequestInit, timeoutMs = 30000): Promise<T> {
  const { init: initComSinal, cancelar } = comTimeout(init, timeoutMs);
  try {
    const res = await fetch(`/api${path}`, { credentials: "include", ...initComSinal });
    const corpo = await res.json().catch(() => null);
    if (!res.ok) throw new Error(corpo?.erro ?? `Erro ${res.status}`);
    return corpo as T;
  } catch (e) {
    if (erroDeTimeout(e)) throw new Error("Tempo de resposta esgotado, tente novamente.");
    throw e;
  } finally {
    cancelar();
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  putForm: <T>(path: string, form: FormData) => requestForm<T>(path, { method: "PUT", body: form }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
