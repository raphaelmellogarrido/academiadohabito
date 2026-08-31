<?php
// PUT /api/aulas-comentario-visibilidade.php — real de PUT
// /meditacao/aulas/comentarios/:id/visibilidade. `id` pode ser o comentário
// raiz ou qualquer resposta dele em qualquer profundidade (mesmo motivo do
// filtro em aulas-comentario-editar.php). Trocar visibilidade é sempre só do
// dono DAQUELE nó específico, sem bypass de orientador/admin (mesmo contrato
// do mock em alterarVisibilidadeComentario/aulas.comentarios.ts). Ver
// _aulas.php pro shape de AulaComentario.
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
require __DIR__ . '/_aulas.php';

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$id = (int) ($input['id'] ?? 0);
$visibilidade = $input['visibilidade'] ?? '';

if ($id <= 0 || !in_array($visibilidade, ['publico', 'privado', 'orientador'], true)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'erro' => 'visibilidade inválida']);
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
// Resposta não tem visibilidade própria: sempre segue a do comentário raiz
// (client nem mostra o seletor pra resposta — ver ComentarioBloco.tsx), então
// recusa mudar visibilidade de qualquer nó que não seja a raiz da thread.
if ($row['parent_id'] !== null) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'erro' => 'sem permissão']);
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

echo json_encode(['ok' => true, 'comentario' => montarAulaComentario($mysqli, $id, $email)]);
