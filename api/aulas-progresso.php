<?php
// GET /api/aulas-progresso.php — real de GET /meditacao/aulas/progresso.
// Tabela nova (self-provisioning) em _aulas.php — ver comentário lá pro
// porquê de não reaproveitar tabela real nenhuma pra isso.
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
require __DIR__ . '/_aulas.php';

garantirTabelaAulasProgresso($mysqli);
$progresso = montarProgresso($mysqli, $email);

echo json_encode(['ok' => true] + $progresso);
