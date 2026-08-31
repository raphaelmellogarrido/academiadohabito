<?php
// GET /api/aulas-video.php?arquivo=dia1.1.mp4 — transmite (stream) um .mp4
// real das vídeo-aulas de meditação.
//
// Por quê isso existe: os .mp4 vivem em curso-meditacao-raiz/, pasta IRMÃ de
// public_html na Hostinger (fora do document root, de propósito — sobrevive
// a deploy via git, que apaga tudo dentro de public_html a cada push). O
// Apache só serve arquivos dentro do document root, então uma URL estática
// tipo /curso-meditacao-raiz/dia1.1.mp4 nunca chega no arquivo real (o
// catch-all de SPA do .htaccess da raiz nem devolve 404 — devolve o
// index.html do site, e o <video> falha calado). Esse endpoint contorna
// isso: o PHP lê o arquivo do disco (sem restrição de document root, é só
// filesystem) e streama os bytes pro navegador.
//
// Suporta Range (obrigatório pro <video> conseguir avançar/retroceder sem
// rebaixar o arquivo inteiro — todo navegador manda Range ao dar seek).
// Exige sessão (exigirSessao(), mesmo cookie assinado de aulas-catalogo.php)
// — diferente do caminho estático antigo, que era público pra quem tivesse
// o link.

header('Access-Control-Allow-Origin: https://academiadohabito.com.br');
header('Access-Control-Allow-Methods: GET, HEAD, OPTIONS');
header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }
if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'HEAD'], true)) {
    http_response_code(405);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'erro' => 'Método não permitido']);
    exit;
}

require __DIR__ . '/_sessao.php';
exigirSessao();

require __DIR__ . '/_aulas.php';

$arquivo = trim($_GET['arquivo'] ?? '');

// Nunca usa $arquivo cru num caminho — só aceita o que já existe no
// catálogo real (mesma validação de nome que montarCatalogoAulas já fez),
// então path traversal ("../../etc/passwd" etc.) não tem como passar aqui:
// ou bate exatamente com um arquivo do catálogo, ou vira 404.
$dias = getCatalogoAulas();
$achado = $arquivo !== '' ? localizarVideoAula($dias, $arquivo) : null;
if (!$achado) {
    http_response_code(404);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'erro' => 'Vídeo não encontrado']);
    exit;
}

$caminho = pastaCursoMeditacao() . '/' . $arquivo;
if (!is_file($caminho)) {
    // Arquivo está no catálogo (mapa de títulos) mas ainda não subiu por
    // FTP — acontece em produção logo após um deploy que adiciona vídeos
    // novos ao mapa antes do upload terminar.
    http_response_code(404);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'erro' => 'Arquivo ainda não disponível']);
    exit;
}

$tamanho = filesize($caminho);
if ($tamanho === false) {
    http_response_code(500);
    exit;
}

// Sem limite de tempo — vídeos grandes podem levar mais que os 30s default
// do PHP pra transmitir numa conexão lenta.
set_time_limit(0);
// Limpa qualquer output buffering ativo antes de escrever bytes binários —
// buffer aberto pode corromper o stream ou estourar memória em arquivo
// grande.
while (ob_get_level() > 0) {
    ob_end_clean();
}

header('Content-Type: video/mp4');
header('Accept-Ranges: bytes');
// Privado porque a resposta é gated por cookie de sessão (não pode virar
// cache compartilhado); 1 dia é seguro porque o conteúdo de um arquivo já
// enviado não muda depois.
header('Cache-Control: private, max-age=86400');

$inicio = 0;
$fim = $tamanho - 1;
$parcial = false;

$rangeHeader = $_SERVER['HTTP_RANGE'] ?? '';
if ($rangeHeader !== '' && preg_match('/^bytes=(\d*)-(\d*)$/', $rangeHeader, $m)) {
    $rangeInicio = $m[1] === '' ? null : (int) $m[1];
    $rangeFim = $m[2] === '' ? null : (int) $m[2];

    if ($rangeInicio === null && $rangeFim !== null) {
        // "bytes=-500" = últimos 500 bytes.
        $inicio = max(0, $tamanho - $rangeFim);
        $fim = $tamanho - 1;
    } else {
        $inicio = $rangeInicio ?? 0;
        $fim = $rangeFim ?? ($tamanho - 1);
    }

    if ($inicio > $fim || $inicio < 0 || $fim >= $tamanho) {
        http_response_code(416);
        header("Content-Range: bytes */$tamanho");
        exit;
    }
    $parcial = true;
}

$comprimento = $fim - $inicio + 1;
header("Content-Length: $comprimento");
if ($parcial) {
    http_response_code(206);
    header("Content-Range: bytes $inicio-$fim/$tamanho");
} else {
    http_response_code(200);
}

if ($_SERVER['REQUEST_METHOD'] === 'HEAD') {
    exit;
}

$handle = fopen($caminho, 'rb');
if ($handle === false) {
    http_response_code(500);
    exit;
}
fseek($handle, $inicio);

$restante = $comprimento;
$tamanhoChunk = 1024 * 1024; // 1MB por vez — não carrega o arquivo inteiro na memória.
while ($restante > 0 && !feof($handle)) {
    $ler = min($tamanhoChunk, $restante);
    $bloco = fread($handle, $ler);
    if ($bloco === false) {
        break;
    }
    echo $bloco;
    flush();
    $restante -= strlen($bloco);
}
fclose($handle);
