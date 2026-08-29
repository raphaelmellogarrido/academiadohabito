# Arquitetura

App logado da Academia do Hábito. `renatodepaula.com` (repo irmão
`renato_de_paula/`) é o site separado — **não é tocado por este projeto**.

## Client (`client/src`)
- `app/` — router (`routes.tsx`), layout logado (`layouts/AppLayout.tsx` +
  `Sidebar.tsx`, porte simplificado de `ComunidadeSidebar.jsx`).
- `features/{meditacao,alimentacao,exercicio}/` — 1 pasta por hábito
  (`components/`, `pages/`, `hooks/`, `api/`). Só `meditacao` tem conteúdo
  hoje; as outras duas são placeholder (`status: "em_breve"`).
- `shared/{ui,lib,hooks}` — CSS global, `apiClient.ts` (fetch wrapper),
  hooks cross-feature (`useAuth`, `useUserHabits`).
- `pages/{Landing,Login,Hub}` — telas fora do `/app`.

## Server (`server/src`)
Modular, 1 pasta por domínio em `modules/`, cada um com
`*.store.ts` (dados em memória) + `*.routes.ts` (Express Router):
`auth`, `users`, `habits`, `user-habits`, `community`, `gamification`,
`live`. `common/app.ts` monta o Express app e pendura os routers; `index.ts`
só dá `.listen()`.

Tudo em memória (mock) — sem banco real ainda, apesar de `mysql2` seguir
como dependência pro dia da migração.

## Rodando
```
npm install
npm run dev:all   # client (vite, :5173) + server (tsx watch, :3001)
```
