// ChatPanel — persistent LLM consultation panel docked to the right rail.
// Toggleable show/hide. Uses a server-side PHP proxy that talks to Groq
// (OpenAI-compatible) so the API key stays server-side and visitors don't
// need any local installation.
//
// Default endpoint:  /atlas/chat.php  (relative to the host)
// Default model:     llama-3.1-8b-instant  (free, very fast on Groq)
//
// Advanced users can switch the URL/model from the gear icon — including
// pointing it back at a local Ollama server for offline development.

const { useState, useRef, useEffect } = React;

// Default endpoint — works whether the site is served from upo.digital/atlas
// or from the project root.
const DEFAULT_API_URL = (() => {
  if (typeof window === 'undefined') return '/chat.php';
  const path = window.location.pathname || '/';
  // strip trailing /index.html or filename
  const base = path.replace(/[^\/]+$/, '');
  return base + 'chat.php';
})();
const DEFAULT_MODEL = 'llama-3.1-8b-instant';

const SUGGESTED_MODELS = [
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'llama3-groq-70b-8192-tool-use-preview',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
];

window.ChatPanel = function ChatPanel({ context, tone = 'serif-dark', open, onToggle }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [apiUrl, setApiUrl] = useState(
    () => localStorage.getItem('atlas_api_url') || DEFAULT_API_URL
  );
  const [model, setModel] = useState(
    () => localStorage.getItem('atlas_api_model') || DEFAULT_MODEL
  );
  const scrollerRef = useRef(null);

  useEffect(() => { localStorage.setItem('atlas_api_url', apiUrl); }, [apiUrl]);
  useEffect(() => { localStorage.setItem('atlas_api_model', model); }, [model]);

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages, busy, open]);

  const systemPrompt = buildSystemPrompt(context);
  const suggestions = buildSuggestions(context);

  const send = async (text) => {
    const content = (text || input).trim();
    if (!content || busy) return;
    setInput('');
    setError(null);
    const userMsg = { role: 'user', content };
    const next = [...messages, userMsg];
    setMessages(next);
    setBusy(true);
    try {
      const reply = await callChat({
        url: apiUrl,
        model,
        messages: [{ role: 'system', content: systemPrompt }, ...next],
      });
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setMessages([]);
    setError(null);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className={`chat-rail tone-${tone} ${open ? 'open' : 'closed'}`}>
      <button
        className="chat-rail-toggle"
        onClick={onToggle}
        title={open ? 'Hide consultation' : 'Show consultation'}>
        <span className="chat-rail-toggle-mark">{open ? '›' : '‹'}</span>
        <span className="chat-rail-toggle-label">{open ? 'Hide' : 'Ask'}</span>
      </button>

      {open && (
        <div className="chat-rail-window">
          <div className="chat-header">
            <div className="chat-header-title">
              <span className="chat-mark">✦</span>
              <span className="chat-title-text">Method consultation</span>
            </div>
            <div className="chat-header-actions">
              <button className="chat-icon-btn" onClick={() => setShowSettings(s => !s)} title="Endpoint & model">⚙</button>
              <button className="chat-icon-btn" onClick={reset} title="Clear conversation">↺</button>
            </div>
          </div>

          {showSettings && (
            <div className="chat-settings">
              <label>
                <span>Endpoint URL</span>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={e => setApiUrl(e.target.value)}
                  placeholder="/atlas/chat.php or http://localhost:11434/api/chat"
                />
              </label>
              <label>
                <span>Model</span>
                <input
                  type="text"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  list="atlas-model-suggestions"
                />
                <datalist id="atlas-model-suggestions">
                  {SUGGESTED_MODELS.map(m => <option key={m} value={m} />)}
                </datalist>
              </label>
              <p className="chat-settings-hint">
                By default the chat goes through a server-side proxy
                (<code>chat.php</code>) backed by Groq. To use a local Ollama
                instead, set the URL to <code>http://localhost:11434/api/chat</code>{' '}
                and a local model like <code>llama3.1:8b</code>.
              </p>
            </div>
          )}

          <div className="chat-context">
            <div className="chat-context-eyebrow">Context</div>
            <div className="chat-context-text">{describeContext(context)}</div>
          </div>

          <div className="chat-scroller" ref={scrollerRef}>
            {messages.length === 0 && (
              <div className="chat-empty">
                <p>Ask anything about this question, the recommended technique, hypotheses, assumptions, sample size, or how to report results. Answers draw on the bibliography you supplied.</p>
                {suggestions.length > 0 && (
                  <div className="chat-suggestions">
                    {suggestions.map((s, i) => (
                      <button key={i} className="chat-suggestion" onClick={() => send(s)}>{s}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg chat-msg-${m.role}`}>
                <div className="chat-msg-role">{m.role === 'user' ? 'You' : 'Assistant'}</div>
                <div className="chat-msg-body">{m.content}</div>
              </div>
            ))}
            {busy && (
              <div className="chat-msg chat-msg-assistant">
                <div className="chat-msg-role">Assistant</div>
                <div className="chat-msg-body chat-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
            {error && (
              <div className="chat-error">
                <strong>Could not reach the model.</strong>
                <div className="chat-error-detail">{error}</div>
                <ol className="chat-error-steps">
                  <li>If you see this on first use, the server may not have a Groq API key configured yet — contact the site admin.</li>
                  <li>If you switched to local Ollama: ensure <code>ollama serve</code> is running and the URL points to <code>/api/chat</code>.</li>
                  <li>Hit <code>↺</code> to clear the conversation and retry.</li>
                </ol>
              </div>
            )}
          </div>

          <div className="chat-input-row">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about this question or the recommended technique…"
              rows={2}
            />
            <button className="chat-send" disabled={busy || !input.trim()} onClick={() => send()}>
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// API call. Auto-detects whether the endpoint is OpenAI-compatible (Groq /
// chat.php proxy → response shape `choices[0].message.content`) or Ollama
// (`/api/chat` → response shape `message.content`). The URL is the cue.
async function callChat({ url, model, messages }) {
  const isOllama = /\/api\/chat\b/.test(url);
  const body = isOllama
    ? { model, messages, stream: false, options: { temperature: 0.4 } }
    : { model, messages, temperature: 0.4 };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} — ${txt.slice(0, 250)}`);
  }
  const data = await res.json();
  if (isOllama) {
    return (data && data.message && data.message.content) || '(empty response)';
  }
  // OpenAI-compatible (Groq, OpenAI, etc.)
  if (data && data.choices && data.choices[0] && data.choices[0].message) {
    return data.choices[0].message.content || '(empty response)';
  }
  if (data && data.error) {
    throw new Error(data.error.message || JSON.stringify(data.error));
  }
  return '(empty response)';
}

function buildSystemPrompt(ctx) {
  const parts = [
    'You are a research-methods assistant for the Method Atlas Entrepreneur, a guided web tool that helps researchers select predictive analytic techniques in entrepreneurship research.',
    'Reply concisely and pedagogically. When relevant, cite the authors listed in the ATLAS KNOWLEDGE BASE below. Mention assumptions, sample-size rules of thumb and reporting standards. Do not invent references; rely on the digest provided.',
    'If the user asks something outside the atlas (e.g. SEM-CB, Bayesian inference, survival analysis), answer briefly and steer them back to the closest atlas sector.',
    '',
    '=== ATLAS KNOWLEDGE BASE ===',
    (window.ATLAS_KNOWLEDGE || '').trim(),
    '=== END KNOWLEDGE BASE ===',
    '',
  ];
  if (ctx && ctx.kind === 'question' && ctx.question) {
    parts.push(
      `LIVE CONTEXT — the researcher is currently on question ${ctx.question.id}: "${ctx.question.text}".`,
      `Available options: ${ctx.question.options.map(o => `[${o.label}]`).join(' | ')}.`,
      'Help them think through the choice. Do not pick one for them unless they ask explicitly.'
    );
    if (ctx.history && ctx.history.length) {
      parts.push('Prior answers in this session:');
      ctx.history.forEach(h => parts.push(`  - ${h.questionText} → ${h.answerLabel}`));
    }
  } else if (ctx && ctx.kind === 'result' && ctx.winner) {
    parts.push(
      `LIVE CONTEXT — the atlas has just recommended: ${ctx.winner.label} (${ctx.winner.sub}).`,
      `Goal of this technique: ${ctx.winner.goal}.`,
      `Hypothesis templates: ${(ctx.winner.hypotheses || []).join(' | ')}.`,
      `Conditions: ${(ctx.winner.conditions || []).join(' | ')}.`,
      `Assumptions to defend: ${(ctx.winner.assumes || []).join(' | ')}.`,
      `Recommended authors: ${(ctx.winner.authors || []).map(a => `${a.name} (${a.work})`).join('; ')}.`,
      'Help the researcher operationalise this technique, refine hypotheses, justify assumptions and prepare the methods section.'
    );
  } else {
    parts.push('LIVE CONTEXT — the researcher has not started the questionnaire yet. Encourage them to begin and stay available for ad-hoc questions.');
  }
  return parts.join('\n');
}

function describeContext(ctx) {
  if (ctx && ctx.kind === 'question' && ctx.question) {
    return `Question ${ctx.question.id} — “${ctx.question.text}”`;
  }
  if (ctx && ctx.kind === 'result' && ctx.winner) {
    return `Recommendation: ${ctx.winner.label} (${ctx.winner.sub})`;
  }
  return 'Idle. Ask anything about predictive techniques in entrepreneurship.';
}

function buildSuggestions(ctx) {
  if (ctx && ctx.kind === 'question' && ctx.question) {
    return [
      `Help me decide between the options of ${ctx.question.id}.`,
      'Which option fits a study with multi-item Likert scales?',
      'What clue in my data should make me pick one option over another?',
    ];
  }
  if (ctx && ctx.kind === 'result' && ctx.winner) {
    return ctx.winner.chatHints || [
      `How do I write the methods section for ${ctx.winner.label}?`,
      `Minimum sample size to defend ${ctx.winner.label}?`,
      `Compare ${ctx.winner.label} with the next-best alternative.`,
    ];
  }
  return [
    'Which technique fits a GEM panel of 50,000 individuals?',
    'When should I prefer fsQCA over logistic regression?',
    'How do I report PLS-SEM following Hair et al. (2022)?',
  ];
}
