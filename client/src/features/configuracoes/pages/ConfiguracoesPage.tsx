import { useOutletContext } from "react-router-dom";
import type { Usuario } from "../../../shared/hooks/useAuth";
import { CardPerfil } from "../components/CardPerfil";
import { CardConta } from "../components/CardConta";
import "../configuracoes.css";

type ContextoApp = { usuario: Usuario; atualizarUsuario: (patch: Partial<Usuario>) => void };

export function ConfiguracoesPage() {
  const { usuario, atualizarUsuario } = useOutletContext<ContextoApp>();

  return (
    <div className="cfg-pagina">
      <h1 className="cfg-titulo">Configurações</h1>
      <div className="cfg-grid">
        <CardPerfil usuario={usuario} onAtualizado={atualizarUsuario} />
        <CardConta email={usuario.email} />
      </div>
    </div>
  );
}
