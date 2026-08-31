<?php
// POST/DELETE /api/aulas-concluir.php — real de POST/DELETE
// /meditacao/aulas/concluir. Ver _aulas.php pro algoritmo (mesmo de
// aulas.store.ts::marcarConcluida/desmarcarConcluida). `arquivo` na
// DELETE vai na query string (api.delete() do client não manda body) —
// mesmo padrão de aulas-comentario-excluir.php.
header('Access-Control-Allow-Origin: https://academiadohabito.com.br');
header('Access-Control-Allow-Methods: POST, DELETE, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

require __DIR__ . '/_sessao.php';
$email = exigirSessao();

require __DIR__ . '/_config.php';
require __DIR__ . '/_aulas.php';

garantirTabelaAulasProgresso($mysqli);

$metodo = $_SERVER['REQUEST_METHOD'];

if ($metodo === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $arquivo = trim($input['arquivo'] ?? '');

    if ($arquivo === '') {
        http_response_code(400);
        echo json_encode(['ok' => false, 'erro' => 'arquivo inválido']);
        exit;
    }

    $progresso = marcarConcluidaAula($mysqli, $email, $arquivo);
    if (!$progresso) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'erro' => 'esse vídeo não está liberado agora']);
        exit;
    }

    echo json_encode(['ok' => true] + $progresso);
    exit;
}

if ($metodo === 'DELETE') {
    $arquivo = isset($_GET['arquivo']) ? trim($_GET['arquivo']) : '';
    if ($arquivo === '') {
        http_response_code(400);
        echo json_encode(['ok' => false, 'erro' => 'arquivo inválido']);
        exit;
    }

    $progresso = desmarcarConcluidaAula($mysqli, $email, $arquivo);
    echo json_encode(['ok' => true] + $progresso);
    exit;
}

http_response_code(405);
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['ok' => false, 'erro' => 'Método não permitido']);
