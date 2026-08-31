import { useEffect, useState } from "react";
import { meditacaoApi } from "../../meditacao/api/meditacaoApi";

// Pré-carrega com GET /meditacao/desafios/admin (textos crus, sem
// `concluido` — que é por-usuário) e salva com PUT (editarDesafiosSemana,
// 403 se não-admin no servidor). DesafiosSemana.tsx já faz polling de 10s —
// o card do dashboard reflete a troca de texto sozinho, sem nada extra
// aqui. "Resetar desafios" é uma ação separada (POST, zera a marcação de
// TODOS os usuários) — por isso o confirm antes de disparar.
export function CardDesafiosAdmin() {
  const [itens, setItens] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [resetando, setResetando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);

  useEffect(() => {
    meditacaoApi.desafiosAdmin().then((r) => {
      setItens(r.textos.join("\n"));
      setCarregando(false);
    });
  }, []);

  async function salvar() {
    setSalvando(true);
    setMensagem(null);
    try {
      const textos = itens
        .split("\n")
        .map((linha) => linha.trim())
        .filter(Boolean);
      const r = await meditacaoApi.editarDesafios(textos);
      setItens(r.textos.join("\n"));
      setMensagem({ tipo: "sucesso", texto: "desafios atualizados — aparece pra todo mundo em até 10s" });
    } catch (e) {
      setMensagem({ tipo: "erro", texto: e instanceof Error ? e.message : "falha ao salvar" });
    } finally {
      setSalvando(false);
    }
  }

  async function resetar() {
    if (!confirm("Resetar os desafios da semana de TODOS os usuários? Essa ação não pode ser desfeita.")) return;
    setResetando(true);
    setMensagem(null);
    try {
      await meditacaoApi.resetarDesafios();
      setMensagem({ tipo: "sucesso", texto: "desafios resetados pra todo mundo" });
    } catch (e) {
      setMensagem({ tipo: "erro", texto: e instanceof Error ? e.message : "falha ao resetar" });
    } finally {
      setResetando(false);
    }
  }

  if (carregando) return null;

  const podeEnviar = itens.trim() && !salvando;

  return (
    <div className="cartao adm-card">
      <p className="cartao-titulo">🔥 Desafios da semana</p>

      <label className="adm-campo">
        <span>Desafios (1 por linha)</span>
        <textarea rows={4} value={itens} onChange={(e) => setItens(e.target.value)} />
      </label>

      {mensagem && <p className={`cfg-mensagem cfg-mensagem--${mensagem.tipo}`}>{mensagem.texto}</p>}

      <div className="adm-card-acoes">
        <button type="button" className="cfg-btn-primario" onClick={salvar} disabled={!podeEnviar}>
          {salvando ? "Salvando…" : "Salvar desafios"}
        </button>
        <button type="button" className="cfg-btn-secundario" onClick={resetar} disabled={resetando}>
          {resetando ? "Resetando…" : "Resetar desafios"}
        </button>
      </div>
    </div>
  );
}
