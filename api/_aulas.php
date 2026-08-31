<?php
// Compartilhado por aulas-catalogo.php, aulas-progresso.php,
// aulas-concluir.php e aulas-comentarios*.php. Três partes:
//
// 1) Catálogo de vídeo-aulas — porta 1:1
//    server/src/modules/aulas/aulas.catalogo.ts (mesmo mapa arquivo->título,
//    mesma pasta de origem, mesmo catálogo "virtual" de fallback).
//
// 2) Progresso por vídeo + bloqueio por dia — porta 1:1
//    aulas.store.ts + aulas.progressoDias.ts (bloqueio por DIA, calendário
//    BRT + pausa obrigatória a cada 3 dias, mesmo algoritmo do projeto
//    irmão — ver plano aprovado em .claude/plans). Tabela self-provisioning (mesmo
//    padrão de _encontro.php), migrada automaticamente do schema antigo
//    (bloco de 3 dias) na primeira request depois do deploy — não há dado
//    real dessa feature em produção ainda, então recriar é seguro.
//
// 3) Comentários da aula — reaproveita as tabelas reais já existentes
//    comentarios/comentario_reacoes (mesmo padrão de _feed.php, que este
//    arquivo também usa via condVisibilidadeSql()/montarArvoreComentario()).
//    Como `comentarios` não tem coluna pra "dia/aula" e é tabela
//    compartilhada com o site antigo (não mexemos no schema dela), dia +
//    aulaIndex + arquivo ficam embutidos no próprio aula_id como
//    "aulas:{dia}:{aulaIndex}:{arquivo}" (gravados explicitamente no momento
//    do comentário, não re-derivados do nome do arquivo depois — assim uma
//    mudança futura na lista de arquivos ocultos não corrompe comentários
//    antigos).

const AULA_ID_PREFIXO = 'aulas:';

// Mapeamento fixo arquivo -> título, portado 1:1 de
// server/src/modules/aulas/aulas.catalogo.ts (mesmo curso, mesmos vídeos).
// Dia 0 é o módulo de boas-vindas; dias 1..15 são a trilha principal.
const TITULOS_AULAS_RAIZ = [
    'dia0.1.mp4' => 'Boas Vindas',
    'dia0.2.mp4' => 'Estrutura do Curso + Motivacional',
    'dia0.3.mp4' => 'Introdução (não pule!)',

    'dia1.1.mp4' => '1a Meditação do dia',
    'dia1.2.mp4' => '1o Mito: Meditação é pra relaxar?',
    'dia1.4.mp4' => '2a Meditação do dia',

    'dia2.1.mp4' => '1a Meditação (5 min)',
    'dia2.2.mp4' => '2o Mito: É necessário parar de pensar?',
    'dia2.3.mp4' => '2a Meditação (5 min)',

    'dia3.1.mp4' => '1a Meditação do dia',
    'dia3.2.mp4' => '3o Mito: O que é o ambiente perfeito para meditar?',
    'dia3.3.mp4' => '2a Meditação (5 min)',

    'dia4.1.mp4' => '1a Meditação (10 min)',
    'dia4.2.mp4' => '4o Mito: É preciso me MANTER concentrado?',
    'dia4.3.mp4' => '2a Meditação (10 min)',

    'dia5.1.mp4' => '1a Meditação (10 min)',
    'dia5.2.mp4' => '5o Mito: Tudo que me faz concentrar é meditação?',
    'dia5.3.mp4' => '2a Meditação (10 min)',

    'dia6.1.mp4' => '1a Meditação (10 min)',
    'dia6.2.mp4' => 'O exercício fundamental da meditação',
    'dia6.3.mp4' => '2a Meditação (10 min)',

    'dia7.1.mp4' => '1a Meditação (15 min)',
    'dia7.2.mp4' => "Como lidar com o pensamento 'reentrante'(ruminativo)",
    'dia7.3.mp4' => '2a Meditação (15 min)',

    'dia8.1.mp4' => '1a Meditação (15 min)',
    'dia8.2.mp4' => 'Segredos do AMBIENTE meditativo',
    'dia8.3.mp4' => '2a Meditação (15 min)',

    'dia9.1.mp4' => '1a Meditação (15 min)',
    'dia9.2.mp4' => 'O que é a concentração verdadeira?',
    'dia9.3.mp4' => '2a Meditação (15 min)',

    'dia10.1.mp4' => '1a Meditação (20 min)',
    'dia10.2.mp4' => 'O poder do estímulo de baixa intensidade',
    'dia10.3.mp4' => '2a Meditação (20 min)',

    'dia11.1.mp4' => '1a Meditação (20 min)',
    'dia11.2.mp4' => 'Refinando a técnica',
    'dia11.3.mp4' => '2a Meditação (20 min)',

    'dia12.1.mp4' => '1a Meditação (20 min)',
    'dia12.2.mp4' => 'O tempo em meditação',
    'dia12.3.mp4' => '2a Meditação (20 min)',

    'dia13.1.mp4' => '1a Meditação (25 min)',
    'dia13.2.mp4' => 'Postura e posição',
    'dia13.3.mp4' => '2a Meditação (25 min)',

    'dia14.1.mp4' => '1a Meditação (25 min)',
    'dia14.2.mp4' => 'Onde meditar/onde não meditar',
    'dia14.3.mp4' => '2a Meditação (25min)',

    'dia15.1.mp4' => '1a Meditação (25 min)',
    'dia15.2.mp4' => 'Ciclos da mente + dias insuportáveis',
    'dia15.3.mp4' => '2a Meditação (25 min)',
];

