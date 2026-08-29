import { useCallback, useEffect, useState } from "react";
import { meditacaoApi, type AulaComentario } from "../api/meditacaoApi";

export function useAulaComentarios() {
  const [comentarios, setComentarios] = useState<AulaComentario[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [temMais, setTemMais] = useState(true);
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);

  const carregarPagina = useCallback(async (cursorAtual: string | null) => {
    const r = await meditacaoApi.aulasComentarios(cursorAtual);
    setComentarios((atual) => (cursorAtual ? [...atual, ...r.comentarios] : r.comentarios));
    setCursor(r.proximoCursor);
    setTemMais(r.proximoCursor !== null);
  }, []);

  useEffect(() => {
    carregarPagina(null).finally(() => setCarregando(false));
  }, [carregarPagina]);

  const carregarMais = useCallback(async () => {
    if (!temMais || carregandoMais) return;
    setCarregandoMais(true);
    try {
      await carregarPagina(cursor);
    } finally {
      setCarregandoMais(false);
    }
  }, [temMais, carregandoMais, cursor, carregarPagina]);

  function adicionarComentario(comentario: AulaComentario) {
    setComentarios((atual) => [comentario, ...atual]);
  }

  function atualizarComentario(comentario: AulaComentario) {
    setComentarios((atual) => atual.map((c) => (c.id === comentario.id ? comentario : c)));
  }

  function removerComentario(id: string) {
    setComentarios((atual) => atual.filter((c) => c.id !== id));
  }

  return {
    comentarios,
    carregando,
    carregandoMais,
    temMais,
    carregarMais,
    adicionarComentario,
    atualizarComentario,
    removerComentario,
  };
}
