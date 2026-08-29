# Como adicionar um hábito novo

Exemplo abaixo usando `sono` como o novo hábito. Troque por `leitura`,
`agua`, etc.

## 1. Frontend — copiar a feature de referência

```
src/features/meditacao/  →  src/features/sono/
```

Copie a pasta inteira e renomeie os arquivos:

- `pages/MeditacaoHomePage.jsx` → `pages/SonoHomePage.jsx` (renomeie também
  o componente exportado dentro do arquivo)
- `api/meditacaoApi.js` → `api/sonoApi.js`
- `index.js` → ajuste o export pro novo nome de página

`components/` e `hooks/` começam vazios (só `.gitkeep`) — preencha conforme
a feature crescer.

## 2. Backend — copiar a feature de referência

```
server/features/meditacao/  →  server/features/sono/
```

Renomeie os 3 arquivos (`sono.routes.js`, `sono.controller.js`,
`sono.service.js`) e o conteúdo interno (nomes de função podem ficar
genéricos, ex. `getStatus`, ou virar algo específico do hábito).

## 3. Montar o router novo em `server/app.js`

```js
import sonoRoutes from "./features/sono/sono.routes.js";
// ...
app.use("/api/sono", sonoRoutes);
```

## 4. Registrar o hábito em `src/habits/registry.js`

```js
{
  id: "sono",
  label: "Sono",
  path: "/sono",
  color: "#0EA5E9",
  HomePage: lazy(() => import("../features/sono/pages/SonoHomePage.jsx")),
},
```

Isso já é suficiente pro menu (`AppLayout`) e pro router mostrarem o hábito
novo — nenhum dos dois precisa ser editado.

## 5. Tabelas no banco

O `CREATE TABLE` das tabelas do hábito `sono` fica dentro de
`server/features/sono/sono.service.js` (mesmo padrão do `meditacao.service.js`
de referência — hoje só um stub, ver `ARQUITETURA.md` sobre "cada feature é
dona das suas tabelas"). Quando o projeto adotar uma ferramenta de migration
formal, este passo muda para "criar uma migration em `<local a definir>`".

## 6. (Opcional) Ícone e cor

O `color` do registry já dá uma cor de identidade ao hábito no menu. Se o
design system (`src/shared/components/`) evoluir para usar ícones (ex.
lucide-react, como no `renato_de_paula`), adicione um campo `Icon` no
mesmo objeto do registry.

## Checklist rápido

- [ ] `src/features/<habito>/` criado (copiado de `meditacao`, renomeado)
- [ ] `server/features/<habito>/` criado (copiado de `meditacao`, renomeado)
- [ ] Router novo montado em `server/app.js`
- [ ] Entrada nova em `src/habits/registry.js`
- [ ] Tabelas do hábito criadas/migradas
