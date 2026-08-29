import { useMeditacaoDashboard } from "../hooks/useMeditacaoDashboard";
import { BotaoMediteiHoje } from "../components/BotaoMediteiHoje";
import { Sequencia } from "../components/Sequencia";
import { JornadaProgress } from "../components/JornadaProgress";
import { MeditandoJunto } from "../components/MeditandoJunto";
import { ProximoEncontro } from "../components/ProximoEncontro";
import { DesafiosSemana } from "../components/DesafiosSemana";
import { FraseSemana } from "../components/FraseSemana";
import { Feed } from "../components/Feed";
import "../meditacao.css";

// Colunas 2-3-4 do grid de 4 (col1 = Sidebar, em app/layouts/AppLayout.tsx).
// Mesmo desenho de renato_de_paula/Dashboard.jsx: col-feed | col-progresso |
// col-encontros.
export function MeditacaoDashboardPage() {
  const { sequencia, jornada, pulso, carregando, marcando, mediteiHoje, jaMarcouHoje } = useMeditacaoDashboard();

  if (carregando) return <div className="carregando">Carregando…</div>;

  return (
    <div className="cm-dashboard">
      <div className="cm-col-feed">
        <BotaoMediteiHoje jaMarcouHoje={jaMarcouHoje} marcando={marcando} onClick={mediteiHoje} />
        <Feed />
      </div>

      <div className="cm-col-progresso">
        {sequencia && <Sequencia sequencia={sequencia} />}
        {jornada && <JornadaProgress jornada={jornada} />}
        {pulso && <MeditandoJunto pulso={pulso} />}
      </div>

      <div className="cm-col-encontros">
        <ProximoEncontro />
        <DesafiosSemana />
        <FraseSemana />
      </div>
    </div>
  );
}
