import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { meditacaoApi, type AulaProgressoArquivo, type DiaAulas } from "../api/meditacaoApi";
import {
  podeAssistir,
  calcularMaxDiaCompleto,
  calcularUltimoDiaCompletadoData,
  isoLocal,
  type ResultadoBloqueio,
} from "../lib/progressoDias";

const LIMIAR_AUTO_CONCLUIDA = 0.9;

// Texto do toast quando um vídeo bloqueado é clicado — mesmas mensagens do
// projeto irmão (progressoDias.js/AulasMeditacaoRaiz.jsx).
function mensagemBloqueio(motivo: ResultadoBloqueio["motivo"], dia: number, diasRestantes?: number): string {
  if (motivo === "calendario") return `Você já completou seu dia hoje! Volte amanhã para liberar o Dia ${dia}.`;
  if (motivo === "pausa") {
    const dias = diasRestantes ?? 0;
    return `Pausa obrigatória: faltam ${dias} dia${dias === 1 ? "" : "s"} para liberar o Dia ${dia}.`;
  }
  if (motivo === "ordem") return "Assista o vídeo anterior para liberar.";
  if (motivo === "sequencia") return `Complete os dias anteriores para desbloquear o Dia ${dia}.`;
  if (motivo === "verificando") return "Não foi possível confirmar seu progresso. Recarregue a página.";
  return "Vídeo bloqueado.";
}

