import { useEffect, useRef, useState } from "react";
import { meditacaoApi } from "../api/meditacaoApi";
import { useAulaComentarios } from "../hooks/useAulaComentarios";

const LIMITE_TEXTO = 140;

export function ComentariosAulas() {
  const { comentarios, carregando, carregandoMais, temMais, carregarMais, adicionarComentario } =
    useAulaComentarios();
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const sentinelaRef = useRef<HTMLDivElement>(null);

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

  async function enviar() {
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      const r = await meditacaoApi.aulasComentar(texto.trim());
      adicionarComentario(r.comentario);
      setTexto("");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="cm-comentarios-aulas">
      <div className="cartao cm-comentarios-composer">
        <textarea
          value={texto}
          maxLength={LIMITE_TEXTO}
          placeholder="Deixe um comentário sobre a aula (texto ou emoji)…"
          onChange={(e) => setTexto(e.target.value)}
        />
        <div className="cm-comentarios-composer-rodape">
          <span className="cm-feed-composer-contador">
            {texto.length}/{LIMITE_TEXTO}
          </span>
          <button type="button" onClick={enviar} disabled={enviando || !texto.trim()}>
            Comentar
          </button>
        </div>
      </div>

      {carregando && <p className="carregando">Carregando…</p>}

      <ul className="cm-comentarios-lista">
        {comentarios.map((c) => (
          <li key={c.id} className="cm-comentario-item">
            <div className="cm-post-avatar">{c.nome.slice(0, 1).toUpperCase()}</div>
            <div>
              <p className="cm-comentario-autor">
                {c.nome} <span>• Dia {c.diaAtual}</span>
              </p>
              <p className="cm-comentario-texto">{c.texto}</p>
            </div>
          </li>
        ))}
      </ul>

      <div ref={sentinelaRef} />
      {carregandoMais && <p className="carregando">Carregando mais…</p>}
    </div>
  );
}
