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

// Monta o mesmo shape de `Usuario` (useAuth.ts) a partir de uma linha de
// `alunos` — usado por login.php e me.php, pra nunca desalinhar os dois.
// `alunos.email` é a PK (não existe id numérico nessa tabela — mesmo
// comentário em renato_de_paula/.../hotmart/_conexao.php linha ~311), por
// isso vira o `id` aqui. `admin` sempre false: não existe esse conceito em
// `alunos`, só controla o link "Admin" na TopBar (sem risco real).
function alunoParaUsuario(array $aluno): array
{
    $partes = explode(' ', trim($aluno['nome'] ?? ''));
    $primeiroNome = mb_substr($partes[0] ?? '', 0, 11);
    return [
        'id' => $aluno['email'],
        'email' => $aluno['email'],
        'nome' => $aluno['nome'] ?? '',
        'primeiroNome' => $aluno['apelido'] ?: $primeiroNome,
        'avatarUrl' => null, // avatar real fica pra quando esse card entrar
        'admin' => false,
    ];
}
