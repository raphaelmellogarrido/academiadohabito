import { lazy, Suspense, useEffect, useRef, useState, type ChangeEvent } from "react";
import { Bold, Italic, Smile, Image as ImageIcon } from "lucide-react";
import { EmojiStyle, type EmojiClickData } from "emoji-picker-react";
import { meditacaoApi, type Humor } from "../api/meditacaoApi";
import { VisibilityToggle, type Visibilidade } from "./VisibilityToggle";
import { ComentarioBloco } from "./ComentarioBloco";
import { FotoAnexo } from "./FotoAnexo";
import { useFeed } from "../hooks/useFeed";

const AJUDA_VISIBILIDADE: Record<Visibilidade, { icone: string; texto: string; tag?: string }> = {
  publico: { icone: "🌍", texto: "Visível para toda comunidade — sua experiência pode acolher outra pessoa" },
  privado: { icone: "🔒", texto: "Apenas para você — seu diário pessoal, ninguém mais vê" },
  orientador: { icone: "💬", texto: "Apenas orientadores verão — receba um acolhimento privado", tag: "PRIVADO · ACOLHIMENTO" },
};

const LIMITE_TEXTO = 140;

// Lazy: emoji-picker-react carrega junto a base inteira de emojis (~200KB
// gzip) — não faz sentido pesar o carregamento inicial da página pra quem
// nunca abre o picker. Só baixa no primeiro clique no botão de emoji.
const EmojiPicker = lazy(() => import("emoji-picker-react"));

const HUMORES: { valor: Humor; label: string }[] = [
  { valor: "calma", label: "Calma 😌" },
  { valor: "agitada", label: "Agitada 🌪️" },
  { valor: "cansada", label: "Cansada 😴" },
  { valor: "foco", label: "Foco 🎯" },
];

