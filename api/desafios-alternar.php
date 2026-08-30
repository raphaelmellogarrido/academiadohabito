<?php
// POST /api/desafios-alternar.php {id} — real de POST
// /meditacao/desafios/:id/alternar. Upsert em desafio_semana pro
// aluno+semana atual (semana = YEARWEEK(CURDATE(),1)) e devolve a lista
// inteira já atualizada (buscarDesafiosDaSemana, _desafios.php).
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
require __DIR__ . '/_desafios.php';

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$itemId = intval($input['id'] ?? 0);

if ($itemId <= 0) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'erro' => 'id inválido']);
    exit;
}

// Estado atual (se existir linha) pra inverter — sem UNIQUE composto
// declarado aqui (a tabela já existe no site antigo com esse comportamento
// de upsert), então SELECT+INSERT/UPDATE explícito em vez de um `ON
// DUPLICATE KEY` que dependeria de uma constraint que não controlamos.
$stmt = $mysqli->prepare(
    "SELECT concluido FROM desafio_semana WHERE email = ? AND item_id = ? AND semana = YEARWEEK(CURDATE(), 1)"
);
$stmt->bind_param('si', $email, $itemId);
$stmt->execute();
$atual = $stmt->get_result()->fetch_assoc();
$stmt->close();

$novoValor = $atual ? ($atual['concluido'] ? 0 : 1) : 1;

$stmt = $mysqli->prepare(
    "INSERT INTO desafio_semana (email, item_id, semana, concluido) VALUES (?, ?, YEARWEEK(CURDATE(), 1), ?)
     ON DUPLICATE KEY UPDATE concluido = VALUES(concluido)"
);
$stmt->bind_param('sii', $email, $itemId, $novoValor);
$stmt->execute();
$stmt->close();

echo json_encode(['ok' => true, 'desafios' => buscarDesafiosDaSemana($mysqli, $email)]);
