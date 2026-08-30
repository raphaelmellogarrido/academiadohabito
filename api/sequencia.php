<?php
// GET /api/sequencia.php — streak real do aluno logado, pro card
// "Sequência" (Sequencia.tsx). Porta pro PHP o mesmo algoritmo do mock Node
// (server/src/modules/gamification/gamification.store.ts:
// calcularStreak/calcularBolinhas), que por sua vez já bate com
// calcularStreakEmail() do site antigo (_conexao.php) pro streak — bolinhas
// é conceito só do app novo (7 pontos Dom–Sáb preenchidos por posição
// relativa a hoje dentro do streak atual, não por presença isolada).
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

$stmt = $mysqli->prepare("SELECT data FROM presencas WHERE email = ?");
$stmt->bind_param('s', $email);
$stmt->execute();
$res = $stmt->get_result();
$datas = [];
while ($row = $res->fetch_assoc()) {
    $datas[$row['data']] = true; // já vem 'AAAA-MM-DD' (coluna DATE)
}
$stmt->close();

// date_default_timezone_set('America/Sao_Paulo') já rodou em _privado.php,
// então 'today' aqui já é a meia-noite de Brasília, não a do servidor.
$hoje = new DateTime('today');

$cursor = clone $hoje;
if (!isset($datas[$cursor->format('Y-m-d')])) {
    $cursor->modify('-1 day');
}
$streak = 0;
while (isset($datas[$cursor->format('Y-m-d')])) {
    $streak++;
    $cursor->modify('-1 day');
}

$offsetAncora = isset($datas[$hoje->format('Y-m-d')]) ? 0 : 1;
$domingo = clone $hoje;
$domingo->modify('-' . (int) $hoje->format('w') . ' days'); // 'w': 0=Dom ... 6=Sáb
$labels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

$bolinhas = [];
for ($i = 0; $i < 7; $i++) {
    $data = clone $domingo;
    $data->modify("+{$i} days");
    // Brasil não tem mais horário de verão (abolido em 2019), então a
    // diferença em segundos/86400 é sempre um inteiro exato aqui.
    $diasAtras = (int) round(($hoje->getTimestamp() - $data->getTimestamp()) / 86400);
    $bolinhas[] = [
        'iso' => $data->format('Y-m-d'),
        'label' => $labels[(int) $data->format('w')],
        'concluido' => $diasAtras >= $offsetAncora && $diasAtras < $offsetAncora + $streak,
        'hoje' => $diasAtras === 0,
    ];
}

echo json_encode(['ok' => true, 'streak' => $streak, 'bolinhas' => $bolinhas]);
