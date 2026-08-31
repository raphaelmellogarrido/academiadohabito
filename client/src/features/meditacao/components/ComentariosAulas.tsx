import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Image as ImageIcon } from "lucide-react";
import { meditacaoApi, type Visibilidade } from "../api/meditacaoApi";
import { useAulaComentarios } from "../hooks/useAulaComentarios";
import { ComentarioBloco } from "./ComentarioBloco";
import { FotoAnexo } from "./FotoAnexo";

const LIMITE_TEXTO = 140;

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

  async function enviar() {
    if (!texto.trim() && !foto) return;
    setEnviando(true);
    try {
      const r = await meditacaoApi.aulasComentar(texto.trim(), arquivoAtivo, foto);
      adicionarComentario(r.comentario);
      setTexto("");
      setFoto(null);
      if (inputFoto.current) inputFoto.current.value = "";
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
      <div className="cartao cm-comentarios-composer">
        <textarea
          ref={textareaRef}
          value={texto}
          maxLength={LIMITE_TEXTO}
          placeholder="Deixe um comentário sobre a aula (texto ou emoji)…"
          onChange={(e) => setTexto(e.target.value)}
        />
        {foto && <FotoAnexo src={foto} />}
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

      <div className="cm-comentarios-lista">
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
      </div>

      <div ref={sentinelaRef} />
      {carregandoMais && <p className="carregando">Carregando mais…</p>}
    </div>
  );
}
