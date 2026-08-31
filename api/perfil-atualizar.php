<?php
// PUT /api/perfil-atualizar.php — real de PUT /users/me/perfil (mock).
// Body JSON: { nome, primeiroNome, avatarDataUri? }. avatarDataUri usa o
// mesmo formato data-URI que feed.php já aceita pro campo `foto` (client
// manda um data:image/...;base64,... só, sem multipart/2 passos) — reaproveita
// o mesmo regex de decode daquele endpoint.
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
garantirColunasPerfil($mysqli);

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$nome = trim((string) ($input['nome'] ?? ''));
$primeiroNome = trim((string) ($input['primeiroNome'] ?? ''));
$avatarDataUri = $input['avatarDataUri'] ?? null;

if ($nome === '' || mb_strlen($nome) > 30) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'erro' => 'nome completo precisa ter entre 1 e 30 caracteres']);
    exit;
}
if ($primeiroNome === '' || mb_strlen($primeiroNome) > 14) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'erro' => 'primeiro nome precisa ter entre 1 e 14 caracteres']);
    exit;
}

// Avatar opcional: mesmo regex/decode de feed.php (data:image/(jpeg|png|webp);base64,...).
// String fora desse formato é ignorada silenciosamente (mesmo comportamento
// defensivo de feed.php pra `foto`).
$avatarBlob = null;
$avatarMime = null;
if (is_string($avatarDataUri) && preg_match('#^data:(image/(?:jpeg|png|webp));base64,(.+)$#', $avatarDataUri, $m)) {
    $bytes = base64_decode($m[2], true);
    if ($bytes !== false) {
        $avatarMime = $m[1];
        $avatarBlob = $bytes;
    }
}

// TEMP: try/catch só pra expor a mensagem real de um 500 aqui (o mysqli no
// PHP 8.1+ lança exception em erro de query/prepare por padrão, e sem isso
// o response não vira JSON e o client só mostra "Erro 500" genérico — ver
// apiClient.ts request()). Remover depois que o bug de avatar for resolvido.
try {
    if ($avatarBlob !== null) {
        $stmt = $mysqli->prepare(
            "UPDATE alunos SET nome = ?, apelido = ?, avatar_blob = ?, avatar_mime = ?, avatar_versao = avatar_versao + 1
             WHERE email = ?"
        );
        $stmt->bind_param('sssss', $nome, $primeiroNome, $avatarBlob, $avatarMime, $email);
    } else {
        $stmt = $mysqli->prepare("UPDATE alunos SET nome = ?, apelido = ? WHERE email = ?");
        $stmt->bind_param('sss', $nome, $primeiroNome, $email);
    }
    $stmt->execute();
    $stmt->close();

    $stmt = $mysqli->prepare("SELECT * FROM alunos WHERE email = ? LIMIT 1");
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $aluno = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    echo json_encode(['ok' => true, 'usuario' => alunoParaUsuario($aluno)]);
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'erro' => get_class($e) . ': ' . $e->getMessage()]);
}
