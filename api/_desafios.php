<?php
// Compartilhado por desafios.php (GET) e desafios-alternar.php (POST) —
// devolve a lista de desafios da semana já com `concluido` do aluno, mesmo
// shape do mock (server/src/modules/community/community.store.ts:
// getDesafiosDaSemana). Tabelas reais do site antigo: desafio_config (itens
// fixos, curados no /admin de lá) + desafio_semana (marcação por
// aluno/semana — `semana` usa YEARWEEK(CURDATE(),1), chave interna sem
// efeito no client).
function buscarDesafiosDaSemana(mysqli $mysqli, string $email): array
{
    $itens = [];
    $res = $mysqli->query("SELECT id, titulo FROM desafio_config ORDER BY ordem");
    while ($row = $res->fetch_assoc()) {
        $itens[(int) $row['id']] = ['id' => (string) $row['id'], 'texto' => $row['titulo'], 'concluido' => false];
    }
    if (!$itens) {
        return [];
    }

    $stmt = $mysqli->prepare(
        "SELECT item_id FROM desafio_semana WHERE email = ? AND semana = YEARWEEK(CURDATE(), 1) AND concluido = 1"
    );
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($row = $res->fetch_assoc()) {
        $id = (int) $row['item_id'];
        if (isset($itens[$id])) {
            $itens[$id]['concluido'] = true;
        }
    }
    $stmt->close();

    return array_values($itens);
}
