# Academia do Hábito

App logado de `academiadohabito.com.br` — acompanhamento de múltiplos
hábitos (meditação ativa hoje; alimentação e exercício em breve).

> **Este projeto é separado de `renatodepaula.com`** (o blog institucional,
> pasta `renato_de_paula/`, sibling deste diretório). Nenhum código é
> compartilhado entre os dois — não mexa em `renato_de_paula/` a partir daqui.

## Stack

Vite + React 19 + React Router 7 (`client/`) · Express 5 + TypeScript
(`server/`, rodado via `tsx`) · um único `package.json` na raiz, rodando os
dois juntos em dev via `concurrently`.

## Como rodar

```bash
npm install
npm run dev:all        # client (Vite, :5173) + server (Express, :3001) juntos
```

Scripts individuais: `npm run dev` (só client), `npm run server` (só API),
`npm run build`, `npm run lint`, `npm run preview`.

## Organização do código

- `client/src/app/` — router + layout logado (Sidebar).
- `client/src/features/<habito>/` — 1 pasta por hábito (`meditacao` completo,
  `alimentacao`/`exercicio` placeholders).
- `client/src/shared/` — CSS global, fetch wrapper, hooks cross-feature.
- `server/src/modules/<dominio>/` — 1 pasta por domínio (`auth`, `users`,
  `habits`, `user-habits`, `community`, `gamification`, `live`).

Leia [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) e
[`docs/HABIT_LOGIC.md`](./docs/HABIT_LOGIC.md).

## Estado atual

`meditacao` é o hábito de referência, funcional ponta a ponta (mock, em
memória, sem persistência real). `alimentacao`/`exercicio` são placeholders
(`status: "em_breve"`).
