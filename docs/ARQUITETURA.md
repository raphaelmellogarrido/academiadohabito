# Arquitetura — Academia do Hábito

## Os dois projetos

- **`renatodepaula.com`** — blog institucional. Projeto separado
  (`renato_de_paula/`), continua existindo, **não é mexido a partir daqui**.
- **`academiadohabito.com.br`** — este projeto. App **logado**, onde o aluno
  acompanha múltiplos hábitos (meditação, alimentação, exercício, e futuros).

Não existe import cruzado entre os dois. Se algo do blog precisar aparecer
aqui (ex: um link "assine o curso"), isso é um link `<a href>` externo, não
código compartilhado.

## Por que feature-based

O projeto antigo (`renato_de_paula/src/pages/meditacao/`) acumulou 11
arquivos de landing page (`CienciaSection.jsx`, `OfertaSection.jsx`, etc.)
misturados com o que seria lógica de app, e um `server/index.js` de 343
linhas fazendo tudo. Isso não escala quando o plano é ter N hábitos.

Aqui, a organização é **por domínio (hábito)**, não por tipo de arquivo:

```
src/features/<habito>/
  index.js       # exports públicos da feature
  pages/         # telas
  components/    # componentes só desta feature
  hooks/         # hooks só desta feature
  api/           # chamadas HTTP pro backend desta feature

server/features/<habito>/
  <habito>.routes.js       # define os endpoints
  <habito>.controller.js   # traduz request/response
  <habito>.service.js      # regra de negócio + acesso a dados
```

Cada hábito é uma unidade que pode ser lida, testada e (no limite) removida
sem tocar nas outras.

## As camadas fora de `features/`

- **`src/habits/registry.js`** — a lista central de hábitos ativos (id,
  label, rota, cor, componente da home). Router e menu leem daqui em vez de
  hardcodar `meditacao`/`alimentacao`/`exercicio`. É o mecanismo de "plugar"
  um hábito novo sem editar código genérico.
- **`src/auth/`** e **`server/auth/`** — login e sessão. Não é um hábito
  (todo aluno usa, independente de quais hábitos ativou), por isso tem
  camada própria, paralela a `features/`.
- **`src/shared/`** e **`server/shared/`** — o que é genérico de verdade:
  design system (`shared/components`), cliente HTTP único
  (`shared/lib/apiClient.js`), utils sem dependência de nenhum hábito
  específico. Regra prática: se o código menciona "meditação" ou similar,
  não é `shared/`, é `features/`.
- **`server/core/`** — infraestrutura do backend: pool de banco (`db.js`),
  middlewares (`auth.js`, `errorHandler.js`), leitura de env. `server/app.js`
  monta tudo isso mais os routers de cada feature; `server/index.js` só
  chama `app.listen`.

## Banco de dados

Cada feature é dona das suas próprias tabelas — o `CREATE TABLE` de um
hábito vive dentro do `*.service.js` (ou um arquivo de migration próprio,
quando o projeto tiver uma ferramenta de migration) daquele hábito, não em
`server/core/db.js`. `core/db.js` só exporta o `pool` de conexão.

## Como adicionar um hábito novo

Ver [`como-adicionar-um-habito.md`](./como-adicionar-um-habito.md).
