<?php
// DELETE /api/feed-excluir.php?id=... — real de DELETE /meditacao/feed/:id.
// Id vai na query string (api.delete() do client não manda body) — mesmo
// padrão de aulas-comentario-excluir.php. `id` pode ser o post raiz ou
// qualquer resposta dele em qualquer profundidade. Dono OU
// ehOrientadorEmail() (reaproveitada como "admin" por enquanto, ver
// _feed.php) pode excluir. Excluir a raiz derruba a thread inteira (cascade
// via descendentes()); excluir um nó aninhado só remove ele + as respostas
// dele, devolvendo o resto da árvore já atualizado — ver contrato de
// meditacaoApi.ts::excluirPost.
header('Access-Control-Allow-Origin: https://academiadohabito.com.br');
header('Access-Control-Allow-Methods: DELETE, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'erro' => 'Método não permitido']);
    exit;
}

require __DIR__ . '/_sessao.php';
$email = exigirSessao();

require __DIR__ . '/_config.php';
require __DIR__ . '/_feed.php';

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'erro' => 'id inválido']);
    exit;
}

$stmt = $mysqli->prepare(
    "SELECT id, email, parent_id FROM comentarios WHERE id = ? AND aula_id = ?"
);
$aulaId = AULA_ID_FEED;
$stmt->bind_param('is', $id, $aulaId);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$row) {
    http_response_code(404);
    echo json_encode(['ok' => false, 'erro' => 'post não encontrado']);
    exit;
}
if ($row['email'] !== $email && !ehOrientadorEmail($email)) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'erro' => 'sem permissão']);
    exit;
}

$raizId = raizDoId($mysqli, $id);
$idsParaApagar = descendentes($mysqli, $id); // inclui o próprio $id

$placeholders = implode(',', array_fill(0, count($idsParaApagar), '?'));
$tipos = str_repeat('i', count($idsParaApagar));

$stmt = $mysqli->prepare("DELETE FROM comentario_reacoes WHERE comentario_id IN ($placeholders)");
$stmt->bind_param($tipos, ...$idsParaApagar);
$stmt->execute();
$stmt->close();

$stmt = $mysqli->prepare("DELETE FROM comentarios WHERE id IN ($placeholders)");
$stmt->bind_param($tipos, ...$idsParaApagar);
$stmt->execute();
$stmt->close();

// Se apagou a raiz, a thread inteira sumiu (raiz: null, client remove da
// lista); se apagou um nó aninhado, devolve a árvore restante já atualizada
// (client substitui pelo raizId).
$eraRaiz = $row['parent_id'] === null;
echo json_encode([
    'ok' => true,
    'raizId' => (string) $raizId,
    'raiz' => $eraRaiz ? null : montarPost($mysqli, $raizId, $email),
]);
