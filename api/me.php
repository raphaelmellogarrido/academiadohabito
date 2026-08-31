<?php
// GET /api/me.php — equivalente real do mock GET /api/users/me (useAuth.ts
// chama um ou outro por hostname, ver shared/lib/ambiente.ts). Revalida
// contra o banco a cada carregamento (não confia só no que veio no login),
// mesmo raciocínio do user.php antigo (renato_de_paula): dado pode ter
// mudado desde o login (nome/apelido em Configurações, por ex.).
header('Access-Control-Allow-Origin: https://academiadohabito.com.br');
header('Access-Control-Allow-Methods: GET, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'erro' => 'Método não permitido']);
    exit;
}

require __DIR__ . '/_sessao.php'; // dá exigirSessao()
$email = exigirSessao();          // já responde 401 e sai se não houver sessão

require __DIR__ . '/_config.php'; // dá $mysqli + alunoParaUsuario()
garantirColunasPerfil($mysqli);   // colunas de avatar podem não existir ainda

$stmt = $mysqli->prepare("SELECT * FROM alunos WHERE email = ? LIMIT 1");
$stmt->bind_param('s', $email);
$stmt->execute();
$aluno = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$aluno) {
    // Sessão válida mas aluno sumiu do banco (ex: removido manualmente) —
    // trata como deslogado em vez de erro genérico.
    encerrarSessao();
    http_response_code(401);
    echo json_encode(['ok' => false, 'erro' => 'não autenticado']);
    exit;
}

echo json_encode(['ok' => true, 'usuario' => alunoParaUsuario($aluno)]);
