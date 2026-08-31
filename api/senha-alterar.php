<?php
// PUT /api/senha-alterar.php — real de PUT /users/me/senha (mock). Sem
// "senha atual": quem já tem sessão válida (exigirSessao) pode trocar direto.
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

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$novaSenha = (string) ($input['novaSenha'] ?? '');
$confirmarNovaSenha = (string) ($input['confirmarNovaSenha'] ?? '');

// Forte = 8+ caracteres, ao menos 1 maiúscula, 1 minúscula e 1 número (mesma
// regra aplicada no client, ver CardConta.tsx) — defesa em profundidade,
// mesmo raciocínio de revalidar mb_strlen($texto) > 140 em feed.php.
if (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/', $novaSenha)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'erro' => 'a nova senha precisa ter 8+ caracteres, com maiúscula, minúscula e número']);
    exit;
}
if ($novaSenha !== $confirmarNovaSenha) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'erro' => 'confirmação não confere com a nova senha']);
    exit;
}

$hash = password_hash($novaSenha, PASSWORD_DEFAULT);
$stmt = $mysqli->prepare("UPDATE alunos SET senha_hash = ? WHERE email = ?");
$stmt->bind_param('ss', $hash, $email);
$stmt->execute();
$stmt->close();

echo json_encode(['ok' => true]);
