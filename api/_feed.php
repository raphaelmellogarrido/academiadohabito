<?php
// Compartilhado por feed.php, feed-reagir.php e feed-responder.php.
// Tabelas reais JÁ existentes e já em uso (pulso.php já lê `comentarios` pra
// partilhasHoje): comentarios (email,nome,aula_id,comentario,image_blob,
// image_mime,parent_id,visibilidade) + comentario_reacoes (comentario_id,
// emoji,email) — mesmo schema do site antigo (hotmart/comentarios.php).
// Fixo AULA_ID_FEED='geral': o app novo tem 1 feed só ("Sua prática hoje"),
// não por-aula — mesmo valor-padrão que o site antigo já usa quando
// aula_id não vem na query.
const AULA_ID_FEED = 'geral';

// 'AAAA-MM-DD HH:MM:SS' (fuso -03:00, SET time_zone em _config.php) -> ISO
// 8601 com offset explícito, pra `new Date(post.criadoEm)` no client nunca
// ficar ambíguo entre o fuso do banco e o fuso do navegador.
function isoComOffset(string $mysqlDatetime): string
{
    return str_replace(' ', 'T', $mysqlDatetime) . '-03:00';
}

// EMAILS_ORIENTADORES/ehOrientadorEmail() moraram aqui antes — agora ficam
// em _config.php (sempre o primeiro require de todo endpoint, não só os de
// feed) pra exigirAdmin() e alunoParaUsuario() poderem reusar sem duplicar.

// null/'publico' = visível a todo mundo; 'privado' só pro próprio autor;
// 'orientador' só pro próprio autor + ehOrientadorEmail(). Aplicado em SQL
// (WHERE), não em PHP, pra não vazar posts privados de outros alunos
// preenchendo os 30 mais recentes. 2 placeholders: e-mail do autor (pro
// aluno ver o próprio post privado/orientador) e flag calculada em PHP se
// quem está pedindo é orientador.
function condVisibilidadeSql(): string
{
    return "(visibilidade = 'publico' OR visibilidade IS NULL OR email = ? OR (visibilidade = 'orientador' AND ? = 1))";
}

// Reações (🙏 ❤️ 🔥) de vários comentários numa query só (evita N+1).
// Devolve [id => ['reacoes' => [...], 'minhasReacoes' => [emailAtual=>[...]]]].
function montarReacoesEmLote(mysqli $mysqli, array $ids, string $emailAtual): array
{
    $out = [];
    foreach ($ids as $id) {
        $out[$id] = ['reacoes' => ['🙏' => 0, '❤️' => 0, '🔥' => 0], 'minhasReacoes' => []];
    }
    if (!$ids) {
        return $out;
    }

    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $tipos = str_repeat('i', count($ids));

    $stmt = $mysqli->prepare(
        "SELECT comentario_id, emoji, COUNT(*) AS n FROM comentario_reacoes
         WHERE comentario_id IN ($placeholders) GROUP BY comentario_id, emoji"
    );
    $stmt->bind_param($tipos, ...$ids);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($row = $res->fetch_assoc()) {
        $out[(int) $row['comentario_id']]['reacoes'][$row['emoji']] = (int) $row['n'];
    }
    $stmt->close();

    if ($emailAtual !== '') {
        // Reações do próprio aluno atual nestes ids, separadas por id (pra
        // saber em quais posts/respostas ele já reagiu e com quê).
        $stmt = $mysqli->prepare(
            "SELECT comentario_id, emoji FROM comentario_reacoes
             WHERE comentario_id IN ($placeholders) AND email = ?"
        );
        $paramsMinhas = [...$ids, $emailAtual];
        $stmt->bind_param($tipos . 's', ...$paramsMinhas);
        $stmt->execute();
        $res = $stmt->get_result();
        while ($row = $res->fetch_assoc()) {
            $id = (int) $row['comentario_id'];
            $out[$id]['minhasReacoes'][$emailAtual] = $out[$id]['minhasReacoes'][$emailAtual] ?? [];
            $out[$id]['minhasReacoes'][$emailAtual][] = $row['emoji'];
        }
        $stmt->close();
    }

    return $out;
}

