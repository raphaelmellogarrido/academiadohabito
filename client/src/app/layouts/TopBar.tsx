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
