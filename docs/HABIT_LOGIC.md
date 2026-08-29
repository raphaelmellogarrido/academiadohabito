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
  (`POST /api/meditacao/meditei-hoje`), quebra se faltar 1 dia. 7 bolinhas
  Dom–Sáb da semana atual.
- **Jornada**: `aulasAssistidas / 48`. Simplificação do MVP: cada
  "Meditei hoje" avança 1 aula (não há catálogo de vídeo ainda).
- **Meditando Junto**: pulso agregado de todos os usuários —
  `hojeCheckins`/`partilhasHoje` recalculados a cada request contra a data
  BRT atual (zeram sozinhos à meia-noite), `totalPresenca` soma o histórico
  inteiro e nunca reseta.
- Todo "hoje" usa fuso `America/Sao_Paulo`, não o fuso do servidor.

## Próximo encontro
`GET /api/meditacao/lives/proxima` — reservar é toggle
(`POST .../reservar`). `aoVivo`/`linkLive` só mudam via
`POST .../liberar` (admin) — troca "Aguardando" por "Entrar na live" pra
quem reservou.

## Pendências conhecidas
- Auth 100% mock (sem senha/hash) — trocar antes de produção.
- `PUT /api/meditacao/frase` sem checagem real de admin ainda.
- Sem persistência: reiniciar o server zera tudo.