// Arquivos que somem do catálogo mesmo que o .mp4 continue no disco — mesma
// lista de aulas.catalogo.ts (dia1.3 virou dia1.4).
const ARQUIVOS_OCULTOS_AULAS_RAIZ = ['dia1.3.mp4' => true];

// Pasta com os .mp4 reais — mesma altura de public_html na Hostinger (irmã
// dela, fora do repo, sobe por FTP; fica fora do document root DE PROPÓSITO
// pra sobreviver a deploy via git, que apaga tudo dentro de public_html a
// cada push), mesmo padrão de dois candidatos que private/db_config.php usa
// em _privado.php (produção: 2 níveis acima de api/; dev local: 1 nível
// acima, api/ e curso-meditacao-raiz são irmãos na raiz do projeto). Por
// estar fora do document root, os .mp4 NUNCA são expostos por URL estática
// direta — só streamados por aulas-video.php (ver montarCatalogoAulas
// abaixo), que também exige sessão.
function pastaCursoMeditacao(): string
{
    $producao = __DIR__ . '/../../curso-meditacao-raiz';
    if (is_dir($producao)) {
        return $producao;
    }
    return __DIR__ . '/../curso-meditacao-raiz';
}

// Monta [{ dia, titulo, videos: [{arquivo,titulo,url}] }] a partir do
// filesystem — mesmo algoritmo de aulas.catalogo.ts::montarCatalogo. Se a
// pasta ainda não existir neste ambiente, cai pro catálogo "virtual" (todos
// os arquivos do mapa de títulos, como se estivessem no disco).
function montarCatalogoAulas(): array
{
    $pasta = pastaCursoMeditacao();
    $candidatos = @scandir($pasta);
    if ($candidatos === false) {
        $candidatos = array_keys(TITULOS_AULAS_RAIZ);
    } else {
        $candidatos = array_values(array_filter($candidatos, fn($f) => str_ends_with(strtolower($f), '.mp4')));
    }

    $porDia = [];
    foreach ($candidatos as $arquivo) {
        if (isset(ARQUIVOS_OCULTOS_AULAS_RAIZ[$arquivo])) {
            continue;
        }
        $titulo = TITULOS_AULAS_RAIZ[$arquivo] ?? null;
        if ($titulo === null) {
            continue; // arquivo sem título fixo conhecido — ignora
        }
        if (!preg_match('/^dia(\d+)\.(\d+)\.mp4$/i', $arquivo, $m)) {
            continue;
        }
        $dia = (int) $m[1];
        $posicao = (int) $m[2];
        // URL de API, não caminho estático — a pasta real fica fora de
        // public_html (ver comentário de pastaCursoMeditacao acima), então o
        // Apache não enxerga o arquivo por URL direta. aulas-video.php lê do
        // disco e transmite (stream) o binário, com Range pro seek do player.
        $porDia[$dia][] = ['arquivo' => $arquivo, 'titulo' => $titulo, 'url' => '/api/aulas-video.php?arquivo=' . rawurlencode($arquivo), 'posicao' => $posicao];
    }

    ksort($porDia);
    $dias = [];
    foreach ($porDia as $dia => $videos) {
        usort($videos, fn($a, $b) => $a['posicao'] <=> $b['posicao']);
        $videos = array_map(fn($v) => ['arquivo' => $v['arquivo'], 'titulo' => $v['titulo'], 'url' => $v['url']], $videos);
        $dias[] = ['dia' => $dia, 'titulo' => $videos[0]['titulo'] ?? "Dia $dia", 'videos' => $videos];
    }
    return $dias;
}

