import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { Home, Library, Settings, LogOut, Mail, Shield, ChevronDown, Lock } from "lucide-react";
import type { Usuario } from "../../shared/hooks/useAuth";

// Porte simplificado de renato_de_paula/src/pages/comunidade/components/
// ComunidadeSidebar.jsx — mesma estrutura (seletor de comunidade, nav,
// admin, mensagens, whatsapp, card do usuário), sem o HamburgerMenu mobile
// separado (aqui o próprio <aside> vira topbar em @media, ver layout.css).
const COMUNIDADES = [
  { id: "meditacao", label: "Meditação", icone: "🧘", bloqueada: false },
  { id: "alimentacao", label: "Alimentação", icone: "🥗", bloqueada: true },
  { id: "exercicio", label: "Exercício", icone: "🏃", bloqueada: true },
];

const NAV_ITEMS = [
  { label: "Início", icon: Home, to: "/app/meditacao", end: true },
  { label: "Aulas", icon: Library, to: "/app/meditacao/aulas" },
  { label: "Configurações", icon: Settings, to: "/app/configuracoes" },
];

function iniciais(nome: string) {
  return nome.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

export function Sidebar({ usuario, onSair }: { usuario: Usuario; onSair: () => void }) {
  const [seletorAberto, setSeletorAberto] = useState(false);
  const seletorRef = useRef<HTMLDivElement>(null);
  const comunidadeAtiva = COMUNIDADES[0];

  useEffect(() => {
    if (!seletorAberto) return;
    function aoClicarFora(e: MouseEvent) {
      if (seletorRef.current?.contains(e.target as Node)) return;
      setSeletorAberto(false);
    }
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") setSeletorAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [seletorAberto]);

  return (
    <aside className="cm-sidebar">
      <div className="cm-comunidade-seletor" ref={seletorRef}>
        <button
          type="button"
          className="cm-comunidade-seletor-btn"
          onClick={() => setSeletorAberto((v) => !v)}
          aria-expanded={seletorAberto}
          aria-haspopup="true"
        >
          <span className="cm-comunidade-seletor-icone">{comunidadeAtiva.icone}</span>
          <span className="cm-comunidade-seletor-label">{comunidadeAtiva.label}</span>
          <ChevronDown size={16} className={`cm-seta ${seletorAberto ? "is-aberta" : ""}`} />
        </button>

        {seletorAberto && (
          <div className="cm-comunidade-dropdown" role="menu">
            {COMUNIDADES.filter((c) => c.id !== comunidadeAtiva.id).map((c) => (
              <div key={c.id} className="cm-comunidade-dropdown-item" aria-disabled={c.bloqueada}>
                <span className="cm-comunidade-seletor-icone">{c.icone}</span>
                <span>{c.label}</span>
                <Lock size={14} />
              </div>
            ))}
          </div>
        )}
      </div>

      <nav className="cm-sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `cm-sidebar-nav-item ${isActive ? "is-ativo" : ""}`}
          >
            <item.icon size={18} strokeWidth={1.8} />
            <span>{item.label}</span>
          </NavLink>
        ))}

        {usuario.admin && (
          <NavLink to="/app/admin" className={({ isActive }) => `cm-sidebar-nav-item ${isActive ? "is-ativo" : ""}`}>
            <Shield size={18} strokeWidth={1.8} />
            <span>Admin</span>
          </NavLink>
        )}
      </nav>

      <div className="cm-sidebar-footer">
        <NavLink to="/app/mensagens" className="cm-ajuda-card">
          <div className="cm-ajuda-icone">
            <Mail size={18} />
          </div>
          <div className="cm-ajuda-texto">
            <strong>Mensagens</strong>
            <span>Converse com a equipe</span>
          </div>
        </NavLink>

        <button
          type="button"
          className="cm-ajuda-card cm-ajuda-card--btn"
          onClick={() =>
            window.open(
              "https://wa.me/5521976624767?text=Olá, preciso de ajuda na Academia do Hábito",
              "_blank",
            )
          }
        >
          <div className="cm-ajuda-icone">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.52 3.48A11.94 11.94 0 0 0 12.04 0C5.5 0 .2 5.3.2 11.85c0 2.09.55 4.13 1.6 5.93L0 24l6.4-1.68a11.86 11.86 0 0 0 5.64 1.44h.01c6.54 0 11.85-5.3 11.85-11.85 0-3.17-1.23-6.14-3.38-8.43ZM12.05 21.6h-.01a9.8 9.8 0 0 1-5-1.37l-.36-.21-3.8 1 1.01-3.7-.23-.38a9.75 9.75 0 0 1-1.5-5.18c0-5.4 4.4-9.79 9.8-9.79 2.62 0 5.08 1.02 6.93 2.87a9.72 9.72 0 0 1 2.87 6.92c0 5.4-4.4 9.79-9.8 9.79Zm5.37-7.34c-.29-.15-1.74-.86-2.01-.96-.27-.1-.47-.15-.66.15-.2.29-.76.96-.93 1.16-.17.2-.34.22-.63.07-.29-.15-1.24-.46-2.36-1.46-.87-.78-1.46-1.74-1.63-2.03-.17-.3-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.2-.29.29-.49.1-.2.05-.37-.02-.51-.08-.15-.66-1.6-.91-2.2-.24-.58-.48-.5-.66-.5h-.56c-.2 0-.51.07-.78.37-.27.29-1.02 1-1.02 2.44s1.05 2.83 1.2 3.03c.15.2 2.06 3.16 5 4.43.7.3 1.24.48 1.67.62.7.22 1.34.19 1.84.12.56-.08 1.74-.71 1.98-1.4.25-.68.25-1.27.17-1.4-.07-.13-.26-.2-.55-.35Z" />
            </svg>
          </div>
          <div className="cm-ajuda-texto">
            <strong>Posso ajudar?</strong>
            <span>Tire suas dúvidas no WhatsApp</span>
          </div>
        </button>

        <div className="cm-sidebar-user-card">
          {usuario.avatarUrl ? (
            <img src={usuario.avatarUrl} alt="" className="cm-sidebar-avatar cm-sidebar-avatar-img" />
          ) : (
            <div className="cm-sidebar-avatar">{iniciais(usuario.nome)}</div>
          )}
          <div className="cm-sidebar-user-info">
            <strong>Olá, {usuario.primeiroNome}</strong>
            <span className="cm-badge-membro">Membro</span>
          </div>
          <button type="button" className="cm-sidebar-logout" onClick={onSair} aria-label="Sair" title="Sair">
            <LogOut size={15} />
            <span>Sair</span>
          </button>
        </div>
        <p className="cm-sidebar-copy">© 2026 Academia do Hábito</p>
      </div>
    </aside>
  );
}
