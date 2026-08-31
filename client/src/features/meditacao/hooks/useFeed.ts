import { useCallback, useRef, useState } from "react";
import { meditacaoApi, type Post } from "../api/meditacaoApi";
import { usePolling } from "../../../shared/hooks/usePolling";

export function useFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [temMais, setTemMais] = useState(true);
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);

  const carregarPagina = useCallback(async (cursorAtual: string | null) => {
    const r = await meditacaoApi.feed(cursorAtual);
    setPosts((atual) => (cursorAtual ? [...atual, ...r.posts] : r.posts));
    setCursor(r.proximoCursor);
    setTemMais(r.proximoCursor !== null);
  }, []);

  // Poll a cada 3s só da 1ª página — usado tanto pra carga inicial quanto pra
  // manter o topo do feed fresco (post novo, reação, edição, exclusão ou
  // mudança de visibilidade de QUALQUER pessoa aparece em até 3s). Não pode
  // reusar `carregarPagina(null)` direto pros ticks seguintes: ela SUBSTITUI
  // `posts` inteiro pela página 1, apagando páginas 2+ que o aluno já
  // carregou via scroll infinito. Depois da 1ª carga, cada tick só atualiza
  // por id quem já está na lista (em qualquer página) e insere no topo quem
  // ainda não apareceu — `cursor`/`temMais` ficam intocados (só avançam via
  // carregarMais). Mesmo padrão de useAulaComentarios.ts, só que 3s em vez
  // de 10s por ser o feed principal do dashboard.
  const primeiraCargaFeita = useRef(false);
  const pollarPrimeiraPagina = useCallback(async () => {
    const r = await meditacaoApi.feed(null);
    if (!primeiraCargaFeita.current) {
      primeiraCargaFeita.current = true;
      setPosts(r.posts);
      setCursor(r.proximoCursor);
      setTemMais(r.proximoCursor !== null);
      setCarregando(false);
      return;
    }
    setPosts((atual) => {
      const idsAtuais = new Set(atual.map((p) => p.id));
      const atualizados = atual.map((p) => r.posts.find((n) => n.id === p.id) ?? p);
      const novosDeVerdade = r.posts.filter((n) => !idsAtuais.has(n.id));
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

  function adicionarPost(post: Post) {
    setPosts((atual) => [post, ...atual]);
  }

  function atualizarPost(post: Post) {
    setPosts((atual) => atual.map((p) => (p.id === post.id ? post : p)));
  }

  function removerPost(id: string) {
    setPosts((atual) => atual.filter((p) => p.id !== id));
  }

  // Apagar a raiz remove o post inteiro da lista; apagar uma resposta
  // aninhada substitui o post pela árvore restante (sem essa resposta).
  function excluirNoPost(raizId: string, raiz: Post | null) {
    if (raiz === null) {
      removerPost(raizId);
    } else {
      atualizarPost(raiz);
    }
  }

  return {
    posts,
    carregando,
    carregandoMais,
    temMais,
    carregarMais,
    adicionarPost,
    atualizarPost,
    excluirNoPost,
  };
}
