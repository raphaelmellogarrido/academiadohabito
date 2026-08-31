import type { VideoAula as VideoAulaTipo } from "../api/meditacaoApi";
import { GuardedVideo } from "./GuardedVideo";

export function VideoAula({
  dia,
  video,
  concluida,
  onToggleConcluida,
  onTimeUpdate,
  onEnded,
}: {
  dia: number;
  video: VideoAulaTipo;
  concluida: boolean;
  onToggleConcluida: () => void;
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onEnded: () => void;
}) {
  return (
    <div className="cartao cm-video-aula">
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
      <h1 className="cm-video-titulo">{video.titulo}</h1>
      <p className="cm-video-subtitulo">Continue de onde parou, sua presença é o que importa.</p>

      <button type="button" className={`cm-video-concluir ${concluida ? "is-concluida" : ""}`} onClick={onToggleConcluida}>
        {concluida ? "Aula concluída ✓ — clique para desmarcar" : "Marcar aula como concluída"}
      </button>
    </div>
  );
}
