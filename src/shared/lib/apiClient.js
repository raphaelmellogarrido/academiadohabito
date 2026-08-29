// Fetch wrapper único do client — toda feature chama isto em vez de `fetch`
// cru, pra manter baseURL, headers de auth e tratamento de erro num só lugar.
const BASE_URL = "";

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Erro ${response.status} ao chamar ${path}`);
  }

  return response.json();
}

export const apiClient = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body) }),
};
