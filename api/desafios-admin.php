<?php
// GET /api/desafios-admin.php — real de GET /meditacao/desafios/admin.
// Textos crus (sem `concluido`) pro form de edição em /app/admin
// (CardDesafiosAdmin.tsx). Só admin (EMAILS_ORIENTADORES).
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
exigirAdmin($email);

require __DIR__ . '/_desafios.php';

echo json_encode(['ok' => true, 'textos' => buscarDesafiosAdmin($mysqli)]);
