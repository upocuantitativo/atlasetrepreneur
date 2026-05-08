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

window.ChatPanel = function ChatPanel({ context, tone = 'serif-dark', open, onToggle, onTrack, sessionId }) {
  const track = onTrack || (() => {});
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [apiUrl, setApiUrl] = useState(() => {
    const stored = localStorage.getItem('atlas_api_url');
    // Refuse stale Ollama-style URLs — the public site only works through
    // the Groq-backed PHP proxy. Users in dev can still override from ⚙.
    if (stored && /\/api\/chat\b/.test(stored)) return DEFAULT_API_URL;
    return stored || DEFAULT_API_URL;
  });
  const [model, setModel] = useState(() => {
    const stored = localStorage.getItem('atlas_api_model');
    // Same: a leftover llama3.1:8b (Ollama tag) makes Groq 404. Force reset.
    if (stored && /^llama3\.1:/.test(stored)) return DEFAULT_MODEL;
    return stored || DEFAULT_MODEL;
  });
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
    track('chat_question', {
      content,
      contextKind: context && context.kind,
      contextId: context && context.kind === 'question' ? (context.question && context.question.id)
                : context && context.kind === 'result' ? (context.winner && context.winner.id)
                : null,
      turnIdx: next.length,
    });
    try {
      // Keep only the last 8 messages to stay well under Groq's 6,000 TPM
      // free-tier limit. The system prompt already carries the relevant
      // technique context, so older chat history adds little value.
      const trimmed = next.slice(-8);
      const reply = await callChat({
        url: apiUrl, model,
        messages: [{ role: 'system', content: systemPrompt }, ...trimmed],
        max_tokens: 512,
      });
      setMessages([...next, { role: 'assistant', content: reply }]);
      track('chat_reply', {
        content: reply,
        contextKind: context && context.kind,
        replyChars: (reply || '').length,
        turnIdx: next.length + 1,
      });
    } catch (e) {
      const msg = humaniseError(e.message || String(e));
      setError(msg);
      track('chat_error', { error: msg });
    }
    finally { setBusy(false); }
  };

  const reset = () => { setMessages([]); setError(null); };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // ---- Draggable help icon ------------------------------------------------
  // Uses WINDOW-level listeners during the drag so we always catch
  // pointer-up — and never mutates any DOM styles. The chat is hidden
  // from elementFromPoint via a `body.atlas-help-dragging` CSS rule
  // that sets pointer-events:none on the chat-rail for the duration of
  // the drag, then is removed cleanly on release.
  const startDrag = (e) => {
    e.preventDefault();
    if (!open) onToggle();
    setDragging(true);
    setDragPos({ x: e.clientX, y: e.clientY });
    document.body.classList.add('atlas-help-dragging');

    const onMove = (ev) => {
      setDragPos({ x: ev.clientX, y: ev.clientY });
      document.querySelectorAll('.atlas-help-target').forEach(x => x.classList.remove('atlas-help-target'));
      const el = pickHelpTarget(ev.clientX, ev.clientY);
      if (el) el.classList.add('atlas-help-target');
    };
    const cleanup = () => {
      document.body.classList.remove('atlas-help-dragging');
      document.querySelectorAll('.atlas-help-target').forEach(x => x.classList.remove('atlas-help-target'));
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      setDragging(false);
    };
    const onUp = (ev) => {
      const el = pickHelpTarget(ev.clientX, ev.clientY);
      cleanup();
      const ctx = extractContextFrom(el);
      if (!ctx || ctx.text.length < 5) return;
      track('chat_drag_help', {
        target: ctx.text.slice(0, 240),
        tag: ctx.tag || null,
      });
      send(`Explain this concept in the context of the Method Atlas, briefly: "${ctx.text}"`);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  // Periodic "drag & ask" tooltip above the ? icon — appears every ~30 s
  // for a couple of seconds while the chat is open, so the user
  // discovers the feature without a permanent label cluttering the UI.
  const [hintShown, setHintShown] = useState(false);
  useEffect(() => {
    if (!open) return;
    let alive = true;
    const tick = () => {
      if (!alive) return;
      setHintShown(true);
      setTimeout(() => alive && setHintShown(false), 2400);
    };
    const first = setTimeout(tick, 6000);
    const id = setInterval(tick, 28000);
    return () => { alive = false; clearTimeout(first); clearInterval(id); };
  }, [open]);

  return (
    <div className={`chat-rail tone-${tone} ${open ? 'open' : 'closed'}`}>
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
              className={`chat-help-icon ${hintShown ? 'hint-on' : ''}`}
              title="Drag onto any concept on the page to ask about it"
              data-hint="drag & ask"
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
  // While dragging the chat-rail has pointer-events:none via the
  // `body.atlas-help-dragging` CSS rule, so elementFromPoint already
  // sees through it. Just return whatever's there.
  return document.elementFromPoint(x, y);
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

async function callChat({ url, model, messages, max_tokens }) {
  const isOllama = /\/api\/chat\b/.test(url);
  const body = isOllama
    ? { model, messages, stream: false, options: { temperature: 0.4 } }
    : { model, messages, temperature: 0.4, max_tokens: max_tokens || 512 };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} — ${txt.slice(0, 350)}`);
  }
  const data = await res.json();
  if (isOllama) return (data && data.message && data.message.content) || '(empty response)';
  if (data && data.choices && data.choices[0] && data.choices[0].message)
    return data.choices[0].message.content || '(empty response)';
  if (data && data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return '(empty response)';
}

function humaniseError(raw) {
  if (/429/.test(raw)) {
    const m = raw.match(/try again in ([\d.]+)s/i);
    if (m) return `The free Groq tier briefly throttled you — please wait about ${Math.ceil(parseFloat(m[1]))} seconds and resend.`;
    return 'The free Groq tier rate-limited this request (6,000 tokens/min). Please retry in a few seconds.';
  }
  if (/HTTP 5\d\d/.test(raw)) return 'The server is temporarily unavailable. Please retry in a moment.';
  return raw;
}

// Build a TIGHT system prompt. We include only the sector(s) that are
// relevant to the current state — the full atlas knowledge would blow
// past Groq's 6,000 TPM free-tier limit on the second turn.
function buildSystemPrompt(ctx) {
  const sectors = (window.TAXONOMY && window.TAXONOMY.sectors) || [];
  const taxIndex = sectors
    .map(s => `${s.id}:${s.label}`)
    .join(', ');

  const parts = [
    'You are a research-methods assistant for the Method Atlas Entrepreneur — a guided tool that helps researchers pick predictive analytic techniques in entrepreneurship research.',
    'Reply concisely (≤180 words unless the user asks for depth). Cite authors when relevant from the SECTOR digest below. Do not invent references.',
    `Atlas sectors available (id:label): ${taxIndex}.`,
  ];

  let relevantSector = null;
  if (ctx && ctx.kind === 'result' && ctx.winner) {
    relevantSector = ctx.winner;
    parts.push(`Current recommendation: ${ctx.winner.label} (${ctx.winner.sub}).`);
  } else if (ctx && ctx.kind === 'question' && ctx.question) {
    // Pick the leading sector based on the option weights of this question
    // plus a quick scan of history.
    const acc = {};
    (ctx.history || []).forEach(h => {
      Object.entries(h.weights || {}).forEach(([k, v]) => { acc[k] = (acc[k] || 0) + v; });
    });
    const ranked = Object.entries(acc).sort((a, b) => b[1] - a[1]);
    if (ranked.length) relevantSector = sectors.find(s => s.id === ranked[0][0]);
    parts.push(`Question on screen: ${ctx.question.id} — "${ctx.question.text}". Options: ${ctx.question.options.map(o => o.label).join(' | ')}.`);
  }

  if (relevantSector) {
    parts.push('--- RELEVANT SECTOR DIGEST ---');
    parts.push(`Technique: ${relevantSector.label} — ${relevantSector.sub}.`);
    if (relevantSector.goal) parts.push(`Goal: ${relevantSector.goal}`);
    const techs = (relevantSector.techniques || []).slice(0, 6).join(', ');
    if (techs) parts.push(`Techniques: ${techs}.`);
    const assumes = (relevantSector.assumes || []).slice(0, 4).join('; ');
    if (assumes) parts.push(`Assumptions: ${assumes}.`);
    const authors = (relevantSector.authors || []).slice(0, 4)
      .map(a => `${a.name} — ${a.work}`).join('; ');
    if (authors) parts.push(`Key authors: ${authors}.`);
  }

  parts.push('If the user asks about a technique outside the current sector, answer briefly using common knowledge and point them to the closest atlas sector by name.');
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
