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

## Ponte PHP (`api/`) — só em produção

`academiadohabito.com.br` hoje é hospedagem PHP/HTML "clássica" na Hostinger
(sem Node App no hPanel), então o `server/src` acima **não roda em
produção** — só localmente (`npm run dev:all`). Pra já mostrar dado real de
produção sem migrar a hospedagem inteira agora, `api/*.php` (raiz do
projeto, deploy vira `public_html/api/`) lê direto do MySQL da Hostinger
(banco `u790959747_comunidade`, mesmo schema do Clube Presença em
`renatodepaula.com` — credenciais em `private/db_config.php`, fora do Git e
fora de `public_html`, subidas manualmente).

O client decide a URL por `window.location.hostname` (ver `ehProducaoReal`
em `meditacaoApi.ts`): em `academiadohabito.com.br` busca `/api/pulso.php`
(PHP, dado real); em qualquer outro host (localhost incluído) busca
`/api/meditacao/...` (Node, mock). Cada card migrado pra dado real ganha seu
próprio `.php` aqui — não é uma segunda cópia da lógica de negócio, só
leitura direta das mesmas tabelas que o PHP antigo já usa. Aposentar esta
pasta inteira quando o Node passar a rodar em produção (Node App na
Hostinger ou outro host).

## Rodando
```
npm install
npm run dev:all   # client (vite, :5173) + server (tsx watch, :3001)
```
