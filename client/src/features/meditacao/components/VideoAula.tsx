import type { VideoAula as VideoAulaTipo } from "../api/meditacaoApi";
import { GuardedVideo } from "./GuardedVideo";

export function VideoAula({
  dia,
  video,
  concluida,
  bloqueada = false,
  onToggleConcluida,
  onTimeUpdate,
  onEnded,
}: {
  dia: number;
  video: VideoAulaTipo;
  concluida: boolean;
  // Defesa extra: o vídeo ATIVO nunca deveria estar bloqueado (useAulas já
  // filtra isso em alvoResumo/selecionarVideo/irParaProximoVideo), mas se por
  // algum motivo estiver, o checkbox fica desabilitado em vez de marcar aula
  // travada — nada de cadeado "decorativo".
  bloqueada?: boolean;
  onToggleConcluida: () => void;
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onEnded: () => void;
}) {
  return (
    <div className="cartao cm-video-aula">
      {/* Cabeçalho (checkbox + título) fica ACIMA do player — antes ficava um
          botão "Marcar aula como concluída" abaixo do vídeo; agora marcar/
          desmarcar é um checkbox ao lado do nome da aula. */}
      <div className="cm-video-cabecalho">
        <label className={`cm-video-check-label ${bloqueada ? "is-bloqueada" : ""}`}>
          <input
            type="checkbox"
            className="cm-video-checkbox"
            checked={concluida}
            disabled={bloqueada}
            onChange={onToggleConcluida}
            aria-label={concluida ? "Aula concluída — clique para desmarcar" : "Marcar aula como concluída"}
          />
          <h1 className="cm-video-titulo">{video.titulo}</h1>
        </label>
        <p className="cm-video-subtitulo">Continue de onde parou, sua presença é o que importa.</p>
      </div>

      <div className="cm-video-player">
        {/* key=arquivo força remontar o player ao trocar de vídeo — reseta
            estado interno (currentTime, volume popup, etc). Progresso >90%
            avança pro próximo vídeo, sem gate (ver useAulas::irParaProximoVideo);
            permitirAvancar=true porque, diferente dos vídeos de venda, aqui o
            bloqueio é por DIA, não dentro do próprio vídeo. */}
        <GuardedVideo
          key={video.arquivo}
          src={video.url}
          label={`Dia ${dia}`}
          permitirAvancar
          onTimeUpdate={onTimeUpdate}
          onEnded={onEnded}
        />
      </div>
    </div>
  );
}
