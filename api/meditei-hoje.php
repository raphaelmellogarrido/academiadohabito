<?php
// POST /api/meditei-hoje.php — real de POST /meditacao/meditei-hoje (mock
// em gamification.store.ts::marcarMeditouHoje). Grava presença de hoje
// (idempotente — mesma upsert de presenca.php no site antigo, sem o cache
// em disco que era só de lá) e devolve sequência+jornada já recalculadas.
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
require __DIR__ . '/_habito.php';

$datasAntes = buscarDatasPresenca($mysqli, $email);
$hoje = (new DateTime('today'))->format('Y-m-d');
$jaMarcado = isset($datasAntes[$hoje]);

if (!$jaMarcado) {
    $stmt = $mysqli->prepare(
        "INSERT INTO presencas (email, data, minutos) VALUES (?, ?, 0) ON DUPLICATE KEY UPDATE data = VALUES(data)"
    );
    $stmt->bind_param('ss', $email, $hoje);
    $stmt->execute();
    $stmt->close();
    $datasAntes[$hoje] = true; // evita reconsultar o banco só pra recontar
}

echo json_encode([
    'ok' => true,
    'jaMarcado' => $jaMarcado,
    'sequencia' => calcularSequencia($datasAntes),
    'jornada' => calcularJornada($datasAntes),
]);