// Sobe a cadeia parent_id até achar a raiz (parent_id IS NULL) de qualquer
// nó da thread — usado por todo endpoint que agora pode agir sobre uma
// resposta em vez de só o post raiz (reagir/editar/visibilidade/responder),
// pra sempre validar visibilidade/dono contra a raiz, não contra o nó em si.
// Limite de 50 saltos é só proteção contra dado corrompido (ciclo), threads
// reais nunca chegam nem perto disso.
function raizDoId(mysqli $mysqli, int $id): ?int
{
    $atual = $id;
    for ($i = 0; $i < 50; $i++) {
        $stmt = $mysqli->prepare("SELECT id, parent_id FROM comentarios WHERE id = ?");
        $stmt->bind_param('i', $atual);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (!$row) {
            return null;
        }
        if ($row['parent_id'] === null) {
            return (int) $row['id'];
        }
        $atual = (int) $row['parent_id'];
    }
    return $atual;
}

// BFS por parent_id: todos os ids da subárvore de `$id`, incluindo ele mesmo
// — usado só por excluir (feed-excluir.php/aulas-comentario-excluir.php) pra
// apagar em cascata de verdade (reações + linhas) quando o nó tem respostas.
function descendentes(mysqli $mysqli, int $id): array
{
    $ids = [$id];
    $fronteira = [$id];
    while ($fronteira) {
        $placeholders = implode(',', array_fill(0, count($fronteira), '?'));
        $tipos = str_repeat('i', count($fronteira));
        $stmt = $mysqli->prepare("SELECT id FROM comentarios WHERE parent_id IN ($placeholders)");
        $stmt->bind_param($tipos, ...$fronteira);
        $stmt->execute();
        $res = $stmt->get_result();
        $prox = [];
        while ($row = $res->fetch_assoc()) {
            $prox[] = (int) $row['id'];
        }
        $stmt->close();
        $ids = array_merge($ids, $prox);
        $fronteira = $prox;
    }
    return $ids;
}

// Nome/avatar ATUAIS de vários alunos numa query só (evita N+1) — sobrepõe
// nome/avatarUrl "ao vivo" por cima do snapshot salvo em comentarios.nome
// (ver montarNoRecursivo), assim um post/comentário antigo passa a refletir
// o nome/foto de HOJE do autor, não o de quando foi escrito. `tem_avatar`
// calculado em SQL (não traz o MEDIUMBLOB inteiro pra PHP só pra checar
// vazio) — mesma ideia de avatarUrl em alunoParaUsuario() (_config.php).
// Devolve [email => ['nome' => ..., 'avatarUrl' => ...|null]].
function buscarAlunosEmLote(mysqli $mysqli, array $emails): array
{
    $out = [];
    if (!$emails) {
        return $out;
    }
    garantirColunasPerfil($mysqli);

    $placeholders = implode(',', array_fill(0, count($emails), '?'));
    $tipos = str_repeat('s', count($emails));
    $stmt = $mysqli->prepare(
        "SELECT email, nome, avatar_versao,
                (avatar_blob IS NOT NULL AND avatar_blob <> '') AS tem_avatar
         FROM alunos WHERE email IN ($placeholders)"
    );
    $stmt->bind_param($tipos, ...$emails);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($row = $res->fetch_assoc()) {
        $out[$row['email']] = [
            'nome' => $row['nome'],
            'avatarUrl' => $row['tem_avatar']
                ? '/api/avatar.php?e=' . urlencode($row['email']) . '&v=' . (int) ($row['avatar_versao'] ?? 0)
                : null,
        ];
    }
    $stmt->close();
    return $out;
}

// Monta 1 nó da árvore (shape de NoComentario, sem `humor`/`diaAtual`, que
// são só da raiz e ficam por conta de montarPost/montarAulaComentario) a
// partir de dados já buscados em lote — nunca faz query aqui dentro.
// `admin` fica sempre false: `alunos` ainda não tem papel de admin de
// verdade, só EMAILS_ORIENTADORES (reaproveitado como "admin" só pra
// podeExcluir, ver ehOrientadorEmail acima).
// `alunosPorEmail` (ver buscarAlunosEmLote) sobrepõe nome/avatar ao vivo por
// cima do snapshot de `comentarios` — cai pro snapshot só se o aluno tiver
// sido removido de `alunos` depois de comentar.
function montarNoRecursivo(int $id, array $linhas, array $filhos, array $reacoesPorId, array $alunosPorEmail, string $emailAtual): array
{
    $row = $linhas[$id];
    $aluno = $alunosPorEmail[$row['email']] ?? null;
    $nomeAtual = $aluno['nome'] ?? null;
    $reacoes = $reacoesPorId[$id] ?? ['reacoes' => ['🙏' => 0, '❤️' => 0, '🔥' => 0], 'minhasReacoes' => []];
    $respostas = [];
    foreach (($filhos[$id] ?? []) as $filhoId) {
        $respostas[] = montarNoRecursivo($filhoId, $linhas, $filhos, $reacoesPorId, $alunosPorEmail, $emailAtual);
    }
    return [
        'id' => (string) $id,
        'userId' => $row['email'],
        'nome' => ($nomeAtual !== null && $nomeAtual !== '') ? $nomeAtual : ($row['nome'] ?: 'Aluno'),
        'avatarUrl' => $aluno['avatarUrl'] ?? null,
        'admin' => false,
        'texto' => $row['comentario'],
        'foto' => $row['image_mime'] ? ('/api/imagem-comentario.php?id=' . $id) : null,
        'visibilidade' => $row['visibilidade'] ?: 'publico',
        'reacoes' => $reacoes['reacoes'],
        'minhasReacoes' => $reacoes['minhasReacoes'],
        'respostas' => $respostas,
        // Editar (texto/visibilidade) é só do dono; excluir também aceita
        // orientador — reaproveita EMAILS_ORIENTADORES como "admin" por
        // enquanto, já que `alunos` ainda não tem papel de admin de verdade.
        'podeEditar' => $row['email'] === $emailAtual,
        'podeExcluir' => $row['email'] === $emailAtual || ehOrientadorEmail($emailAtual),
        'criadoEm' => isoComOffset($row['created_at']),
    ];
}

