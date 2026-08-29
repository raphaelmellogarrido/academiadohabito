import { useAulas } from "../hooks/useAulas";
import { VideoAula } from "../components/VideoAula";
import { ComentariosAulas } from "../components/ComentariosAulas";
import { CardDia } from "../components/CardDia";
import { JornadaAulas } from "../components/JornadaAulas";
import "../meditacao.css";

// Layout: vídeo + feed de comentários (coluna principal) | Dia + Jornada
// (coluna direita) — mesma grade de 2 colunas do dashboard, só que 1x2.
export function AulasPage() {
  const { progresso, diaSelecionado, carregando, concluindo, selecionarDia, concluirDiaAtual } = useAulas();

  if (carregando) return <div className="carregando">Carregando…</div>;
  if (!progresso || diaSelecionado === null) return null;

  return (
    <div className="cm-aulas">
      <div className="cm-aulas-principal">
        <VideoAula
          progresso={progresso}
          diaSelecionado={diaSelecionado}
          concluindo={concluindo}
          onConcluir={concluirDiaAtual}
        />
        <ComentariosAulas />
      </div>

      <div className="cm-aulas-lateral">
        <CardDia progresso={progresso} diaSelecionado={diaSelecionado} onSelecionar={selecionarDia} />
        <JornadaAulas progresso={progresso} />
      </div>
    </div>
  );
}
