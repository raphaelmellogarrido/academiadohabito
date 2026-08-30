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

// null/'publico' = visível a todo mundo; qualquer outro valor ('privado',
// 'orientador' — não temos lista de orientadores nesta app ainda) só é
// visível pro próprio autor. Aplicado em SQL (WHERE), não em PHP, pra não
// vazar posts privados de outros alunos preenchendo os 30 mais recentes.
function condVisibilidadeSql(): string
{
    return "(visibilidade = 'publico' OR visibilidade IS NULL OR email = ?)";
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

// Reconstrói 1 post completo (raiz + respostas + reações) pelo id — usado
// por feed-reagir.php/feed-responder.php depois de mutar uma linha, sem
// precisar devolver a lista inteira do feed.
function montarPost(mysqli $mysqli, int $id, string $emailAtual): ?array
{
    $stmt = $mysqli->prepare(
        "SELECT id, email, nome, comentario, image_mime, visibilidade, created_at
         FROM comentarios WHERE id = ? AND parent_id IS NULL"
    );
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$row) {
        return null;
    }

    $respostas = [];
    $stmtResp = $mysqli->prepare(
        "SELECT id, email, nome, comentario, created_at FROM comentarios
         WHERE parent_id = ? ORDER BY created_at ASC, id ASC"
    );
    $stmtResp->bind_param('i', $id);
    $stmtResp->execute();
    $resResp = $stmtResp->get_result();
    while ($r = $resResp->fetch_assoc()) {
        $respostas[] = [
            'id' => (string) $r['id'],
            'userId' => $r['email'],
            'nome' => $r['nome'] ?: 'Aluno',
            'texto' => $r['comentario'],
            'criadoEm' => isoComOffset($r['created_at']),
        ];
    }
    $stmtResp->close();

    $reacoes = montarReacoesEmLote($mysqli, [(int) $row['id']], $emailAtual)[(int) $row['id']];

    return [
        'id' => (string) $row['id'],
        'userId' => $row['email'],
        'nome' => $row['nome'] ?: 'Aluno',
        'avatarUrl' => null, // avatar real fica pra quando esse card entrar (mesmo estado de alunoParaUsuario())
        'texto' => $row['comentario'],
        'humor' => null, // não existe coluna real pra humor, e o mock também nunca renderiza esse campo no post
        'foto' => $row['image_mime'] ? ('/api/imagem-comentario.php?id=' . $row['id']) : null,
        'publico' => ($row['visibilidade'] ?: 'publico') === 'publico',
        'reacoes' => $reacoes['reacoes'],
        'minhasReacoes' => $reacoes['minhasReacoes'],
        'respostas' => $respostas,
        'criadoEm' => isoComOffset($row['created_at']),
    ];
}
