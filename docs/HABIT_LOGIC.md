# Lógica de hábitos

## Modelo
```
habits       { id, slug, nome, status: "ativo" | "em_breve" }
user_habits  { userId, habitId, enrolled_at }
progress     { userId, habitId, sequencia (derivada), jornada (derivada) }
```
Ver `server/src/modules/habits/habits.data.ts`, `user-habits/user-habits.store.ts`,
`gamification/gamification.store.ts`.

## Rota inteligente (`/app`)
`GET /api/me/habitos` → `client/src/shared/hooks/useUserHabits.ts`:
- `length === 1` → redireciona pra `/app/:slug` (hoje sempre `meditacao`).
- `length !== 1` → mostra o Hub (`pages/Hub`).

## Gamificação (meditação)
- **Sequência**: streak de dias consecutivos com check-in
  (`POST /api/meditacao/meditei-hoje`), quebra se faltar 1 dia. 7 bolinhas na
  semana de calendário Dom–Sáb que contém "hoje" (sempre começa no domingo);
  marcadas por posição dentro do streak atual, dias futuros da semana ficam
  vazios.
- **Jornada** (dashboard): `aulasAssistidas / 48`, incrementada por
  "Meditei hoje" — contador simples e independente do progresso real de
  vídeo-aulas abaixo (as duas fontes não são unificadas, de propósito: uma é
  o hábito diário, a outra é a trilha de curso).
- **Meditando Junto**: pulso agregado de todos os usuários —
  `hojeCheckins`/`partilhasHoje` recalculados a cada request contra a data
  BRT atual (zeram sozinhos à meia-noite), `totalPresenca` soma o histórico
  inteiro e nunca reseta.
- Todo "hoje" usa fuso `America/Sao_Paulo`, não o fuso do servidor.

## Vídeo-aulas (`/app/meditacao/aulas`)
- Catálogo real (16 dias, dia0–dia15, ~48 vídeos), montado a partir do
  filesystem — mapa arquivo→título fixo (`aulas.catalogo.ts` no mock,
  `TITULOS_AULAS_RAIZ` em `api/_aulas.php` na produção), mesmo curso/vídeos
  de `renato_de_paula`. Os `.mp4` reais **não vivem no repo**: sobem via FTP
  direto pra uma pasta `curso-meditacao-raiz` na raiz da hospedagem (mesma
  altura de `public_html` na Hostinger). Em dev, se a pasta não existir
  localmente, o catálogo cai pro modo "virtual" (usa só o mapa de títulos,
  URLs que 404 até os arquivos reais chegarem) — dá pra testar a UI inteira
  sem os vídeos de verdade. Variável de ambiente: `CURSO_MEDITACAO_DIR` (só
  o mock Node lê; o PHP de produção resolve o caminho sozinho, 2 níveis
  acima de `api/`).
- **Bloqueio por dia** (não por vídeo individual): todos os vídeos de um dia
  liberam juntos, em ordem dentro do dia; o próximo dia só libera depois da
  virada de calendário em Brasília (exceção: Dia 0 → Dia 1 libera no mesmo
  dia). Dias já completados continuam sempre revisitáveis. **Pausa
  obrigatória** (pedido do cliente, mesmo algoritmo do projeto irmão
  `renato_de_paula/.../progressoDias.js`): a cada 3 dias de curso concluídos
  (dias 1-3, 4-6, 7-9, ...), o aluno espera 4 dias corridos antes do próximo
  dia liberar — "dia de retomada" é `dia > 1 && dia % 3 === 1` (dias 4, 7,
  10, 13...; o Dia 1 fica fora, coberto pela exceção Dia0→Dia1). Fora dos
  dias de retomada, vale a regra geral de 1 dia novo por dia de calendário.
  Dia 0 nunca entra na conta de 3-em-3. Ver `aulas.progressoDias.ts` e o
  espelho em `api/_aulas.php::podeAssistirAula`, mantidos manualmente em
  sincronia com a versão client-side em `client/.../lib/progressoDias.ts`.
  Servidor sempre revalida o bloqueio antes de aceitar uma conclusão — a UI
  desabilitar o botão não é a única trava.
- **Comentários da aula** guardam, no momento da criação, em qual vídeo o
  autor estava (`dia` + `aulaIndex`, 1-based) — é o que mostra o badge
  "Dia X, Aula Y" ao lado do nome no feed de comentários. Na produção PHP
  isso fica embutido no `aula_id` (`"aulas:{dia}:{aulaIndex}:{arquivo}"`,
  gravado explicitamente, não re-derivado do nome do arquivo depois).

## Próximo encontro
`GET /api/meditacao/lives/proxima` — reservar é toggle
(`POST .../reservar`). `aoVivo`/`linkLive` só mudam via
`POST .../liberar` (admin) — troca "Aguardando" por "Entrar na live" pra
quem reservou.

## Pendências conhecidas
- Auth 100% mock (sem senha/hash) — trocar antes de produção.
- `PUT /api/meditacao/frase` sem checagem real de admin ainda.
- Sem persistência: reiniciar o server zera tudo.
