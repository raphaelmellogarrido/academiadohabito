import { useRef, useState, type ChangeEvent } from "react";
import type { Usuario } from "../../../shared/hooks/useAuth";
import { configuracoesApi } from "../api/configuracoesApi";
import { CropAvatarModal } from "./CropAvatarModal";
import { CampoValidado } from "./CampoValidado";

const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];
const TAMANHO_MAXIMO = 5 * 1024 * 1024;
const NOME_MAX = 30;
const PRIMEIRO_NOME_MAX = 14;

function iniciais(nome: string) {
  return nome.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

export function CardPerfil({
  usuario,
  onAtualizado,
}: {
  usuario: Usuario;
  onAtualizado: (usuario: Usuario) => void;
}) {
  const [nome, setNome] = useState(usuario.nome);
  const [primeiroNome, setPrimeiroNome] = useState(usuario.primeiroNome);
  const [arquivoParaCrop, setArquivoParaCrop] = useState<File | null>(null);
  const [avatarPendente, setAvatarPendente] = useState<{ blob: Blob; preview: string } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);
  const inputFoto = useRef<HTMLInputElement>(null);

  function aoEscolherArquivo(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (!TIPOS_ACEITOS.includes(arquivo.type)) {
      setMensagem({ tipo: "erro", texto: "formato inválido — use JPG, PNG ou WEBP" });
      return;
    }
    if (arquivo.size > TAMANHO_MAXIMO) {
      setMensagem({ tipo: "erro", texto: "a foto precisa ter até 5MB" });
      return;
    }
    setMensagem(null);
    setArquivoParaCrop(arquivo);
  }

  function aoConfirmarCrop(blob: Blob) {
    if (avatarPendente) URL.revokeObjectURL(avatarPendente.preview);
    setAvatarPendente({ blob, preview: URL.createObjectURL(blob) });
    setArquivoParaCrop(null);
    if (inputFoto.current) inputFoto.current.value = "";
  }

  const nomeValido = nome.trim().length > 0 && nome.length <= NOME_MAX;
  const primeiroNomeValido = primeiroNome.trim().length > 0 && primeiroNome.length <= PRIMEIRO_NOME_MAX;

  async function salvar() {
    if (!nomeValido || !primeiroNomeValido) return;
    setSalvando(true);
    setMensagem(null);
    try {
      const r = await configuracoesApi.salvarPerfil({
        nome: nome.trim(),
        primeiroNome: primeiroNome.trim(),
        avatarBlob: avatarPendente?.blob ?? null,
      });
      onAtualizado(r.usuario);
      setMensagem({ tipo: "sucesso", texto: "perfil atualizado" });
    } catch (e) {
      setMensagem({ tipo: "erro", texto: e instanceof Error ? e.message : "falha ao salvar" });
    } finally {
      setSalvando(false);
    }
  }

  const avatarExibido = avatarPendente?.preview ?? usuario.avatarUrl;

  return (
    <div className="cartao cfg-card">
      <p className="cartao-titulo">Perfil</p>

      <div className="cfg-avatar-linha">
        {avatarExibido ? (
          <img src={avatarExibido} alt="" className="cfg-avatar-preview" />
        ) : (
          <div className="cfg-avatar-preview cfg-avatar-preview--iniciais">{iniciais(nome || usuario.nome)}</div>
        )}
        <div>
          <button type="button" className="cfg-btn-secundario" onClick={() => inputFoto.current?.click()}>
            Trocar foto
          </button>
          <input ref={inputFoto} type="file" accept={TIPOS_ACEITOS.join(",")} hidden onChange={aoEscolherArquivo} />
          <p className="cfg-avatar-dica">JPG, PNG ou WEBP · até 5MB</p>
        </div>
      </div>

      <CampoValidado label="Nome completo" value={nome} onChange={setNome} maxLength={NOME_MAX} placeholder="Nome completo" />

      <CampoValidado
        label="Primeiro nome"
        value={primeiroNome}
        onChange={setPrimeiroNome}
        maxLength={PRIMEIRO_NOME_MAX}
        placeholder="Como quer ser chamado(a)"
      />
      <p className="cfg-campo-dica">É esse nome que aparece em "Olá, {primeiroNome || "…"}" na barra lateral.</p>

      {mensagem && <p className={`cfg-mensagem cfg-mensagem--${mensagem.tipo}`}>{mensagem.texto}</p>}

      <button type="button" className="cfg-btn-primario" onClick={salvar} disabled={salvando || !nomeValido || !primeiroNomeValido}>
        {salvando ? "Salvando…" : "Salvar perfil"}
      </button>

      {arquivoParaCrop && (
        <CropAvatarModal
          arquivo={arquivoParaCrop}
          onCancelar={() => setArquivoParaCrop(null)}
          onConfirmar={aoConfirmarCrop}
        />
      )}
    </div>
  );
}
