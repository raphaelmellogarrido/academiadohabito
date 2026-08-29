import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Globe, Image as ImageIcon, Trash2 } from "lucide-react";
import { meditacaoApi, type AulaComentario } from "../api/meditacaoApi";
import { useAulaComentarios } from "../hooks/useAulaComentarios";

const REACOES: ("🙏" | "❤️" | "🔥")[] = ["🙏", "❤️", "🔥"];
const LIMITE_TEXTO = 140;

function ComentarioItem({
  comentario,
  onReagir,
  onExcluir,
  onResponder,
}: {
  comentario: AulaComentario;
  onReagir: (c: AulaComentario) => void;
  onExcluir: (id: string) => void;
  onResponder: (nome: string) => void;
}) {
  async function reagir(reacao: "🙏" | "❤️" | "🔥") {
    const r = await meditacaoApi.aulasReagir(comentario.id, reacao);
    onReagir(r.comentario);
  }

  async function excluir() {
    await meditacaoApi.aulasExcluirComentario(comentario.id);
    onExcluir(comentario.id);
  }

  return (
    <li className={`cm-comentario-item ${comentario.admin ? "is-admin" : ""}`}>
      <div className="cm-post-avatar">{comentario.nome.slice(0, 1).toUpperCase()}</div>
      <div className="cm-comentario-corpo">
        <div className="cm-comentario-topo">
          <p className="cm-comentario-autor">
            {comentario.nome}
            {comentario.admin && <span className="cm-badge-admin">ADMINISTRADOR</span>}
            <span> • Dia {comentario.diaAtual}</span>
          </p>
          <div className="cm-comentario-icones">
            {comentario.publico && (
              <span title="Comentário público">
                <Globe size={13} />
              </span>
            )}
            {comentario.podeExcluir && (
              <button type="button" className="cm-comentario-excluir" onClick={excluir} title="Excluir">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
        <p className="cm-comentario-texto">{comentario.texto}</p>
        {comentario.foto && <img src={comentario.foto} alt="" className="cm-comentario-foto" />}
        <div className="cm-post-acoes">
          {REACOES.map((r) => (
            <button key={r} type="button" onClick={() => reagir(r)} className="cm-post-reacao">
              {r} {comentario.reacoes[r] > 0 && comentario.reacoes[r]}
            </button>
          ))}
          <button type="button" className="cm-post-responder" onClick={() => onResponder(comentario.nome)}>
            Responder
          </button>
        </div>
      </div>
    </li>
  );
}

export function ComentariosAulas() {
  const {
    comentarios,
    carregando,
    carregandoMais,
    temMais,
    carregarMais,
    adicionarComentario,
    atualizarComentario,
    removerComentario,
  } = useAulaComentarios();
  const [texto, setTexto] = useState("");
  const [foto, setFoto] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const sentinelaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputFoto = useRef<HTMLInputElement>(null);

  // Scroll infinito: observa a sentinela no fim da lista e carrega a próxima
  // página quando ela entra na viewport (mesmo padrão do resto do app: sem
  // libs extras, só IntersectionObserver nativo).
  useEffect(() => {
    const alvo = sentinelaRef.current;
    if (!alvo || !temMais) return;
    const observer = new IntersectionObserver(
      (entradas) => entradas[0].isIntersecting && carregarMais(),
      { rootMargin: "120px" },
    );
    observer.observe(alvo);
    return () => observer.disconnect();
  }, [temMais, carregarMais]);

  function aoEscolherFoto(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = () => setFoto(leitor.result as string);
    leitor.readAsDataURL(arquivo);
  }

  function responder(nome: string) {
    setTexto((t) => (t.startsWith(`@${nome} `) ? t : `@${nome} ${t}`));
    textareaRef.current?.focus();
  }

  async function enviar() {
    if (!texto.trim() && !foto) return;
    setEnviando(true);
    try {
      const r = await meditacaoApi.aulasComentar(texto.trim(), foto);
      adicionarComentario(r.comentario);
      setTexto("");
      setFoto(null);
      if (inputFoto.current) inputFoto.current.value = "";
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="cm-comentarios-aulas">
      <div className="cartao cm-comentarios-composer">
        <textarea
          ref={textareaRef}
          value={texto}
          maxLength={LIMITE_TEXTO}
          placeholder="Deixe um comentário sobre a aula (texto ou emoji)…"
          onChange={(e) => setTexto(e.target.value)}
        />
        {foto && <img src={foto} alt="" className="cm-feed-composer-foto" />}
        <div className="cm-comentarios-composer-rodape">
          <button type="button" className="cm-feed-composer-foto-btn" onClick={() => inputFoto.current?.click()}>
            <ImageIcon size={16} />
          </button>
          <input ref={inputFoto} type="file" accept="image/*" hidden onChange={aoEscolherFoto} />
          <span className="cm-feed-composer-contador">
            {texto.length}/{LIMITE_TEXTO}
          </span>
          <button type="button" onClick={enviar} disabled={enviando || (!texto.trim() && !foto)}>
            Comentar
          </button>
        </div>
      </div>

      {carregando && <p className="carregando">Carregando…</p>}

      <ul className="cm-comentarios-lista">
        {comentarios.map((c) => (
          <ComentarioItem
            key={c.id}
            comentario={c}
            onReagir={atualizarComentario}
            onExcluir={removerComentario}
            onResponder={responder}
          />
        ))}
      </ul>

      <div ref={sentinelaRef} />
      {carregandoMais && <p className="carregando">Carregando mais…</p>}
    </div>
  );
}