// Cacheado por request (a pasta de vídeos não muda em runtime) — mesma ideia
// do catalogoCache em aulas.store.ts.
function getCatalogoAulas(): array
{
    static $cache = null;
    if ($cache === null) {
        $cache = montarCatalogoAulas();
    }
    return $cache;
}

// Acha o dia (do catálogo) e o índice de POSIÇÃO do vídeo dentro dele a
// partir do nome do arquivo.
function localizarVideoAula(array $dias, string $arquivo): ?array
{
    foreach ($dias as $diaObj) {
        foreach ($diaObj['videos'] as $i => $v) {
            if ($v['arquivo'] === $arquivo) {
                return ['diaObj' => $diaObj, 'videoIndex' => $i];
            }
        }
    }
    return null;
}

// Usado por aulas-comentarios.php pra montar o comentário com dia + aulaIndex
// (1-based, na ordem exibida) a partir do arquivo ativo no client.
function localizarDiaEAulaIndexAula(array $dias, string $arquivo): ?array
{
    $achado = localizarVideoAula($dias, $arquivo);
    if (!$achado) {
        return null;
    }
    return ['dia' => $achado['diaObj']['dia'], 'aulaIndex' => $achado['videoIndex'] + 1];
}

// "Hoje" travado em Brasília (não no fuso do servidor) — mesmo raciocínio de
// hojeBrasilISO() em gamification.store.ts.
function hojeBrasilISOAula(): string
{
    $dt = new DateTime('now', new DateTimeZone('America/Sao_Paulo'));
    return $dt->format('Y-m-d');
}

// Dia "completo" = TODOS os vídeos do dia (contagem real do catálogo) estão
// com assistida=true.
function diaEstaCompletoAula(?array $diaObj, array $progressoPorArquivo): bool
{
    if (!$diaObj || !$diaObj['videos']) {
        return false;
    }
    foreach ($diaObj['videos'] as $v) {
        if (empty($progressoPorArquivo[$v['arquivo']]['assistida'])) {
            return false;
        }
    }
    return true;
}

// Maior dia 100% concluído a partir do Dia 0, ou -1 se nem o Dia 0 foi
// concluído. `dias` precisa vir ordenado por número do dia (já vem de
// montarCatalogoAulas via ksort).
function calcularMaxDiaCompletoAula(array $dias, array $progressoPorArquivo): int
{
    $max = -1;
    foreach ($dias as $diaObj) {
        if (diaEstaCompletoAula($diaObj, $progressoPorArquivo)) {
            $max = $diaObj['dia'];
        } else {
            break;
        }
    }
    return $max;
}

// Data (YYYY-MM-DD) em que o dia `maxDiaCompleto` foi concluído — maior
// completadoEm entre os vídeos desse dia.
function calcularUltimoDiaCompletadoDataAula(array $dias, array $progressoPorArquivo, int $maxDiaCompleto): ?string
{
    if ($maxDiaCompleto < 0) {
        return null;
    }
    $diaObj = null;
    foreach ($dias as $d) {
        if ($d['dia'] === $maxDiaCompleto) {
            $diaObj = $d;
            break;
        }
    }
    if (!$diaObj) {
        return null;
    }
    $maiorData = null;
    foreach ($diaObj['videos'] as $v) {
        $completadoEm = $progressoPorArquivo[$v['arquivo']]['completadoEm'] ?? null;
        if ($completadoEm) {
            $data = substr($completadoEm, 0, 10);
            if (!$maiorData || $data > $maiorData) {
                $maiorData = $data;
            }
        }
    }
    return $maiorData;
}

