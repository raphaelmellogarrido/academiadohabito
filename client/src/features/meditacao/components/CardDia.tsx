import { Lock } from "lucide-react";
import type { AulaProgresso } from "../api/meditacaoApi";

export function CardDia({
  progresso,
  diaSelecionado,
  onSelecionar,
}: {
  progresso: AulaProgresso;
  diaSelecionado: number;
  onSelecionar: (dia: number) => void;
}) {
  const dias = Array.from({ length: progresso.totalDias }, (_, i) => i + 1);

  return (
    <div className="cartao">
      <p className="cartao-titulo">Dia {diaSelecionado}</p>
      <select
        className="cm-dia-select"
        value={diaSelecionado}
        onChange={(e) => onSelecionar(Number(e.target.value))}
      >
        {dias.map((dia) => {
          const bloqueadoNoDropdown = dia > progresso.diaMaximoLiberado;
          return (
            <option key={dia} value={dia} disabled={bloqueadoNoDropdown}>
              Dia {dia}
              {progresso.diasConcluidos.includes(dia) ? " ✓" : ""}
              {bloqueadoNoDropdown ? " 🔒" : ""}
            </option>
          );
        })}
      </select>
      {progresso.bloqueado && (
        <p className="cm-dia-bloqueio">
          <Lock size={13} /> Pausa obrigatória — volte amanhã
        </p>
      )}
    </div>
  );
}
