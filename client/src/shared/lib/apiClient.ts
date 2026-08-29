// Fetch wrapper único do client — sempre credentials:"include" (cookie
// ah_session) e sempre prefixado com /api (proxy do Vite -> :3001 em dev).
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  const corpo = await res.json().catch(() => null);
  if (!res.ok) throw new Error(corpo?.erro ?? `Erro ${res.status}`);
  return corpo as T;
}

// Variante multipart (upload de arquivo, ex: foto de perfil) — sem
// Content-Type manual, o browser define o boundary do multipart sozinho.
async function requestForm<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, { credentials: "include", ...init });
  const corpo = await res.json().catch(() => null);
  if (!res.ok) throw new Error(corpo?.erro ?? `Erro ${res.status}`);
  return corpo as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  putForm: <T>(path: string, form: FormData) => requestForm<T>(path, { method: "PUT", body: form }),
};
