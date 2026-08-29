import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  erro: Error | null;
}

// Rede de segurança pra nenhuma página logada (ex: /app/meditacao/aulas,
// /app/configuracoes) quebrar em tela branca — captura erro de render de
// qualquer descendente e mostra um cartão de fallback em vez de crashar o
// app inteiro. AppLayout monta isto ao redor do <Outlet/>, remontando por
// `key={pathname}` a cada troca de rota (ver AppLayout.tsx).
export class ErrorBoundary extends Component<Props, State> {
  state: State = { erro: null };

  static getDerivedStateFromError(erro: Error): State {
    return { erro };
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", erro, info.componentStack);
  }

  render() {
    if (this.state.erro) {
      return (
        <div className="cartao" style={{ maxWidth: 480 }}>
          <p className="cartao-titulo">Algo deu errado</p>
          <p>Essa página encontrou um problema. Tente recarregar.</p>
          <button type="button" onClick={() => window.location.reload()}>
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
