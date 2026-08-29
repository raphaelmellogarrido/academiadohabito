// Centraliza leitura de import.meta.env — resto do client importa daqui em
// vez de ler import.meta.env espalhado pelo código.
export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "",
};
