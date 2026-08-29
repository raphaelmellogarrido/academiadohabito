import { apiClient } from "../../../shared/lib/apiClient.js";

export function getExercicioStatus() {
  return apiClient.get("/api/exercicio/status");
}
