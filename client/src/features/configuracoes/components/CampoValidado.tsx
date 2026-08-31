// Label+input reusado pelos 4 campos com validação ao vivo de Configurações
// (nome completo, primeiro nome, nova senha, confirmar senha) — a borda
// inteira do label fica verde/vermelha conforme o valor é válido ou não,
// nunca neutra. Dois jeitos de decidir a cor:
//  - `maxLength`: mostra um contador "20/30" e a cor vem do tamanho do valor
//    (campos de nome).
//  - `valido`: cor explícita vinda de fora (campos de senha, que não têm
//    contador — força/confirmação calculadas em CardConta.tsx).
// Um dos dois é sempre passado pelo chamador.
export function CampoValidado({
  label,
  value,
  onChange,
  tipo = "text",
  maxLength,
  valido,
  placeholder,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  tipo?: "text" | "password";
  maxLength?: number;
  valido?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const ok = maxLength !== undefined ? value.length <= maxLength : Boolean(valido);

  return (
    <label className={`cfg-campo ${ok ? "cfg-campo--ok" : "cfg-campo--erro"}`}>
      <span className="cfg-campo-topo">
        <span>{label}</span>
        {maxLength !== undefined && (
          <span className="cfg-campo-contador">
            {value.length}/{maxLength}
          </span>
        )}
      </span>
      <input
        type={tipo}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
    </label>
  );
}
