import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../shared/lib/apiClient";
import { ehProducaoReal } from "../../shared/lib/ambiente";
import "./login.css";

// Em produção (academiadohabito.com.br) é login real contra api/login.php
// (email+senha, valida bcrypt em alunos.senha_hash — ver docs/ARCHITECTURE.md).
// Em qualquer outro host continua o mock de sempre (server/src/modules/auth):
// só e-mail, sem checar senha — por isso o campo "Nome (1º acesso)" só faz
// sentido aí, e o campo de senha só é validado de verdade em produção.
export function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      if (ehProducaoReal) {
        await api.post("/login.php", { email, senha });
      } else {
        await api.post("/auth/login", { email, nome });
      }
      navigate("/app");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao entrar");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login">
      <form className="login-card" onSubmit={aoEnviar}>
        <h1>Entrar</h1>
        <label>
          E-mail
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
        </label>
        {ehProducaoReal ? (
          <label>
            Senha
            <input type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Sua senha" />
          </label>
        ) : (
          <label>
            Nome <span>(1º acesso)</span>
            <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
          </label>
        )}
        {erro && <p className="login-erro">{erro}</p>}
        <button type="submit" disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
