<?php
// DELETE /api/feed-excluir.php?id=... — real de DELETE /meditacao/feed/:id.
// Id vai na query string (api.delete() do client não manda body) — mesmo
// padrão de aulas-comentario-excluir.php. Dono OU ehOrientadorEmail()
// (reaproveitada como "admin" por enquanto, ver _feed.php) pode excluir.
// Filtro `parent_id IS NULL` pra não deixar excluir uma resposta como se
// fosse post raiz.
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
    "SELECT email FROM comentarios WHERE id = ? AND aula_id = ? AND parent_id IS NULL"
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

$stmt = $mysqli->prepare("DELETE FROM comentario_reacoes WHERE comentario_id = ?");
$stmt->bind_param('i', $id);
$stmt->execute();
$stmt->close();

$stmt = $mysqli->prepare("DELETE FROM comentarios WHERE id = ?");
$stmt->bind_param('i', $id);
$stmt->execute();
$stmt->close();

echo json_encode(['ok' => true]);
