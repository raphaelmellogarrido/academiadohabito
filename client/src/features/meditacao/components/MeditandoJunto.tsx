import { Users, MessageCircle, Calendar } from "lucide-react";
import type { Pulso } from "../api/meditacaoApi";

// 3 blocos — os 2 primeiros reiniciam sozinhos à meia-noite BRT (o server
// recalcula a cada request, ver gamification.store.ts), o 3º nunca reseta.
export function MeditandoJunto({ pulso }: { pulso: Pulso }) {
  return (
    <div className="cartao">
      <p className="cm-meditando-junto-titulo">Meditando junto</p>
      <div className="cm-meditando-junto">
        <div className="cm-mj-item">
          <span className="cm-mj-icone">
            <Users size={20} strokeWidth={1.75} />
          </span>
          <p>
            <strong>{pulso.hojeCheckins}</strong> pessoas meditaram hoje
          </p>
        </div>
        <div className="cm-mj-item">
          <span className="cm-mj-icone">
            <MessageCircle size={20} strokeWidth={1.75} />
          </span>
          <p>
            <strong>{pulso.partilhasHoje}</strong> partilhas
          </p>
        </div>
        <div className="cm-mj-item">
          <span className="cm-mj-icone">
            <Calendar size={20} strokeWidth={1.75} />
          </span>
          <p>
            <strong>{pulso.totalPresenca}</strong> dias presença somados
          </p>
        </div>
      </div>
    </div>
  );
}
