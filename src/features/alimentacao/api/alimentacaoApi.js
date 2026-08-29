import { apiClient } from "../../../shared/lib/apiClient.js";

export function getAlimentacaoStatus() {
  return apiClient.get("/api/alimentacao/status");
}
