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
if ($action === 'track')         { trackEvent($config); }
if ($action === 'send_email')    { sendRecommendationEmail($config); }

// --- Admin-only actions -----------------------------------------------------
if (!isAdmin()) fail(401, 'Admin only — log in first');

if ($action === 'save_sector')      { saveSector($config); }
if ($action === 'save_question')    { saveQuestion($config); }
if ($action === 'save_options')     { saveOptions($config); }
if ($action === 'delete_question')  { deleteQuestion($config); }
if ($action === 'reseed')           { initSchema($config, true); ok(['reseeded' => true]); }
if ($action === 'stats_summary')    { ok(statsSummary($config)); }
if ($action === 'stats_sessions')   { ok(statsSessions($config)); }
if ($action === 'stats_session')    { ok(statsSession($config)); }
if ($action === 'stats_emails')     { ok(statsEmails($config)); }

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

// ===========================================================================
// Tracking
// ===========================================================================

function ensureTrackingTables(PDO $pdo) {
    static $done = false; if ($done) return; $done = true;
    $stmts = [
        "CREATE TABLE IF NOT EXISTS tracking_sessions (
            id            VARCHAR(64)  NOT NULL PRIMARY KEY,
            started_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            last_event_at TIMESTAMP    NULL,
            user_agent    TEXT,
            ip_hash       VARCHAR(64),
            events_count  INT          NOT NULL DEFAULT 0,
            final_winner  VARCHAR(48)  NULL,
            email         VARCHAR(255) NULL
        ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS tracking_events (
            id          BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
            session_id  VARCHAR(64)  NOT NULL,
            ts          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            ts_ms       BIGINT       NULL,
            event_type  VARCHAR(48)  NOT NULL,
            payload     JSON,
            KEY ix_session_ts (session_id, ts),
            KEY ix_event_type (event_type)
        ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS email_log (
            id           BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
            session_id   VARCHAR(64)  NULL,
            email        VARCHAR(255) NOT NULL,
            winner_id    VARCHAR(48)  NULL,
            winner_label VARCHAR(255) NULL,
            subject      VARCHAR(255) NULL,
            html_body    LONGTEXT     NULL,
            text_body    LONGTEXT     NULL,
            payload      JSON         NULL,
            sent_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            status       VARCHAR(32)  NOT NULL DEFAULT 'sent',
            error        TEXT         NULL,
            KEY ix_email (email),
            KEY ix_session (session_id)
        ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    ];
    foreach ($stmts as $s) { try { $pdo->exec($s); } catch (Throwable $e) { /* ignore */ } }
}

function trackEvent($cfg) {
    $pdo = db($cfg);
    ensureTrackingTables($pdo);
    $body = readJson();
    $sid  = (string)($body['session_id'] ?? '');
    $type = (string)($body['event_type'] ?? '');
    if ($sid === '' || $type === '' || strlen($sid) > 64 || strlen($type) > 48) {
        fail(400, 'session_id and event_type required');
    }
    $payload = $body['payload'] ?? null;
    $tsMs = isset($body['ts_ms']) ? (int)$body['ts_ms'] : (int)round(microtime(true) * 1000);

    $ipHash = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|atlas');
    $ua = (string)($_SERVER['HTTP_USER_AGENT'] ?? '');
    if (strlen($ua) > 400) $ua = substr($ua, 0, 400);

    // Upsert session row. user_agent and ip_hash are set on first insert and
    // not overwritten on subsequent events — we only bump the activity stats.
    $pdo->prepare('INSERT INTO tracking_sessions (id, user_agent, ip_hash, last_event_at, events_count)
                   VALUES (?, ?, ?, NOW(), 1)
                   ON DUPLICATE KEY UPDATE last_event_at = NOW(),
                                           events_count = events_count + 1')
        ->execute([$sid, $ua, $ipHash]);

    // Side effects: certain event types update the session row.
    if ($type === 'recommendation_shown' && is_array($payload) && !empty($payload['winner_id'])) {
        $pdo->prepare('UPDATE tracking_sessions SET final_winner = ? WHERE id = ?')
            ->execute([(string)$payload['winner_id'], $sid]);
    }
    if ($type === 'email_send' && is_array($payload) && !empty($payload['email'])) {
        $pdo->prepare('UPDATE tracking_sessions SET email = ? WHERE id = ?')
            ->execute([(string)$payload['email'], $sid]);
    }

    $pdo->prepare('INSERT INTO tracking_events (session_id, ts_ms, event_type, payload) VALUES (?, ?, ?, ?)')
        ->execute([
            $sid, $tsMs, $type,
            $payload === null ? null : json_encode($payload, JSON_UNESCAPED_UNICODE),
        ]);

    ok(['tracked' => true]);
}

// ===========================================================================
// Email
// ===========================================================================

function sendRecommendationEmail($cfg) {
    $pdo = db($cfg);
    ensureTrackingTables($pdo);
    $body = readJson();

    $email = trim((string)($body['email'] ?? ''));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail(400, 'Invalid email address');
    if (strlen($email) > 200) fail(400, 'Email too long');

    $sid       = (string)($body['session_id'] ?? '');
    $winnerId  = (string)($body['winner_id'] ?? '');
    $winnerLab = (string)($body['winner_label'] ?? '');
    $subject   = trim((string)($body['subject'] ?? '')) ?: ('Method Atlas — Your recommendation: ' . ($winnerLab ?: 'analytic technique'));
    $html      = (string)($body['html_body'] ?? '');
    $text      = (string)($body['text_body'] ?? '');
    $payload   = $body['payload'] ?? null;

    if ($html === '' && $text === '') fail(400, 'html_body or text_body required');

    // Cap body sizes to avoid runaway storage.
    if (strlen($html) > 200000) $html = substr($html, 0, 200000);
    if (strlen($text) > 80000)  $text = substr($text,  0, 80000);
    if (strlen($subject) > 250) $subject = substr($subject, 0, 250);

    $from = $cfg['MAIL_FROM']      ?? 'info@upo.digital';
    $fromName = $cfg['MAIL_FROM_NAME'] ?? 'Method Atlas Entrepreneur Research';
    $replyTo  = $cfg['MAIL_REPLY_TO']   ?? $from;

    // Build a multipart/alternative message so clients with HTML disabled
    // still get a readable plain-text version.
    $boundary = 'atlas-' . bin2hex(random_bytes(8));
    $headers  = [];
    $headers[] = 'From: ' . sprintf('%s <%s>', mb_encode_mimeheader($fromName, 'UTF-8'), $from);
    $headers[] = 'Reply-To: ' . $replyTo;
    $headers[] = 'MIME-Version: 1.0';
    $headers[] = 'Content-Type: multipart/alternative; boundary="' . $boundary . '"';
    $headers[] = 'X-Mailer: MethodAtlas/1.0';

    $textPart = $text !== '' ? $text : strip_tags($html);
    $htmlPart = $html !== '' ? $html : nl2br(htmlspecialchars($text, ENT_QUOTES | ENT_HTML5, 'UTF-8'));

    $msg  = "--$boundary\r\n";
    $msg .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $msg .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
    $msg .= $textPart . "\r\n\r\n";
    $msg .= "--$boundary\r\n";
    $msg .= "Content-Type: text/html; charset=UTF-8\r\n";
    $msg .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
    $msg .= $htmlPart . "\r\n\r\n";
    $msg .= "--$boundary--\r\n";

    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

    $sent = false; $error = null;
    try {
        $sent = @mail($email, $encodedSubject, $msg, implode("\r\n", $headers), '-f' . $from);
        if (!$sent) {
            $err = error_get_last();
            $error = $err ? ($err['message'] ?? 'mail() returned false') : 'mail() returned false';
        }
    } catch (Throwable $e) { $error = $e->getMessage(); }

    $status = $sent ? 'sent' : 'failed';

    $pdo->prepare('INSERT INTO email_log
        (session_id, email, winner_id, winner_label, subject, html_body, text_body, payload, status, error)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        ->execute([
            $sid !== '' ? $sid : null,
            $email,
            $winnerId !== '' ? $winnerId : null,
            $winnerLab !== '' ? $winnerLab : null,
            $subject,
            $htmlPart,
            $textPart,
            $payload === null ? null : json_encode($payload, JSON_UNESCAPED_UNICODE),
            $status,
            $error,
        ]);

    if ($sid !== '') {
        try {
            $pdo->prepare('UPDATE tracking_sessions SET email = ? WHERE id = ?')
                ->execute([$email, $sid]);
            $pdo->prepare('INSERT INTO tracking_events (session_id, ts_ms, event_type, payload) VALUES (?, ?, ?, ?)')
                ->execute([
                    $sid, (int)round(microtime(true)*1000), 'email_send',
                    json_encode(['email' => $email, 'winner_id' => $winnerId, 'status' => $status], JSON_UNESCAPED_UNICODE),
                ]);
        } catch (Throwable $e) { /* non-fatal */ }
    }

    if (!$sent) fail(502, 'mail() failed: ' . ($error ?: 'unknown'));
    ok(['sent' => true, 'status' => $status]);
}

// ===========================================================================
// Stats (admin-only)
// ===========================================================================

function statsSummary($cfg): array {
    $pdo = db($cfg); ensureTrackingTables($pdo);
    $sessions = (int)$pdo->query('SELECT COUNT(*) FROM tracking_sessions')->fetchColumn();
    $finished = (int)$pdo->query('SELECT COUNT(*) FROM tracking_sessions WHERE final_winner IS NOT NULL')->fetchColumn();
    $events   = (int)$pdo->query('SELECT COUNT(*) FROM tracking_events')->fetchColumn();
    $emails   = (int)$pdo->query('SELECT COUNT(*) FROM email_log')->fetchColumn();
    $emailsOk = (int)$pdo->query("SELECT COUNT(*) FROM email_log WHERE status='sent'")->fetchColumn();
    $byType   = $pdo->query("SELECT event_type, COUNT(*) AS n FROM tracking_events GROUP BY event_type ORDER BY n DESC")->fetchAll();
    $byWinner = $pdo->query("SELECT final_winner, COUNT(*) AS n FROM tracking_sessions WHERE final_winner IS NOT NULL GROUP BY final_winner ORDER BY n DESC")->fetchAll();
    $recent   = $pdo->query("SELECT id, started_at, last_event_at, events_count, final_winner, email FROM tracking_sessions ORDER BY started_at DESC LIMIT 20")->fetchAll();
    return [
        'sessions_total'     => $sessions,
        'sessions_finished'  => $finished,
        'events_total'       => $events,
        'emails_total'       => $emails,
        'emails_sent_ok'     => $emailsOk,
        'events_by_type'     => $byType,
        'sessions_by_winner' => $byWinner,
        'recent_sessions'    => $recent,
    ];
}

function statsSessions($cfg): array {
    $pdo = db($cfg); ensureTrackingTables($pdo);
    $limit  = max(1, min(500, (int)($_GET['limit']  ?? 100)));
    $offset = max(0, (int)($_GET['offset'] ?? 0));
    $rows = $pdo->prepare('SELECT id, started_at, last_event_at, events_count, final_winner, email
                           FROM tracking_sessions ORDER BY started_at DESC LIMIT ? OFFSET ?');
    $rows->bindValue(1, $limit, PDO::PARAM_INT);
    $rows->bindValue(2, $offset, PDO::PARAM_INT);
    $rows->execute();
    return ['rows' => $rows->fetchAll(), 'limit' => $limit, 'offset' => $offset];
}

function statsSession($cfg): array {
    $pdo = db($cfg); ensureTrackingTables($pdo);
    $sid = (string)($_GET['id'] ?? '');
    if ($sid === '') fail(400, 'id required');
    $session = $pdo->prepare('SELECT * FROM tracking_sessions WHERE id = ?');
    $session->execute([$sid]);
    $s = $session->fetch();
    if (!$s) fail(404, 'session not found');
    $events = $pdo->prepare('SELECT id, ts, ts_ms, event_type, payload FROM tracking_events WHERE session_id = ? ORDER BY id ASC');
    $events->execute([$sid]);
    $rows = $events->fetchAll();
    foreach ($rows as &$r) decodeJsonFields($r, ['payload']);
    $emails = $pdo->prepare('SELECT id, email, winner_id, winner_label, subject, sent_at, status, error FROM email_log WHERE session_id = ? ORDER BY id ASC');
    $emails->execute([$sid]);
    return ['session' => $s, 'events' => $rows, 'emails' => $emails->fetchAll()];
}

function statsEmails($cfg): array {
    $pdo = db($cfg); ensureTrackingTables($pdo);
    $limit  = max(1, min(500, (int)($_GET['limit']  ?? 100)));
    $offset = max(0, (int)($_GET['offset'] ?? 0));
    $rows = $pdo->prepare('SELECT id, session_id, email, winner_id, winner_label, subject, sent_at, status, error
                           FROM email_log ORDER BY sent_at DESC LIMIT ? OFFSET ?');
    $rows->bindValue(1, $limit, PDO::PARAM_INT);
    $rows->bindValue(2, $offset, PDO::PARAM_INT);
    $rows->execute();
    return ['rows' => $rows->fetchAll(), 'limit' => $limit, 'offset' => $offset];
}
