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
  //
  // Exclusão: um id que estava na página 1 do tick anterior e sumiu da
  // página 1 deste tick foi apagado por alguém — remove do estado local.
  // `idsPagina1Ref` guarda só ids vistos via poll (nunca os de páginas 2+
  // carregadas por scroll infinito), então isso nunca derruba um post que só
  // saiu da janela da página 1 por paginação.
  const primeiraCargaFeita = useRef(false);
  const idsPagina1Ref = useRef<Set<string>>(new Set());
  const pollarPrimeiraPagina = useCallback(async () => {
    const r = await meditacaoApi.feed(null);
    const idsPagina1Antes = idsPagina1Ref.current;
    const idsPagina1Agora = new Set(r.posts.map((p) => p.id));
    idsPagina1Ref.current = idsPagina1Agora;
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
      // Excluído por alguém: estava na página 1 do tick anterior e sumiu da
      // página 1 agora.
      const semExcluidos = atual.filter((p) => !idsPagina1Antes.has(p.id) || idsPagina1Agora.has(p.id));
      const atualizados = semExcluidos.map((p) => r.posts.find((n) => n.id === p.id) ?? p);
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
