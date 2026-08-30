<?php
// DELETE /api/aulas-comentario-excluir.php?id=... — real de DELETE
// /meditacao/aulas/comentarios/:id. Id vai na query string (não no corpo,
// já que api.delete() do client não manda body) — mesmo padrão de
// imagem-comentario.php pra passar id por GET. `id` pode ser o comentário
// raiz ou qualquer resposta dele em qualquer profundidade. Dono OU
// ehOrientadorEmail() (reaproveitada como "admin" por enquanto, ver
// _feed.php) pode excluir — mesmo contrato do mock quando usuario.admin é
// true. Excluir a raiz derruba a thread inteira (cascade via
// descendentes()); excluir um nó aninhado só remove ele + as respostas dele,
// devolvendo o resto da árvore já atualizado — ver contrato de
// meditacaoApi.ts::aulasExcluirComentario.
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
require __DIR__ . '/_aulas.php';

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'erro' => 'id inválido']);
    exit;
}

$stmt = $mysqli->prepare(
    "SELECT email, parent_id FROM comentarios WHERE id = ? AND aula_id LIKE '" . AULA_ID_PREFIXO . "%'"
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
    'raiz' => $eraRaiz ? null : montarAulaComentario($mysqli, $raizId, $email),
]);