export function Feed() {
  const { posts, carregando, carregandoMais, temMais, carregarMais, adicionarPost, atualizarPost, excluirNoPost } = useFeed();
  const [texto, setTexto] = useState("");
  const [foto, setFoto] = useState<string | null>(null);
  const [visibilidade, setVisibilidade] = useState<Visibilidade>("publico");
  const [humor, setHumor] = useState<Humor>("calma");
  const [emojiAberto, setEmojiAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const inputFoto = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const sentinelaRef = useRef<HTMLDivElement>(null);

  // Scroll infinito: 20 posts por vez (mais recentes primeiro); observa a
  // sentinela no fim da lista e carrega a próxima leva quando ela entra na
  // viewport — mesmo padrão de ComentariosAulas.tsx, sem libs extras. Evita
  // travar renderizando os 1000+ comentários de uma vez só.
  useEffect(() => {
    const alvo = sentinelaRef.current;
    if (!alvo || !temMais) return;
    const observer = new IntersectionObserver((entradas) => entradas[0].isIntersecting && carregarMais(), { rootMargin: "120px" });
    observer.observe(alvo);
    return () => observer.disconnect();
  }, [temMais, carregarMais]);

  // Fecha o picker de emoji ao clicar fora dele.
  useEffect(() => {
    if (!emojiAberto) return;
    function aoClicarFora(e: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setEmojiAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [emojiAberto]);

  function inserirNoCursor(trecho: string) {
    const el = textareaRef.current;
    if (!el) {
      setTexto((t) => (t + trecho).slice(0, LIMITE_TEXTO));
      return;
    }
    const ini = el.selectionStart ?? texto.length;
    const fim = el.selectionEnd ?? texto.length;
    const novo = `${texto.slice(0, ini)}${trecho}${texto.slice(fim)}`.slice(0, LIMITE_TEXTO);
    setTexto(novo);
    requestAnimationFrame(() => {
      el.focus();
      const pos = ini + trecho.length;
      el.setSelectionRange(pos, pos);
    });
  }

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

  function aoEscolherFoto(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = () => setFoto(leitor.result as string);
    leitor.readAsDataURL(arquivo);
  }

  async function publicar() {
    if (!texto.trim() && !foto) return;
    setEnviando(true);
    try {
      const r = await meditacaoApi.postar(texto, foto, visibilidade, humor);
      adicionarPost(r.post);
      setTexto("");
      setFoto(null);
      if (inputFoto.current) inputFoto.current.value = "";
    } finally {
      setEnviando(false);
    }
  }

  // Callbacks genéricos passados pro ComentarioBloco — `id` pode ser o post
  // raiz ou qualquer resposta dele em qualquer profundidade; o servidor
  // resolve a raiz e devolve a árvore inteira já atualizada, que aqui
  // substitui o post certo na lista top-level (mesma chave: raiz.id).
  async function aoReagir(id: string, reacao: "🙏" | "❤️" | "🔥") {
    const r = await meditacaoApi.reagir(id, reacao);
    atualizarPost(r.post);
  }

  async function aoResponder(id: string, texto: string) {
    const r = await meditacaoApi.responder(id, texto);
    atualizarPost(r.post);
  }

  async function aoEditar(id: string, texto: string) {
    const r = await meditacaoApi.editarPost(id, texto);
    atualizarPost(r.post);
  }

  async function aoAlterarVisibilidade(id: string, visibilidade: Visibilidade) {
    const r = await meditacaoApi.alterarVisibilidadePost(id, visibilidade);
    atualizarPost(r.post);
  }

  // Apagar a raiz remove o post inteiro da lista; apagar uma resposta
  // aninhada substitui o post pela árvore restante (sem essa resposta).
  async function aoExcluir(id: string) {
    const r = await meditacaoApi.excluirPost(id);
    excluirNoPost(r.raizId, r.raiz);
  }

  return (
    <div className="cm-feed">
      <div className="cartao cm-feed-composer">
        <div className="cm-composer-cabecalho">
          <span className="cartao-titulo">Sua prática hoje</span>
          <span className="cm-composer-badge">Pergunta diária</span>
        </div>
        <h3 className="cm-composer-pergunta">Qual foi sua dificuldade ao meditar hoje?</h3>

        {/* <div className="cm-composer-humor">
          {HUMORES.map((h) => (
            <button key={h.valor} type="button" className={`cm-humor-pilula ${humor === h.valor ? "is-selecionada" : ""}`} onClick={() => setHumor(h.valor)}>
              {h.label}
            </button>
          ))}
        </div> */}

        <div className="cm-composer-toolbar">
          <button type="button" title="Negrito" onClick={() => envolverSelecao("**")}>
            <Bold size={15} />
          </button>
          <button type="button" title="Itálico" onClick={() => envolverSelecao("_")}>
            <Italic size={15} />
          </button>
          <div className="cm-composer-emoji-wrap" ref={emojiRef}>
            <button type="button" title="Emoji" onClick={() => setEmojiAberto((v) => !v)}>
              <Smile size={15} />
            </button>
            {emojiAberto && (
              // Lib completa (emoji-picker-react) em vez da lista fixa de
              // antes — busca + categorias, mesmo espírito do picker do
              // WhatsApp (ver renato_de_paula/.../DificuldadeDoDia.jsx). Não
              // fecha o popover ao escolher (mesmo comportamento de lá):
              // deixa selecionar vários emojis seguidos, só fecha ao clicar
              // fora (aoClicarFora acima). Width "100%" pro wrapper controlar
              // o tamanho real — vira bottom sheet em telas de celular (ver
              // .cm-emoji-picker-pop no CSS).
              <div className="cm-emoji-picker-pop">
                <Suspense fallback={null}>
                  {/* emojiStyle="native": sem isso a lib busca cada emoji como
                      imagem de um CDN externo (jsdelivr) — com centenas de
                      requests em paralelo a grade fica praticamente em
                      branco por vários segundos depois de abrir (bug
                      reportado: "não dá pra ver nada"). Native usa a fonte
                      de emoji do SO, renderiza na hora e não depende de
                      rede. */}
                  <EmojiPicker onEmojiClick={(dados: EmojiClickData) => inserirNoCursor(dados.emoji)} width="100%" height={360} previewConfig={{ showPreview: false }} emojiStyle={EmojiStyle.NATIVE} />
                </Suspense>
              </div>
            )}
          </div>
          <button type="button" title="Imagem" onClick={() => inputFoto.current?.click()}>
            <ImageIcon size={15} />
          </button>
          <input ref={inputFoto} type="file" accept="image/*" hidden onChange={aoEscolherFoto} />
        </div>

        <div className="cm-composer-textarea-wrap">
          <textarea ref={textareaRef} value={texto} maxLength={LIMITE_TEXTO} placeholder="Hoje eu senti…" onChange={(e) => setTexto(e.target.value)} />
          <span className="cm-feed-composer-contador">
            {texto.length}/{LIMITE_TEXTO}
          </span>
        </div>
        {foto && <FotoAnexo src={foto} />}

        <div className="cm-feed-composer-rodape">
          <VisibilityToggle value={visibilidade} onChange={setVisibilidade} />
          <button type="button" className="cm-btn-compartilhar" onClick={publicar} disabled={enviando || (!texto.trim() && !foto)}>
            Compartilhar
          </button>
        </div>

        <div className={`cm-visibility-ajuda cm-visibility-ajuda--${visibilidade}`}>
          <span>{AJUDA_VISIBILIDADE[visibilidade].icone}</span>
          <p>{AJUDA_VISIBILIDADE[visibilidade].texto}</p>
          {AJUDA_VISIBILIDADE[visibilidade].tag && <span className="cm-visibility-ajuda-tag">{AJUDA_VISIBILIDADE[visibilidade].tag}</span>}
        </div>
      </div>

      {carregando && <p className="carregando">Carregando…</p>}
      {posts.map((p) => (
        <ComentarioBloco key={p.id} no={p} nivel={0} onReagir={aoReagir} onResponder={aoResponder} onEditar={aoEditar} onAlterarVisibilidade={aoAlterarVisibilidade} onExcluir={aoExcluir} />
      ))}

      <div ref={sentinelaRef} />
      {carregandoMais && <p className="carregando">Carregando mais…</p>}
    </div>
  );
}
