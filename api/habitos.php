<?php
// GET /api/habitos.php — equivalente real de GET /api/me/habitos (mock em
// server/src/modules/user-habits/user-habits.store.ts). A "rota inteligente"
// do client (routes.tsx) decide /app/:slug vs Hub a partir desta lista — ver
// docs/HABIT_LOGIC.md.
//
// Sem tabela de matrícula em u790959747_comunidade (esse conceito de
// multi-hábito é só do app novo — o schema antigo era só meditação) — então
// aqui a regra é a mesma do mock: todo aluno autenticado já está
// automaticamente matriculado em "meditacao", o único hábito com conteúdo
// pronto hoje (mesmo catálogo fixo de server/src/modules/habits/habits.data.ts).
header('Access-Control-Allow-Origin: https://academiadohabito.com.br');
header('Access-Control-Allow-Methods: GET, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'erro' => 'Método não permitido']);
    exit;
}

require __DIR__ . '/_sessao.php';
$email = exigirSessao(); // já responde 401 e sai se não houver sessão

require __DIR__ . '/_config.php'; // dá $mysqli

// Primeira presença registrada = data real de "matrícula" em meditação.
// Só cosmético (enrolled_at não é exibido em lugar nenhum do client hoje),
// mas real é melhor que inventado quando dá pra ter de graça.
$stmt = $mysqli->prepare("SELECT MIN(data) AS primeira FROM presencas WHERE email = ?");
$stmt->bind_param('s', $email);
$stmt->execute();
$primeira = $stmt->get_result()->fetch_assoc()['primeira'] ?? null;
$stmt->close();

echo json_encode([
    'ok' => true,
    'habitos' => [[
        'id' => 'meditacao',
        'slug' => 'meditacao',
        'nome' => 'Meditação',
        'status' => 'ativo',
        'icone' => '🧘',
        'enrolled_at' => $primeira ?? date('Y-m-d'),
    ]],
]);
