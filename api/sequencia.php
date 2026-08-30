<?php
// GET /api/sequencia.php — streak real do aluno logado, pro card
// "Sequência" (Sequencia.tsx). Algoritmo em _habito.php (compartilhado com
// jornada.php e meditei-hoje.php, que leem a mesma tabela presencas) — porta
// pro PHP o mesmo algoritmo do mock Node (gamification.store.ts:
// calcularStreak/calcularBolinhas), que por sua vez já bate com
// calcularStreakEmail() do site antigo (_conexao.php) pro streak — bolinhas
// é conceito só do app novo (7 pontos Dom–Sáb preenchidos por posição
// relativa a hoje dentro do streak atual, não por presença isolada).
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

echo json_encode(['ok' => true] + calcularSequencia($datas));
