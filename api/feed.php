<?php
// GET/POST /api/feed.php — real de GET/POST /meditacao/feed ("Sua prática
// hoje"). Tabelas reais já existentes (comentarios/comentario_reacoes) — ver
// _feed.php pro porquê de aula_id fixo e pro shape de Post reconstruído.
header('Access-Control-Allow-Origin: https://academiadohabito.com.br');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

require __DIR__ . '/_sessao.php';
$email = exigirSessao();

require __DIR__ . '/_config.php';
require __DIR__ . '/_feed.php';

$metodo = $_SERVER['REQUEST_METHOD'];

if ($metodo === 'GET') {
    // Diferente do mock (que devolve TODO post pra todo mundo): aqui é dado
    // real de múltiplos alunos, então aplica visibilidade de verdade —
    // 'privado'/'orientador' só aparece pro próprio autor (ver
    // condVisibilidadeSql em _feed.php).
    $aulaId = AULA_ID_FEED;
    $stmt = $mysqli->prepare(
        "SELECT id FROM comentarios
         WHERE aula_id = ? AND parent_id IS NULL AND " . condVisibilidadeSql() . "
         ORDER BY created_at DESC, id DESC LIMIT 30"
    );
    $stmt->bind_param('ss', $aulaId, $email);
    $stmt->execute();
    $res = $stmt->get_result();
    $ids = [];
    while ($row = $res->fetch_assoc()) {
        $ids[] = (int) $row['id'];
    }
    $stmt->close();

    $posts = [];
    foreach ($ids as $id) {
        $post = montarPost($mysqli, $id, $email);
        if ($post) {
            $posts[] = $post;
        }
    }

    echo json_encode(['ok' => true, 'posts' => $posts]);
    exit;
}

if ($metodo === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $texto = trim($input['texto'] ?? '');
    $fotoDataUri = $input['foto'] ?? null;
    $publico = !array_key_exists('publico', $input) || $input['publico'] ? true : false;
    // humor é aceito no corpo mas não persistido: comentarios não tem essa
    // coluna e o mock também nunca renderiza post.humor em lugar nenhum do
    // Feed.tsx, só captura — sem regressão visível pro usuário.

    if ($texto === '' && !$fotoDataUri) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'erro' => 'post vazio']);
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

    // Foto opcional: client sempre manda um data-URI só (FileReader), sem
    // tabela de staging/token de 2 passos como no site antigo — o POST aqui
    // já vem com tudo num passo só. Formato fora da lista vira post sem foto
    // (mesmo comportamento defensivo do upload-imagem-comentario.php antigo).
    $imageBlob = null;
    $imageMime = null;
    if (is_string($fotoDataUri) && preg_match('#^data:(image/(?:jpeg|png|webp));base64,(.+)$#', $fotoDataUri, $m)) {
        $bytes = base64_decode($m[2], true);
        if ($bytes !== false) {
            $imageMime = $m[1];
            $imageBlob = $bytes;
        }
    }

    $visibilidade = $publico ? 'publico' : 'privado';
    $aulaId = AULA_ID_FEED;
    $parentId = null;

    $stmt = $mysqli->prepare(
        "INSERT INTO comentarios (email, nome, aula_id, comentario, image_blob, image_mime, parent_id, visibilidade)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->bind_param('ssssssis', $email, $nome, $aulaId, $texto, $imageBlob, $imageMime, $parentId, $visibilidade);
    $stmt->execute();
    $novoId = $stmt->insert_id;
    $stmt->close();

    echo json_encode(['ok' => true, 'post' => montarPost($mysqli, $novoId, $email)]);
    exit;
}

http_response_code(405);
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['ok' => false, 'erro' => 'Método não permitido']);
