<?php
// PUT /api/encontro-editar.php — real de PUT /meditacao/lives/proxima.
// Só admin (EMAILS_ORIENTADORES, ver exigirAdmin em _config.php) edita o
// card inteiro: título, data, duração, anfitrião, checklist e o toggle "ao
// vivo"/link. Chamado por AdminPage.tsx; o dashboard (ProximoEncontro.tsx)
// vê a mudança no próprio poll de 3s, sem nenhum aviso explícito daqui.
header('Access-Control-Allow-Origin: https://academiadohabito.com.br');
header('Access-Control-Allow-Methods: PUT, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'erro' => 'Método não permitido']);
    exit;
}

require __DIR__ . '/_sessao.php';
$email = exigirSessao();

require __DIR__ . '/_config.php';
exigirAdmin($email);

require __DIR__ . '/_encontro.php';
garantirTabelasEncontro($mysqli);

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$titulo = trim((string) ($input['titulo'] ?? ''));
$dataIso = trim((string) ($input['dataISO'] ?? ''));
$duracaoMin = (int) ($input['duracaoMin'] ?? 0);
$anfitriao = trim((string) ($input['anfitriao'] ?? ''));
$aoVivo = !empty($input['aoVivo']);
$linkLive = $aoVivo ? trim((string) ($input['linkLive'] ?? '')) : null;
$checklist = is_array($input['checklist'] ?? null)
    ? implode("\n", array_map('strval', $input['checklist']))
    : '';

if ($titulo === '' || $dataIso === '' || $duracaoMin <= 0 || $anfitriao === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'erro' => 'campos obrigatórios faltando']);
    exit;
}

$stmt = $mysqli->prepare(
    "UPDATE ah_proximo_encontro
     SET titulo = ?, data_iso = ?, duracao_min = ?, anfitriao = ?, ao_vivo = ?, link_live = ?, checklist = ?
     WHERE id = 1"
);
$aoVivoInt = $aoVivo ? 1 : 0;
$stmt->bind_param('ssisiss', $titulo, $dataIso, $duracaoMin, $anfitriao, $aoVivoInt, $linkLive, $checklist);
$stmt->execute();
$stmt->close();

echo json_encode(['ok' => true, 'encontro' => montarEncontro($mysqli, $email)]);
