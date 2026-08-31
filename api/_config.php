<?php
// Ponte PHP pro banco de produção da Hostinger (u790959747_comunidade) —
// só existe porque academiadohabito.com.br hoje é hospedagem PHP/HTML
// "clássica" (sem Node App no hPanel), então o server/src (Express/TS) não
// roda em produção ainda. `npm run dev:all` local NUNCA toca este arquivo —
// continua 100% mock (server/src/modules/gamification), como documentado em
// docs/ARCHITECTURE.md. Migrar/aposentar esta pasta quando o app ganhar um
// Node App de verdade na Hostinger (ou outro host) — ver docs/ARCHITECTURE.md.
//
// Credenciais vêm de private/db_config.php, arquivo FORA do Git e fora de
// public_html (subido manualmente pelo Gerenciador de Arquivos da Hostinger,
// mesmo padrão do renato_de_paula — ver public/api/hotmart/_conexao.php e
// config.example.php lá). Nunca hardcoda senha aqui.
//
// Uso: require __DIR__ . '/_config.php'; e use $mysqli. Este arquivo não é
// acessível direto via URL (bloqueado no .htaccess desta pasta).

require_once __DIR__ . '/_privado.php'; // dá DB_HOST/DB_NAME/SESSION_SECRET

header('Content-Type: application/json; charset=utf-8');

if (!defined('DB_HOST') || !defined('DB_NAME')) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'erro' => 'private/db_config.php não encontrado no servidor.']);
    exit;
}

$mysqli = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if ($mysqli->connect_error) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'erro' => 'Erro banco: ' . $mysqli->connect_error]);
    exit;
}
$mysqli->set_charset('utf8mb4');
// Sessão MySQL fixa em Brasília, pra CURDATE()/NOW() baterem com o fuso do
// aluno mesmo o servidor rodando em UTC (mesmo motivo do _conexao.php irmão).
$mysqli->query("SET time_zone = '-03:00'");

// Orientadores/admin — lista fixa por enquanto, não existe papel de
// admin/orientador na tabela `alunos` ainda. Mora aqui (não em _feed.php)
// porque _config.php é sempre o primeiro require de todo endpoint (login,
// admin, encontro, frase...), e não só dos de feed. Mesmo par de e-mails do
// lado mock Node (ehOrientador em server/src/modules/auth/auth.service.ts)
// — manter os dois em sincronia.
const EMAILS_ORIENTADORES = ['raphaelmellogarrido@gmail.com', 'rsp.ren@gmail.com'];

function ehOrientadorEmail(string $email): bool
{
    return in_array(strtolower(trim($email)), EMAILS_ORIENTADORES, true);
}

// Endpoints de escrita restritos a admin (encontro-editar.php,
// frase-editar.php) chamam isso logo após exigirSessao() — 403 + exit se o
// e-mail da sessão não estiver em EMAILS_ORIENTADORES. Mesmo padrão de
// exigirSessao() em _sessao.php.
function exigirAdmin(string $email): void
{
    if (!ehOrientadorEmail($email)) {
        http_response_code(403);
        echo json_encode(['ok' => false, 'erro' => 'somente admin']);
        exit;
    }
}

// Monta o mesmo shape de `Usuario` (useAuth.ts) a partir de uma linha de
// `alunos` — usado por login.php e me.php, pra nunca desalinhar os dois.
// `alunos.email` é a PK (não existe id numérico nessa tabela — mesmo
// comentário em renato_de_paula/.../hotmart/_conexao.php linha ~311), por
// isso vira o `id` aqui. `admin` reaproveita EMAILS_ORIENTADORES (mesma
// lista já usada como "admin" em podeExcluir de feed/aula) — controla o
// link "Admin" na TopBar e a permissão real dos endpoints -editar.php.
// avatarUrl agora é real (ver garantirColunasPerfil abaixo): aponta pro
// endpoint que serve o blob (avatar.php), com `v` = avatar_versao só pra
// cache-busting (senão o browser mantém a foto antiga em cache na mesma URL).
function alunoParaUsuario(array $aluno): array
{
    $partes = explode(' ', trim($aluno['nome'] ?? ''));
    $primeiroNome = mb_substr($partes[0] ?? '', 0, 11);
    $temAvatar = !empty($aluno['avatar_blob']);
    return [
        'id' => $aluno['email'],
        'email' => $aluno['email'],
        'nome' => $aluno['nome'] ?? '',
        'primeiroNome' => $aluno['apelido'] ?: $primeiroNome,
        'avatarUrl' => $temAvatar
            ? '/api/avatar.php?e=' . urlencode($aluno['email']) . '&v=' . (int) ($aluno['avatar_versao'] ?? 0)
            : null,
        'admin' => ehOrientadorEmail($aluno['email']),
    ];
}

// Self-provisioning (mesmo padrão de garantirTabelasEncontro em _encontro.php,
// só que aqui é ALTER numa tabela que já existe em vez de CREATE TABLE IF NOT
// EXISTS numa nova) — adiciona as colunas de Configurações -> Perfil
// (avatar + limites de nome/apelido não têm coluna própria, só nome/apelido
// mesmo) na primeira request depois do deploy, sem precisar mexer no
// phpMyAdmin manualmente. Chamado por login.php/me.php (antes de ler
// alunoParaUsuario) e por perfil-atualizar.php/avatar.php.
function garantirColunasPerfil(mysqli $mysqli): void
{
    $existe = $mysqli->query(
        "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'alunos' AND COLUMN_NAME = 'avatar_blob'"
    )->fetch_assoc();
    if ($existe) {
        return;
    }
    $mysqli->query(
        "ALTER TABLE alunos
         ADD COLUMN avatar_blob MEDIUMBLOB NULL,
         ADD COLUMN avatar_mime VARCHAR(50) NULL,
         ADD COLUMN avatar_versao INT NOT NULL DEFAULT 0"
    );
}
