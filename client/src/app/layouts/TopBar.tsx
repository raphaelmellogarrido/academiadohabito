import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { Home, Library, Settings, Shield, Mail, LogOut, ChevronDown, Lock, Menu, X } from "lucide-react";
import type { Usuario } from "../../shared/hooks/useAuth";

// Porte da Sidebar.tsx pra layout de topbar fixa (ver layout.css). Mesma
// lógica (seletor de comunidade, nav, admin, mensagens, whatsapp, card do
// usuário) só que horizontal, com um drawer mobile no lugar da pilha vertical.
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
  return nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export function TopBar({ usuario, onSair }: { usuario: Usuario; onSair: () => void }) {
  const [seletorAberto, setSeletorAberto] = useState(false);
  const [drawerAberto, setDrawerAberto] = useState(false);
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

  // Drawer mobile fecha sozinho se a tela crescer pra desktop (evita ficar
  // "aberto" atrás de um layout que já não mostra mais o hamburger).
  useEffect(() => {
    function aoRedimensionar() {
      if (window.innerWidth > 768) setDrawerAberto(false);
    }
    window.addEventListener("resize", aoRedimensionar);
    return () => window.removeEventListener("resize", aoRedimensionar);
  }, []);

  const itensNav = usuario.admin ? [...NAV_ITEMS, { label: "Admin", icon: Shield, to: "/app/admin" }] : NAV_ITEMS;

  const linkWhatsapp = "https://wa.me/5521976624767?text=Olá, preciso de ajuda na Academia do Hábito";

  return (
    <>
      <header className="cm-topbar">
        <div className="cm-topbar-left">
          <button type="button" className="cm-hamburger" onClick={() => setDrawerAberto(true)} aria-label="Abrir menu">
            <Menu size={20} />
          </button>

          <div className="cm-comunidade-seletor" ref={seletorRef}>
            <button type="button" className="cm-comunidade-seletor-btn" onClick={() => setSeletorAberto((v) => !v)} aria-expanded={seletorAberto} aria-haspopup="true">
              <img src="/meditacao.png" alt="Academia do Hábito" className="cm-logo-r" />
              <span className="cm-comunidade-texto">
                <span>Comunidade</span>
                <span>{comunidadeAtiva.label}</span>
              </span>
              <ChevronDown size={14} className={`cm-seta ${seletorAberto ? "is-aberta" : ""}`} />
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
        </div>

        <nav className="cm-topbar-center-pill">
          {itensNav.map((item) => (
            <NavLink key={item.label} to={item.to} end={"end" in item ? item.end : undefined} className={({ isActive }) => `cm-pill-btn ${isActive ? "is-ativo" : ""}`}>
              <item.icon size={16} strokeWidth={1.8} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="cm-topbar-right">
          {/* <NavLink to="/app/mensagens" className="cm-msg-btn">
            <Mail size={16} />
            Mensagens
          </NavLink> */}

          <a href={linkWhatsapp} target="_blank" rel="noreferrer" className="cm-wpp-btn">
            Posso ajudar?
            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
              <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.65-1.03-5.13-2.9-7-1.87-1.87-4.35-2.9-7.03-2.83zm0 18.02h-.01c-1.49 0-2.95-.4-4.22-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.13 8.13 0 0 1-1.25-4.34c0-4.5 3.66-8.16 8.16-8.16 2.18 0 4.22.85 5.77 2.39a8.1 8.1 0 0 1 2.39 5.77c0 4.5-3.65 8.15-8.05 8.2zm4.48-6.13c-.24-.12-1.43-.71-1.65-.79-.22-.08-.38-.12-.55.12-.16.24-.63.79-.77.95-.14.16-.28.18-.52.06-.24-.12-1-.37-1.9-1.17-.7-.63-1.18-1.4-1.31-1.64-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.42-.55-.42h-.47c-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.02 0 1.19.87 2.34 1 2.5.12.16 1.7 2.6 4.13 3.65.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.43-.58 1.63-1.15.2-.56.2-1.04.14-1.15-.06-.1-.22-.16-.46-.28z" />
            </svg>
          </a>

          <div className="cm-profile">
            {usuario.avatarUrl ? <img src={usuario.avatarUrl} alt="" className="cm-profile-avatar cm-profile-avatar-img" /> : <div className="cm-profile-avatar">{iniciais(usuario.nome)}</div>}
            <span className="cm-profile-texto">
              Olá, {usuario.primeiroNome}
              <small>Membro</small>
            </span>
            <button type="button" className="cm-profile-sair" onClick={onSair} aria-label="Sair" title="Sair">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {drawerAberto && (
        <>
          <div className="cm-overlay" onClick={() => setDrawerAberto(false)} />
          <nav className="cm-drawer">
            <div className="cm-drawer-header">
              {usuario.avatarUrl ? <img src={usuario.avatarUrl} alt="" className="cm-profile-avatar cm-profile-avatar-img" /> : <div className="cm-profile-avatar">{iniciais(usuario.nome)}</div>}
              <span className="cm-profile-texto">
                Olá, {usuario.primeiroNome}
                <small>Membro</small>
              </span>
              <button type="button" onClick={() => setDrawerAberto(false)} aria-label="Fechar menu">
                <X size={20} />
              </button>
            </div>

            {itensNav.map((item) => (
              <NavLink key={item.label} to={item.to} end={"end" in item ? item.end : undefined} className={({ isActive }) => `cm-drawer-item ${isActive ? "is-ativo" : ""}`} onClick={() => setDrawerAberto(false)}>
                <item.icon size={18} strokeWidth={1.8} />
                {item.label}
              </NavLink>
            ))}

            <NavLink to="/app/mensagens" className="cm-drawer-item" onClick={() => setDrawerAberto(false)}>
              <Mail size={18} />
              Mensagens
            </NavLink>

            <a href={linkWhatsapp} target="_blank" rel="noreferrer" className="cm-drawer-item">
              Posso ajudar? WhatsApp
            </a>

            <button type="button" className="cm-drawer-item" onClick={onSair}>
              <LogOut size={18} />
              Sair
            </button>
          </nav>
        </>
      )}
    </>
  );
}
