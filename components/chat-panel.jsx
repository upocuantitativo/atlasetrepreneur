// ChatPanel — persistent LLM consultation panel docked to the right rail.
// Toggleable show/hide. Uses a server-side PHP proxy that talks to Groq
// (OpenAI-compatible) so the API key stays server-side and visitors don't
// need any local installation.
//
// Default endpoint:  /atlas/chat.php  (relative to the host)
// Default model:     llama-3.1-8b-instant  (free, very fast on Groq)
//
// Features:
//   - context-aware system prompt (current question OR final recommendation)
//   - first-visit pulse on the toggle button
//   - auto-open when the result screen appears
//   - draggable "?" help icon: drag onto any element to ask the assistant
//     to explain that concept; the icon snaps back to its slot after drop

const { useState, useRef, useEffect } = React;

const DEFAULT_API_URL = (() => {
  if (typeof window === 'undefined') return '/chat.php';
  const path = window.location.pathname || '/';
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
  const [firstVisit, setFirstVisit] = useState(
    () => !localStorage.getItem('atlas_chat_seen')
  );
  const [dragging, setDragging] = useState(false);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const scrollerRef = useRef(null);

  useEffect(() => { localStorage.setItem('atlas_api_url', apiUrl); }, [apiUrl]);
  useEffect(() => { localStorage.setItem('atlas_api_model', model); }, [model]);

  useEffect(() => {
    if (open && firstVisit) {
      localStorage.setItem('atlas_chat_seen', '1');
      setFirstVisit(false);
    }
  }, [open, firstVisit]);

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
        url: apiUrl, model,
        messages: [{ role: 'system', content: systemPrompt }, ...next],
      });
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch (e) { setError(e.message || String(e)); }
    finally { setBusy(false); }
  };

  const reset = () => { setMessages([]); setError(null); };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // ---- Draggable help icon ------------------------------------------------
  const startDrag = (e) => {
    e.preventDefault();
    if (!open) onToggle();        // make sure the chat is visible to receive answer
    setDragging(true);
    setDragPos({ x: e.clientX, y: e.clientY });
    document.body.classList.add('atlas-help-dragging');
    try { e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId); } catch (_) {}
  };
  const onDragMove = (e) => {
    if (!dragging) return;
    setDragPos({ x: e.clientX, y: e.clientY });
    document.querySelectorAll('.atlas-help-target').forEach(el => el.classList.remove('atlas-help-target'));
    const el = pickHelpTarget(e.clientX, e.clientY);
    if (el) el.classList.add('atlas-help-target');
  };
  const endDrag = (e) => {
    if (!dragging) return;
    setDragging(false);
    document.body.classList.remove('atlas-help-dragging');
    document.querySelectorAll('.atlas-help-target').forEach(el => el.classList.remove('atlas-help-target'));
    const el = pickHelpTarget(e.clientX, e.clientY);
    const ctx = extractContextFrom(el);
    if (!ctx || ctx.text.length < 5) return;
    send(`Explain this concept in the context of the Method Atlas, briefly: "${ctx.text}"`);
  };

  return (
    <div className={`chat-rail tone-${tone} ${open ? 'open' : 'closed'}`}
         onPointerMove={dragging ? onDragMove : undefined}
         onPointerUp={dragging ? endDrag : undefined}>
      <button
        className={`chat-rail-toggle ${firstVisit && !open ? 'first-visit' : ''}`}
        onClick={() => { onToggle(); setFirstVisit(false); localStorage.setItem('atlas_chat_seen', '1'); }}
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
              <button className="chat-icon-btn chat-close-btn" onClick={onToggle} title="Close consultation">×</button>
            </div>
          </div>

          {showSettings && (
            <div className="chat-settings">
              <label><span>Endpoint URL</span>
                <input type="text" value={apiUrl} onChange={e=>setApiUrl(e.target.value)} placeholder="/atlas/chat.php" />
              </label>
              <label><span>Model</span>
                <input type="text" value={model} onChange={e=>setModel(e.target.value)} list="atlas-model-suggestions" />
                <datalist id="atlas-model-suggestions">
                  {SUGGESTED_MODELS.map(m => <option key={m} value={m} />)}
                </datalist>
              </label>
              <p className="chat-settings-hint">
                Default: server proxy <code>chat.php</code> backed by Groq. To use local Ollama,
                set URL to <code>http://localhost:11434/api/chat</code> and model to <code>llama3.1:8b</code>.
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
                <p>Ask anything about this question, the recommended technique, hypotheses, assumptions, sample size, or how to report results. Drag the <strong>?</strong> icon onto any text on the page to get an explanation of that concept.</p>
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
                <div className="chat-msg-body chat-typing"><span /><span /><span /></div>
              </div>
            )}
            {error && (
              <div className="chat-error">
                <strong>Could not reach the model.</strong>
                <div className="chat-error-detail">{error}</div>
                <ol className="chat-error-steps">
                  <li>The server may not have a Groq API key configured yet — contact the site admin.</li>
                  <li>If using local Ollama: ensure <code>ollama serve</code> is running and the URL ends in <code>/api/chat</code>.</li>
                </ol>
              </div>
            )}
          </div>

          <div className="chat-input-row">
            <button
              className="chat-help-icon"
              title="Drag onto any concept on the page to ask about it"
              onPointerDown={startDrag}>?</button>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about this question or the recommended technique…"
              rows={2} />
            <button className="chat-send" disabled={busy || !input.trim()} onClick={() => send()}>Send</button>
          </div>
        </div>
      )}

      {/* Floating ghost icon while dragging */}
      {dragging && (
        <div className="chat-help-ghost" style={{ left: dragPos.x, top: dragPos.y }}>?</div>
      )}
    </div>
  );
};

