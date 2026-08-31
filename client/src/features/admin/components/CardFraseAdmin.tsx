import { useEffect, useState } from "react";
import { meditacaoApi } from "../../meditacao/api/meditacaoApi";

// Pré-carrega com GET /meditacao/frase (mesmo endpoint que FraseSemana.tsx
// usa pra exibir) e salva com PUT (editarFrase, 403 se não-admin no
// servidor). FraseSemana.tsx já faz polling de 3s — o card do dashboard
// reflete essa edição sozinho, sem nada extra aqui.
export function CardFraseAdmin() {
  const [frase, setFrase] = useState("");
  const [autor, setAutor] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);

  useEffect(() => {
    meditacaoApi.frase().then((r) => {
      setFrase(r.frase);
      setAutor(r.autor);
      setCarregando(false);
    });
  }, []);

  async function salvar() {
    setSalvando(true);
    setMensagem(null);
    try {
      await meditacaoApi.editarFrase(frase, autor);
      setMensagem({ tipo: "sucesso", texto: "frase atualizada — aparece pra todo mundo em até 3s" });
    } catch (e) {
      setMensagem({ tipo: "erro", texto: e instanceof Error ? e.message : "falha ao salvar" });
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return null;

  const podeEnviar = frase.trim() && !salvando;

  return (
    <div className="cartao adm-card">
      <p className="cartao-titulo">💬 Frase da semana</p>

      <label className="adm-campo">
        <span>Frase</span>
        <textarea rows={3} value={frase} onChange={(e) => setFrase(e.target.value)} />
      </label>
      <label className="adm-campo">
        <span>Autor</span>
        <input value={autor} onChange={(e) => setAutor(e.target.value)} />
      </label>

      {mensagem && <p className={`cfg-mensagem cfg-mensagem--${mensagem.tipo}`}>{mensagem.texto}</p>}

      <button type="button" className="cfg-btn-primario" onClick={salvar} disabled={!podeEnviar}>
        {salvando ? "Salvando…" : "Salvar frase"}
      </button>
    </div>
  );
}
