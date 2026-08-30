<?php
// POST /api/feed-responder.php — real de POST /meditacao/feed/:id/responder.
// Resposta sempre pública (mock nunca restringe, e só se responde a algo já
// visível). Ver _feed.php pro shape de Post.
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
$texto = trim($input['texto'] ?? '');

if ($id <= 0 || $texto === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'erro' => 'resposta vazia']);
    exit;
}
if (mb_strlen($texto) > 140) {
    $texto = mb_substr($texto, 0, 140);
}

// Só responde a um post que existe e que o aluno atual pode ver (reaproveita
// a mesma condição de visibilidade do feed.php).
$souOrientador = ehOrientadorEmail($email) ? 1 : 0;
$stmtPai = $mysqli->prepare(
    "SELECT id FROM comentarios WHERE id = ? AND parent_id IS NULL AND " . condVisibilidadeSql()
);
$stmtPai->bind_param('isi', $id, $email, $souOrientador);
$stmtPai->execute();
$pai = $stmtPai->get_result()->fetch_assoc();
$stmtPai->close();
if (!$pai) {
    http_response_code(404);
    echo json_encode(['ok' => false, 'erro' => 'post não encontrado']);
    exit;
}

$stmtNome = $mysqli->prepare("SELECT nome FROM alunos WHERE email = ? LIMIT 1");
$stmtNome->bind_param('s', $email);
$stmtNome->execute();
$alunoRow = $stmtNome->get_result()->fetch_assoc();
$stmtNome->close();
$nome = $alunoRow['nome'] ?? 'Aluno';

$aulaId = AULA_ID_FEED;
$visibilidade = 'publico';
$stmt = $mysqli->prepare(
    "INSERT INTO comentarios (email, nome, aula_id, comentario, parent_id, visibilidade)
     VALUES (?, ?, ?, ?, ?, ?)"
);
$stmt->bind_param('ssssis', $email, $nome, $aulaId, $texto, $id, $visibilidade);
$stmt->execute();
$stmt->close();

echo json_encode(['ok' => true, 'post' => montarPost($mysqli, $id, $email)]);
