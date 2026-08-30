<?php
// Compartilhado por encontro.php (GET) e encontro-reservar.php (POST).
// Tabelas NOVAS, self-provisioning (CREATE TABLE IF NOT EXISTS, mesmo
// padrão de renato_de_paula/public/api/live/reservas.php) dentro do banco
// que já temos conectado (u790959747_comunidade) — as tabelas antigas
// (config_encontro/live_reservas) não servem: campos freeform demais e a
// reserva mora num banco separado (u790959747_clube) que não temos
// credencial. Desenhadas pra baterem 1:1 com a interface `Encontro` do
// client (meditacaoApi.ts) — zero mudança em ProximoEncontro.tsx.
function garantirTabelasEncontro(mysqli $mysqli): void
{
    $mysqli->query(
        "CREATE TABLE IF NOT EXISTS ah_proximo_encontro (
            id INT PRIMARY KEY,
            titulo VARCHAR(200) NOT NULL,
            data_iso VARCHAR(40) NOT NULL,
            duracao_min INT NOT NULL DEFAULT 60,
            anfitriao VARCHAR(120) NOT NULL,
            foto_anfitriao VARCHAR(255) NULL,
            ao_vivo TINYINT(1) NOT NULL DEFAULT 0,
            link_live VARCHAR(255) NULL,
            checklist TEXT NULL
        )"
    );
    $mysqli->query(
        "CREATE TABLE IF NOT EXISTS ah_encontro_reservas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            encontro_id INT NOT NULL,
            email VARCHAR(190) NOT NULL,
            criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uk_encontro_email (encontro_id, email)
        )"
    );

    // Seed só na primeira vez (linha id=1 ainda não existe) — mesmo texto
    // de exemplo do mock (live.store.ts), até o usuário editar via
    // phpMyAdmin com o encontro real (sem admin UI ainda pra isso).
    $existe = $mysqli->query("SELECT id FROM ah_proximo_encontro WHERE id = 1")->fetch_assoc();
    if (!$existe) {
        $stmt = $mysqli->prepare(
            "INSERT INTO ah_proximo_encontro (id, titulo, data_iso, duracao_min, anfitriao, checklist)
             VALUES (1, ?, ?, ?, ?, ?)"
        );
        $titulo = 'Meditação guiada com Dr. Renato';
        $dataIso = '2026-09-06T20:00:00-03:00';
        $duracao = 60;
        $anfitriao = 'Dr. Renato';
        $checklist = "Ambiente silencioso\nFone de ouvido por perto\nChegue 5 min antes";
        $stmt->bind_param('ssiss', $titulo, $dataIso, $duracao, $anfitriao, $checklist);
        $stmt->execute();
        $stmt->close();
    }
}

// Monta o mesmo shape de `Encontro` (meditacaoApi.ts) a partir da linha
// id=1 + reservas do aluno atual.
function montarEncontro(mysqli $mysqli, string $email): ?array
{
    $row = $mysqli->query("SELECT * FROM ah_proximo_encontro WHERE id = 1")->fetch_assoc();
    if (!$row) {
        return null;
    }

    $totalReservas = (int) $mysqli->query(
        "SELECT COUNT(*) AS n FROM ah_encontro_reservas WHERE encontro_id = 1"
    )->fetch_assoc()['n'];

    $reservado = false;
    $stmt = $mysqli->prepare("SELECT 1 FROM ah_encontro_reservas WHERE encontro_id = 1 AND email = ?");
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $reservado = (bool) $stmt->get_result()->fetch_assoc();
    $stmt->close();

    // Até 3 nomes pra pílula de avatares — JOIN alunos pelo email.
    // avatarUrl sempre null aqui (mesmo estado de alunoParaUsuario() em
    // _config.php: "avatar real fica pra quando esse card entrar").
    $reservasAvatares = [];
    $res = $mysqli->query(
        "SELECT a.nome FROM ah_encontro_reservas r
         JOIN alunos a ON a.email = r.email
         WHERE r.encontro_id = 1 ORDER BY r.criado_em ASC LIMIT 3"
    );
    while ($row2 = $res->fetch_assoc()) {
        $reservasAvatares[] = ['nome' => $row2['nome'], 'avatarUrl' => null];
    }

    return [
        'id' => (string) $row['id'],
        'titulo' => $row['titulo'],
        'dataISO' => $row['data_iso'],
        'duracaoMin' => (int) $row['duracao_min'],
        'anfitriao' => $row['anfitriao'],
        'fotoAnfitriao' => $row['foto_anfitriao'],
        'aoVivo' => (bool) $row['ao_vivo'],
        'linkLive' => $row['ao_vivo'] ? $row['link_live'] : null,
        'checklist' => $row['checklist'] ? explode("\n", $row['checklist']) : [],
        'reservado' => $reservado,
        'totalReservas' => $totalReservas,
        'reservasAvatares' => $reservasAvatares,
    ];
}
