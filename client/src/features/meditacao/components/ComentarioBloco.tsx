import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { NoComentario, Visibilidade } from "../api/meditacaoApi";
import { VisibilidadeIcone } from "./VisibilidadeIcone";

const REACOES: ("🙏" | "❤️" | "🔥")[] = ["🙏", "❤️", "🔥"];
const LIMITE_TEXTO = 140;

// "DD/MM/AAAA às HH:mm" — formato pedido pro layout novo (antes era
// toLocaleDateString curto, só data, sem hora).
function formatarDataHora(iso: string): string {
  const d = new Date(iso);
  const dois = (n: number) => String(n).padStart(2, "0");
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()} às ${dois(d.getHours())}:${dois(d.getMinutes())}`;
}

// Achata a árvore de respostas (resposta de resposta, em qualquer
// profundidade) numa lista única em ordem cronológica. Responder a uma
// resposta continua criando um nó aninhado no servidor (a hierarquia real
// não muda), mas visualmente todas ficam lado a lado, um nível só de
// indentação abaixo do post raiz — sem "escadinha" indentando cada vez mais
// a cada resposta-de-resposta.
function coletarRespostas(no: NoComentario): NoComentario[] {
  const todas: NoComentario[] = [];
  for (const r of no.respostas) {
    todas.push(r);
    todas.push(...coletarRespostas(r));
  }
  return todas.sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
}

// Componente recursivo único compartilhado entre Feed ("Sua prática hoje") e
// /aulas: renderiza 1 nó (post/comentário raiz OU qualquer resposta, em
// qualquer profundidade — mesmo shape `NoComentario`) e, embaixo dele, toda
// a árvore de respostas achatada num único nível de indentação via
// `.cm-post-respostas` (ver `coletarRespostas`) — responder a uma resposta
// ainda cria um nó aninhado no servidor, só não indenta mais um nível na tela.
//
// Os callbacks já vêm prontos do componente pai (Feed.tsx/ComentariosAulas.tsx):
// eles chamam a API passando o id DESTE nó específico (raiz ou aninhado — o
// servidor resolve a raiz internamente) e substituem a árvore inteira no
// estado a partir da resposta. Este componente não sabe nada sobre HTTP nem
// sobre onde a lista vive.
export function ComentarioBloco({
  no,
  nivel,
  badge,
  onReagir,
  onResponder,
  onEditar,
  onAlterarVisibilidade,
  onExcluir,
}: {
  no: NoComentario;
  nivel: number;
  badge?: ReactNode;
  onReagir: (id: string, reacao: "🙏" | "❤️" | "🔥") => void | Promise<void>;
  onResponder: (id: string, texto: string) => void | Promise<void>;
  onEditar: (id: string, texto: string) => void | Promise<void>;
  onAlterarVisibilidade: (id: string, visibilidade: Visibilidade) => void | Promise<void>;
  onExcluir: (id: string) => void | Promise<void>;
}) {
  const [respondendo, setRespondendo] = useState(false);
  const [textoResposta, setTextoResposta] = useState("");
  const [editando, setEditando] = useState(false);
  const [textoEdicao, setTextoEdicao] = useState(no.texto);
  const inputRespostaRef = useRef<HTMLInputElement>(null);

  // Ao abrir o box de resposta, já deixa "@Nome " digitado e o cursor
  // posicionado depois da menção, pronto pra continuar digitando.
  useEffect(() => {
    if (!respondendo) return;
    const el = inputRespostaRef.current;
    if (!el) return;
    el.focus();
    const pos = el.value.length;
    el.setSelectionRange(pos, pos);
  }, [respondendo]);

  function reagir(reacao: "🙏" | "❤️" | "🔥") {
    onReagir(no.id, reacao);
  }

  function alternarResposta() {
    setRespondendo((v) => {
      const abrir = !v;
      setTextoResposta(abrir ? `@${no.nome} ` : "");
      return abrir;
    });
  }

  function alterarVisibilidade(nova: Visibilidade) {
    onAlterarVisibilidade(no.id, nova);
  }

  function comecarEdicao() {
    setTextoEdicao(no.texto);
    setEditando(true);
  }

  async function salvarEdicao() {
    if (!textoEdicao.trim()) return;
    await onEditar(no.id, textoEdicao.trim());
    setEditando(false);
  }

  async function enviarResposta() {
    if (!textoResposta.trim()) return;
    await onResponder(no.id, textoResposta);
    setTextoResposta("");
    setRespondendo(false);
  }

  async function excluir() {
    await onExcluir(no.id);
  }

  return (
    <div className={`cm-post ${nivel > 0 ? "cm-post--resposta" : ""} ${no.admin ? "is-admin" : ""}`}>
      <div className="cm-post-cabecalho">
        <div className="cm-post-avatar">{no.nome.slice(0, 1).toUpperCase()}</div>
        <div className="cm-post-cabecalho-topo">
          <div>
            <strong>{no.nome}</strong>
            {/* {no.admin && <span className="cm-badge-admin">ADMINISTRADOR</span>}
            {badge} */}
          </div>
          <div className="cm-comentario-icones">
            {/* Resposta não tem opção de visibilidade própria: ela segue
                sempre a visibilidade do post raiz (pública se o post é
                público; se o autor torna o post privado, post e respostas
                inteiros somem pra todo mundo menos ele — ver podeVerPost em
                community.store.ts/_feed.php). Só a raiz (nivel 0) mostra o
                seletor. */}
            {nivel === 0 && <VisibilidadeIcone valor={no.visibilidade} podeAlterar={no.podeEditar} onAlterar={alterarVisibilidade} />}
            <span className="cm-post-quando">{formatarDataHora(no.criadoEm)}</span>
            {no.podeEditar && (
              <button type="button" className="cm-comentario-editar" onClick={comecarEdicao} title="Editar">
                <Pencil size={13} />
              </button>
            )}
            {no.podeExcluir && (
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
        <p className="cm-post-texto">{no.texto}</p>
      )}
      {no.foto && <img src={no.foto} alt="" className="cm-post-foto" />}

      <div className="cm-post-acoes">
        <button type="button" className="cm-post-responder" onClick={alternarResposta}>
          Responder
        </button>
        <div className="cm-post-reacoes">
          {REACOES.map((r) => (
            <button key={r} type="button" onClick={() => reagir(r)} className="cm-post-reacao">
              {r} {no.reacoes[r] > 0 && no.reacoes[r]}
            </button>
          ))}
        </div>
      </div>

      {respondendo && (
        <div className="cm-post-resposta-form">
          <input ref={inputRespostaRef} value={textoResposta} maxLength={LIMITE_TEXTO} onChange={(e) => setTextoResposta(e.target.value)} placeholder="Escreva uma resposta…" onKeyDown={(e) => e.key === "Enter" && enviarResposta()} />
          <button type="button" onClick={enviarResposta}>
            Enviar
          </button>
        </div>
      )}

      {/* Só a raiz (nivel 0) desenha a caixa de respostas — toda a árvore de
          respostas-de-respostas é achatada aqui num único nível visual (ver
          `coletarRespostas`), então os nós aninhados abaixo nunca desenham
          sua própria `.cm-post-respostas` de novo. */}
      {nivel === 0 && no.respostas.length > 0 && (
        <div className="cm-post-respostas">
          {coletarRespostas(no).map((r) => (
            <ComentarioBloco key={r.id} no={r} nivel={1} onReagir={onReagir} onResponder={onResponder} onEditar={onEditar} onAlterarVisibilidade={onAlterarVisibilidade} onExcluir={onExcluir} />
          ))}
        </div>
      )}
    </div>
  );
}
