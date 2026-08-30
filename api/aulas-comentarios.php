<?php
// GET/POST /api/aulas-comentarios.php — real de GET/POST
// /meditacao/aulas/comentarios. Tabelas reais já existentes
// (comentarios/comentario_reacoes) — ver _aulas.php pro porquê do aula_id
// no formato "aulas:{dia}" e pro shape de AulaComentario reconstruído.
header('Access-Control-Allow-Origin: https://academiadohabito.com.br');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

require __DIR__ . '/_sessao.php';
$email = exigirSessao();

require __DIR__ . '/_config.php';
require __DIR__ . '/_feed.php';
require __DIR__ . '/_aulas.php';

$metodo = $_SERVER['REQUEST_METHOD'];

if ($metodo === 'GET') {
    // Scroll infinito: mais recentes primeiro, paginado por cursor (id do
    // último comentário já recebido pelo client) — mesmo esquema do mock
    // (aulas.comentarios.ts::listarComentarios), 15 por página.
    $cursor = isset($_GET['cursor']) ? (int) $_GET['cursor'] : 0;
    $limite = 15;
    $souOrientador = ehOrientadorEmail($email) ? 1 : 0;

    // `parent_id IS NULL` pra listar só os comentários raiz — respostas
    // aparecem aninhadas dentro de cada `comentario.respostas`
    // (montarAulaComentario), não como itens soltos na página.
    $like = AULA_ID_PREFIXO . '%';
    if ($cursor > 0) {
        $stmt = $mysqli->prepare(
            "SELECT id FROM comentarios
             WHERE aula_id LIKE ? AND id < ? AND parent_id IS NULL AND " . condVisibilidadeSql() . "
             ORDER BY id DESC LIMIT ?"
        );
        $stmt->bind_param('sisii', $like, $cursor, $email, $souOrientador, $limite);
    } else {
        $stmt = $mysqli->prepare(
            "SELECT id FROM comentarios
             WHERE aula_id LIKE ? AND parent_id IS NULL AND " . condVisibilidadeSql() . "
             ORDER BY id DESC LIMIT ?"
        );
        $stmt->bind_param('ssii', $like, $email, $souOrientador, $limite);
    }
    $stmt->execute();
    $res = $stmt->get_result();
    $ids = [];
    while ($row = $res->fetch_assoc()) {
        $ids[] = (int) $row['id'];
    }
    $stmt->close();

    $comentarios = [];
    foreach ($ids as $id) {
        $c = montarAulaComentario($mysqli, $id, $email);
        if ($c) {
            $comentarios[] = $c;
        }
    }

    // Tem mais página se veio o lote cheio (mesma heurística do mock).
    $proximoCursor = count($comentarios) === $limite ? $comentarios[count($comentarios) - 1]['id'] : null;

    echo json_encode(['ok' => true, 'comentarios' => $comentarios, 'proximoCursor' => $proximoCursor]);
    exit;
}

if ($metodo === 'POST') {
    garantirTabelaAulasProgresso($mysqli);

    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $texto = trim($input['texto'] ?? '');
    $fotoDataUri = $input['foto'] ?? null;
    $publico = !array_key_exists('publico', $input) || $input['publico'] ? true : false;

    if ($texto === '' && !$fotoDataUri) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'erro' => 'comentário vazio']);
        exit;
    }
    if (mb_strlen($texto) > 140) {
        $texto = mb_substr($texto, 0, 140);
    }

    $stmtNome = $mysqli->prepare("SELECT nome FROM alunos WHERE email = ? LIMIT 1");
    $stmtNome->bind_param('s', $email);
    $stmtNome->execute();
    $alunoRow = $stmtNome->get_result()->fetch_assoc();
    $stmtNome->close();
    $nome = $alunoRow['nome'] ?? 'Aluno';

    // Mesmo tratamento de foto data-URI de feed.php.
    $imageBlob = null;
    $imageMime = null;
    if (is_string($fotoDataUri) && preg_match('#^data:(image/(?:jpeg|png|webp));base64,(.+)$#', $fotoDataUri, $m)) {
        $bytes = base64_decode($m[2], true);
        if ($bytes !== false) {
            $imageMime = $m[1];
            $imageBlob = $bytes;
        }
    }

    $diaAtual = montarProgresso($mysqli, $email)['diaAtual'];
    $aulaId = AULA_ID_PREFIXO . $diaAtual;
    $visibilidade = $publico ? 'publico' : 'privado';
    $parentId = null;

    $stmt = $mysqli->prepare(
        "INSERT INTO comentarios (email, nome, aula_id, comentario, image_blob, image_mime, parent_id, visibilidade)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->bind_param('ssssssis', $email, $nome, $aulaId, $texto, $imageBlob, $imageMime, $parentId, $visibilidade);
    $stmt->execute();
    $novoId = $stmt->insert_id;
    $stmt->close();

    echo json_encode(['ok' => true, 'comentario' => montarAulaComentario($mysqli, $novoId, $email)]);
    exit;
}

http_response_code(405);
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['ok' => false, 'erro' => 'Método não permitido']);
