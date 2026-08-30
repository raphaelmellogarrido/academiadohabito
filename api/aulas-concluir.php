<?php
// POST /api/aulas-concluir.php — real de POST /meditacao/aulas/concluir.
// Ver _aulas.php pro algoritmo (mesmo de aulas.store.ts::concluirDia).
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
require __DIR__ . '/_aulas.php';

garantirTabelaAulasProgresso($mysqli);

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$dia = (int) ($input['dia'] ?? 0);

if ($dia <= 0) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'erro' => 'dia inválido']);
    exit;
}

$progresso = concluirDiaAula($mysqli, $email, $dia);
if (!$progresso) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'erro' => 'esse dia não está liberado agora']);
    exit;
}

echo json_encode(['ok' => true] + $progresso);
