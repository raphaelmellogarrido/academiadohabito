<?php
// POST /api/aulas-comentario-responder.php — real de POST
// /meditacao/aulas/comentarios/:id/responder. `id` pode ser o comentário
// raiz ou qualquer resposta dele em qualquer profundidade — thread
// recursiva sem limite de nível (mesmo padrão de feed-responder.php).
// A resposta herda o MESMO aula_id "aulas:{dia}" da raiz (não o do pai
// direto, embora dê no mesmo por transitividade) — é o que faz o filtro
// `aula_id LIKE 'aulas:%'` usado por aulas-comentario-editar.php/
// -visibilidade.php/-excluir.php continuar enxergando qualquer nível da
// thread, e o que dá pra montarAulaComentario calcular diaAtual sem
// percorrer a árvore.
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
require __DIR__ . '/_aulas.php';

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

// Só responde a um nó que existe e que pertence de fato à thread de aulas
// (aula_id "aulas:%" na raiz) — pega o aula_id da raiz pra herdar no INSERT.
$raizId = raizDoId($mysqli, $id);
if ($raizId === null) {
    http_response_code(404);
    echo json_encode(['ok' => false, 'erro' => 'comentário não encontrado']);
    exit;
}
$stmtRaiz = $mysqli->prepare(
    "SELECT aula_id FROM comentarios WHERE id = ? AND aula_id LIKE '" . AULA_ID_PREFIXO . "%'"
);
$stmtRaiz->bind_param('i', $raizId);
$stmtRaiz->execute();
$raizRow = $stmtRaiz->get_result()->fetch_assoc();
$stmtRaiz->close();
if (!$raizRow) {
    http_response_code(404);
    echo json_encode(['ok' => false, 'erro' => 'comentário não encontrado']);
    exit;
}

$stmtNome = $mysqli->prepare("SELECT nome FROM alunos WHERE email = ? LIMIT 1");
$stmtNome->bind_param('s', $email);
$stmtNome->execute();
$alunoRow = $stmtNome->get_result()->fetch_assoc();
$stmtNome->close();
$nome = $alunoRow['nome'] ?? 'Aluno';

$aulaId = $raizRow['aula_id'];
$visibilidade = 'publico';
$stmt = $mysqli->prepare(
    "INSERT INTO comentarios (email, nome, aula_id, comentario, parent_id, visibilidade)
     VALUES (?, ?, ?, ?, ?, ?)"
);
$stmt->bind_param('ssssis', $email, $nome, $aulaId, $texto, $id, $visibilidade);
$stmt->execute();
$stmt->close();

echo json_encode(['ok' => true, 'comentario' => montarAulaComentario($mysqli, $id, $email)]);
