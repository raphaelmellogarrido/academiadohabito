import { useEffect, useState } from "react";
import { meditacaoApi } from "../../meditacao/api/meditacaoApi";

// Pré-carrega com GET /meditacao/lives/proxima (mesmo endpoint que
// ProximoEncontro.tsx usa) e salva com PUT (editarEncontro, 403 se
// não-admin no servidor). ProximoEncontro.tsx já faz polling de 3s — o card
// do dashboard reflete essa edição sozinho, sem nada extra aqui.
//
// `dataISO` sempre chega/sai com offset explícito -03:00 (ver isoComOffset
// em _feed.php / seed em _encontro.php e live.store.ts) — o app inteiro
// trata "data do encontro" como horário de Brasília, não do fuso do
// navegador, então o campo datetime-local edita só a parte
// "YYYY-MM-DDTHH:mm" (sem timezone) e a gente recoloca o offset fixo ao
// salvar, igual ao resto do projeto já assume.
function isoParaCampoLocal(iso: string): string {
  return iso.slice(0, 16);
}

function campoLocalParaIso(campo: string): string {
  return `${campo}:00-03:00`;
}

export function CardEncontroAdmin() {
  const [titulo, setTitulo] = useState("");
  const [dataLocal, setDataLocal] = useState("");
  const [duracaoMin, setDuracaoMin] = useState(60);
  const [anfitriao, setAnfitriao] = useState("");
  const [checklist, setChecklist] = useState("");
  const [aoVivo, setAoVivo] = useState(false);
  const [linkLive, setLinkLive] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);

  useEffect(() => {
    meditacaoApi.proximoEncontro().then((r) => {
      const e = r.encontro;
      setTitulo(e.titulo);
      setDataLocal(isoParaCampoLocal(e.dataISO));
      setDuracaoMin(e.duracaoMin);
      setAnfitriao(e.anfitriao);
      setChecklist(e.checklist.join("\n"));
      setAoVivo(e.aoVivo);
      setLinkLive(e.linkLive ?? "");
      setCarregando(false);
    });
  }, []);

  async function salvar() {
    setSalvando(true);
    setMensagem(null);
    try {
      await meditacaoApi.editarEncontro({
        titulo,
        dataISO: campoLocalParaIso(dataLocal),
        duracaoMin,
        anfitriao,
        aoVivo,
        linkLive: aoVivo ? linkLive : null,
        checklist: checklist
          .split("\n")
          .map((linha) => linha.trim())
          .filter(Boolean),
      });
      setMensagem({ tipo: "sucesso", texto: "encontro atualizado — aparece pra todo mundo em até 3s" });
    } catch (e) {
      setMensagem({ tipo: "erro", texto: e instanceof Error ? e.message : "falha ao salvar" });
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return null;

  const podeEnviar = titulo.trim() && dataLocal && duracaoMin > 0 && anfitriao.trim() && !salvando;

  return (
    <div className="cartao adm-card">
      <p className="cartao-titulo">🔴 Próximo encontro ao vivo</p>

      <label className="adm-campo">
        <span>Título</span>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </label>
      <label className="adm-campo">
        <span>Data e hora (Brasília)</span>
        <input type="datetime-local" value={dataLocal} onChange={(e) => setDataLocal(e.target.value)} />
      </label>
      <label className="adm-campo">
        <span>Duração (min)</span>
        <input
          type="number"
          min={1}
          value={duracaoMin}
          onChange={(e) => setDuracaoMin(Number(e.target.value))}
        />
      </label>
      <label className="adm-campo">
        <span>Anfitrião</span>
        <input value={anfitriao} onChange={(e) => setAnfitriao(e.target.value)} />
      </label>
      <label className="adm-campo">
        <span>Checklist (1 item por linha)</span>
        <textarea rows={3} value={checklist} onChange={(e) => setChecklist(e.target.value)} />
      </label>

      <label className="adm-campo adm-campo--linha">
        <input type="checkbox" checked={aoVivo} onChange={(e) => setAoVivo(e.target.checked)} />
        <span>Ao vivo agora</span>
      </label>
      <label className="adm-campo">
        <span>Link da live</span>
        <input
          value={linkLive}
          onChange={(e) => setLinkLive(e.target.value)}
          disabled={!aoVivo}
          placeholder="https://..."
        />
      </label>

      {mensagem && <p className={`cfg-mensagem cfg-mensagem--${mensagem.tipo}`}>{mensagem.texto}</p>}

      <button type="button" className="cfg-btn-primario" onClick={salvar} disabled={!podeEnviar}>
        {salvando ? "Salvando…" : "Salvar encontro"}
      </button>
    </div>
  );
}
