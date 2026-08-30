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

O client decide a URL por `window.location.hostname` (`ehProducaoReal` em
`shared/lib/ambiente.ts`, único lugar que faz essa checagem): em
`academiadohabito.com.br` busca `/api/*.php` (PHP, dado real); em qualquer
outro host (localhost incluído) busca `/api/...` de sempre (Node, mock).
Cada card migrado pra dado real ganha seu próprio `.php` aqui — não é uma
segunda cópia da lógica de negócio, só leitura direta das mesmas tabelas que
o PHP antigo já usa. Aposentar esta pasta inteira quando o Node passar a
rodar em produção (Node App na Hostinger ou outro host).

**Login real + sessão do aluno** (`login.php`, `logout.php`, `me.php`,
`_sessao.php`) — cards por-aluno (ex: "Sequência") precisam saber quem está
logado, e o app novo ainda não tem login de verdade (`auth.service.ts` é
mock). `login.php` valida email+senha contra `alunos` (bcrypt `senha_hash`,
mesma regra do `login.php` do site antigo) e, se ok, assina um cookie
`ah_aluno` (HMAC com `SESSION_SECRET`, definido em `private/db_config.php` —
**precisa ser adicionado manualmente lá**, não existe no repo). `_sessao.php`
lê/valida esse cookie; qualquer `.php` que precise saber o aluno logado
(`me.php`, `sequencia.php`) chama `exigirSessao()` no topo. Diferente do site
antigo (que confiava num `email` cru mandado pelo client em cada chamada),
aqui o cookie é assinado — não dá pra forjar sem o segredo.

`api/sequencia.php` porta pro PHP o mesmo algoritmo de streak/bolinhas de
`gamification.store.ts` (`calcularStreak`/`calcularBolinhas`), lendo
`presencas` do aluno da sessão. Fica de fora desta rodada: "Meditei hoje"
(grava em `presencas`) e a tela de "criar senha" pra quem comprou mas nunca
definiu uma (login.php responde `precisaCriarSenha:true` nesse caso, sem
fluxo de UI ainda).

`api/habitos.php` (GET, também atrás de `exigirSessao()`) é o real de
`GET /me/habitos` (`useUserHabits.ts`, base da "rota inteligente" em
`routes.tsx`). Sem tabela de matrícula em `u790959747_comunidade` (schema
antigo era só meditação), a regra é a mesma do mock: todo aluno autenticado
já cai matriculado só em "meditacao". `enrolled_at` é só cosmético (não
aparece em lugar nenhum do client hoje) — usa `MIN(presencas.data)` do aluno
quando existe, senão a data de hoje.

## Rodando
```
npm install
npm run dev:all   # client (vite, :5173) + server (tsx watch, :3001)
```
