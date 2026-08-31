import { useCallback, useRef, useState } from "react";
import { meditacaoApi, type AulaComentario } from "../api/meditacaoApi";
import { usePolling } from "../../../shared/hooks/usePolling";

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

  // Poll a cada 3s só da 1ª página — usado tanto pra carga inicial quanto
  // pra manter a lista fresca (novo comentário/reação/exclusão de qualquer
  // pessoa em até 3s). Não pode reusar `carregarPagina(null)` direto pros
  // ticks seguintes: ela SUBSTITUI `comentarios` inteiro pela página 1,
  // apagando páginas 2+ que o aluno já carregou via "carregar mais". Depois
  // da 1ª carga, cada tick só atualiza por id quem já está na lista (em
  // qualquer página) e insere no topo quem ainda não apareceu — `cursor`/
  // `temMais` ficam intocados (só avançam via carregarMais).
  const primeiraCargaFeita = useRef(false);
  const pollarPrimeiraPagina = useCallback(async () => {
    const r = await meditacaoApi.aulasComentarios(null);
    if (!primeiraCargaFeita.current) {
      primeiraCargaFeita.current = true;
      setComentarios(r.comentarios);
      setCursor(r.proximoCursor);
      setTemMais(r.proximoCursor !== null);
      setCarregando(false);
      return;
    }
    setComentarios((atual) => {
      const idsAtuais = new Set(atual.map((c) => c.id));
      const atualizados = atual.map((c) => r.comentarios.find((n) => n.id === c.id) ?? c);
      const novosDeVerdade = r.comentarios.filter((n) => !idsAtuais.has(n.id));
      return [...novosDeVerdade, ...atualizados];
    });
  }, []);
  usePolling(pollarPrimeiraPagina, 3000);

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

  // Contrato de excluir num nó qualquer da thread (raiz ou resposta em
  // qualquer profundidade): `raiz: null` quando a raiz foi apagada (remove o
  // item da lista top-level); `raiz: <árvore>` quando foi um nó aninhado
  // (substitui o item pela árvore restante, sem aquele nó).
  function excluirNoComentario(raizId: string, raiz: AulaComentario | null) {
    if (raiz === null) {
      removerComentario(raizId);
    } else {
      atualizarComentario(raiz);
    }
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
    excluirNoComentario,
  };
}
