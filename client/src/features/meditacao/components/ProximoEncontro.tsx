import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { meditacaoApi, type Encontro } from "../api/meditacaoApi";

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function iniciais(nome: string) {
  return nome.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

function formatarData(inicio: Date, fim: Date) {
  const dia = `${DIAS[inicio.getDay()]}, ${inicio.getDate()} ${MESES[inicio.getMonth()]}`;
  const hora = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${dia} · ${hora(inicio)}-${hora(fim)}`;
}

export function ProximoEncontro() {
  const [encontro, setEncontro] = useState<Encontro | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    meditacaoApi.proximoEncontro().then((r) => setEncontro(r.encontro));
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
      <div className="cm-encontro-cabecalho">
        <p className="cartao-titulo cm-encontro-titulo">Próximo encontro ao vivo</p>
        <span className={`cm-encontro-badge ${encontro.aoVivo ? "is-ao-vivo" : ""}`}>
          {encontro.aoVivo ? "AO VIVO" : "EM BREVE"}
        </span>
      </div>

      <strong className="cm-encontro-data">{formatarData(inicio, fim)}</strong>

      <div className="cm-encontro-anfitriao">
        <div className="cm-encontro-foto">
          {encontro.fotoAnfitriao ? <img src={encontro.fotoAnfitriao} alt="" /> : iniciais(encontro.anfitriao)}
        </div>
        <span>com {encontro.anfitriao}</span>
      </div>

      {encontro.checklist.length > 0 && (
        <ul className="cm-encontro-checklist">
          {encontro.checklist.map((item) => (
            <li key={item}>
              <Check size={12} strokeWidth={3} />
              {item}
            </li>
          ))}
        </ul>
      )}

      <div className="cm-encontro-reservas">
        <div className="cm-encontro-avatares">
          {encontro.reservasAvatares.map((r, i) => (
            <span key={i} className="cm-encontro-avatar" style={{ zIndex: encontro.reservasAvatares.length - i }}>
              {r.avatarUrl ? <img src={r.avatarUrl} alt="" /> : iniciais(r.nome)}
            </span>
          ))}
        </div>
        <span className="cm-encontro-contador">{encontro.totalReservas} reservaram</span>
      </div>

      {encontro.aoVivo ? (
        <a className="cm-encontro-btn is-ao-vivo" href={encontro.linkLive ?? "#"} target="_blank" rel="noreferrer">
          Entrar na live
        </a>
      ) : (
        <>
          <button
            type="button"
            className={`cm-encontro-btn ${encontro.reservado ? "is-reservado" : ""}`}
            onClick={alternarReserva}
            disabled={enviando}
          >
            {encontro.reservado ? "Vaga reservada ✓" : "Reservar vaga"}
          </button>
          {encontro.reservado && (
            <button type="button" className="cm-encontro-btn-outline" disabled>
              Aguardando liberação
            </button>
          )}
        </>
      )}
    </div>
  );
}
