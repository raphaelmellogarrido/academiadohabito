<?php
// POST /api/logout.php — encerra a sessão real (cookie ah_aluno). Ver
// api/login.php e docs/ARCHITECTURE.md.
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

encerrarSessao();
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['ok' => true]);
