<?php
// Streak/bolinhas ("Sequência") e jornada de aulas — portados 1:1 de
// gamification.store.ts (calcularStreak/calcularBolinhas/getJornada), pra
// serem reaproveitados por sequencia.php, jornada.php e meditei-hoje.php sem
// triplicar a lógica. Os três leem a MESMA tabela real (presencas): jornada
// não é uma feature separada, é só COUNT(DISTINCT data) capado em
// TOTAL_AULAS (ver docs/ARCHITECTURE.md).
//
// Uso: require __DIR__ . '/_habito.php'; depois de já ter $mysqli
// (_config.php) e $email (exigirSessao()).

const AH_TOTAL_AULAS = 48;

// Busca todas as datas de presença do aluno de uma vez (1 query), pra
// sequencia() e jornada() não baterem 2x no banco na mesma request.
function buscarDatasPresenca(mysqli $mysqli, string $email): array
{
    $stmt = $mysqli->prepare("SELECT data FROM presencas WHERE email = ?");
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $res = $stmt->get_result();
    $datas = [];
    while ($row = $res->fetch_assoc()) {
        $datas[$row['data']] = true; // já vem 'AAAA-MM-DD' (coluna DATE)
    }
    $stmt->close();
    return $datas;
}

// $datas: array associativo 'AAAA-MM-DD' => true (ver buscarDatasPresenca).
function calcularSequencia(array $datas): array
{
    $hoje = new DateTime('today'); // já em America/Sao_Paulo (_privado.php)

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
        $diasAtras = (int) round(($hoje->getTimestamp() - $data->getTimestamp()) / 86400);
        $bolinhas[] = [
            'iso' => $data->format('Y-m-d'),
            'label' => $labels[(int) $data->format('w')],
            'concluido' => $diasAtras >= $offsetAncora && $diasAtras < $offsetAncora + $streak,
            'hoje' => $diasAtras === 0,
        ];
    }

    return ['streak' => $streak, 'bolinhas' => $bolinhas];
}

// Mesmas mensagens de gamification.store.ts::getJornada.
function calcularJornada(array $datas): array
{
    $totalAssistidos = min(count($datas), AH_TOTAL_AULAS);
    $percentual = (int) round(($totalAssistidos / AH_TOTAL_AULAS) * 100);
    $hoje = (new DateTime('today'))->format('Y-m-d');
    $marcouHoje = isset($datas[$hoje]);
    $jornadaCompleta = $totalAssistidos >= AH_TOTAL_AULAS;

    if ($jornadaCompleta) {
        $mensagem = 'Jornada completa! Continue mantendo a prática diária. ✨';
    } elseif ($marcouHoje) {
        $mensagem = 'Próxima aula libera à meia-noite ✨';
    } elseif ($totalAssistidos === 0) {
        $mensagem = '🪷 Sua jornada começa agora';
    } else {
        $mensagem = '🪷 Faltam ' . (AH_TOTAL_AULAS - $totalAssistidos) . ' aulas pra sua transformação';
    }

    return [
        'totalAssistidos' => $totalAssistidos,
        'totalAulas' => AH_TOTAL_AULAS,
        'percentual' => $percentual,
        'jornadaCompleta' => $jornadaCompleta,
        'mensagem' => $mensagem,
    ];
}
