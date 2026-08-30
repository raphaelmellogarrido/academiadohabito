<?php
// POST /api/encontro-reservar.php — real de POST
// /meditacao/lives/proxima/reservar. Toggle: reservado -> cancela,
// não-reservado -> reserva. Ver _encontro.php pro shape/tabelas.
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
require __DIR__ . '/_encontro.php';

garantirTabelasEncontro($mysqli);

$stmt = $mysqli->prepare("SELECT 1 FROM ah_encontro_reservas WHERE encontro_id = 1 AND email = ?");
$stmt->bind_param('s', $email);
$stmt->execute();
$jaReservado = (bool) $stmt->get_result()->fetch_assoc();
$stmt->close();

if ($jaReservado) {
    $stmt = $mysqli->prepare("DELETE FROM ah_encontro_reservas WHERE encontro_id = 1 AND email = ?");
} else {
    $stmt = $mysqli->prepare("INSERT INTO ah_encontro_reservas (encontro_id, email) VALUES (1, ?)");
}
$stmt->bind_param('s', $email);
$stmt->execute();
$stmt->close();

$encontro = montarEncontro($mysqli, $email);
if (!$encontro) {
    http_response_code(404);
    echo json_encode(['ok' => false, 'erro' => 'nenhum encontro agendado']);
    exit;
}

echo json_encode(['ok' => true, 'encontro' => $encontro]);
