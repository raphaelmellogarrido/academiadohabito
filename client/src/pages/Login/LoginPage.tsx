import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../shared/lib/apiClient";
import "./login.css";

// Login mock — só e-mail (+ nome opcional no 1º acesso), sem senha. Ver
// server/src/modules/auth/auth.service.ts.
export function LoginPage() {
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await api.post("/auth/login", { email, nome });
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
        <label>
          Nome <span>(1º acesso)</span>
          <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
        </label>
        {erro && <p className="login-erro">{erro}</p>}
        <button type="submit" disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
