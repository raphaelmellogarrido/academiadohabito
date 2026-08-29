// Ponto único pra empilhar context providers globais (auth, tema, etc.)
// conforme o app crescer. Hoje é passthrough — mantém App.jsx estável
// enquanto os providers reais ainda não existem.
export default function AppProviders({ children }) {
  return children;
}
