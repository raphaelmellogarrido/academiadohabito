<?php
// GET /api/jornada.php — real de GET /meditacao/jornada (mock em
// gamification.store.ts::getJornada). Não é feature separada: jornada é só
// COUNT(DISTINCT data) de presencas, capado em 48 aulas (ver _habito.php e
// docs/ARCHITECTURE.md).
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
require __DIR__ . '/_habito.php';

$datas = buscarDatasPresenca($mysqli, $email);

echo json_encode(['ok' => true] + calcularJornada($datas));
