import { useCallback, useEffect, useState } from "react";
import { meditacaoApi, type AulaProgresso } from "../api/meditacaoApi";

export function useAulas() {
  const [progresso, setProgresso] = useState<AulaProgresso | null>(null);
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [concluindo, setConcluindo] = useState(false);

  useEffect(() => {
    meditacaoApi
      .aulasProgresso()
      .then((r) => {
        setProgresso(r);
        setDiaSelecionado(r.diaAtual);
      })
      .finally(() => setCarregando(false));
  }, []);

  // Dropdown do card Dia: pode voltar pra qualquer dia já liberado, nunca
  // pular à frente do que o servidor libera.
  function selecionarDia(dia: number) {
    if (!progresso || dia > progresso.diaMaximoLiberado) return;
    setDiaSelecionado(dia);
  }

  const concluirDiaAtual = useCallback(async () => {
    if (!progresso) return;
    setConcluindo(true);
    try {
      const r = await meditacaoApi.aulasConcluirDia(progresso.diaMaximoLiberado);
      setProgresso(r);
      setDiaSelecionado(r.diaAtual);
    } finally {
      setConcluindo(false);
    }
  }, [progresso]);

  return { progresso, diaSelecionado, carregando, concluindo, selecionarDia, concluirDiaAtual };
}