// Pausa obrigatória (pedido do cliente): a cada 3 dias de curso CONCLUÍDOS, o
// aluno espera DIAS_PAUSA_OBRIGATORIA dias corridos antes do próximo dia
// liberar — dias 1,2,3 -> pausa de 4 dias -> 4,5,6 -> pausa -> 7,8,9 -> ...
// "Dia de retomada" (exige a pausa inteira) quando $diaAlvo > 1 e
// $diaAlvo % 3 === 1 (dias 4, 7, 10, ...) — dia 1 fica de fora, coberto pela
// exceção Dia0->Dia1. Mesmo algoritmo do projeto irmão
// (renato_de_paula/src/pages/comunidade/components/progressoDias.js).
const DIAS_PAUSA_OBRIGATORIA_AULA = 4;

function ehDiaDeRetomadaAposPausaAula(int $diaAlvo): bool
{
    return $diaAlvo > 1 && $diaAlvo % 3 === 1;
}

// Diferença em dias corridos entre duas datas ISO locais (YYYY-MM-DD).
function diferencaEmDiasAula(string $isoRecente, string $isoAntigo): int
{
    $recente = new DateTime($isoRecente);
    $antigo = new DateTime($isoAntigo);
    return (int) $antigo->diff($recente)->format('%r%a');
}

// Dias corridos que ainda faltam pra pausa obrigatória terminar e liberar
// $diaAlvo. 0 = pausa já cumprida.
function diasRestantesPausaAula(int $diaAlvo, ?string $ultimoDiaCompletadoData, string $hojeServidor): int
{
    if (!ehDiaDeRetomadaAposPausaAula($diaAlvo) || $ultimoDiaCompletadoData === null) {
        return 0;
    }
    $passados = diferencaEmDiasAula($hojeServidor, $ultimoDiaCompletadoData);
    return max(0, DIAS_PAUSA_OBRIGATORIA_AULA - $passados);
}

// Vídeo anterior (mesmo dia, índice de POSIÇÃO na ordem real do catálogo) já
// foi assistido?
function videoAnteriorAssistidoAula(array $dias, array $progressoPorArquivo, int $diaAlvo, int $videoIndexAlvo): bool
{
    if ($videoIndexAlvo <= 0) {
        return true;
    }
    foreach ($dias as $diaObj) {
        if ($diaObj['dia'] === $diaAlvo) {
            $anterior = $diaObj['videos'][$videoIndexAlvo - 1] ?? null;
            return $anterior ? !empty($progressoPorArquivo[$anterior['arquivo']]['assistida']) : false;
        }
    }
    return false;
}

