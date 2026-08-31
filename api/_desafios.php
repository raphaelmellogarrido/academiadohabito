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

// Textos crus (sem `concluido`, que é por-aluno) pro form de /admin — ver
// desafios-admin.php / CardDesafiosAdmin.tsx. Mesma query de
// buscarDesafiosDaSemana acima, só que devolve só o título.
function buscarDesafiosAdmin(mysqli $mysqli): array
{
    $textos = [];
    $res = $mysqli->query("SELECT titulo FROM desafio_config ORDER BY ordem");
    while ($row = $res->fetch_assoc()) {
        $textos[] = $row['titulo'];
    }
    return $textos;
}

// Reescreve a lista inteira de desafios (1 item por linha no form) — apaga
// todo desafio_config e reinsere com `ordem` = posição na lista. IDs novos
// (AUTO_INCREMENT) não têm por quê bater com os antigos — igual ao mock
// (editarDesafiosSemana em community.store.ts), quem já tinha marcado um id
// que deixou de existir simplesmente não vê mais nada correspondente em
// desafio_semana (buscarDesafiosDaSemana só junta pelos ids atuais).
function salvarDesafiosSemana(mysqli $mysqli, array $textos): array
{
    $mysqli->query("DELETE FROM desafio_config");
    $stmt = $mysqli->prepare("INSERT INTO desafio_config (titulo, ordem) VALUES (?, ?)");
    foreach (array_values($textos) as $i => $titulo) {
        $stmt->bind_param('si', $titulo, $i);
        $stmt->execute();
    }
    $stmt->close();
    return buscarDesafiosAdmin($mysqli);
}

// Botão "Resetar desafios" do /admin — zera a marcação de TODOS os alunos
// (todas as semanas, não só a atual), mesmo comportamento de
// resetarDesafios() no mock (CONCLUIDOS.clear()).
function resetarDesafiosSemana(mysqli $mysqli): void
{
    $mysqli->query("DELETE FROM desafio_semana");
}
