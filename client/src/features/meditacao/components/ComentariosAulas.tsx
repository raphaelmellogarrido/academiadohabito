import { useEffect, useRef, useState } from "react";
import { Bold, Italic } from "lucide-react";
import { meditacaoApi, type Visibilidade } from "../api/meditacaoApi";
import { VisibilityToggle } from "./VisibilityToggle";
import { useAulaComentarios } from "../hooks/useAulaComentarios";
import { ComentarioBloco } from "./ComentarioBloco";

const AJUDA_VISIBILIDADE: Record<Visibilidade, { icone: string; texto: string; tag?: string }> = {
  publico: { icone: "🌍", texto: "Visível para toda comunidade — seu comentário pode ajudar outra pessoa" },
  privado: { icone: "🔒", texto: "Apenas para você — seu diário pessoal, ninguém mais vê" },
  orientador: { icone: "💬", texto: "Apenas orientadores verão — receba um acolhimento privado", tag: "PRIVADO · ACOLHIMENTO" },
};

const LIMITE_TEXTO = 140;

// Composer/lista idênticos ao Feed do dashboard ("Sua prática hoje") — mesmas
// classes CSS, mesmo ComentarioBloco recursivo — só que sem upload de foto e
// com o cabeçalho trocado pro contexto de aulas (sem badge "Pergunta diária"
// nem a pergunta fixa sobre meditação, que não fazem sentido aqui).
//
// `arquivoAtivo` é o vídeo que o aluno está assistindo agora (vem de
// AulasPage/useAulas) — vai em cada comentário novo pra que o servidor grave
// o "Dia X, Aula Y" exibido no badge (ver aulas.routes.ts::localizarDiaEAulaIndex).
export function ComentariosAulas({ arquivoAtivo }: { arquivoAtivo: string }) {
  const {
    comentarios,
    carregando,
    carregandoMais,
    temMais,
    carregarMais,
    adicionarComentario,
    atualizarComentario,
    excluirNoComentario,
  } = useAulaComentarios();
  const [texto, setTexto] = useState("");
  const [visibilidade, setVisibilidade] = useState<Visibilidade>("publico");
  const [enviando, setEnviando] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sentinelaRef = useRef<HTMLDivElement>(null);

  // Scroll infinito: mesmo padrão do Feed.tsx.
  useEffect(() => {
    const alvo = sentinelaRef.current;
    if (!alvo || !temMais) return;
    const observer = new IntersectionObserver((entradas) => entradas[0].isIntersecting && carregarMais(), { rootMargin: "120px" });
    observer.observe(alvo);
    return () => observer.disconnect();
  }, [temMais, carregarMais]);

  function envolverSelecao(marcador: string) {
    const el = textareaRef.current;
    if (!el) return;
    const ini = el.selectionStart ?? 0;
    const fim = el.selectionEnd ?? 0;
    const meio = texto.slice(ini, fim) || "texto";
    const novo = `${texto.slice(0, ini)}${marcador}${meio}${marcador}${texto.slice(fim)}`.slice(0, LIMITE_TEXTO);
    setTexto(novo);
    requestAnimationFrame(() => {
      el.focus();
      const pos = ini + marcador.length + meio.length + marcador.length;
      el.setSelectionRange(pos, pos);
    });
  }

  async function enviar() {
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      const r = await meditacaoApi.aulasComentar(texto.trim(), arquivoAtivo, null, visibilidade);
      adicionarComentario(r.comentario);
      setTexto("");
    } finally {
      setEnviando(false);
    }
  }

  // Callbacks genéricos passados pro ComentarioBloco — `id` pode ser o
  // comentário raiz ou qualquer resposta dele em qualquer profundidade; o
  // servidor resolve a raiz e devolve a árvore inteira já atualizada, que
  // aqui substitui o comentário certo na lista (mesma chave: raiz.id).
  async function aoReagir(id: string, reacao: "🙏" | "❤️" | "🔥") {
    const r = await meditacaoApi.aulasReagir(id, reacao);
    atualizarComentario(r.comentario);
  }

  async function aoResponder(id: string, texto: string) {
    const r = await meditacaoApi.aulasResponder(id, texto);
    atualizarComentario(r.comentario);
  }

  async function aoEditar(id: string, texto: string) {
    const r = await meditacaoApi.aulasEditarComentario(id, texto);
    atualizarComentario(r.comentario);
  }

  async function aoAlterarVisibilidade(id: string, visibilidade: Visibilidade) {
    const r = await meditacaoApi.aulasAlterarVisibilidadeComentario(id, visibilidade);
    atualizarComentario(r.comentario);
  }

  // Apagar a raiz remove o comentário inteiro da lista; apagar uma resposta
  // aninhada substitui pela árvore restante (sem essa resposta).
  async function aoExcluir(id: string) {
    const r = await meditacaoApi.aulasExcluirComentario(id);
    excluirNoComentario(r.raizId, r.raiz);
  }

  return (
    <div className="cm-comentarios-aulas">
      <div className="cartao cm-feed-composer">
        <div className="cm-composer-cabecalho">
          <span className="cartao-titulo">Comentários sobre as aulas</span>
        </div>

        <div className="cm-composer-toolbar">
          <button type="button" title="Negrito" onClick={() => envolverSelecao("**")}>
            <Bold size={15} />
          </button>
          <button type="button" title="Itálico" onClick={() => envolverSelecao("_")}>
            <Italic size={15} />
          </button>
        </div>

        <div className="cm-composer-textarea-wrap">
          <textarea ref={textareaRef} value={texto} maxLength={LIMITE_TEXTO} placeholder="Deixe um comentário sobre a aula…" onChange={(e) => setTexto(e.target.value)} />
          <span className="cm-feed-composer-contador">
            {texto.length}/{LIMITE_TEXTO}
          </span>
        </div>

        <div className="cm-feed-composer-rodape">
          <VisibilityToggle value={visibilidade} onChange={setVisibilidade} />
          <button type="button" className="cm-btn-compartilhar" onClick={enviar} disabled={enviando || !texto.trim()}>
            Comentar
          </button>
        </div>

        <div className={`cm-visibility-ajuda cm-visibility-ajuda--${visibilidade}`}>
          <span>{AJUDA_VISIBILIDADE[visibilidade].icone}</span>
          <p>{AJUDA_VISIBILIDADE[visibilidade].texto}</p>
          {AJUDA_VISIBILIDADE[visibilidade].tag && <span className="cm-visibility-ajuda-tag">{AJUDA_VISIBILIDADE[visibilidade].tag}</span>}
        </div>
      </div>

      {carregando && <p className="carregando">Carregando…</p>}
      {comentarios.map((c) => (
        <ComentarioBloco
          key={c.id}
          no={c}
          nivel={0}
          badge={
            <span className="cm-comentario-dia">
              {" "}
              • Dia {c.dia}, Aula {c.aulaIndex}
            </span>
          }
          onReagir={aoReagir}
          onResponder={aoResponder}
          onEditar={aoEditar}
          onAlterarVisibilidade={aoAlterarVisibilidade}
          onExcluir={aoExcluir}
        />
      ))}

      <div ref={sentinelaRef} />
      {carregandoMais && <p className="carregando">Carregando mais…</p>}
    </div>
  );
}
