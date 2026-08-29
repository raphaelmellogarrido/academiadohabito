# Academia do Hábito

App logado de `academiadohabito.com.br` — acompanhamento de múltiplos
hábitos (meditação, alimentação, exercício, e futuros).

> **Este projeto é separado de `renatodepaula.com`** (o blog institucional,
> pasta `renato_de_paula/`, sibling deste diretório). Nenhum código é
> compartilhado entre os dois — não mexa em `renato_de_paula/` a partir daqui.

## Stack

Vite + React 19 + React Router 7 no client · Express 5 + MySQL (mysql2) no
server · um único `package.json` na raiz, rodando os dois juntos em dev via
`concurrently` (mesmo padrão do `renato_de_paula`).

## Como rodar

```bash
npm install
cp .env.example .env   # preencher com credenciais reais do MySQL
npm run dev:all        # client (Vite) + server (Express) juntos
```

Scripts individuais: `npm run dev` (só client), `npm run server` (só API),
`npm run build`, `npm run lint`, `npm run preview`.

## Organização do código

Feature-based por hábito — cada hábito é uma pasta isolada em
`src/features/<habito>/` e `server/features/<habito>/`. Leia:

- [`docs/ARQUITETURA.md`](./docs/ARQUITETURA.md) — por que a estrutura é
  assim, o papel de cada camada (`features/`, `shared/`, `auth/`, `core/`).
- [`docs/como-adicionar-um-habito.md`](./docs/como-adicionar-um-habito.md) —
  passo a passo pra plugar um hábito novo (ex: sono, água, leitura).

## Estado atual

Estrutura de pastas e esqueleto (stubs) prontos, com `meditacao` como hábito
de referência completo e `alimentacao`/`exercicio` como placeholders no
mesmo padrão. Nenhuma lógica de negócio foi migrada do projeto antigo ainda
— isso é o próximo passo, feature por feature.
