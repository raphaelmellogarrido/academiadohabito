<?php
// Compartilhado por aulas-progresso.php, aulas-concluir.php e
// aulas-comentarios*.php. Duas partes:
//
// 1) Progresso da trilha de vídeo-aulas — porta 1:1 o algoritmo de
//    server/src/modules/aulas/aulas.store.ts (bloco de 3 dias, pausa
//    obrigatória) pra uma tabela NOVA self-provisioning (mesmo padrão de
//    _encontro.php: CREATE TABLE IF NOT EXISTS, sem seed aqui — cada aluno
//    começa sem linha, equivalente a diasConcluidos vazio no mock).
//
// 2) Comentários da aula — reaproveita as tabelas reais já existentes
//    comentarios/comentario_reacoes (mesmo padrão de _feed.php, que este
//    arquivo também usa via condVisibilidadeSql()/montarReacoesEmLote()).
//    Como `comentarios` não tem coluna pra "dia da aula" e é tabela
//    compartilhada com o site antigo (não mexemos no schema dela), o dia
//    fica embutido no próprio aula_id como "aulas:{dia}" — mesma ideia do
//    aula_id fixo 'geral' do feed, só que aqui varia por dia.

const TOTAL_DIAS_AULAS = 48; // mesmo valor de TOTAL_AULAS em gamification.store.ts
const TAMANHO_BLOCO_AULAS = 3;
const AULA_ID_PREFIXO = 'aulas:';

function garantirTabelaAulasProgresso(mysqli $mysqli): void
{
    $mysqli->query(
        "CREATE TABLE IF NOT EXISTS ah_aulas_progresso (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(190) NOT NULL,
            dia INT NOT NULL,
            concluido_em DATE NOT NULL,
            UNIQUE KEY uk_email_dia (email, dia)
        )"
    );
}

// Monta o mesmo shape de `AulaProgresso` (meditacaoApi.ts) a partir das
// linhas de ah_aulas_progresso do aluno — mesma lógica de
// aulas.store.ts::getProgresso, incluindo as mensagens exatas.
function montarProgresso(mysqli $mysqli, string $email): array
{
    $stmt = $mysqli->prepare(
        "SELECT dia FROM ah_aulas_progresso WHERE email = ? ORDER BY dia ASC"
    );
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $res = $stmt->get_result();
    $diasConcluidos = [];
    while ($row = $res->fetch_assoc()) {
        $diasConcluidos[] = (int) $row['dia'];
    }
    $stmt->close();

    $stmt = $mysqli->prepare(
        "SELECT MAX(concluido_em) AS ultima FROM ah_aulas_progresso WHERE email = ?"
    );
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $ultimaConclusao = $stmt->get_result()->fetch_assoc()['ultima'] ?? null;
    $stmt->close();

    $hoje = $mysqli->query("SELECT CURDATE() AS hoje")->fetch_assoc()['hoje'];

    $diaMaxConcluido = $diasConcluidos ? max($diasConcluidos) : 0;
    $concluiuHoje = $ultimaConclusao !== null && $ultimaConclusao === $hoje;

    $fimDeBloco = $diaMaxConcluido > 0 && $diaMaxConcluido % TAMANHO_BLOCO_AULAS === 0;
    $jornadaCompleta = $diaMaxConcluido >= TOTAL_DIAS_AULAS;
    $bloqueado = !$jornadaCompleta && $fimDeBloco && $concluiuHoje;

    $diaAtual = min($diaMaxConcluido + ($jornadaCompleta ? 0 : 1), TOTAL_DIAS_AULAS);
    $diaMaximoLiberado = $bloqueado ? $diaMaxConcluido : $diaAtual;

    if ($jornadaCompleta) {
        $status = 'concluido';
        $mensagem = 'Jornada completa! Continue mantendo a prática diária. ✨';
    } elseif ($bloqueado) {
        $status = 'pausa';
        $mensagem = 'Pausa obrigatória — volte amanhã';
    } elseif ($concluiuHoje) {
        $status = 'concluido';
        $mensagem = 'Dia concluído';
    } else {
        $status = 'praticar';
        $mensagem = 'Hora de praticar';
    }

    return [
        'totalDias' => TOTAL_DIAS_AULAS,
        'diaAtual' => $diaAtual,
        'diaMaximoLiberado' => $diaMaximoLiberado,
        'diasConcluidos' => $diasConcluidos,
        'bloqueado' => $bloqueado,
        'status' => $status,
        'mensagem' => $mensagem,
        'percentual' => (int) round(($diaMaxConcluido / TOTAL_DIAS_AULAS) * 100),
    ];
}

// Retorna null quando o dia pedido não é o dia liberado agora (mesmo
// contrato de aulas.store.ts::concluirDia) — o endpoint traduz isso pra 400.
function concluirDiaAula(mysqli $mysqli, string $email, int $dia): ?array
{
    $atual = montarProgresso($mysqli, $email);
    if ($dia !== $atual['diaMaximoLiberado'] || $atual['bloqueado']) {
        return null;
    }

    $stmt = $mysqli->prepare(
        "INSERT INTO ah_aulas_progresso (email, dia, concluido_em) VALUES (?, ?, CURDATE())
         ON DUPLICATE KEY UPDATE concluido_em = CURDATE()"
    );
    $stmt->bind_param('si', $email, $dia);
    $stmt->execute();
    $stmt->close();

    return montarProgresso($mysqli, $email);
}

// Reconstrói 1 comentário de aula completo (shape de `AulaComentario`) pelo
// id — usado por aulas-comentario-reagir.php/editar.php/visibilidade.php
// depois de mutar uma linha. `admin` sempre false (mesma regra de
// alunoParaUsuario() em _config.php: não existe esse conceito em `alunos`
// ainda) -> podeExcluir aceita o próprio autor OU ehOrientadorEmail()
// (reaproveitada como "admin" por enquanto, ver _feed.php).
function montarAulaComentario(mysqli $mysqli, int $id, string $emailAtual): ?array
{
    $stmt = $mysqli->prepare(
        "SELECT id, email, nome, aula_id, comentario, image_mime, visibilidade, created_at
         FROM comentarios WHERE id = ? AND aula_id LIKE '" . AULA_ID_PREFIXO . "%'"
    );
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$row) {
        return null;
    }

    $reacoes = montarReacoesEmLote($mysqli, [(int) $row['id']], $emailAtual)[(int) $row['id']];
    $dia = (int) substr($row['aula_id'], strlen(AULA_ID_PREFIXO));

    return [
        'id' => (string) $row['id'],
        'userId' => $row['email'],
        'nome' => $row['nome'] ?: 'Aluno',
        'admin' => false,
        'diaAtual' => $dia,
        'texto' => $row['comentario'],
        'foto' => $row['image_mime'] ? ('/api/imagem-comentario.php?id=' . $row['id']) : null,
        'visibilidade' => $row['visibilidade'] ?: 'publico',
        'reacoes' => $reacoes['reacoes'],
        'minhasReacoes' => $reacoes['minhasReacoes'],
        'podeEditar' => $row['email'] === $emailAtual,
        'podeExcluir' => $row['email'] === $emailAtual || ehOrientadorEmail($emailAtual),
        'criadoEm' => isoComOffset($row['created_at']),
    ];
}
