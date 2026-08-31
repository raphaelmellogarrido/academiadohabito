import { useCallback, useState } from "react";
import { meditacaoApi, type Jornada, type Pulso, type Sequencia } from "../api/meditacaoApi";
import { usePolling } from "../../../shared/hooks/usePolling";

export function useMeditacaoDashboard() {
  const [sequencia, setSequencia] = useState<Sequencia | null>(null);
  const [jornada, setJornada] = useState<Jornada | null>(null);
  const [pulso, setPulso] = useState<Pulso | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [marcando, setMarcando] = useState(false);

  // allSettled (não all): em produção nem todo card já foi migrado pra
  // PHP real (ver docs/ARCHITECTURE.md) — se um falhar (404), os outros que
  // já têm dado real (sequência, meditando junto) não podem sumir junto.
  const recarregar = useCallback(async () => {
    const [seq, jor, pul] = await Promise.allSettled([
      meditacaoApi.sequencia(),
      meditacaoApi.jornada(),
      meditacaoApi.meditandoJunto(),
    ]);
    if (seq.status === "fulfilled") setSequencia(seq.value);
    if (jor.status === "fulfilled") setJornada(jor.value);
    if (pul.status === "fulfilled") setPulso(pul.value);
  }, []);

  // Poll a cada 10s (usePolling) — "Meditando junto" reflete check-ins,
  // partilhas e dias de presença de QUALQUER aluno em até 10s, não só do
  // próprio (ver docs/ARCHITECTURE.md). 3 chamadas por tick (sequência +
  // jornada + meditando junto), então intervalo maior que o Feed pra não
  // somar carga demais na hospedagem compartilhada (cada chamada abre sua
  // própria conexão MySQL — ver api/_config.php).
  const carregarUmaVez = useCallback(async () => {
    await recarregar();
    setCarregando(false);
  }, [recarregar]);
  usePolling(carregarUmaVez, 10000);

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
