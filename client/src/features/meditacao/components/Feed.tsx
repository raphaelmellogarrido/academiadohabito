import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Bold, Italic, Smile, Image as ImageIcon, Pencil, Trash2 } from "lucide-react";
import { meditacaoApi, type Humor, type Post } from "../api/meditacaoApi";
import { VisibilityToggle, type Visibilidade } from "./VisibilityToggle";
import { VisibilidadeIcone } from "./VisibilidadeIcone";

const AJUDA_VISIBILIDADE: Record<Visibilidade, { icone: string; texto: string; tag?: string }> = {
  publico: { icone: "🌍", texto: "Visível para toda comunidade — sua experiência pode acolher outra pessoa" },
  privado: { icone: "🔒", texto: "Apenas para você — seu diário pessoal, ninguém mais vê" },
  orientador: { icone: "💬", texto: "Apenas orientadores verão — receba um acolhimento privado", tag: "PRIVADO · ACOLHIMENTO" },
};

const REACOES: ("🙏" | "❤️" | "🔥")[] = ["🙏", "❤️", "🔥"];
const LIMITE_TEXTO = 140;

const HUMORES: { valor: Humor; label: string }[] = [
  { valor: "calma", label: "Calma 😌" },
  { valor: "agitada", label: "Agitada 🌪️" },
  { valor: "cansada", label: "Cansada 😴" },
  { valor: "foco", label: "Foco 🎯" },
];

const EMOJIS = ["😊", "😌", "😢", "😴", "🙏", "❤️", "🔥", "🌱", "🪷", "✨", "💪", "🧘", "👍", "🎉", "☀️", "🌙", "💧", "🍃"];

