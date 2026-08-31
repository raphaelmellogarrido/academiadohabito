<?php
// GET /api/avatar.php?e=<email> — serve a foto de perfil do aluno a partir de
// alunos.avatar_blob. Porta 1:1 o padrão de imagem-comentario.php (mesma
// tabela de ideia, servindo um blob do MySQL), só trocando `comentarios` por
// `alunos` e o id numérico por email (chave real da tabela, ver
// alunoParaUsuario em _config.php). Sem exigirSessao(): é um <img src> direto
// do navegador (TopBar, Configurações, etc.), mesmo comportamento já aceito
// em imagem-comentario.php.
header('Access-Control-Allow-Origin: https://academiadohabito.com.br');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

require __DIR__ . '/_config.php';
garantirColunasPerfil($mysqli);

$email = trim($_GET['e'] ?? '');
if ($email === '') {
    http_response_code(400);
    exit;
}

$stmt = $mysqli->prepare("SELECT avatar_blob, avatar_mime FROM alunos WHERE email = ? LIMIT 1");
$stmt->bind_param('s', $email);
$stmt->execute();
$stmt->bind_result($blob, $mime);
$temLinha = $stmt->fetch();
$stmt->close();

if (!$temLinha || $blob === null || $blob === '' || !$mime) {
    http_response_code(404);
    exit;
}

header('Content-Type: ' . $mime);
// Diferente da foto de comentário (imutável depois de postada), o avatar
// pode ser trocado — cache curto (a URL já muda de qualquer forma a cada
// troca via `?v=avatar_versao`, isso aqui é só rede de segurança).
header('Cache-Control: public, max-age=300');
echo $blob;
