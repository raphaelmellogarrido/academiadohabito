<?php
// Login real — POST /api/login.php {email, senha}. Porta a lógica de
// renato_de_paula/public/api/hotmart/login.php pro schema real
// (u790959747_comunidade.alunos), pra autenticar aluno de verdade em
// produção. Em localhost o LoginPage.tsx nem chama isto — continua batendo
// em /auth/login (mock), ver ehProducaoReal em shared/lib/ambiente.ts.
header('Access-Control-Allow-Origin: https://academiadohabito.com.br');
header('Access-Control-Allow-Methods: POST, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'erro' => 'Método não permitido']);
    exit;
}

require __DIR__ . '/_config.php';   // dá $mysqli + alunoParaUsuario()
require __DIR__ . '/_sessao.php';   // dá iniciarSessao()

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$email = strtolower(trim($input['email'] ?? ''));
$senha = (string) ($input['senha'] ?? '');

if (!$email || !$senha) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'erro' => 'Email e senha obrigatórios']);
    exit;
}

$stmt = $mysqli->prepare("SELECT * FROM alunos WHERE email = ? LIMIT 1");
$stmt->bind_param('s', $email);
$stmt->execute();
$aluno = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$aluno) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'erro' => 'Email não encontrado']);
    exit;
}

// 'teste' = acesso liberado manualmente sem compra (mesmo critério do site
// antigo, ver public/api/admin/teste-emails.php lá).
if (isset($aluno['status']) && !in_array($aluno['status'], ['ativo', 'teste'], true)) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'erro' => 'Compra não ativa']);
    exit;
}

$hash = $aluno['senha_hash'] ?? '';
if (empty($hash)) {
    // Comprou mas nunca criou senha — front de criar-senha ainda não existe
    // aqui (fica pra outra rodada), então só sinaliza pro LoginPage mostrar
    // uma mensagem clara em vez de "senha incorreta".
    http_response_code(403);
    echo json_encode(['ok' => false, 'erro' => 'Você ainda não criou senha', 'precisaCriarSenha' => true]);
    exit;
}

// Fallback pra senha legada não migrada pra bcrypt ainda (mesmo do login.php
// antigo) — se algum dia sumir, basta tirar o `&& $senha !== $hash`.
if (!password_verify($senha, $hash) && $senha !== $hash) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'erro' => 'Senha incorreta']);
    exit;
}

iniciarSessao($email);
echo json_encode(['ok' => true, 'usuario' => alunoParaUsuario($aluno)]);
