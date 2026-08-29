import type { AulaProgresso } from "../api/meditacaoApi";

export function VideoAula({
  progresso,
  diaSelecionado,
  concluindo,
  onConcluir,
}: {
  progresso: AulaProgresso;
  diaSelecionado: number;
  concluindo: boolean;
  onConcluir: () => void;
}) {
  const ehDiaAtual = diaSelecionado === progresso.diaMaximoLiberado;
  const jaConcluido = progresso.diasConcluidos.includes(diaSelecionado);
  const podeConcluir = ehDiaAtual && !jaConcluido && !progresso.bloqueado;

  return (
    <div className="cartao cm-video-aula">
      <div className="cm-video-player">
        {/* Player mock — sem catálogo de vídeo real ainda (ver docs/HABIT_LOGIC.md). */}
        <video controls className="cm-video-player-el">
          <source src="" type="video/mp4" />
        </video>
        <div className="cm-video-player-overlay">Dia {diaSelecionado}</div>
      </div>
      <h1 className="cm-video-titulo">Aulas de meditação</h1>
      <p className="cm-video-subtitulo">Continue de onde parou, sua presença é o que importa.</p>

      {podeConcluir && (
        <button type="button" className="cm-video-concluir" onClick={onConcluir} disabled={concluindo}>
          {concluindo ? "Marcando…" : `Concluir aula do Dia ${diaSelecionado}`}
        </button>
      )}
      {jaConcluido && <p className="cm-video-concluido">Aula concluída ✓</p>}
    </div>
  );
}
