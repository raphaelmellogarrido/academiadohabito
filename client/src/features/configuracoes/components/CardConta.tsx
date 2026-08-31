import { useState } from "react";
import { configuracoesApi } from "../api/configuracoesApi";
import { CampoValidado } from "./CampoValidado";

// Mesma regra aplicada nos dois backends (senha-alterar.php / users.routes.ts)
// — 8+ caracteres, com maiúscula, minúscula e número.
const SENHA_FORTE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export function CardConta({ email }: { email: string }) {
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);

  const senhaForte = SENHA_FORTE.test(novaSenha);
  const confirmacaoBate = confirmarNovaSenha.length > 0 && confirmarNovaSenha === novaSenha;

  async function alterarSenha() {
    if (!senhaForte || !confirmacaoBate) return;
    setSalvando(true);
    setMensagem(null);
    try {
      await configuracoesApi.alterarSenha({ novaSenha, confirmarNovaSenha });
      setMensagem({ tipo: "sucesso", texto: "senha alterada" });
      setNovaSenha("");
      setConfirmarNovaSenha("");
    } catch (e) {
      setMensagem({ tipo: "erro", texto: e instanceof Error ? e.message : "falha ao alterar senha" });
    } finally {
      setSalvando(false);
    }
  }

  const podeEnviar = senhaForte && confirmacaoBate && !salvando;

  return (
    <div className="cartao cfg-card">
      <p className="cartao-titulo">Conta</p>

      <label className="cfg-campo cfg-campo--neutro">
        <span className="cfg-campo-topo">
          <span>Email</span>
        </span>
        <input value={email} disabled />
      </label>

      <p className="cfg-secao-sub">Alterar senha</p>

      <CampoValidado label="Nova senha" tipo="password" value={novaSenha} onChange={setNovaSenha} valido={senhaForte} />
      <p className="cfg-campo-dica">Mínimo 8 caracteres, com maiúscula, minúscula e número.</p>

      <CampoValidado
        label="Confirmar nova senha"
        tipo="password"
        value={confirmarNovaSenha}
        onChange={setConfirmarNovaSenha}
        valido={confirmacaoBate}
      />

      {mensagem && <p className={`cfg-mensagem cfg-mensagem--${mensagem.tipo}`}>{mensagem.texto}</p>}

      <button type="button" className="cfg-btn-primario" onClick={alterarSenha} disabled={!podeEnviar}>
        {salvando ? "Alterando…" : "Alterar senha"}
      </button>
    </div>
  );
}
