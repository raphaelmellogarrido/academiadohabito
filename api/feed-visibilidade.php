<?php
// PUT /api/feed-visibilidade.php — real de PUT /meditacao/feed/:id/visibilidade.
// `id` pode ser o post raiz ou qualquer resposta dele em qualquer
// profundidade. Trocar visibilidade é sempre só do dono DAQUELE nó
// específico, sem bypass de orientador/admin (mesmo contrato do mock em
// alterarVisibilidade/community.store.ts). Ver _feed.php pro shape de Post.
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
$visibilidade = $input['visibilidade'] ?? '';

if ($id <= 0 || !in_array($visibilidade, ['publico', 'privado', 'orientador'], true)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'erro' => 'visibilidade inválida']);
    exit;
}

$stmt = $mysqli->prepare("SELECT email FROM comentarios WHERE id = ?");
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

$stmt = $mysqli->prepare("UPDATE comentarios SET visibilidade = ? WHERE id = ?");
$stmt->bind_param('si', $visibilidade, $id);
$stmt->execute();
$stmt->close();

echo json_encode(['ok' => true, 'post' => montarPost($mysqli, $id, $email)]);
