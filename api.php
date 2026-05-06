<?php
/**
 * api.php — backend for the Method Atlas Entrepreneur.
 * - Public reads:    ?action=get_all
 * - Admin writes:    ?action=login | logout | save_sector | save_question
 *                    | save_options | delete_question | seed
 * - One-shot init:   ?action=init  (creates tables & seeds if empty)
 *
 * Auth model: cookie session. Admin password lives in chat_config.php as
 * ADMIN_PASSWORD. DB credentials live in the same file (DB_HOST, DB_NAME,
 * DB_USER, DB_PASS).
 */
declare(strict_types=1);

session_set_cookie_params(['samesite' => 'Lax']);
session_start();
header('Content-Type: application/json; charset=utf-8');

$config = @include __DIR__ . '/chat_config.php';
if (!is_array($config)) { fail(500, 'Server not configured'); }

// CORS (same-origin in production but be explicit)
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = $config['ALLOWED_ORIGINS'] ?? ['https://upo.digital'];
if (in_array($origin, $allowed, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Vary: Origin');
}
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }

$action = $_GET['action'] ?? $_POST['action'] ?? '';

// --- Public actions ---------------------------------------------------------
if ($action === 'init')          { initSchema($config); ok(['initialised' => true]); }
if ($action === 'get_all')       { ok(getAll($config)); }
if ($action === 'login')         { doLogin($config); }
if ($action === 'logout')        { $_SESSION = []; session_destroy(); ok(['logged_out' => true]); }
if ($action === 'whoami')        { ok(['admin' => isAdmin()]); }

// --- Admin-only actions -----------------------------------------------------
if (!isAdmin()) fail(401, 'Admin only — log in first');

if ($action === 'save_sector')      { saveSector($config); }
if ($action === 'save_question')    { saveQuestion($config); }
if ($action === 'save_options')     { saveOptions($config); }
if ($action === 'delete_question')  { deleteQuestion($config); }
if ($action === 'reseed')           { initSchema($config, true); ok(['reseeded' => true]); }

fail(400, 'Unknown action');

// ===========================================================================
// Helpers
// ===========================================================================

function ok($payload) { echo json_encode($payload); exit; }
function fail(int $code, string $msg) { http_response_code($code); echo json_encode(['error'=>$msg]); exit; }

function db($cfg): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $host = $cfg['DB_HOST'] ?? 'localhost';
    $name = $cfg['DB_NAME'] ?? 'u262522767_atlas';
    $user = $cfg['DB_USER'] ?? 'u262522767_atlas';
    $pass = $cfg['DB_PASS'] ?? '';
    $dsn = "mysql:host=$host;dbname=$name;charset=utf8mb4";
    try {
        $pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    } catch (Throwable $e) { fail(500, 'DB connect failed: ' . $e->getMessage()); }
    return $pdo;
}

function isAdmin(): bool { return !empty($_SESSION['atlas_admin']); }

function doLogin($cfg) {
    $pwd = (string)($_POST['password'] ?? json_decode(file_get_contents('php://input'), true)['password'] ?? '');
    $ok = $pwd !== '' && hash_equals((string)($cfg['ADMIN_PASSWORD'] ?? ''), $pwd);
    if (!$ok) fail(403, 'Bad password');
    $_SESSION['atlas_admin'] = true;
    ok(['admin' => true]);
}

// --- Schema ----------------------------------------------------------------
function initSchema($cfg, bool $force=false) {
    $pdo = db($cfg);
    $sql = file_get_contents(__DIR__ . '/schema.sql');
    foreach (array_filter(array_map('trim', explode(';', $sql))) as $stmt) {
        if ($stmt !== '') $pdo->exec($stmt);
    }
    // Seed if empty (or always seed when $force).
    $count = (int)$pdo->query('SELECT COUNT(*) FROM sectors')->fetchColumn();
    if ($force) {
        $pdo->exec('DELETE FROM options'); $pdo->exec('DELETE FROM questions'); $pdo->exec('DELETE FROM sectors'); $pdo->exec('DELETE FROM rings');
    }
    if ($force || $count === 0) seedFromBundle($pdo);
}