// Porta EXATAMENTE aulas.progressoDias.ts::podeAssistir — bloqueio por DIA
// (não por vídeo): cada dia libera inteiro (vídeos em ordem) de uma vez, Dia
// 0 -> Dia 1 pode ser feito no mesmo dia (exceção pedida pelo cliente), e a
// partir daí só libera um dia novo por dia de calendário (BRT), EXCETO nos
// "dias de retomada" (4, 7, 10, ...), que exigem a pausa obrigatória de
// DIAS_PAUSA_OBRIGATORIA_AULA dias corridos. Dias já completados continuam
// sempre revisitáveis, em qualquer ordem. Servidor sempre "verificado" (é a
// própria fonte da verdade) — sem o motivo "verificando" (só existe no
// client, antes do 1o GET de progresso responder).
function podeAssistirAula(
    int $diaAlvo,
    int $videoIndexAlvo,
    array $dias,
    array $progressoPorArquivo,
    int $maxDiaCompleto,
    ?string $ultimoDiaCompletadoData,
    string $hojeServidor
): array {
    // DIA 0 SEMPRE LIVRE — mas em ordem dentro do próprio dia.
    if ($diaAlvo === 0) {
        if ($videoIndexAlvo === 0) {
            return ['liberado' => true, 'motivo' => null];
        }
        $ok = videoAnteriorAssistidoAula($dias, $progressoPorArquivo, $diaAlvo, $videoIndexAlvo);
        return $ok ? ['liberado' => true, 'motivo' => null] : ['liberado' => false, 'motivo' => 'ordem'];
    }

    // REASSISTIR DIAS JÁ COMPLETADOS: sempre pode, qualquer ordem.
    if ($diaAlvo <= $maxDiaCompleto) {
        return ['liberado' => true, 'motivo' => null];
    }

    // TENTANDO AVANÇAR 1 DIA (o próximo depois do último completo).
    if ($diaAlvo === $maxDiaCompleto + 1) {
        // EXCEÇÃO DIA 0 -> DIA 1: libera mesmo no mesmo dia que terminou o Dia 0.
        if ($maxDiaCompleto === 0) {
            if ($videoIndexAlvo === 0) {
                return ['liberado' => true, 'motivo' => null];
            }
            $ok = videoAnteriorAssistidoAula($dias, $progressoPorArquivo, $diaAlvo, $videoIndexAlvo);
            return $ok ? ['liberado' => true, 'motivo' => null] : ['liberado' => false, 'motivo' => 'ordem'];
        }

        if ($maxDiaCompleto >= 1) {
            // PAUSA OBRIGATÓRIA (3 dias faz, 4 dias pausa): dias de retomada
            // (4, 7, 10, ...) substituem o "1 dia de calendário" geral abaixo
            // por DIAS_PAUSA_OBRIGATORIA_AULA dias corridos inteiros desde a
            // conclusão do dia anterior.
            if (ehDiaDeRetomadaAposPausaAula($diaAlvo)) {
                $restantes = diasRestantesPausaAula($diaAlvo, $ultimoDiaCompletadoData, $hojeServidor);
                if ($restantes > 0) {
                    return ['liberado' => false, 'motivo' => 'pausa', 'diasRestantes' => $restantes];
                }
                if ($videoIndexAlvo === 0) {
                    return ['liberado' => true, 'motivo' => null];
                }
                $ok = videoAnteriorAssistidoAula($dias, $progressoPorArquivo, $diaAlvo, $videoIndexAlvo);
                return $ok ? ['liberado' => true, 'motivo' => null] : ['liberado' => false, 'motivo' => 'ordem'];
            }

            // REGRA GERAL: 1 dia novo por dia de calendário — só libera se o
            // último dia completado foi ANTES de hoje (comparação de DATE).
            if ($ultimoDiaCompletadoData !== null && $ultimoDiaCompletadoData < $hojeServidor) {
                if ($videoIndexAlvo === 0) {
                    return ['liberado' => true, 'motivo' => null];
                }
                $ok = videoAnteriorAssistidoAula($dias, $progressoPorArquivo, $diaAlvo, $videoIndexAlvo);
                return $ok ? ['liberado' => true, 'motivo' => null] : ['liberado' => false, 'motivo' => 'ordem'];
            }
            return ['liberado' => false, 'motivo' => 'calendario'];
        }

        // maxDiaCompleto === -1 não deveria cair aqui (diaAlvo seria 0, já
        // tratado acima) — defensivo.
        return ['liberado' => false, 'motivo' => 'sequencia'];
    }

    // TENTANDO PULAR 2 DIAS OU MAIS.
    return ['liberado' => false, 'motivo' => 'sequencia'];
}

