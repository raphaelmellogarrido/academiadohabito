<?php
// PUT /api/desafios-editar.php {textos: string[]} — real de PUT
// /meditacao/desafios. Reescreve desafio_config inteiro (delete + insert,
// ver salvarDesafiosSemana em _desafios.php). Só admin.
header('Access-Control-Allow-Origin: https://academiadohabito.com.br');
header('Access-Control-Allow-Methods: PUT, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
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

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$textos = is_array($input['textos'] ?? null) ? $input['textos'] : [];
$limpos = array_slice(array_values(array_filter(array_map(
    fn($t) => trim((string) $t),
    $textos
))), 0, 10);

if (!$limpos) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'erro' => 'lista vazia']);
    exit;
}

echo json_encode(['ok' => true, 'textos' => salvarDesafiosSemana($mysqli, $limpos)]);
