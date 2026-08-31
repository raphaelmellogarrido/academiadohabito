import { useOutletContext } from "react-router-dom";
import type { Usuario } from "../../../shared/hooks/useAuth";
import { CardEncontroAdmin } from "../components/CardEncontroAdmin";
import { CardFraseAdmin } from "../components/CardFraseAdmin";
import { CardDesafiosAdmin } from "../components/CardDesafiosAdmin";
import "../admin.css";

type ContextoApp = { usuario: Usuario; atualizarUsuario: (patch: Partial<Usuario>) => void };

// Restrito a EMAILS_ORIENTADORES (ver exigirAdmin em api/_config.php / rotas
// de live.routes.ts e community.routes.ts) — a barreira real é sempre do
// servidor (403 nos endpoints -editar), isso aqui só evita mostrar um
// formulário inútil pra quem não tem permissão. `usuario.admin` já é o
// mesmo campo que a TopBar usa pra decidir se mostra o link "Admin".
export function AdminPage() {
  const { usuario } = useOutletContext<ContextoApp>();

  if (!usuario.admin) {
    return (
      <div className="cartao" style={{ maxWidth: 480 }}>
        <p className="cartao-titulo">Admin</p>
        <p>Sem permissão.</p>
      </div>
    );
  }

  return (
    <div className="adm-pagina">
      <h1 className="adm-titulo">Admin</h1>
      <div className="adm-grid">
        <CardEncontroAdmin />
        <CardFraseAdmin />
        <CardDesafiosAdmin />
      </div>
    </div>
  );
}
