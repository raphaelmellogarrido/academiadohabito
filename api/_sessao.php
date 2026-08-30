<?php
// Sessão de aluno real, só pra produção (ver docs/ARCHITECTURE.md — Ponte
// PHP). Sem framework aqui, então a sessão vive num cookie assinado
// (`ah_aluno`) em vez de session_start()/arquivo no servidor: mais simples
// de sobreviver a deploy (não perde sessão a cada `git push`) e mais seguro
// que o padrão do site antigo (renato_de_paula/public/api/hotmart, que
// confiava cegamente no `email` que o próprio client mandava em cada
// chamada — qualquer um podia trocar o parâmetro e ver dado de outro
// aluno). Aqui o cookie é HMAC-assinado com SESSION_SECRET (definido em
// private/db_config.php, fora do Git) — sem o segredo não dá pra forjar.
//
// Uso: require __DIR__ . '/_sessao.php'; — pode vir antes ou depois de
// _config.php, tanto faz (require_once em _privado.php evita redeclarar
// SESSION_SECRET se os dois arquivos forem carregados na mesma request).

require_once __DIR__ . '/_privado.php';

if (!defined('SESSION_SECRET')) {
    // Sem o segredo, nenhuma sessão pode ser assinada/validada com
    // segurança — resposta clara em vez de um 500 genérico de mysqli.
    http_response_code(500);
    echo json_encode(['ok' => false, 'erro' => 'SESSION_SECRET não configurado em private/db_config.php.']);
    exit;
}

const AH_COOKIE_ALUNO = 'ah_aluno';

function assinarEmail(string $email): string
{
    $codificado = rtrim(strtr(base64_encode($email), '+/', '-_'), '=');
    $hmac = hash_hmac('sha256', $email, SESSION_SECRET);
    return $codificado . '.' . $hmac;
}

function iniciarSessao(string $email): void
{
    setcookie(AH_COOKIE_ALUNO, assinarEmail($email), [
        'expires' => time() + 30 * 24 * 60 * 60,
        'path' => '/',
        'secure' => true,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

function encerrarSessao(): void
{
    setcookie(AH_COOKIE_ALUNO, '', [
        'expires' => time() - 3600,
        'path' => '/',
        'secure' => true,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

// Devolve o email autenticado da requisição atual, ou null se não há
// cookie ou a assinatura não bate (cookie adulterado/segredo trocado).
function emailDaSessao(): ?string
{
    $cookie = $_COOKIE[AH_COOKIE_ALUNO] ?? '';
    if (!$cookie || !str_contains($cookie, '.')) {
        return null;
    }
    [$codificado, $hmacRecebido] = explode('.', $cookie, 2);
    $email = base64_decode(strtr($codificado, '-_', '+/'));
    if ($email === false || $email === '') {
        return null;
    }
    $hmacEsperado = hash_hmac('sha256', $email, SESSION_SECRET);
    // hash_equals evita timing attack na comparação.
    if (!hash_equals($hmacEsperado, $hmacRecebido)) {
        return null;
    }
    return $email;
}

// Endpoints que exigem login (ex: sequencia.php) chamam isso logo no topo —
// já responde 401 e sai se não houver sessão válida.
function exigirSessao(): string
{
    $email = emailDaSessao();
    if (!$email) {
        http_response_code(401);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => false, 'erro' => 'não autenticado']);
        exit;
    }
    return $email;
}
