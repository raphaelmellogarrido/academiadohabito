import { useEffect, useState } from "react";
import { api } from "../lib/apiClient";
import { ehProducaoReal } from "../lib/ambiente";

export interface HabitoUsuario {
  id: string;
  slug: string;
  nome: string;
  status: "ativo" | "em_breve";
  icone: string;
  enrolled_at: string;
}

// Base da "rota inteligente" (/app -> routes.tsx): length===1 redireciona
// direto pro hábito, >1 mostra o Hub. Hoje todo mundo cai em length===1
// (só meditação matriculada) — ver docs/HABIT_LOGIC.md.
// Em produção (ehProducaoReal) busca api/habitos.php: mesma regra fixa do
// mock (todo aluno logado cai matriculado só em "meditacao"), sem tabela de
// matrícula real — ver docs/ARCHITECTURE.md.
export function useUserHabits() {
  const [habitos, setHabitos] = useState<HabitoUsuario[] | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (ehProducaoReal
      ? api.get<{ ok: true; habitos: HabitoUsuario[] }>("/habitos.php")
      : api.get<{ ok: true; habitos: HabitoUsuario[] }>("/me/habitos")
    )
      .then((r) => setHabitos(r.habitos))
      .catch(() => setHabitos([]))
      .finally(() => setCarregando(false));
  }, []);

  return { habitos, carregando };
}
