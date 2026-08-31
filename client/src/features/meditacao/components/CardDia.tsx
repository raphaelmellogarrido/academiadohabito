import { Check, Lock } from "lucide-react";
import type { AulaProgressoArquivo, DiaAulas } from "../api/meditacaoApi";
import type { ResultadoBloqueio } from "../lib/progressoDias";

// Sidebar "vídeos do dia" — troca o antigo <select> puro de dias por um
// dropdown de dia + lista dos vídeos daquele dia, com cadeado nos bloqueados
// e bolinha de check nos concluídos, espelhando
// renato_de_paula/src/pages/comunidade/AulasMeditacaoRaiz.jsx.
export function CardDia({
  dias,
  diaEfetivo,
  videoAtivoArquivo,
  bloqueioPorArquivo,
  progressoPorArquivo,
  diaMaximoLiberado,
  onSelecionarVideo,
  onTrocarDia,
}: {
  dias: DiaAulas[];
  diaEfetivo: number;
  videoAtivoArquivo: string;
  bloqueioPorArquivo: Record<string, ResultadoBloqueio>;
  progressoPorArquivo: Record<string, AulaProgressoArquivo>;
  diaMaximoLiberado: number;
  onSelecionarVideo: (arquivo: string) => void;
  onTrocarDia: (dia: number) => void;
}) {
  const diaAtual = dias.find((d) => d.dia === diaEfetivo);
  if (!diaAtual) return null;

  return (
    <div className="cartao cm-aula-videos-do-dia">
      <div className="cm-aula-videos-do-dia-cabecalho">
        <p className="cartao-titulo">Dia {diaAtual.dia}</p>
        <select className="cm-dia-select" value={diaEfetivo} onChange={(e) => onTrocarDia(Number(e.target.value))}>
          {dias.map((d) => {
            const bloqueadoNoDropdown = d.dia > diaMaximoLiberado;
            const concluido = d.videos.every((v) => !!progressoPorArquivo[v.arquivo]?.assistida);
            return (
              <option key={d.dia} value={d.dia} disabled={bloqueadoNoDropdown}>
                Dia {d.dia}
                {concluido ? " ✓" : ""}
                {bloqueadoNoDropdown ? " 🔒" : ""}
              </option>
            );
          })}
        </select>
      </div>

      <ul className="cm-video-item-lista">
        {diaAtual.videos.map((video) => {
          const bloqueio = bloqueioPorArquivo[video.arquivo];
          const bloqueado = !!bloqueio && !bloqueio.liberado;
          const concluida = !!progressoPorArquivo[video.arquivo]?.assistida;
          const ativo = video.arquivo === videoAtivoArquivo;
          return (
            <li key={video.arquivo}>
              <button
                type="button"
                className={`cm-video-item ${ativo ? "is-ativo" : ""} ${bloqueado ? "is-bloqueado" : ""}`}
                onClick={() => onSelecionarVideo(video.arquivo)}
              >
                <span className={`cm-video-item-dot ${concluida ? "is-concluido" : ""}`}>
                  {concluida && <Check size={9} className="cm-video-check is-concluido" />}
                </span>
                <span className="cm-video-item-titulo">{video.titulo}</span>
                {bloqueado && <Lock size={11} className="cm-video-item-lock" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
