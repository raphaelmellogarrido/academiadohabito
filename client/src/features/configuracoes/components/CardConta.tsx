import { useState } from "react";
import { configuracoesApi } from "../api/configuracoesApi";

export function CardConta({ email }: { email: string }) {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);

  async function alterarSenha() {
    if (novaSenha !== confirmarNovaSenha) {
      setMensagem({ tipo: "erro", texto: "confirmação não confere com a nova senha" });
      return;
    }
    setSalvando(true);
    setMensagem(null);
    try {
      await configuracoesApi.alterarSenha({ senhaAtual, novaSenha, confirmarNovaSenha });
      setMensagem({ tipo: "sucesso", texto: "senha alterada" });
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarNovaSenha("");
    } catch (e) {
      setMensagem({ tipo: "erro", texto: e instanceof Error ? e.message : "falha ao alterar senha" });
    } finally {
      setSalvando(false);
    }
  }

  const podeEnviar = senhaAtual && novaSenha && confirmarNovaSenha && !salvando;

  return (
    <div className="cartao cfg-card">
      <p className="cartao-titulo">Conta</p>

      <label className="cfg-campo">
        <span>Email</span>
        <input value={email} disabled />
      </label>

      <p className="cfg-secao-sub">Alterar senha</p>

      <label className="cfg-campo">
        <span>Senha atual</span>
        <input type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} />
      </label>
      <label className="cfg-campo">
        <span>Nova senha</span>
        <input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
      </label>
      <label className="cfg-campo">
        <span>Confirmar nova senha</span>
        <input type="password" value={confirmarNovaSenha} onChange={(e) => setConfirmarNovaSenha(e.target.value)} />
      </label>

      {mensagem && <p className={`cfg-mensagem cfg-mensagem--${mensagem.tipo}`}>{mensagem.texto}</p>}

      <button type="button" className="cfg-btn-primario" onClick={alterarSenha} disabled={!podeEnviar}>
        {salvando ? "Alterando…" : "Alterar senha"}
      </button>
    </div>
  );
}
