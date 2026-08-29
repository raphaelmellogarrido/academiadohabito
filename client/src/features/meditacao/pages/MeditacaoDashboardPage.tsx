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

// Colunas do dashboard renderizadas abaixo da TopBar (ver app/layouts/AppLayout.tsx).
// Ordem: col-progresso (25%) | col-feed (50%) | col-encontros (25%, com "Meditei hoje" acima do encontro ao vivo).
export function MeditacaoDashboardPage() {
  const { sequencia, jornada, pulso, carregando, marcando, mediteiHoje, jaMarcouHoje } = useMeditacaoDashboard();

  if (carregando) return <div className="carregando">Carregando…</div>;

  return (
    <div className="cm-dashboard">
      <div className="cm-col-progresso">
        {sequencia && <Sequencia sequencia={sequencia} />}
        {jornada && <JornadaProgress jornada={jornada} jaMarcouHoje={jaMarcouHoje} />}
        {pulso && <MeditandoJunto pulso={pulso} />}
      </div>

      <div className="cm-col-feed">
        <Feed />
      </div>

      <div className="cm-col-encontros">
        <BotaoMediteiHoje jaMarcouHoje={jaMarcouHoje} marcando={marcando} onClick={mediteiHoje} />
        <ProximoEncontro />
        <DesafiosSemana />
        <FraseSemana />
      </div>
    </div>
  );
}