// Orquestra progresso por vídeo + seleção de dia/vídeo + bloqueio (podeAssistir
// espelhado do servidor) — porta o núcleo de
// renato_de_paula/src/pages/comunidade/AulasMeditacaoRaiz.jsx, sem o
// localStorage por e-mail de lá (aqui o servidor já é a única fonte via
// sessão/cookie, ver requireAuth).
export function useAulas(dias: DiaAulas[], catalogoCarregando: boolean) {
  const [progressoPorArquivo, setProgressoPorArquivo] = useState<Record<string, AulaProgressoArquivo>>({});
  const [progressoCarregado, setProgressoCarregado] = useState(false);
  const [progressoVerificado, setProgressoVerificado] = useState(false);
  const [hojeServidor, setHojeServidor] = useState<string | null>(null);

  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null);
  const [videoAtivoArquivo, setVideoAtivoArquivo] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const marcados90Ref = useRef(new Set<string>());

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // Servidor é a fonte de verdade — substitui o mapa local inteiro (cobre
  // outro dispositivo, inclusive uma desmarcação feita lá).
  useEffect(() => {
    meditacaoApi
      .aulasProgresso()
      .then((r) => {
        setProgressoPorArquivo(r.progressoPorArquivo);
        setHojeServidor(r.hoje);
        setProgressoVerificado(true);
      })
      .catch((err) => {
        console.error("Erro ao carregar progresso de aulas:", err);
        // Sem confirmação do servidor, o bloqueio por calendário continua
        // fechado (fail-closed) — ver podeAssistir/progressoDias.ts.
      })
      .finally(() => setProgressoCarregado(true));
  }, []);

  const maxDiaCompleto = useMemo(() => calcularMaxDiaCompleto(dias, progressoPorArquivo), [dias, progressoPorArquivo]);
  const ultimoDiaCompletadoData = useMemo(
    () => calcularUltimoDiaCompletadoData(dias, progressoPorArquivo, maxDiaCompleto),
    [dias, progressoPorArquivo, maxDiaCompleto],
  );

  const ultimoDia = dias.length ? dias[dias.length - 1].dia : 0;
  const jornadaCompleta = dias.length > 0 && maxDiaCompleto >= ultimoDia;
  const diaMaximoLiberado = jornadaCompleta ? ultimoDia : Math.min(Math.max(maxDiaCompleto + 1, 0), ultimoDia);
  const diasConcluidos = maxDiaCompleto >= 0 ? dias.filter((d) => d.dia <= maxDiaCompleto).map((d) => d.dia) : [];
  const totalVideosCount = useMemo(() => dias.reduce((soma, d) => soma + d.videos.length, 0), [dias]);
  const totalConcluidos = useMemo(
    () => Object.values(progressoPorArquivo).filter((v) => v.assistida).length,
    [progressoPorArquivo],
  );
  const percentual = totalVideosCount > 0 ? Math.round((totalConcluidos / totalVideosCount) * 100) : 0;

  // Bloqueio por DIA (não por vídeo): dia inteiro libera de uma vez (em
  // ordem interna), Dia 0 -> Dia 1 pode ser feito no mesmo dia, e a partir
  // daí só libera 1 dia novo por dia de calendário (BRT).
  const bloqueioPorArquivo = useMemo(() => {
    const mapa: Record<string, ResultadoBloqueio> = {};
    for (const diaObj of dias) {
      diaObj.videos.forEach((video, videoIndex) => {
        mapa[video.arquivo] = podeAssistir(diaObj.dia, videoIndex, {
          dias,
          progressoPorArquivo,
          maxDiaCompleto,
          ultimoDiaCompletadoData,
          hojeServidor: hojeServidor ?? isoLocal(new Date()),
          verificado: progressoVerificado,
        });
      });
    }
    return mapa;
  }, [dias, progressoPorArquivo, maxDiaCompleto, ultimoDiaCompletadoData, hojeServidor, progressoVerificado]);

  // "Continuar de onde parou": primeira aula ainda não concluída E LIBERADA,
  // na ordem real do curso — nunca cai numa aula travada (calendário/pausa),
  // senão o player abriria sozinho num vídeo bloqueado. Só vale como FALLBACK
  // enquanto diaSelecionado/videoAtivoArquivo ainda são null — assim que o
  // aluno clica numa aula ou troca de dia, o estado explícito manda.
  const alvoResumo = useMemo(() => {
    if (!dias.length || !progressoCarregado) return null;
    const ordemAulas = dias.flatMap((d) => d.videos.map((v) => ({ dia: d.dia, arquivo: v.arquivo })));
    const proximaLiberada = ordemAulas.find(
      (a) => !progressoPorArquivo[a.arquivo]?.assistida && !!bloqueioPorArquivo[a.arquivo]?.liberado,
    );
    if (proximaLiberada) return proximaLiberada;
    // Tudo que está liberado já foi assistido (jornada completa até aqui, ou
    // travada esperando calendário/pausa) — mostra a última aula liberada.
    const liberadas = ordemAulas.filter((a) => !!bloqueioPorArquivo[a.arquivo]?.liberado);
    return liberadas[liberadas.length - 1] || ordemAulas[0] || null;
  }, [dias, progressoCarregado, progressoPorArquivo, bloqueioPorArquivo]);

  const diaEfetivo = diaSelecionado ?? alvoResumo?.dia ?? null;
  const videoArquivoEfetivo = videoAtivoArquivo ?? alvoResumo?.arquivo ?? null;

  const diaAtual = useMemo(() => dias.find((d) => d.dia === diaEfetivo), [dias, diaEfetivo]);
  const videos = useMemo(() => diaAtual?.videos || [], [diaAtual]);
  const videoAtivo = useMemo(
    () => videos.find((v) => v.arquivo === videoArquivoEfetivo) || videos[0],
    [videos, videoArquivoEfetivo],
  );

  const bloqueioVideoAtivo = videoAtivo ? bloqueioPorArquivo[videoAtivo.arquivo] : null;

  // Banner "Pausa obrigatória em andamento": olha o bloqueio do 1º vídeo do
  // PRÓXIMO dia (maxDiaCompleto+1) — index 0 carrega o motivo do gate do DIA
  // inteiro (calendário/pausa). Some sozinho assim que a pausa é cumprida.
  const diaObjProximo = dias.find((d) => d.dia === maxDiaCompleto + 1);
  const bloqueioProximoDia = diaObjProximo?.videos?.[0] ? bloqueioPorArquivo[diaObjProximo.videos[0].arquivo] : null;
  const emPausaObrigatoria = bloqueioProximoDia?.motivo === "pausa";

  const marcarConcluida = useCallback((arquivoParam?: string) => {
    const arquivo = arquivoParam || videoAtivo?.arquivo;
    if (!arquivo) return;

    // Gate de verdade: se o vídeo está bloqueado (calendário/pausa/ordem),
    // nem tenta marcar — só avisa com o mesmo toast do clique num cadeado
    // (ver selecionarVideo). Sem isso, o botão/checkbox "marcava" a aula na
    // hora (otimista) mesmo bloqueada, e só desfazia quando o servidor
    // respondia (ou nem isso, ver rollback abaixo).
    const bloqueio = bloqueioPorArquivo[arquivo];
    if (bloqueio && !bloqueio.liberado) {
      setToast(mensagemBloqueio(bloqueio.motivo, diaEfetivo ?? 0, bloqueio.diasRestantes));
      return;
    }

    const anterior = progressoPorArquivo[arquivo];
    // Otimista: atualiza local já, sem esperar o servidor responder —
    // completadoEm local libera o próximo dia na UI sem esperar round-trip.
    setProgressoPorArquivo((atual) => ({
      ...atual,
      [arquivo]: { assistida: true, progresso: 100, completadoEm: new Date().toISOString() },
    }));

    meditacaoApi
      .aulasMarcarConcluida(arquivo)
      .then((r) => {
        setProgressoPorArquivo(r.progressoPorArquivo);
        setHojeServidor(r.hoje);
      })
      .catch((err) => {
        console.error("Não foi possível sincronizar progresso com o servidor:", err);
        // Servidor recusou (ex: bloqueio mudou entre o clique e a resposta) —
        // desfaz o otimista em vez de deixar a UI mentindo que concluiu.
        setProgressoPorArquivo((atual) => {
          const novo = { ...atual };
          if (anterior) novo[arquivo] = anterior;
          else delete novo[arquivo];
          return novo;
        });
        setToast("Não foi possível marcar essa aula agora. Recarregue a página.");
      });
  }, [videoAtivo, bloqueioPorArquivo, progressoPorArquivo, diaEfetivo]);

  const desmarcarConcluida = useCallback((arquivoParam?: string) => {
    const arquivo = arquivoParam || videoAtivo?.arquivo;
    if (!arquivo) return;

    marcados90Ref.current.delete(arquivo);
    setProgressoPorArquivo((atual) => {
      if (!atual[arquivo]) return atual;
      const novo = { ...atual };
      delete novo[arquivo];
      return novo;
    });

    meditacaoApi
      .aulasDesmarcar(arquivo)
      .then((r) => {
        setProgressoPorArquivo(r.progressoPorArquivo);
        setHojeServidor(r.hoje);
      })
      .catch((err) => console.error("Não foi possível sincronizar remoção de progresso com o servidor:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoAtivo]);

  function toggleConcluida(arquivo: string) {
    const concluida = !!progressoPorArquivo[arquivo]?.assistida;
    if (concluida) desmarcarConcluida(arquivo);
    else marcarConcluida(arquivo);
  }

  function handleTimeUpdatePlayer(currentTime: number, duration: number) {
    if (!duration || !videoAtivo) return;
    const arquivo = videoAtivo.arquivo;
    if (marcados90Ref.current.has(arquivo)) return;
    if (currentTime / duration >= LIMIAR_AUTO_CONCLUIDA) {
      marcados90Ref.current.add(arquivo);
      marcarConcluida(arquivo);
    }
  }

  function selecionarVideo(arquivo: string) {
    const bloqueio = bloqueioPorArquivo[arquivo];
    if (bloqueio && !bloqueio.liberado) {
      setToast(mensagemBloqueio(bloqueio.motivo, diaEfetivo ?? 0, bloqueio.diasRestantes));
      return;
    }
    setVideoAtivoArquivo(arquivo);
  }

  // Avanço automático ao fim do vídeo — não passa pelo toast de
  // selecionarVideo (uma transição automática não deveria interromper com
  // aviso), mas AINDA PRECISA respeitar o bloqueio: sem isso, terminar o
  // último vídeo de um dia liberado empurrava o aluno pro próximo dia mesmo
  // que ele estivesse travado por calendário/pausa. Se o próximo estiver
  // bloqueado, simplesmente não avança (o vídeo atual já foi marcado
  // concluído pelo limiar de 90%, ver handleTimeUpdatePlayer).
  function irParaProximoVideo() {
    const indiceAtual = videos.findIndex((v) => v.arquivo === videoAtivo?.arquivo);
    if (indiceAtual > -1 && indiceAtual < videos.length - 1) {
      const proximoVideo = videos[indiceAtual + 1];
      if (bloqueioPorArquivo[proximoVideo.arquivo]?.liberado) {
        setVideoAtivoArquivo(proximoVideo.arquivo);
      }
      return;
    }
    const indiceDia = dias.findIndex((d) => d.dia === diaEfetivo);
    const proximoDia = dias[indiceDia + 1];
    const primeiroVideoProximoDia = proximoDia?.videos[0];
    if (proximoDia && primeiroVideoProximoDia && bloqueioPorArquivo[primeiroVideoProximoDia.arquivo]?.liberado) {
      setDiaSelecionado(proximoDia.dia);
      setVideoAtivoArquivo(primeiroVideoProximoDia.arquivo);
    }
  }

  function handleTrocarDia(novoDia: number) {
    const dia = dias.find((d) => d.dia === novoDia);
    setDiaSelecionado(novoDia);
    setVideoAtivoArquivo(dia?.videos[0]?.arquivo || null);
  }

  const carregando = catalogoCarregando || !progressoCarregado;

  return {
    carregando,
    diaAtual,
    diaEfetivo,
    videos,
    videoAtivo,
    progressoPorArquivo,
    bloqueioPorArquivo,
    bloqueioVideoAtivo,
    bloqueioProximoDia,
    emPausaObrigatoria,
    maxDiaCompleto,
    diaMaximoLiberado,
    diasConcluidos,
    jornadaCompleta,
    percentual,
    totalConcluidos,
    totalVideos: totalVideosCount,
    toast,
    selecionarVideo,
    irParaProximoVideo,
    handleTrocarDia,
    toggleConcluida,
    handleTimeUpdatePlayer,
  };
}
