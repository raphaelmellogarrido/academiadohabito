import { useAulasCatalogo } from "../hooks/useAulasCatalogo";
import { useAulas } from "../hooks/useAulas";
import { VideoAula } from "../components/VideoAula";
import { ComentariosAulas } from "../components/ComentariosAulas";
import { CardDia } from "../components/CardDia";
import { JornadaAulas } from "../components/JornadaAulas";
import "../meditacao.css";

// Layout: vídeo + feed de comentários (coluna principal) | Dia + Jornada
// (coluna direita) — mesma grade de 2 colunas do dashboard, só que 1x2.
// Catálogo (dias/vídeos, vem do filesystem) e progresso (por vídeo, por
// usuário) são duas fontes separadas — ver useAulasCatalogo/useAulas.
export function AulasPage() {
  const { dias, carregando: catalogoCarregando, erro: catalogoErro } = useAulasCatalogo();
  const aulas = useAulas(dias, catalogoCarregando);

  if (catalogoErro) {
    return <p className="erro">Não foi possível carregar as aulas. Tente recarregar a página.</p>;
  }
  if (aulas.carregando) return <div className="carregando">Carregando…</div>;
  if (!aulas.diaAtual || !aulas.videoAtivo) return null;

  const video = aulas.videoAtivo;

  return (
    <div className="cm-aulas">
      <div className="cm-aulas-principal">
        {aulas.emPausaObrigatoria && (
          <div className="cm-pausa-banner" role="status">
            <span className="cm-pausa-banner-icone" aria-hidden="true">⏳</span>
            <span>
              Pausa obrigatória em andamento — faltam{" "}
              <strong>
                {aulas.bloqueioProximoDia?.diasRestantes} dia{aulas.bloqueioProximoDia?.diasRestantes === 1 ? "" : "s"}
              </strong>{" "}
              para liberar o próximo módulo (Dia {aulas.maxDiaCompleto + 1}).
            </span>
          </div>
        )}
        <VideoAula
          dia={aulas.diaAtual.dia}
          video={video}
          onTimeUpdate={aulas.handleTimeUpdatePlayer}
          onEnded={aulas.irParaProximoVideo}
        />
        <ComentariosAulas arquivoAtivo={video.arquivo} />
      </div>

      <div className="cm-aulas-lateral">
        <CardDia
          dias={dias}
          diaEfetivo={aulas.diaAtual.dia}
          videoAtivoArquivo={video.arquivo}
          bloqueioPorArquivo={aulas.bloqueioPorArquivo}
          progressoPorArquivo={aulas.progressoPorArquivo}
          diaMaximoLiberado={aulas.diaMaximoLiberado}
          onSelecionarVideo={aulas.selecionarVideo}
          onTrocarDia={aulas.handleTrocarDia}
          onToggleConcluida={aulas.toggleConcluida}
        />
        <JornadaAulas
          totalConcluidos={aulas.totalConcluidos}
          totalVideos={aulas.totalVideos}
          percentual={aulas.percentual}
          jornadaCompleta={aulas.jornadaCompleta}
          bloqueio={aulas.bloqueioVideoAtivo}
        />
      </div>

      {aulas.toast && <div className="cm-aula-toast">{aulas.toast}</div>}
    </div>
  );
}
