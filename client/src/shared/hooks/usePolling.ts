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

  const tick = useCallback(async () => {
    if (emVooRef.current || document.hidden) return;
    emVooRef.current = true;
    try {
      await fnRef.current();
    } finally {
      emVooRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    tick();
    const id = setInterval(tick, intervalMs);
    function aoMudarVisibilidade() {
      if (!document.hidden) tick();
    }
    document.addEventListener("visibilitychange", aoMudarVisibilidade);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", aoMudarVisibilidade);
    };
  }, [tick, intervalMs, enabled]);
}
