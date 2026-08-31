import { Check } from "lucide-react";

// Checklist ao vivo dos requisitos de "Nova senha" — cada item fica verde
// com check assim que a senha digitada passa a cumpri-lo. Os 4 requisitos
// aqui juntos formam exatamente a regra SENHA_FORTE de CardConta.tsx.
const REQUISITOS = [
  { texto: "Mínimo 8 caracteres", testar: (senha: string) => senha.length >= 8 },
  { texto: "1 letra maiúscula", testar: (senha: string) => /[A-Z]/.test(senha) },
  { texto: "1 letra minúscula", testar: (senha: string) => /[a-z]/.test(senha) },
  { texto: "1 número", testar: (senha: string) => /\d/.test(senha) },
];

export function SenhaRequisitos({ senha }: { senha: string }) {
  return (
    <ul className="cfg-senha-requisitos">
      {REQUISITOS.map(({ texto, testar }) => {
        const ok = testar(senha);
        return (
          <li key={texto} className={`cfg-senha-requisito ${ok ? "cfg-senha-requisito--ok" : ""}`}>
            <span className="cfg-senha-requisito-icone">{ok && <Check size={11} strokeWidth={3} />}</span>
            {texto}
          </li>
        );
      })}
    </ul>
  );
}
