<?php
// Localiza e carrega private/db_config.php (credenciais de banco +
// SESSION_SECRET, fora do Git — ver _config.php). Extraído num arquivo à
// parte porque tanto _config.php (conexão mysqli) quanto _sessao.php
// (cookie assinado) precisam dele, mas nem sempre dos dois juntos —
// logout.php só precisa de SESSION_SECRET, sem abrir conexão com o banco.
// require_once (não require): pode ser chamado pelos dois sem redeclarar
// as constantes.
date_default_timezone_set('America/Sao_Paulo');

// Deploy real: este arquivo vira public_html/api/_privado.php, e private/ é
// irmão de public_html na raiz da conta Hostinger -> 2 níveis acima.
$configPrivado = __DIR__ . '/../../private/db_config.php';
if (!file_exists($configPrivado)) {
    // Fallback só pra teste manual fora da estrutura padrão da Hostinger.
    $configPrivado = __DIR__ . '/../private/db_config.php';
}

if (file_exists($configPrivado)) {
    require_once $configPrivado;
}
