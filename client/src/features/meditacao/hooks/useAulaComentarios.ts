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

  // Poll a cada 10s só da 1ª página — usado tanto pra carga inicial quanto
  // pra manter a lista fresca (novo comentário/reação/exclusão de qualquer
  // pessoa em até 10s; mais devagar que o Feed do dashboard — ver
  // comentário em useMeditacaoDashboard.ts sobre carga na hospedagem
  // compartilhada). Não pode reusar `carregarPagina(null)` direto pros
  // ticks seguintes: ela SUBSTITUI `comentarios` inteiro pela página 1,
  // apagando páginas 2+ que o aluno já carregou via "carregar mais". Depois
  // da 1ª carga, cada tick só atualiza por id quem já está na lista (em
  // qualquer página) e insere no topo quem ainda não apareceu — `cursor`/
  // `temMais` ficam intocados (só avançam via carregarMais).
  //
  // Exclusão real (ou perda de visibilidade: virou privado/orientador e este
  // usuário não é mais dono nem enxerga): um id que estava na página 1 do
  // tick anterior e sumiu da página 1 deste tick. `idsPagina1Ref` guarda só
  // ids vistos via poll (nunca os de páginas 2+ carregadas por "carregar
  // mais"), então isso nunca derruba um comentário que só saiu da janela por
  // paginação — mas paginação não é só "carregar mais": a página 1 tem
  // tamanho fixo, então um comentário novo (ou um que acabou de virar
  // público, ficando visível pra esse usuário pela 1ª vez) empurra o
  // comentário que estava na última posição pra fora da janela SEM que ele
  // tenha sido apagado. `corteAgora` (criadoEm do comentário mais antigo que
  // ainda está na página 1 agora) resolve isso: um comentário que sumiu da
  // janela só conta como excluído/privado de verdade se ele ainda seria
  // cronologicamente elegível pra página 1 pela ordenação atual (criadoEm >=
  // corte) — se for mais antigo que o corte, só foi empurrado pra fora por
  // algo mais novo, continua existindo e fica como está até "carregar mais"
  // alcançá-lo.
  //
  // Novo de verdade: o comentário que desliza pra dentro da janela pra
  // preencher o buraco (de uma exclusão ou de algo que virou público) não é
  // novo — só ficou visível agora — mas como ainda não está em `idsAtuais`,
  // tratá-lo como novo o inseriria no topo da lista sem ser o mais recente
  // de verdade. `topoConhecidoEmRef` guarda o `criadoEm` do comentário mais
  // recente já visto; só quem foi criado DEPOIS disso entra no topo.
  const primeiraCargaFeita = useRef(false);
  const idsPagina1Ref = useRef<Set<string>>(new Set());
  const topoConhecidoEmRef = useRef<string | null>(null);
  const pollarPrimeiraPagina = useCallback(async () => {
    const r = await meditacaoApi.aulasComentarios(null);
    const idsPagina1Antes = idsPagina1Ref.current;
    const idsPagina1Agora = new Set(r.comentarios.map((c) => c.id));
    idsPagina1Ref.current = idsPagina1Agora;
    if (!primeiraCargaFeita.current) {
      primeiraCargaFeita.current = true;
      topoConhecidoEmRef.current = r.comentarios[0]?.criadoEm ?? null;
      setComentarios(r.comentarios);
      setCursor(r.proximoCursor);
      setTemMais(r.proximoCursor !== null);
      setCarregando(false);
      return;
    }
    const topoAntes = topoConhecidoEmRef.current;
    topoConhecidoEmRef.current = r.comentarios[0]?.criadoEm ?? topoAntes;
    const corteAgora = r.comentarios.length > 0 ? r.comentarios[r.comentarios.length - 1].criadoEm : null;
    setComentarios((atual) => {
      const idsAtuais = new Set(atual.map((c) => c.id));
      const semExcluidos = atual.filter(
        (c) => !idsPagina1Antes.has(c.id) || idsPagina1Agora.has(c.id) || corteAgora === null || c.criadoEm < corteAgora,
      );
      const atualizados = semExcluidos.map((c) => r.comentarios.find((n) => n.id === c.id) ?? c);
      const novosDeVerdade = r.comentarios.filter((n) => !idsAtuais.has(n.id) && (!topoAntes || n.criadoEm > topoAntes));
      return [...novosDeVerdade, ...atualizados];
    });
  }, []);
  usePolling(pollarPrimeiraPagina, 10000);

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