// Reconstrói a árvore inteira (raiz + respostas em qualquer profundidade +
// reações, tudo batched) a partir de QUALQUER id da thread — resolve a raiz
// primeiro via raizDoId, então já devolve o nó certo mesmo se `$anyId` for
// uma resposta aninhada. Compartilhado por montarPost (feed) e
// montarAulaComentario (_aulas.php), que só empilham `humor`/`diaAtual` por
// cima do nó raiz devolvido aqui.
function montarArvoreComentario(mysqli $mysqli, int $anyId, string $emailAtual): ?array
{
    $raizId = raizDoId($mysqli, $anyId);
    if ($raizId === null) {
        return null;
    }

    $stmt = $mysqli->prepare(
        "SELECT id, email, nome, comentario, image_mime, visibilidade, created_at
         FROM comentarios WHERE id = ?"
    );
    $stmt->bind_param('i', $raizId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$row) {
        return null;
    }

    $linhas = [$raizId => $row];
    $filhos = [];

    // BFS nível a nível: uma query por profundidade da thread, não por nó.
    $fronteira = [$raizId];
    while ($fronteira) {
        $placeholders = implode(',', array_fill(0, count($fronteira), '?'));
        $tipos = str_repeat('i', count($fronteira));
        $stmt = $mysqli->prepare(
            "SELECT id, email, nome, comentario, image_mime, visibilidade, created_at, parent_id
             FROM comentarios WHERE parent_id IN ($placeholders)
             ORDER BY created_at ASC, id ASC"
        );
        $stmt->bind_param($tipos, ...$fronteira);
        $stmt->execute();
        $res = $stmt->get_result();
        $prox = [];
        while ($r = $res->fetch_assoc()) {
            $id = (int) $r['id'];
            $linhas[$id] = $r;
            $pid = (int) $r['parent_id'];
            $filhos[$pid][] = $id;
            $prox[] = $id;
        }
        $stmt->close();
        $fronteira = $prox;
    }

    $ids = array_map('intval', array_keys($linhas));
    $reacoesPorId = montarReacoesEmLote($mysqli, $ids, $emailAtual);
    $emails = array_values(array_unique(array_column($linhas, 'email')));
    $alunosPorEmail = buscarAlunosEmLote($mysqli, $emails);

    return montarNoRecursivo($raizId, $linhas, $filhos, $reacoesPorId, $alunosPorEmail, $emailAtual);
}

// Reconstrói 1 post completo (árvore inteira, raiz + respostas em qualquer
// profundidade) a partir de QUALQUER id da thread — usado por
// feed-reagir.php/feed-responder.php/etc depois de mutar uma linha, sem
// precisar devolver a lista inteira do feed. Aceita tanto o id da raiz
// quanto de uma resposta (resolve a raiz internamente via
// montarArvoreComentario), então nenhum call site que já passava a raiz
// precisa mudar.
function montarPost(mysqli $mysqli, int $anyId, string $emailAtual): ?array
{
    $arvore = montarArvoreComentario($mysqli, $anyId, $emailAtual);
    if ($arvore === null) {
        return null;
    }
    // não existe coluna real pra humor, e o mock também nunca renderiza esse
    // campo fora do post raiz
    $arvore['humor'] = null;
    return $arvore;
}
