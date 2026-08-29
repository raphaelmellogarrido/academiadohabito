// Chamadas HTTP desta feature pro backend (server/features/meditacao).
// Usa o cliente único em src/shared/lib/apiClient.js — nunca `fetch` cru
// aqui, pra manter baseURL/headers/erro centralizados.
import { apiClient } from "../../../shared/lib/apiClient.js";

export function getMeditacaoStatus() {
  return apiClient.get("/api/meditacao/status");
}
