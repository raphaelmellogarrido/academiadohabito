<?php
// GET /api/frase.php — real de GET /meditacao/frase. Tabela real
// frase_motivacional_semana (site antigo, get_frase_semana.php) só tem
// frase+subfrase, não "autor" como o mock — o client (meditacaoApi.ts)
// remapeia subfrase->autor na resposta, então FraseSemana.tsx não muda.
// Sem sessão: conteúdo não é por-aluno (mesmo raciocínio de pulso.php).
header('Access-Control-Allow-Origin: https://academiadohabito.com.br');
header('Access-Control-Allow-Methods: GET, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'erro' => 'Método não permitido']);
    exit;
}

require __DIR__ . '/_config.php';

$res = $mysqli->query("SELECT frase, subfrase FROM frase_motivacional_semana ORDER BY id DESC LIMIT 1");
$row = $res ? $res->fetch_assoc() : null;

echo json_encode([
    'ok' => true,
    'frase' => $row['frase'] ?? '',
    'subfrase' => $row['subfrase'] ?? '',
]);