// Self-provisioning (mesmo padrão de garantirColunasPerfil em _config.php):
// checa a coluna `arquivo` pra saber se a tabela ainda está no schema antigo
// (bloco de 3 dias: email/dia/concluido_em) — se estiver, derruba e recria,
// já que essa feature ainda não tinha usuário real quando o modelo mudou (ver
// plano em .claude/plans). Sem essa migração, um INSERT com a coluna
// `arquivo` (que não existiria na tabela antiga) quebraria em produção.
function garantirTabelaAulasProgresso(mysqli $mysqli): void
{
    $existe = (int) $mysqli->query(
        "SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ah_aulas_progresso'"
    )->fetch_assoc()['n'] > 0;

    if ($existe) {
        $temArquivo = (int) $mysqli->query(
            "SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ah_aulas_progresso' AND COLUMN_NAME = 'arquivo'"
        )->fetch_assoc()['n'] > 0;
        if (!$temArquivo) {
            $mysqli->query('DROP TABLE ah_aulas_progresso');
            $existe = false;
        }
    }

    if (!$existe) {
        $mysqli->query(
            "CREATE TABLE ah_aulas_progresso (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(190) NOT NULL,
                arquivo VARCHAR(40) NOT NULL,
                dia INT NOT NULL,
                completado_em DATETIME NOT NULL,
                UNIQUE KEY uk_email_arquivo (email, arquivo)
            )"
        );
    }
}

// Monta o progresso por arquivo (email -> {assistida,progresso,completadoEm})
// direto das linhas de ah_aulas_progresso do aluno.
function buscarProgressoPorArquivoAula(mysqli $mysqli, string $email): array
{
    $stmt = $mysqli->prepare('SELECT arquivo, completado_em FROM ah_aulas_progresso WHERE email = ?');
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $res = $stmt->get_result();
    $mapa = [];
    while ($row = $res->fetch_assoc()) {
        $mapa[$row['arquivo']] = [
            'assistida' => true,
            'progresso' => 100,
            'completadoEm' => str_replace(' ', 'T', $row['completado_em']),
        ];
    }
    $stmt->close();
    return $mapa;
}

// Monta o mesmo shape de `AulaProgresso` (meditacaoApi.ts) — mesma lógica de
// aulas.store.ts::getProgresso.
function montarProgresso(mysqli $mysqli, string $email): array
{
    $dias = getCatalogoAulas();
    $progressoPorArquivo = buscarProgressoPorArquivoAula($mysqli, $email);
    $maxDiaCompleto = calcularMaxDiaCompletoAula($dias, $progressoPorArquivo);
    $totalConcluidos = count(array_filter($progressoPorArquivo, fn($v) => $v['assistida']));

    $ultimoDia = $dias ? $dias[count($dias) - 1]['dia'] : 0;
    $jornadaCompleta = count($dias) > 0 && $maxDiaCompleto >= $ultimoDia;
    $diaMaximoLiberado = $jornadaCompleta ? $ultimoDia : min(max($maxDiaCompleto + 1, 0), $ultimoDia);
    $diasConcluidos = $maxDiaCompleto >= 0
        ? array_values(array_map(fn($d) => $d['dia'], array_filter($dias, fn($d) => $d['dia'] <= $maxDiaCompleto)))
        : [];
    $totalVideos = array_sum(array_map(fn($d) => count($d['videos']), $dias));

    return [
        'totalDias' => count($dias),
        'totalVideos' => $totalVideos,
        'totalConcluidos' => $totalConcluidos,
        'diaMaximoLiberado' => $diaMaximoLiberado,
        'diasConcluidos' => $diasConcluidos,
        'jornadaCompleta' => $jornadaCompleta,
        'percentual' => $totalVideos > 0 ? (int) round(($totalConcluidos / $totalVideos) * 100) : 0,
        'progressoPorArquivo' => $progressoPorArquivo,
        'hoje' => hojeBrasilISOAula(),
    ];
}

// Servidor revalida o bloqueio antes de aceitar a conclusão (mesmo espírito
// de aulas.store.ts::marcarConcluida) — evita que uma chamada direta à API
// marque um vídeo ainda bloqueado. Retorna null quando o vídeo não existe no
// catálogo ou está bloqueado agora.
function marcarConcluidaAula(mysqli $mysqli, string $email, string $arquivo): ?array
{
    $dias = getCatalogoAulas();
    $achado = localizarVideoAula($dias, $arquivo);
    if (!$achado) {
        return null;
    }

    $progressoPorArquivo = buscarProgressoPorArquivoAula($mysqli, $email);
    $maxDiaCompleto = calcularMaxDiaCompletoAula($dias, $progressoPorArquivo);
    $ultimoDiaCompletadoData = calcularUltimoDiaCompletadoDataAula($dias, $progressoPorArquivo, $maxDiaCompleto);
    $bloqueio = podeAssistirAula(
        $achado['diaObj']['dia'],
        $achado['videoIndex'],
        $dias,
        $progressoPorArquivo,
        $maxDiaCompleto,
        $ultimoDiaCompletadoData,
        hojeBrasilISOAula()
    );
    if (!$bloqueio['liberado']) {
        return null;
    }

    $dia = $achado['diaObj']['dia'];
    $stmt = $mysqli->prepare(
        'INSERT INTO ah_aulas_progresso (email, arquivo, dia, completado_em) VALUES (?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE completado_em = NOW(), dia = VALUES(dia)'
    );
    $stmt->bind_param('ssi', $email, $arquivo, $dia);
    $stmt->execute();
    $stmt->close();

    return montarProgresso($mysqli, $email);
}

