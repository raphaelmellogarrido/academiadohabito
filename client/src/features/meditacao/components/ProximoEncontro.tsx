import { useEffect, useState } from "react";
import { meditacaoApi, type Encontro } from "../api/meditacaoApi";

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatarData(inicio: Date, fim: Date) {
  const dia = `${DIAS[inicio.getDay()]}, ${inicio.getDate()} ${MESES[inicio.getMonth()]}`;
  const hora = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${dia} · ${hora(inicio)}-${hora(fim)}`;
}

function formatarCountdown(inicio: Date, agora: Date) {
  const diffMs = inicio.getTime() - agora.getTime();
  if (diffMs <= 0) return "Começando agora";
  const dias = Math.floor(diffMs / 86400000);
  const horas = Math.floor((diffMs % 86400000) / 3600000);
  return `Começa em ${String(dias).padStart(2, "0")}d ${String(horas).padStart(2, "0")}h`;
}

export function ProximoEncontro() {
  const [encontro, setEncontro] = useState<Encontro | null>(null);
  const [agora, setAgora] = useState(new Date());
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    meditacaoApi.proximoEncontro().then((r) => setEncontro(r.encontro));
    const t = setInterval(() => setAgora(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  if (!encontro) return null;

  const inicio = new Date(encontro.dataISO);
  const fim = new Date(inicio.getTime() + encontro.duracaoMin * 60000);

  async function alternarReserva() {
    setEnviando(true);
    try {
      const r = await meditacaoApi.reservar();
      setEncontro(r.encontro);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="cartao cm-encontro">
      <p className="cartao-titulo">Próximo Encontro</p>
      <div className="cm-encontro-topo">
        <span className={`cm-encontro-dot ${encontro.aoVivo ? "is-ao-vivo" : ""}`} />
        <div className="cm-encontro-info">
          <strong>{formatarData(inicio, fim)}</strong>
          <span>{formatarCountdown(inicio, agora)}</span>
        </div>
      </div>
      <div className="cm-encontro-anfitriao">
        <div className="cm-encontro-foto">
          {encontro.fotoAnfitriao ? <img src={encontro.fotoAnfitriao} alt="" /> : "🧑‍🦱"}
        </div>
        <span>com {encontro.anfitriao}</span>
      </div>
      <p className="cm-encontro-contador">{encontro.totalReservas} reservaram</p>

      {encontro.aoVivo ? (
        <a className="cm-encontro-btn is-ao-vivo" href={encontro.linkLive ?? "#"} target="_blank" rel="noreferrer">
          Entrar na live
        </a>
      ) : (
        <>
          <button type="button" className="cm-encontro-btn" onClick={alternarReserva} disabled={enviando}>
            {encontro.reservado ? "Vaga reservada ✓" : "Reservar"}
          </button>
          {encontro.reservado && <p className="cm-encontro-aguardando">Aguardando início…</p>}
        </>
      )}
    </div>
  );
}
