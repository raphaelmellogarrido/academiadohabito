import { useCallback, useEffect, useRef } from "react";

// Chama `fn` imediatamente e depois a cada `intervalMs` enquanto a aba está
// visível — é assim que o site "empurra" atualização pra todo mundo em até
// 3s sem WebSocket/SSE: produção é hospedagem PHP clássica (Hostinger, sem
// Node App — ver docs/ARCHITECTURE.md), então polling é a única forma
// viável de "tempo real" sem trocar de hospedagem. Substitui o
// `useEffect(() => fetch..., [])` de carga inicial que cada card já tinha —
// o primeiro tick É a carga inicial.
//
// Pausa sozinho quando a aba vai pra background (evita gastar request à
// toa) e já refaz um fetch assim que volta ao foco, pra nunca mostrar dado
// velho depois de um tempo fora da aba. `emVooRef` evita ticks sobrepostos
// se uma resposta demorar mais que o intervalo. `enabled=false` (ex: uma
// mutação própria em voo, tipo reservar vaga) desliga o timer até voltar a
// `true` — quando volta, já dispara um tick na hora.
//
// Watchdog: `fn` já tem timeout próprio (ver TIMEOUT_PADRAO_MS em
// apiClient.ts), então `emVooRef` sempre deveria voltar a `false` sozinho.
// Mas se por algum motivo um `await fnRef.current()` nunca resolver (bug
// futuro, fn que não usa o api client, etc.), `emVooRef` travado em `true`
// desliga os retries do setInterval pra sempre — só um refresh da página
// resolveria. Esse timeout de segurança força o destravamento depois de
// alguns intervalos, pra nunca depender só do timeout interno do fetch.
export function usePolling(fn: () => void | Promise<void>, intervalMs: number, enabled = true) {
  // "Latest ref" pra `tick` sempre chamar o `fn` mais novo sem precisar
  // recriar o intervalo a cada render — sincronizado num effect (não durante
  // o render) declarado antes do que dispara `tick`, pra rodar primeiro
  // dentro do mesmo commit.
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });
  const emVooRef = useRef(false);

  const tick = useCallback(async (watchdogMs: number) => {
    if (emVooRef.current || document.hidden) return;
    emVooRef.current = true;
    const watchdog = setTimeout(() => {
      emVooRef.current = false;
    }, watchdogMs);
    try {
      await fnRef.current();
    } finally {
      clearTimeout(watchdog);
      emVooRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    // Watchdog generoso (5x o intervalo, mínimo 30s) — só existe pra nunca
    // deixar `emVooRef` travado além do timeout que `fn` já deveria respeitar
    // sozinha; não é o mecanismo normal de destravamento.
    const watchdogMs = Math.max(intervalMs * 5, 30000);
    tick(watchdogMs);
    const id = setInterval(() => tick(watchdogMs), intervalMs);
    function aoMudarVisibilidade() {
      if (!document.hidden) tick(watchdogMs);
    }
    document.addEventListener("visibilitychange", aoMudarVisibilidade);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", aoMudarVisibilidade);
    };
  }, [tick, intervalMs, enabled]);
}
