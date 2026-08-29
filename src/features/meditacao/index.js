// Hábito de referência: qualquer hábito novo copia esta pasta inteira
// (index.js, pages/, components/, hooks/, api/) e renomeia. Ver
// docs/como-adicionar-um-habito.md.
//
// Exporte aqui só o que outras partes do app (fora desta feature) precisam
// importar — o resto (components/hooks internos) fica privado da feature.

export { default as MeditacaoHomePage } from "./pages/MeditacaoHomePage.jsx";
