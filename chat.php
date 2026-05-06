<?php
/**
 * chat.php — server-side proxy that forwards browser chat requests to the
 * Groq Cloud API (OpenAI-compatible). Keeps the API key server-side.
 *
 * Endpoints proxied:  POST /atlas/chat.php  →  https://api.groq.com/openai/v1/chat/completions
 *
 * Configuration: place a sibling file `chat_config.php` that defines
 *   <?php
 *   return [
 *     'GROQ_API_KEY' => 'gsk_...your_key...',
 *     'DEFAULT_MODEL' => 'llama-3.1-8b-instant',
 *     'ALLOWED_ORIGINS' => ['https://upo.digital'],
 *   ];
 *
 * The config file is .gitignored and not committed.
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

// --- CORS handling ----------------------------------------------------------
$config = @include __DIR__ . '/chat_config.php';
if (!is_array($config)) {
    http_response_code(500);
    echo json_encode(['error' => 'Server not configured. Missing chat_config.php on the server.']);
    exit;
}

$allowedOrigins = $config['ALLOWED_ORIGINS'] ?? ['https://upo.digital'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Vary: Origin');
}
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'POST only']);
    exit;
}

// --- Read body --------------------------------------------------------------
$raw = file_get_contents('php://input');
$body = json_decode($raw, true);
if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON body']);
    exit;
}

$messages = $body['messages'] ?? null;
if (!is_array($messages) || count($messages) === 0) {
    http_response_code(400);
    echo json_encode(['error' => 'messages[] is required']);
    exit;
}

$model = $body['model'] ?? ($config['DEFAULT_MODEL'] ?? 'llama-3.1-8b-instant');
$temperature = isset($body['temperature']) ? (float)$body['temperature'] : 0.4;
$maxTokens = isset($body['max_tokens']) ? (int)$body['max_tokens'] : 1024;

// --- Light per-IP rate limit (10 req / 60 s), persisted in a tmp dir --------
$ip = $_SERVER['REMOTE_ADDR'] ?? 'anon';
$bucket = sys_get_temp_dir() . '/atlas_rate_' . md5($ip);
$now = time();
$recent = [];
if (is_file($bucket)) {
    $arr = @json_decode((string)@file_get_contents($bucket), true);
    if (is_array($arr)) $recent = $arr;
}
$recent = array_filter($recent, fn($t) => $t > $now - 60);
if (count($recent) >= 10) {
    http_response_code(429);
    echo json_encode(['error' => 'Too many requests in the last minute. Please wait.']);
    exit;
}
$recent[] = $now;
@file_put_contents($bucket, json_encode(array_values($recent)));

// --- Forward to Groq --------------------------------------------------------
$apiKey = $config['GROQ_API_KEY'] ?? '';
if ($apiKey === '') {
    http_response_code(500);
    echo json_encode(['error' => 'GROQ_API_KEY not set in chat_config.php']);
    exit;
}

$payload = [
    'model' => $model,
    'messages' => $messages,
    'temperature' => $temperature,
    'max_tokens' => $maxTokens,
    'stream' => false,
];

$ch = curl_init('https://api.groq.com/openai/v1/chat/completions');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey,
    ],
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_TIMEOUT => 60,
]);
$resp = curl_exec($ch);
$httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err = curl_error($ch);
curl_close($ch);

if ($resp === false) {
    http_response_code(502);
    echo json_encode(['error' => 'Upstream connection failed', 'detail' => $err]);
    exit;
}

http_response_code($httpCode);
echo $resp;
