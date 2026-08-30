<?php
// GET /api/encontro.php — real de GET /meditacao/lives/proxima. Tabelas
// novas (self-provisioning) em _encontro.php — ver comentário lá pro porquê
// de não reaproveitar config_encontro/live_reservas do site antigo.
header('Access-Control-Allow-Origin: https://academiadohabito.com.br');
header('Access-Control-Allow-Methods: GET, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
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
$encontro = montarEncontro($mysqli, $email);

if (!$encontro) {
    http_response_code(404);
    echo json_encode(['ok' => false, 'erro' => 'nenhum encontro agendado']);
    exit;
}

echo json_encode(['ok' => true, 'encontro' => $encontro]);