function getAll($cfg): array {
    $pdo = db($cfg);
    $sectors = $pdo->query('SELECT * FROM sectors ORDER BY display_order, id')->fetchAll();
    $rings = $pdo->query('SELECT * FROM rings ORDER BY display_order, id')->fetchAll();
    $questions = $pdo->query('SELECT * FROM questions ORDER BY display_order, id')->fetchAll();
    $options = $pdo->query('SELECT * FROM options ORDER BY question_id, display_order, id')->fetchAll();
    foreach ($sectors as &$s) decodeJsonFields($s, ['techniques','hypotheses','conditions','assumes','procedure_steps','software','authors','key_refs','chat_hints']);
    foreach ($questions as &$q) decodeJsonFields($q, ['show_if']);
    foreach ($options as &$o) decodeJsonFields($o, ['weights']);
    return [
        'sectors' => $sectors,
        'rings' => $rings,
        'questions' => $questions,
        'options' => $options,
        'updated_at' => (new DateTime('now', new DateTimeZone('UTC')))->format(DATE_ATOM),
    ];
}

function decodeJsonFields(array &$row, array $keys) {
    foreach ($keys as $k) {
        if (isset($row[$k]) && is_string($row[$k])) {
            $d = json_decode($row[$k], true);
            $row[$k] = $d === null ? null : $d;
        }
    }
}

// --- Sector CRUD ------------------------------------------------------------
function saveSector($cfg) {
    $pdo = db($cfg); $body = readJson();
    $cols = ['id','label','sub','angle','hue','goal','description','techniques','hypotheses','conditions','assumes','procedure_steps','software','authors','key_refs','chat_hints','display_order'];
    $vals = []; foreach ($cols as $c) $vals[$c] = isset($body[$c]) ? (in_array($c,['techniques','hypotheses','conditions','assumes','procedure_steps','software','authors','key_refs','chat_hints'],true) ? json_encode($body[$c],JSON_UNESCAPED_UNICODE) : $body[$c]) : null;
    $sql = 'REPLACE INTO sectors (id,label,sub,angle,hue,goal,description,techniques,hypotheses,conditions,assumes,procedure_steps,software,authors,key_refs,chat_hints,display_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
    $pdo->prepare($sql)->execute(array_values($vals));
    ok(['saved' => $vals['id']]);
}

// --- Question CRUD ----------------------------------------------------------
function saveQuestion($cfg) {
    $pdo = db($cfg); $body = readJson();
    $cols = ['id','ring_index','question_text','hint','always_show','multi_select','show_if','display_order'];
    $vals = []; foreach ($cols as $c) $vals[$c] = isset($body[$c]) ? ($c==='show_if' ? json_encode($body[$c],JSON_UNESCAPED_UNICODE) : $body[$c]) : null;
    $sql = 'REPLACE INTO questions (id,ring_index,question_text,hint,always_show,multi_select,show_if,display_order) VALUES (?,?,?,?,?,?,?,?)';
    $pdo->prepare($sql)->execute(array_values($vals));
    ok(['saved' => $vals['id']]);
}

function saveOptions($cfg) {
    $pdo = db($cfg); $body = readJson();
    $qid = (string)($body['question_id'] ?? '');
    $opts = $body['options'] ?? [];
    if ($qid === '' || !is_array($opts)) fail(400,'question_id and options[] required');
    $pdo->prepare('DELETE FROM options WHERE question_id = ?')->execute([$qid]);
    $stmt = $pdo->prepare('INSERT INTO options (question_id,label,weights,display_order) VALUES (?,?,?,?)');
    foreach ($opts as $i => $o) {
        $stmt->execute([
            $qid,
            (string)($o['label'] ?? ''),
            json_encode($o['weights'] ?? new stdClass(), JSON_UNESCAPED_UNICODE),
            (int)($o['display_order'] ?? $i),
        ]);
    }
    ok(['saved' => count($opts), 'question_id' => $qid]);
}

