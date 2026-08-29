import type { Pulso } from "../api/meditacaoApi";

// 3 linhas — as 2 primeiras reiniciam sozinhas à meia-noite BRT (o server
// recalcula a cada request, ver gamification.store.ts), a 3ª nunca reseta.
export function MeditandoJunto({ pulso }: { pulso: Pulso }) {
  return (
    <div className="cartao">
      <p className="cartao-titulo">Meditando Junto</p>
      <ul className="cm-meditando-junto">
        <li>
          <strong>{pulso.hojeCheckins}</strong> pessoas meditaram hoje
        </li>
        <li>
          <strong>{pulso.partilhasHoje}</strong> partilhas hoje
        </li>
        <li>
          <strong>{pulso.totalPresenca}</strong> presenças ao todo
        </li>
      </ul>
    </div>
  );
}