// Desmarcar não precisa de gate (mesma regra do mock: sempre pode desfazer
// uma marca já feita).
function desmarcarConcluidaAula(mysqli $mysqli, string $email, string $arquivo): array
{
    $stmt = $mysqli->prepare('DELETE FROM ah_aulas_progresso WHERE email = ? AND arquivo = ?');
    $stmt->bind_param('ss', $email, $arquivo);
    $stmt->execute();
    $stmt->close();

    return montarProgresso($mysqli, $email);
}

// Codifica dia + aulaIndex + arquivo dentro do aula_id — explicitamente (não
// re-derivado do nome do arquivo depois), pra um comentário antigo continuar
// mostrando o badge certo mesmo se a lista de ocultos/títulos mudar no
// futuro. Formato: "aulas:{dia}:{aulaIndex}:{arquivo}".
function codificarAulaId(int $dia, int $aulaIndex, string $arquivo): string
{
    return AULA_ID_PREFIXO . $dia . ':' . $aulaIndex . ':' . $arquivo;
}

function decodificarAulaId(string $aulaId): ?array
{
    if (strpos($aulaId, AULA_ID_PREFIXO) !== 0) {
        return null;
    }
    $resto = substr($aulaId, strlen(AULA_ID_PREFIXO));
    $partes = explode(':', $resto, 3);
    if (count($partes) < 2 || $partes[0] === '' || $partes[1] === '') {
        return null;
    }
    return ['dia' => (int) $partes[0], 'aulaIndex' => (int) $partes[1], 'arquivo' => $partes[2] ?? ''];
}

// Reconstrói 1 comentário de aula completo (árvore inteira: raiz + respostas
// em qualquer profundidade, shape de `AulaComentario`) a partir de QUALQUER
// id da thread — usado por aulas-comentario-reagir.php/editar.php/
// visibilidade.php/responder.php depois de mutar uma linha. Reaproveita a
// mesma árvore recursiva de _feed.php (montarArvoreComentario), só empilhando
// `dia`/`aulaIndex` (decodificados do aula_id da linha raiz) por cima do nó
// raiz. `admin` sempre false em todo nó (mesma regra de alunoParaUsuario() em
// _config.php: não existe esse conceito em `alunos` ainda) -> podeExcluir
// aceita o próprio autor OU ehOrientadorEmail() (reaproveitada como "admin"
// por enquanto, ver _feed.php).
function montarAulaComentario(mysqli $mysqli, int $anyId, string $emailAtual): ?array
{
    $raizId = raizDoId($mysqli, $anyId);
    if ($raizId === null) {
        return null;
    }

    $stmt = $mysqli->prepare(
        "SELECT aula_id FROM comentarios WHERE id = ? AND aula_id LIKE '" . AULA_ID_PREFIXO . "%'"
    );
    $stmt->bind_param('i', $raizId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$row) {
        return null; // raiz não existe ou não é uma thread de /aulas
    }

    $arvore = montarArvoreComentario($mysqli, $raizId, $emailAtual);
    if ($arvore === null) {
        return null;
    }

    $decodificado = decodificarAulaId($row['aula_id']);
    $arvore['dia'] = $decodificado['dia'] ?? 0;
    $arvore['aulaIndex'] = $decodificado['aulaIndex'] ?? 0;
    return $arvore;
}