// --- Helpers --------------------------------------------------------------

function pickHelpTarget(x, y) {
  let el = document.elementFromPoint(x, y);
  // Skip the chat itself and the dragging ghost.
  while (el && (el.closest && (el.closest('.chat-rail') || el.closest('.chat-help-ghost')))) {
    el.style.pointerEvents = 'none';
    el = document.elementFromPoint(x, y);
    if (!el) break;
  }
  return el;
}

function extractContextFrom(el) {
  if (!el) return null;
  let cur = el;
  while (cur && cur !== document.body) {
    const text = (cur.innerText || cur.textContent || '').trim().replace(/\s+/g, ' ');
    if (text.length >= 12 && text.length <= 800) {
      return { text, tag: cur.tagName ? cur.tagName.toLowerCase() : '?' };
    }
    cur = cur.parentElement;
  }
  if (cur) {
    const text = (cur.innerText || cur.textContent || '').trim().replace(/\s+/g, ' ');
    return { text: text.slice(0, 800) };
  }
  return null;
}

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
  if (isOllama) return (data && data.message && data.message.content) || '(empty response)';
  if (data && data.choices && data.choices[0] && data.choices[0].message)
    return data.choices[0].message.content || '(empty response)';
  if (data && data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return '(empty response)';
}

function buildSystemPrompt(ctx) {
  const parts = [
    'You are a research-methods assistant for the Method Atlas Entrepreneur, a guided web tool that helps researchers select predictive analytic techniques in entrepreneurship research.',
    'Reply concisely and pedagogically. When relevant, cite the authors listed in the ATLAS KNOWLEDGE BASE below. Mention assumptions, sample-size rules of thumb and reporting standards. Do not invent references; rely on the digest provided.',
    'If the user asks something outside the atlas, answer briefly and steer them back to the closest atlas sector.',
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
      `Goal: ${ctx.winner.goal}.`,
      `Hypothesis templates: ${(ctx.winner.hypotheses || []).join(' | ')}.`,
      `Conditions: ${(ctx.winner.conditions || []).join(' | ')}.`,
      `Assumptions to defend: ${(ctx.winner.assumes || []).join(' | ')}.`,
      `Recommended authors: ${(ctx.winner.authors || []).map(a => `${a.name} (${a.work})`).join('; ')}.`,
      'Help the researcher operationalise this technique.'
    );
  } else {
    parts.push('LIVE CONTEXT — the researcher has not started yet.');
  }
  return parts.join('\n');
}

function describeContext(ctx) {
  if (ctx && ctx.kind === 'question' && ctx.question) return `Question ${ctx.question.id} — “${ctx.question.text}”`;
  if (ctx && ctx.kind === 'result' && ctx.winner)     return `Recommendation: ${ctx.winner.label} (${ctx.winner.sub})`;
  return 'Idle. Ask anything about predictive techniques in entrepreneurship.';
}

function buildSuggestions(ctx) {
  if (ctx && ctx.kind === 'question' && ctx.question) return [
    `Help me decide between the options of ${ctx.question.id}.`,
    'Which option fits a study with multi-item Likert scales?',
    'What clue in my data should make me pick one option over another?',
  ];
  if (ctx && ctx.kind === 'result' && ctx.winner) return ctx.winner.chatHints || [
    `How do I write the methods section for ${ctx.winner.label}?`,
    `Minimum sample size to defend ${ctx.winner.label}?`,
    `Compare ${ctx.winner.label} with the next-best alternative.`,
  ];
  return [
    'Which technique fits a GEM panel of 50,000 individuals?',
    'When should I prefer fsQCA over logistic regression?',
    'How do I report PLS-SEM following Hair et al. (2022)?',
  ];
}
