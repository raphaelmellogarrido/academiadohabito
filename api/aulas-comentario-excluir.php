<?php
// DELETE /api/aulas-comentario-excluir.php?id=... — real de DELETE
// /meditacao/aulas/comentarios/:id. Id vai na query string (não no corpo,
// já que api.delete() do client não manda body) — mesmo padrão de
// imagem-comentario.php pra passar id por GET. Sem bypass de admin: `admin`
// no comentário real é sempre false (ver _aulas.php), então só o próprio
// autor pode excluir — mesmo contrato do mock quando usuario.admin é false.
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
require __DIR__ . '/_aulas.php';

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'erro' => 'id inválido']);
    exit;
}

$stmt = $mysqli->prepare(
    "SELECT email FROM comentarios WHERE id = ? AND aula_id LIKE '" . AULA_ID_PREFIXO . "%'"
);
$stmt->bind_param('i', $id);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$row) {
    http_response_code(404);
    echo json_encode(['ok' => false, 'erro' => 'comentário não encontrado']);
    exit;
}
if ($row['email'] !== $email) {
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
