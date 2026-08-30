<?php
// GET /api/imagem-comentario.php?id=<comentario_id> — serve a foto anexada a
// um post de "Sua prática hoje" a partir de comentarios.image_blob. Porta
// 1:1 o arquivo antigo (hotmart/imagem-comentario.php), só trocando
// _conexao.php por _config.php (mesma tabela `comentarios`, já com
// image_blob/image_mime — sem precisar de garantirEstruturaClube aqui).
// Sem exigirSessao(): é um <img src> direto do navegador, mesmo
// comportamento do arquivo antigo (nunca checou visibilidade por id).
header('Access-Control-Allow-Origin: https://academiadohabito.com.br');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

require __DIR__ . '/_config.php';

$id = intval($_GET['id'] ?? 0);
if ($id <= 0) {
    http_response_code(400);
    exit;
}

$stmt = $mysqli->prepare("SELECT image_blob, image_mime FROM comentarios WHERE id = ? LIMIT 1");
$stmt->bind_param('i', $id);
$stmt->execute();
$stmt->bind_result($blob, $mime);
$temLinha = $stmt->fetch();
$stmt->close();

if (!$temLinha || $blob === null || $blob === '' || !$mime) {
    http_response_code(404);
    exit;
}

header('Content-Type: ' . $mime);
// Foto de um comentário nunca muda depois de postada (sem editar/trocar
// foto já enviada) — cache longo e imutável é seguro, mesmo comentário do
// arquivo antigo.
header('Cache-Control: public, max-age=31536000, immutable');
echo $blob;
