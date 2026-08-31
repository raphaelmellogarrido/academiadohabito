import { useState } from "react";
import { Calendar, Check, Clock } from "lucide-react";
import { meditacaoApi, type Encontro } from "../api/meditacaoApi";
import { usePolling } from "../../../shared/hooks/usePolling";

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function iniciais(nome: string) {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function formatarData(inicio: Date, fim: Date) {
  const dia = `${DIAS[inicio.getDay()]}, ${inicio.getDate()} ${MESES[inicio.getMonth()]}`;
  const hora = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${dia} · ${hora(inicio)}-${hora(fim)}`;
}

export function ProximoEncontro() {
  const [encontro, setEncontro] = useState<Encontro | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Poll a cada 10s: reservas de outros alunos e qualquer edição feita no
  // admin (título, data, "ao vivo", etc. — ver AdminPage.tsx) aparecem aqui
  // em até 10s (mais devagar que o Feed — ver comentário em
  // useMeditacaoDashboard.ts sobre carga na hospedagem compartilhada).
  // `enabled: !enviando` evita a resposta do poll pisar na resposta do
  // próprio POST de reservar (ver alternarReserva abaixo).
  usePolling(async () => {
    const r = await meditacaoApi.proximoEncontro();
    setEncontro(r.encontro);
  }, 10000, !enviando);

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
      <div className="cm-encontro-titulo-linha">
        <span className="cm-encontro-icone-titulo">
          <Calendar size={13} />
        </span>
        <p className="cartao-titulo cm-encontro-titulo">Próximo encontro ao vivo</p>
      </div>

      <div className="cm-encontro-linha-data">
        <span className="cm-encontro-data">
          <Clock size={14} />
          {formatarData(inicio, fim)}
        </span>
        <span className={`cm-encontro-badge ${encontro.aoVivo ? "is-ao-vivo" : ""}`}>
          <span className="cm-encontro-badge-ponto" />
          {encontro.aoVivo ? "AO VIVO" : "EM BREVE"}
        </span>
      </div>

      <div className="cm-encontro-anfitriao">
        <div className="cm-encontro-foto">
          <img src={encontro.fotoAnfitriao ?? "/perfil_live.png"} alt="" />
        </div>
        <span>com {encontro.anfitriao}</span>
      </div>

      {/* {encontro.checklist.length > 0 && (
        <ul className="cm-encontro-checklist">
          {encontro.checklist.map((item) => (
            <li key={item}>
              <Check size={12} strokeWidth={3} />
              {item}
            </li>
          ))}
        </ul>
      )} */}

      <div className="cm-encontro-reservas">
        <div className="cm-encontro-avatares">
          {encontro.reservasAvatares.map((r, i) => (
            <span key={i} className="cm-encontro-avatar" style={{ zIndex: encontro.reservasAvatares.length - i }}>
              {r.avatarUrl ? <img src={r.avatarUrl} alt="" /> : iniciais(r.nome)}
            </span>
          ))}
        </div>
        <span className="cm-encontro-contador">{encontro.totalReservas} pessoas reservaram</span>
      </div>

      {encontro.aoVivo ? (
        <a className="cm-encontro-btn is-ao-vivo" href={encontro.linkLive ?? "#"} target="_blank" rel="noreferrer">
          Entrar na live
        </a>
      ) : (
        <div className="cm-encontro-acoes">
          <button type="button" className={`cm-encontro-btn ${encontro.reservado ? "is-reservado" : ""}`} onClick={alternarReserva} disabled={enviando}>
            {encontro.reservado ? "Vaga reservada ✓" : "Reservar vaga"}
          </button>
          <button type="button" className="cm-encontro-btn-outline" disabled>
            Aguardando liberação
          </button>
        </div>
      )}
    </div>
  );
}
