import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Image as ImageIcon } from "lucide-react";
import { meditacaoApi, type Post } from "../api/meditacaoApi";

const REACOES: ("🙏" | "❤️" | "🔥")[] = ["🙏", "❤️", "🔥"];
const LIMITE_TEXTO = 140;

function PostItem({ post, onMudou }: { post: Post; onMudou: (p: Post) => void }) {
  const [respondendo, setRespondendo] = useState(false);
  const [textoResposta, setTextoResposta] = useState("");

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

  return (
    <div className="cm-post">
      <div className="cm-post-cabecalho">
        <div className="cm-post-avatar">{post.nome.slice(0, 1).toUpperCase()}</div>
        <div>
          <strong>{post.nome}</strong>
          <span className="cm-post-quando">{new Date(post.criadoEm).toLocaleString("pt-BR")}</span>
        </div>
        {!post.publico && <span className="cm-post-privado">Privado</span>}
      </div>
      <p className="cm-post-texto">{post.texto}</p>
      {post.foto && <img src={post.foto} alt="" className="cm-post-foto" />}

      <div className="cm-post-acoes">
        {REACOES.map((r) => (
          <button key={r} type="button" onClick={() => reagir(r)} className="cm-post-reacao">
            {r} {post.reacoes[r] > 0 && post.reacoes[r]}
          </button>
        ))}
        <button type="button" className="cm-post-responder" onClick={() => setRespondendo((v) => !v)}>
          Responder
        </button>
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
          <input
            value={textoResposta}
            onChange={(e) => setTextoResposta(e.target.value)}
            placeholder="Escreva uma resposta…"
            onKeyDown={(e) => e.key === "Enter" && enviarResposta()}
          />
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
  const [publico, setPublico] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const inputFoto = useRef<HTMLInputElement>(null);

  useEffect(() => {
    meditacaoApi.feed().then((r) => setPosts(r.posts));
  }, []);

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
      const r = await meditacaoApi.postar(texto, foto, publico);
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

  return (
    <div className="cm-feed">
      <div className="cartao cm-feed-composer">
        <textarea
          value={texto}
          maxLength={LIMITE_TEXTO}
          placeholder="O que você sentiu na prática de hoje?"
          onChange={(e) => setTexto(e.target.value)}
        />
        {foto && <img src={foto} alt="" className="cm-feed-composer-foto" />}
        <div className="cm-feed-composer-rodape">
          <div className="cm-feed-composer-esquerda">
            <button type="button" onClick={() => inputFoto.current?.click()} className="cm-feed-composer-foto-btn">
              <ImageIcon size={16} />
            </button>
            <input ref={inputFoto} type="file" accept="image/*" hidden onChange={aoEscolherFoto} />
            <label className="cm-feed-composer-publico">
              <input type="checkbox" checked={publico} onChange={(e) => setPublico(e.target.checked)} />
              Público
            </label>
          </div>
          <div className="cm-feed-composer-direita">
            <span className="cm-feed-composer-contador">
              {texto.length}/{LIMITE_TEXTO}
            </span>
            <button type="button" onClick={publicar} disabled={enviando || (!texto.trim() && !foto)}>
              Publicar
            </button>
          </div>
        </div>
      </div>

      {posts === null && <p className="carregando">Carregando…</p>}
      {posts?.map((p) => (
        <PostItem key={p.id} post={p} onMudou={aoMudarPost} />
      ))}
    </div>
  );
}
