<?php
// PUT /api/feed-editar.php — real de PUT /meditacao/feed/:id. Editar texto é
// sempre só do dono, sem bypass de orientador/admin (mesmo contrato do mock
// em editarPost/community.store.ts). Ver _feed.php pro shape de Post.
header('Access-Control-Allow-Origin: https://academiadohabito.com.br');
header('Access-Control-Allow-Methods: PUT, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
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
$texto = trim($input['texto'] ?? '');

if ($id <= 0 || $texto === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'erro' => 'texto vazio']);
    exit;
}
if (mb_strlen($texto) > 140) {
    $texto = mb_substr($texto, 0, 140);
}

$stmt = $mysqli->prepare("SELECT email FROM comentarios WHERE id = ? AND parent_id IS NULL");
$stmt->bind_param('i', $id);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$row) {
    http_response_code(404);
    echo json_encode(['ok' => false, 'erro' => 'post não encontrado']);
    exit;
}
if ($row['email'] !== $email) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'erro' => 'sem permissão']);
    exit;
}

$stmt = $mysqli->prepare("UPDATE comentarios SET comentario = ? WHERE id = ?");
$stmt->bind_param('si', $texto, $id);
$stmt->execute();
$stmt->close();

echo json_encode(['ok' => true, 'post' => montarPost($mysqli, $id, $email)]);
