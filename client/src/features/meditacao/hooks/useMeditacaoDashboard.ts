import { useCallback, useEffect, useState } from "react";
import { meditacaoApi, type Jornada, type Pulso, type Sequencia } from "../api/meditacaoApi";

export function useMeditacaoDashboard() {
  const [sequencia, setSequencia] = useState<Sequencia | null>(null);
  const [jornada, setJornada] = useState<Jornada | null>(null);
  const [pulso, setPulso] = useState<Pulso | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [marcando, setMarcando] = useState(false);

  const recarregar = useCallback(async () => {
    const [seq, jor, pul] = await Promise.all([
      meditacaoApi.sequencia(),
      meditacaoApi.jornada(),
      meditacaoApi.meditandoJunto(),
    ]);
    setSequencia(seq);
    setJornada(jor);
    setPulso(pul);
  }, []);

  useEffect(() => {
    recarregar().finally(() => setCarregando(false));
  }, [recarregar]);

  const mediteiHoje = useCallback(async () => {
    setMarcando(true);
    try {
      const r = await meditacaoApi.mediteiHoje();
      setSequencia(r.sequencia);
      setJornada(r.jornada);
      const pul = await meditacaoApi.meditandoJunto();
      setPulso(pul);
      return r.jaMarcado;
    } finally {
      setMarcando(false);
    }
  }, []);

  const jaMarcouHoje = sequencia?.bolinhas.find((b) => b.hoje)?.concluido ?? false;

  return { sequencia, jornada, pulso, carregando, marcando, mediteiHoje, jaMarcouHoje };
}
