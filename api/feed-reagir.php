<?php
// POST /api/feed-reagir.php — real de POST /meditacao/feed/:id/reagir.
// Toggle: já reagiu com esse emoji -> remove, senão -> adiciona. Ver
// _feed.php pro shape de Post/reações em lote.
header('Access-Control-Allow-Origin: https://academiadohabito.com.br');
header('Access-Control-Allow-Methods: POST, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'erro' => 'Método não permitido']);
    exit;
}

require __DIR__ . '/_sessao.php';
$email = exigirSessao();

require __DIR__ . '/_config.php';
require __DIR__ . '/_feed.php';

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$id = (int) ($input['id'] ?? 0);
$reacao = trim($input['reacao'] ?? '');

if ($id <= 0 || !in_array($reacao, ['🙏', '❤️', '🔥'], true)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'erro' => 'reação inválida']);
    exit;
}

$stmt = $mysqli->prepare(
    "SELECT 1 FROM comentario_reacoes WHERE comentario_id = ? AND emoji = ? AND email = ?"
);
$stmt->bind_param('iss', $id, $reacao, $email);
$stmt->execute();
$jaReagiu = (bool) $stmt->get_result()->fetch_assoc();
$stmt->close();

if ($jaReagiu) {
    $stmt = $mysqli->prepare(
        "DELETE FROM comentario_reacoes WHERE comentario_id = ? AND emoji = ? AND email = ?"
    );
} else {
    $stmt = $mysqli->prepare(
        "INSERT INTO comentario_reacoes (comentario_id, emoji, email) VALUES (?, ?, ?)"
    );
}
$stmt->bind_param('iss', $id, $reacao, $email);
$stmt->execute();
$stmt->close();

$post = montarPost($mysqli, $id, $email);
if (!$post) {
    http_response_code(404);
    echo json_encode(['ok' => false, 'erro' => 'post não encontrado']);
    exit;
}

echo json_encode(['ok' => true, 'post' => $post]);
