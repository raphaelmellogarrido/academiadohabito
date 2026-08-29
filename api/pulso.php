<?php
// "Pulso" da comunidade — GET /api/pulso.php. Alimenta o card "Meditando
// junto" (MeditandoJunto.tsx) com 3 números 100% reais, direto do banco
// (schema idêntico ao Clube Presença do renatodepaula.com, mesma query —
// ver renato_de_paula/public/api/comunidade/pulso.php):
//   hojeCheckins  -> alunos distintos com presença hoje (presencas.data)
//   partilhasHoje -> comentários hoje (comentarios.created_at)
//   totalPresenca -> soma do total de dias de presença de cada aluno
//     (não streak consecutivo — total de dias distintos já meditados)
//
// Endpoint público, sem sessão: é número agregado de todo mundo, sem dado
// individual, então não há por que exigir login aqui (a versão mock em Node,
// server/src/modules/gamification, só pede login porque TODO o app ali passa
// por requireAuth — não é uma exigência real desta query).
header('Access-Control-Allow-Origin: https://academiadohabito.com.br');
header('Access-Control-Allow-Methods: GET, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'erro' => 'Método não permitido']);
    exit;
}

require __DIR__ . '/_config.php'; // dá $mysqli pronto (ou já responde 500 e sai)

$hojeCheckins = (int) $mysqli->query(
    "SELECT COUNT(DISTINCT email) AS n FROM presencas WHERE data = CURDATE()"
)->fetch_assoc()['n'];

$partilhasHoje = (int) $mysqli->query(
    "SELECT COUNT(*) AS n FROM comentarios WHERE DATE(created_at) = CURDATE()"
)->fetch_assoc()['n'];

// Uma query só (não 1 por aluno): lê email+data de todas as presenças e soma
// em PHP quantos dias distintos cada aluno tem.
$res = $mysqli->query("SELECT email, data FROM presencas ORDER BY email, data DESC");
$datasPorEmail = [];
while ($row = $res->fetch_assoc()) {
    $datasPorEmail[$row['email']][$row['data']] = true;
}
$totalPresenca = array_sum(array_map('count', $datasPorEmail));

echo json_encode([
    'ok' => true,
    'hojeCheckins' => $hojeCheckins,
    'partilhasHoje' => $partilhasHoje,
    'totalPresenca' => $totalPresenca,
]);