function PostItem({ post, onMudou, onExcluir }: { post: Post; onMudou: (p: Post) => void; onExcluir: (id: string) => void }) {
  const [respondendo, setRespondendo] = useState(false);
  const [textoResposta, setTextoResposta] = useState("");
  const [editando, setEditando] = useState(false);
  const [textoEdicao, setTextoEdicao] = useState(post.texto);

  async function reagir(reacao: "🙏" | "❤️" | "🔥") {
    const r = await meditacaoApi.reagir(post.id, reacao);
    onMudou(r.post);
  }

  async function enviarResposta() {
    if (!textoResposta.trim()) return;
    const r = await meditacaoApi.responder(post.id, textoResposta);
    onMudou(r.post);
    setTextoResposta("");
    setRespondendo(false);
  }

  async function alterarVisibilidade(nova: Visibilidade) {
    const r = await meditacaoApi.alterarVisibilidadePost(post.id, nova);
    onMudou(r.post);
  }

  function comecarEdicao() {
    setTextoEdicao(post.texto);
    setEditando(true);
  }

  async function salvarEdicao() {
    if (!textoEdicao.trim()) return;
    const r = await meditacaoApi.editarPost(post.id, textoEdicao.trim());
    onMudou(r.post);
    setEditando(false);
  }

  async function excluir() {
    await meditacaoApi.excluirPost(post.id);
    onExcluir(post.id);
  }

  return (
    <div className="cm-post">
      <div className="cm-post-cabecalho">
        <div className="cm-post-avatar">{post.nome.slice(0, 1).toUpperCase()}</div>
        <div className="cm-post-cabecalho-topo">
          <div>
            <strong>{post.nome}</strong>
            <span className="cm-post-quando">
              {new Date(post.criadoEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" })}
            </span>
          </div>
          <div className="cm-comentario-icones">
            <VisibilidadeIcone valor={post.visibilidade} podeAlterar={post.podeEditar} onAlterar={alterarVisibilidade} />
            {post.podeEditar && (
              <button type="button" className="cm-comentario-editar" onClick={comecarEdicao} title="Editar">
                <Pencil size={13} />
              </button>
            )}
            {post.podeExcluir && (
              <button type="button" className="cm-comentario-excluir" onClick={excluir} title="Excluir">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {editando ? (
        <div className="cm-post-resposta-form">
          <input value={textoEdicao} maxLength={LIMITE_TEXTO} onChange={(e) => setTextoEdicao(e.target.value)} onKeyDown={(e) => e.key === "Enter" && salvarEdicao()} />
          <button type="button" onClick={salvarEdicao}>
            Salvar
          </button>
          <button type="button" className="cm-post-edicao-cancelar" onClick={() => setEditando(false)}>
            Cancelar
          </button>
        </div>
      ) : (
        <p className="cm-post-texto">{post.texto}</p>
      )}
      {post.foto && <img src={post.foto} alt="" className="cm-post-foto" />}

      <div className="cm-post-acoes">
        <button type="button" className="cm-post-responder" onClick={() => setRespondendo((v) => !v)}>
          Responder
        </button>
        <div className="cm-post-reacoes">
          {REACOES.map((r) => (
            <button key={r} type="button" onClick={() => reagir(r)} className="cm-post-reacao">
              {r} {post.reacoes[r] > 0 && post.reacoes[r]}
            </button>
          ))}
        </div>
      </div>

      {post.respostas.length > 0 && (
        <ul className="cm-post-respostas">
          {post.respostas.map((r) => (
            <li key={r.id}>
              <strong>{r.nome}:</strong> {r.texto}
            </li>
          ))}
        </ul>
      )}

      {respondendo && (
        <div className="cm-post-resposta-form">
          <input value={textoResposta} onChange={(e) => setTextoResposta(e.target.value)} placeholder="Escreva uma resposta…" onKeyDown={(e) => e.key === "Enter" && enviarResposta()} />
          <button type="button" onClick={enviarResposta}>
            Enviar
          </button>
        </div>
      )}
    </div>
  );
}

export function Feed() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [texto, setTexto] = useState("");
  const [foto, setFoto] = useState<string | null>(null);
  const [visibilidade, setVisibilidade] = useState<Visibilidade>("publico");
  const [humor, setHumor] = useState<Humor>("calma");
  const [emojiAberto, setEmojiAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const inputFoto = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    meditacaoApi.feed().then((r) => setPosts(r.posts));
  }, []);

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
      setPosts((atual) => [r.post, ...(atual ?? [])]);
      setTexto("");
      setFoto(null);
      if (inputFoto.current) inputFoto.current.value = "";
    } finally {
      setEnviando(false);
    }
  }

  function aoMudarPost(post: Post) {
    setPosts((atual) => (atual ?? []).map((p) => (p.id === post.id ? post : p)));
  }

  function aoExcluirPost(id: string) {
    setPosts((atual) => (atual ?? []).filter((p) => p.id !== id));
  }

  return (
    <div className="cm-feed">
      <div className="cartao cm-feed-composer">
        <div className="cm-composer-cabecalho">
          <span className="cartao-titulo">Sua prática hoje</span>
          <span className="cm-composer-badge">Pergunta diária</span>
        </div>
        <h3 className="cm-composer-pergunta">Qual foi sua dificuldade ao meditar hoje?</h3>

        <div className="cm-composer-humor">
          {HUMORES.map((h) => (
            <button key={h.valor} type="button" className={`cm-humor-pilula ${humor === h.valor ? "is-selecionada" : ""}`} onClick={() => setHumor(h.valor)}>
              {h.label}
            </button>
          ))}
        </div>

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
              <div className="cm-emoji-picker">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => {
                      inserirNoCursor(e);
                      setEmojiAberto(false);
                    }}
                  >
                    {e}
                  </button>
                ))}
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
        {foto && <img src={foto} alt="" className="cm-feed-composer-foto" />}

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

      {posts === null && <p className="carregando">Carregando…</p>}
      {posts?.map((p) => (
        <PostItem key={p.id} post={p} onMudou={aoMudarPost} onExcluir={aoExcluirPost} />
      ))}
    </div>
  );
}
