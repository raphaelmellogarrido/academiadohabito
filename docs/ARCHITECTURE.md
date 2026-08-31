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

Rodada seguinte migra o resto do dashboard de meditação pra dado real:
`jornada.php` e `meditei-hoje.php` (POST, grava em `presencas`) reaproveitam
`api/_habito.php` (`calcularSequencia`/`calcularJornada`, também usado pelo
`sequencia.php` reescrito — elimina a duplicação que existia antes);
`frase.php` lê `frase_motivacional_semana` (só `frase`+`subfrase`, o client
remapeia `subfrase`→`autor` em `meditacaoApi.ts` pra não mudar
`FraseSemana.tsx`); `desafios.php`/`desafios-alternar.php` usam
`desafio_config`+`desafio_semana` já existentes via `api/_desafios.php`.

"Próximo encontro ao vivo" (`encontro.php`/`encontro-reservar.php`) não
reaproveita as tabelas antigas (`config_encontro`/`live_reservas`): a
primeira tem campos freeform demais e a segunda mora num banco separado
(`u790959747_clube`) sem credencial disponível. Em vez disso,
`api/_encontro.php` cria duas tabelas novas, **self-provisioning**
(`CREATE TABLE IF NOT EXISTS` + seed na primeira execução, mesmo padrão do
`live/reservas.php` antigo) dentro do `u790959747_comunidade` já conectado:
`ah_proximo_encontro` (1 linha, `id=1`, editada por `/app/admin` via
`encontro-editar.php` — ver "Admin e tempo real" abaixo) e
`ah_encontro_reservas` (reserva por aluno).

"Sua prática hoje" / feed (`feed.php`, `feed-reagir.php`,
`feed-responder.php`, `imagem-comentario.php`) reaproveita `comentarios` e
`comentario_reacoes` — tabelas já em uso (`pulso.php` já lê `comentarios`
pra `partilhasHoje`), mesmo schema do `comentarios.php`/`imagem-comentario.php`
do site antigo. `aula_id` fica fixo em `'geral'` (1 feed só, não por-aula).
Lógica compartilhada (montagem de post, reações em lote anti-N+1) vive em
`api/_feed.php`. Diferente do mock (que devolve todo post pra todo mundo),
aqui a visibilidade é real: post `'privado'` só aparece pro próprio autor,
já que agora é dado de múltiplos alunos de verdade.

`/app/meditacao/aulas` (`aulas-progresso.php`, `aulas-concluir.php`,
`aulas-comentarios.php`, `aulas-comentario-reagir.php`,
`aulas-comentario-excluir.php`) porta 1:1 o algoritmo de
`aulas.store.ts::getProgresso`/`concluirDia` (bloco de 3 dias, pausa
obrigatória) pra dentro de `api/_aulas.php`. Progresso mora numa tabela nova
**self-provisioning** `ah_aulas_progresso` (`email`+`dia`+`concluido_em`,
mesmo padrão do `ah_proximo_encontro`/`ah_encontro_reservas` de
`_encontro.php` — nenhuma tabela real equivalente existe). Comentários da
aula reaproveitam `comentarios`/`comentario_reacoes` (mesmo `_feed.php`
usado pelo feed), mas como essa tabela não tem coluna pra "dia da aula" e é
compartilhada com o site antigo, o dia fica embutido no próprio `aula_id`
como `"aulas:{dia}"` (listagem filtra por `aula_id LIKE 'aulas:%'`). `admin`
no comentário real segue `ehOrientadorEmail()` (ver abaixo) — excluir aceita
o próprio autor ou um orientador, mesmo contrato do mock.

## Admin e tempo real (≤3s)

Não existe tabela de "papel" em `alunos` — admin/orientador é a mesma lista
fixa `EMAILS_ORIENTADORES` (`api/_config.php`, espelhada em
`ehOrientador()` de `server/src/modules/auth/auth.service.ts`), já
reaproveitada em vários lugares como bypass de "pode excluir". `_config.php`
(sempre o primeiro `require` de todo endpoint) expõe `ehOrientadorEmail()` +
`exigirAdmin($email)` (mesmo padrão 403 de `exigirSessao()`); `alunoParaUsuario()`
seta `admin` a partir daí, o que já liga o link "Admin" na TopBar sem
mexer nela. `encontro-editar.php`, `frase-editar.php` e
`desafios-editar.php`/`desafios-resetar.php` (todos atrás de
`exigirSessao()` + `exigirAdmin()`) são os endpoints de escrita restritos a
admin — servem os formulários de `/app/admin` (`client/src/features/admin/`).
`desafios-editar.php` reescreve `desafio_config` inteira (delete + insert,
`ordem` = posição da linha no textarea); `desafios-resetar.php` zera
`desafio_semana` inteira (todos os alunos, todas as semanas) — mesmo par de
funções em `api/_desafios.php` (`salvarDesafiosSemana`/`resetarDesafiosSemana`),
espelhando `editarDesafiosSemana`/`resetarDesafios` do mock
(`community.store.ts`).

Sem Node App em produção, WebSocket/SSE não são viáveis (mesma limitação do
topo deste doc) — "atualizar pra todo mundo em até 3s" é feito por
**polling**: todo card do dashboard (`usePolling`, `shared/hooks/usePolling.ts`)
re-busca seu próprio endpoint a cada 3s, pausando sozinho quando a aba vai
pra background. Isso cobre uniformemente qualquer origem de mudança — ação
de outro aluno (meditar, comentar, reagir, reservar vaga) ou edição feita no
admin — sem precisar de nenhum mecanismo de "avisar os outros": o próximo
poll de qualquer cliente já traz a versão nova.

## Rodando
```
npm install
npm run dev:all   # client (vite, :5173) + server (tsx watch, :3001)
```