function deleteQuestion($cfg) {
    $pdo = db($cfg); $body = readJson();
    $qid = (string)($body['id'] ?? '');
    if ($qid === '') fail(400,'id required');
    $pdo->prepare('DELETE FROM options WHERE question_id = ?')->execute([$qid]);
    $pdo->prepare('DELETE FROM questions WHERE id = ?')->execute([$qid]);
    ok(['deleted' => $qid]);
}

function readJson() : array {
    $raw = file_get_contents('php://input');
    $j = json_decode($raw, true);
    if (!is_array($j)) fail(400, 'Invalid JSON body');
    return $j;
}

// --- Seeding from the bundled JSON snapshot --------------------------------
function seedFromBundle(PDO $pdo) {
    $file = __DIR__ . '/seed.json';
    if (!is_file($file)) return;
    $bundle = json_decode((string)file_get_contents($file), true);
    if (!is_array($bundle)) return;

    foreach (($bundle['rings'] ?? []) as $i => $r) {
        $pdo->prepare('REPLACE INTO rings (id,label,sub,r_norm,display_order) VALUES (?,?,?,?,?)')
            ->execute([$r['id'],$r['label'],$r['sub']??null,$r['rNorm']??$r['r_norm']??0,$i]);
    }
    foreach (($bundle['sectors'] ?? []) as $i => $s) {
        $pdo->prepare('REPLACE INTO sectors (id,label,sub,angle,hue,goal,description,techniques,hypotheses,conditions,assumes,procedure_steps,software,authors,key_refs,chat_hints,display_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
            ->execute([
                $s['id'],$s['label'],$s['sub'],$s['angle'],$s['hue'],
                $s['goal']??'', $s['description']??'',
                json_encode($s['techniques']??[],JSON_UNESCAPED_UNICODE),
                json_encode($s['hypotheses']??[],JSON_UNESCAPED_UNICODE),
                json_encode($s['conditions']??[],JSON_UNESCAPED_UNICODE),
                json_encode($s['assumes']??[],JSON_UNESCAPED_UNICODE),
                json_encode($s['procedure']??$s['procedure_steps']??[],JSON_UNESCAPED_UNICODE),
                json_encode($s['software']??[],JSON_UNESCAPED_UNICODE),
                json_encode($s['authors']??[],JSON_UNESCAPED_UNICODE),
                json_encode($s['keyRefs']??$s['key_refs']??[],JSON_UNESCAPED_UNICODE),
                json_encode($s['chatHints']??$s['chat_hints']??[],JSON_UNESCAPED_UNICODE),
                $i,
            ]);
    }
    foreach (($bundle['questions'] ?? []) as $i => $q) {
        $pdo->prepare('REPLACE INTO questions (id,ring_index,question_text,hint,always_show,multi_select,show_if,display_order) VALUES (?,?,?,?,?,?,?,?)')
            ->execute([
                $q['id'], (int)($q['ring']??0),
                $q['text']??$q['question_text']??'',
                $q['hint']??null,
                (int)!empty($q['always']),
                (int)!empty($q['multi_select']),
                isset($q['show_if']) ? json_encode($q['show_if'],JSON_UNESCAPED_UNICODE) : null,
                $i,
            ]);
        $pdo->prepare('DELETE FROM options WHERE question_id = ?')->execute([$q['id']]);
        foreach (($q['options']??[]) as $j => $o) {
            $pdo->prepare('INSERT INTO options (question_id,label,weights,display_order) VALUES (?,?,?,?)')
                ->execute([
                    $q['id'], $o['label']??'',
                    json_encode($o['weights']??new stdClass(),JSON_UNESCAPED_UNICODE), $j,
                ]);
        }
    }
}
