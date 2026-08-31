<?php
// POST /api/desafios-resetar.php — real de POST /meditacao/desafios/resetar.
// Botão "Resetar desafios" do /admin: zera desafio_semana inteira (todos os
// alunos, todas as semanas — ver resetarDesafiosSemana em _desafios.php).
// Só admin.
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
exigirAdmin($email);

require __DIR__ . '/_desafios.php';

resetarDesafiosSemana($mysqli);

echo json_encode(['ok' => true]);
