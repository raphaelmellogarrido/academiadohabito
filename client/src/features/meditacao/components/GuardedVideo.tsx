import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type MouseEvent } from "react";

interface GuardedVideoProps {
  src: string;
  onEnded?: () => void;
  label?: string;
  autoPlay?: boolean;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  permitirAvancar?: boolean;
}

// Player com barra de progresso que, por padrão, só permite retroceder (nunca
// avançar) — porta renato_de_paula/src/components/GuardedVideo.jsx. Na página
// /aulas usamos permitirAvancar=true (ver VideoAula.tsx): o aluno pode ir e
// voltar livremente entre os vídeos já liberados, igual à "Jornada" do
// projeto antigo — o bloqueio de verdade é por DIA (podeAssistir), não dentro
// do vídeo em si.
export function GuardedVideo({
  src,
  onEnded,
  label,
  autoPlay = false,
  onTimeUpdate,
  permitirAvancar = false,
}: GuardedVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const maxTimeRef = useRef(0);
  const volumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [playing, setPlaying] = useState(false);
  const [erro, setErro] = useState("");
  const [volume, setVolume] = useState(1);
  // Autoplay só funciona mudo na maioria dos navegadores — começa mudo e
  // mostra um botão pra ativar o som, em vez de tentar tocar com som e falhar.
  const [muted, setMuted] = useState(autoPlay);
  const [volumeAberto, setVolumeAberto] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // Estado do botão "girar tela" (mobile). `rotated` controla o toggle
  // (clicar de novo desfaz); `usarFallbackCss` só liga quando
  // screen.orientation.lock não existe ou falhou (caso do iOS Safari) — aí a
  // rotação visual vem da classe .is-rotated-css em vez da orientação real.
  const [rotated, setRotated] = useState(false);
  const [usarFallbackCss, setUsarFallbackCss] = useState(false);

  useEffect(() => {
    if (!autoPlay) return;
    const v = videoRef.current;
    v?.play()?.catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleFullscreenChange() {
      const doc = document as any;
      const ativo = doc.fullscreenElement || doc.webkitFullscreenElement;
      const dentro = ativo === wrapperRef.current;
      setFullscreen(dentro);
      // Ao sair da tela cheia, libera a orientação — senão a página inteira
      // fica presa em modo paisagem depois que o vídeo fecha.
      if (!dentro) {
        try {
          (screen.orientation as any)?.unlock?.();
        } catch {
          // ignora — nem todo navegador suporta unlock
        }
        setRotated(false);
        setUsarFallbackCss(false);
      }
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => () => clearTimeout(volumeTimeoutRef.current), []);

  function handleTimeUpdate() {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    if (v.currentTime > maxTimeRef.current) {
      maxTimeRef.current = v.currentTime;
    }
    // Prop opcional (ex: auto-marcar a aula como concluída aos 90% assistidos
    // — ver hooks/useAulas.ts::handleTimeUpdatePlayer). Quem não passar não é afetado.
    if (onTimeUpdate) onTimeUpdate(v.currentTime, v.duration);
  }

  function handleLoadedMetadata() {
    setDuration(videoRef.current?.duration || 0);
  }

  // Rede de segurança extra: mesmo com a barra visível só permitindo
  // retroceder, mantemos esse bloqueio para tentativas de avanço que não
  // passem pelo onChange da barra (ex: controles de mídia do sistema).
  // Quando permitirAvancar=true esse freio simplesmente não roda.
  function handleSeeking() {
    if (permitirAvancar) return;
    const v = videoRef.current;
    if (!v) return;
    if (v.currentTime > maxTimeRef.current + 0.5) {
      v.currentTime = maxTimeRef.current;
    }
  }

  // Barra de progresso: com permitirAvancar=true arrasta livre pros dois
  // lados. Sem a prop, só permite arrastar pra trás — tentativas de avançar
  // são ignoradas e, como o value é controlado pelo estado currentTime, a
  // barra "volta" sozinha pra posição real.
  function handleSeekBarChange(e: ChangeEvent<HTMLInputElement>) {
    const v = videoRef.current;
    if (!v) return;
    const novoTempo = Number(e.target.value);
    if (permitirAvancar || novoTempo <= v.currentTime) {
      v.currentTime = novoTempo;
      setCurrentTime(novoTempo);
    }
  }

  // ±10s (botões e setas do teclado) — só existem quando permitirAvancar.
  function pular(segundosDelta: number) {
    const v = videoRef.current;
    if (!v) return;
    const limite = duration || v.duration || Infinity;
    const novoTempo = Math.min(Math.max(v.currentTime + segundosDelta, 0), limite);
    v.currentTime = novoTempo;
    setCurrentTime(novoTempo);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!permitirAvancar) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      pular(10);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      pular(-10);
    }
  }

  function abrirVolumeTemporariamente() {
    setVolumeAberto(true);
    clearTimeout(volumeTimeoutRef.current);
    volumeTimeoutRef.current = setTimeout(() => setVolumeAberto(false), 2500);
  }

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    setErro("");

    if (v.paused) {
      v.play()?.catch((err) => {
        console.error("Erro ao reproduzir vídeo:", err);
        setErro("Não foi possível reproduzir o vídeo. Toque novamente ou tente com outra conexão.");
      });
    } else {
      v.pause();
    }
  }

  function handleVideoError() {
    const v = videoRef.current;
    console.error("Erro ao carregar vídeo:", v?.error);
    setErro("Não foi possível carregar o vídeo. Verifique sua conexão e tente novamente.");
  }

  function toggleMute() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    abrirVolumeTemporariamente();
  }

  function handleAtivarSom(e: MouseEvent) {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    setMuted(false);
    abrirVolumeTemporariamente();
  }

  function handleVolumeChange(e: ChangeEvent<HTMLInputElement>) {
    const v = videoRef.current;
    if (!v) return;
    const novoVolume = Number(e.target.value);
    v.volume = novoVolume;
    v.muted = novoVolume === 0;
    setVolume(novoVolume);
    setMuted(v.muted);
    abrirVolumeTemporariamente();
  }

  // Deixa a DIV que envolve o vídeo em tela cheia, não o <video> em si. Se o
  // próprio elemento <video> entrar em fullscreen, o navegador injeta
  // controles nativos por cima (incluindo uma barra de progresso que permite
  // pular o vídeo) — algo que não conseguimos desativar via atributo.
  function handleFullscreen() {
    const doc = document as any;
    const jaEmFullscreen = doc.fullscreenElement || doc.webkitFullscreenElement;
    if (jaEmFullscreen) {
      if (doc.exitFullscreen) doc.exitFullscreen();
      else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
      return;
    }
    const wrapper = wrapperRef.current as any;
    if (!wrapper) return;
    if (wrapper.requestFullscreen) wrapper.requestFullscreen();
    else if (wrapper.webkitRequestFullscreen) wrapper.webkitRequestFullscreen();
  }

  // Botão só do mobile: entra em tela cheia e força a orientação paisagem,
  // mesmo que o bloqueio de rotação do celular esteja ativado no sistema.
  // Clicar de novo desfaz. iOS Safari não suporta screen.orientation.lock —
  // nesse caso caímos na classe .is-rotated-css (rotate CSS puro).
  async function handleGirarTela() {
    const doc = document as any;
    if (rotated) {
      try {
        (screen.orientation as any)?.unlock?.();
      } catch (err) {
        console.error("Não foi possível destravar a orientação:", err);
      }
      if (doc.fullscreenElement || doc.webkitFullscreenElement) {
        if (doc.exitFullscreen) doc.exitFullscreen();
        else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
      }
      setRotated(false);
      setUsarFallbackCss(false);
      return;
    }

    let orientacaoTravada = false;
    try {
      const wrapper = wrapperRef.current as any;
      if (!doc.fullscreenElement && !doc.webkitFullscreenElement && wrapper) {
        if (wrapper.requestFullscreen) await wrapper.requestFullscreen();
        else if (wrapper.webkitRequestFullscreen) wrapper.webkitRequestFullscreen();
      }
      if ((screen.orientation as any)?.lock) {
        await (screen.orientation as any).lock("landscape");
        orientacaoTravada = true;
      }
    } catch (err) {
      console.error("Não foi possível girar a tela:", err);
    }
    setRotated(true);
    setUsarFallbackCss(!orientacaoTravada);
  }

  return (
    <div
      className={`guarded-video ${usarFallbackCss ? "is-rotated-css" : ""}`}
      ref={wrapperRef}
      tabIndex={permitirAvancar ? 0 : -1}
      onKeyDown={handleKeyDown}
    >
      {label && <span className="guarded-video-label">{label}</span>}
      <video
        ref={videoRef}
        src={src}
        controls={false}
        controlsList="nodownload"
        disablePictureInPicture
        playsInline
        autoPlay={autoPlay}
        muted={muted}
        preload="metadata"
        onContextMenu={(e) => e.preventDefault()}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onSeeking={handleSeeking}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={onEnded}
        onError={handleVideoError}
        onClick={togglePlay}
      />
      <button
        type="button"
        className={`guarded-video-toggle ${playing ? "is-playing" : ""}`}
        onClick={togglePlay}
        aria-label={playing ? "Pausar" : "Reproduzir"}
      >
        {playing ? "❚❚" : "▶"}
      </button>
      {autoPlay && muted && (
        <button type="button" className="meditacao-hero-video-mute" onClick={handleAtivarSom} aria-label="Ativar som">
          🔇
        </button>
      )}
      <div className="guarded-video-controls">
        <div className="guarded-video-buttons-row">
          <div className="guarded-video-volume-group">
            <button type="button" onClick={toggleMute} aria-label={muted ? "Ativar som" : "Silenciar"}>
              {muted || volume === 0 ? "🔇" : "🔊"}
            </button>
            {volumeAberto && (
              <input
                type="range"
                className="guarded-video-volume-popup"
                min="0"
                max="1"
                step="0.05"
                value={muted ? 0 : volume}
                onChange={handleVolumeChange}
                aria-label="Volume"
              />
            )}
          </div>
          {permitirAvancar && (
            <button type="button" className="guarded-video-skip" onClick={() => pular(-10)} aria-label="Voltar 10 segundos">
              -10s
            </button>
          )}
          <input
            type="range"
            className="guarded-video-seekbar"
            min="0"
            max={duration || 0}
            step="0.1"
            value={currentTime}
            onChange={handleSeekBarChange}
            aria-label={permitirAvancar ? "Progresso do vídeo" : "Progresso do vídeo — só é possível retroceder"}
          />
          {permitirAvancar && (
            <button type="button" className="guarded-video-skip" onClick={() => pular(10)} aria-label="Avançar 10 segundos">
              +10s
            </button>
          )}
          <button
            type="button"
            className={`guarded-video-rotate ${rotated ? "is-active" : ""}`}
            onClick={handleGirarTela}
            aria-label={rotated ? "Voltar à orientação normal" : "Girar tela para assistir na horizontal"}
            aria-pressed={rotated}
          >
            ⟲
          </button>
          <button type="button" onClick={handleFullscreen} aria-label={fullscreen ? "Sair da tela cheia" : "Tela cheia"}>
            {fullscreen ? "⤡" : "⛶"}
          </button>
        </div>
      </div>
      {erro && <div className="error-box guarded-video-erro">{erro}</div>}
    </div>
  );
}
