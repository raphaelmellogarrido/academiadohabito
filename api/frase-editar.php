<?php
// PUT /api/frase-editar.php — real de PUT /meditacao/frase. Só admin
// (EMAILS_ORIENTADORES, ver exigirAdmin em _config.php) edita a frase da
// semana. Mesma linha que frase.php já lê (ORDER BY id DESC LIMIT 1) —
// tabela frase_motivacional_semana só tem frase+subfrase, "autor" do client
// é subfrase remapeado (ver comentário em frase.php/meditacaoApi.ts).
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

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$frase = trim((string) ($input['frase'] ?? ''));
$subfrase = trim((string) ($input['subfrase'] ?? ''));

if ($frase === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'erro' => 'frase vazia']);
    exit;
}

$idRow = $mysqli->query("SELECT id FROM frase_motivacional_semana ORDER BY id DESC LIMIT 1")->fetch_assoc();
if (!$idRow) {
    http_response_code(404);
    echo json_encode(['ok' => false, 'erro' => 'nenhuma frase cadastrada']);
    exit;
}

$stmt = $mysqli->prepare("UPDATE frase_motivacional_semana SET frase = ?, subfrase = ? WHERE id = ?");
$stmt->bind_param('ssi', $frase, $subfrase, $idRow['id']);
$stmt->execute();
$stmt->close();

echo json_encode(['ok' => true, 'frase' => $frase, 'subfrase' => $subfrase]);
