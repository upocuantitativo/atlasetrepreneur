// ChatPanel — persistent local-LLM consultation panel docked to the right side,
// below the mini-map. Toggleable (show/hide). Designed so that opening or
// closing the chat does NOT alter the styling or layout of the question dialog
// or the mandala — they live on the main column; the chat lives on a separate
// right rail.
//
// Talks to a local Ollama server at OLLAMA_URL (default http://localhost:11434).
// The system prompt is built every turn and includes:
//   - role instructions
//   - the curated bibliography digest (window.ATLAS_KNOWLEDGE)
//   - the live context: which question the user is on, or which technique
//     was recommended
//
// Default model: 'llama3.1:8b'. The user can override URL and
// model from the gear icon. State persists in localStorage.

const { useState, useRef, useEffect } = React;

const DEFAULT_OLLAMA_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'llama3.1:8b';

const SUGGESTED_MODELS = [
  'llama3.1:8b',
  'llama3.1:70b-instruct-q4_K_M',
  'mistral:7b-instruct',
  'qwen2.5:7b-instruct',
  'qwen2.5:14b-instruct',
  'gemma2:9b-instruct',
  'phi3:medium-128k-instruct',
];

window.ChatPanel = function ChatPanel({ context, tone = 'serif-dark', open, onToggle }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [ollamaUrl, setOllamaUrl] = useState(
    () => localStorage.getItem('atlas_ollama_url') || DEFAULT_OLLAMA_URL
  );
  const [model, setModel] = useState(
    () => localStorage.getItem('atlas_ollama_model') || DEFAULT_MODEL
  );
  const scrollerRef = useRef(null);

  useEffect(() => { localStorage.setItem('atlas_ollama_url', ollamaUrl); }, [ollamaUrl]);
  useEffect(() => { localStorage.setItem('atlas_ollama_model', model); }, [model]);

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
      const reply = await callOllama({
        url: ollamaUrl,
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
              <button className="chat-icon-btn" onClick={() => setShowSettings(s => !s)} title="Model & server settings">⚙</button>
              <button className="chat-icon-btn" onClick={reset} title="Clear conversation">↺</button>
            </div>
          </div>

          {showSettings && (
            <div className="chat-settings">
              <label>
                <span>Ollama URL</span>
                <input
                  type="text"
                  value={ollamaUrl}
                  onChange={e => setOllamaUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                />
              </label>
              <label>
                <span>Model</span>
                <input
                  type="text"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  list="ollama-model-suggestions"
                />
                <datalist id="ollama-model-suggestions">
                  {SUGGESTED_MODELS.map(m => <option key={m} value={m} />)}
                </datalist>
              </label>
              <p className="chat-settings-hint">
                Local-only. Run Ollama with <code>OLLAMA_ORIGINS=*</code> so the
                browser can reach it. Pull the model with{' '}
                <code>ollama pull {model}</code>.
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
                <strong>Could not reach the local model.</strong>
                <div className="chat-error-detail">{error}</div>
                <ol className="chat-error-steps">
                  <li>Install Ollama from <a href="https://ollama.com/download" target="_blank" rel="noreferrer">ollama.com</a>.</li>
                  <li>Pull a model: <code>ollama pull {model}</code></li>
                  <li>Start it with browser CORS allowed: <code>OLLAMA_ORIGINS=* ollama serve</code></li>
                  <li>Confirm <code>{ollamaUrl}/api/tags</code> responds in your browser.</li>
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

async function callOllama({ url, model, messages }) {
  const endpoint = url.replace(/\/$/, '') + '/api/chat';
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false, options: { temperature: 0.4 } }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} — ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  return (data && data.message && data.message.content) || '(empty response)';
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
