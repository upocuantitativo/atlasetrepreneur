// App — orchestrates the experience.
//
// Adaptive flow: questions are not advanced by index but by *queue
// recomputation*. After every answer we:
//   1. recompute cumulative scores from the answer history
//   2. evaluate every question's showIf(scores, history) predicate
//   3. drop questions already answered, drop questions whose predicate is false
//   4. the next-up question is the first remaining one
// This way late questions adapt to whichever sectors are leading the race.
//
// The chat panel stays mounted at all times on the right rail so the user
// can ask the local LLM about whatever question they are currently on, or
// about the final recommendation.

const { useState, useMemo, useEffect } = React;

window.GuideApp = function GuideApp({ tone = 'serif-dark' }) {
  // history is an *ordered list of answered question entries*. We no longer
  // index the questions array directly because the visible queue changes
  // dynamically.
  const [history, setHistory] = useState([]);
  const [done, setDone] = useState(false);
  const [chatOpen, setChatOpen] = useState(() => {
    const v = localStorage.getItem('atlas_chat_open');
    return v == null ? true : v === '1';
  });

  useEffect(() => {
    localStorage.setItem('atlas_chat_open', chatOpen ? '1' : '0');
  }, [chatOpen]);

  const allQuestions = window.QUESTIONS;

  // Cumulative scores from history.
  const scores = useMemo(() => {
    const acc = {};
    history.forEach(h => {
      Object.entries(h.weights || {}).forEach(([k, v]) => {
        acc[k] = (acc[k] || 0) + v;
      });
    });
    return acc;
  }, [history]);

  // Set of question ids already answered.
  const answeredIds = useMemo(() => new Set(history.map(h => h.questionId)), [history]);

  // Decide which questions are eligible right now (always-on OR showIf true).
  const eligibleNow = useMemo(() => {
    return allQuestions.filter(q => {
      if (q.always) return true;
      if (typeof q.showIf === 'function') {
        try { return q.showIf(scores, history); } catch (e) { return false; }
      }
      return true;
    });
  }, [allQuestions, scores, history]);

  // The current question is the first eligible one not yet answered.
  const currentQ = useMemo(() => {
    return eligibleNow.find(q => !answeredIds.has(q.id)) || null;
  }, [eligibleNow, answeredIds]);

  // For the progress indicator we estimate "expected remaining" by counting
  // how many eligible questions are unanswered — this number can shift as
  // adaptive predicates flip. The denominator is answered + remaining.
  const total = useMemo(() => {
    const remaining = eligibleNow.filter(q => !answeredIds.has(q.id)).length;
    return history.length + remaining;
  }, [eligibleNow, answeredIds, history.length]);
  const qIdx = history.length;

  // Detect end-of-flow: no current question available.
  useEffect(() => {
    if (!currentQ && history.length > 0 && !done) {
      const t = setTimeout(() => setDone(true), 600);
      return () => clearTimeout(t);
    }
  }, [currentQ, history.length, done]);

  const focusSector = useMemo(() => {
    const entries = Object.entries(scores);
    if (entries.length === 0) return null;
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0][0];
  }, [scores]);

  const focusRing = currentQ ? currentQ.ring : (history.length ? history[history.length - 1].ring : 0);

  const handleAnswer = ({ optionIdx, note }) => {
    if (!currentQ) return;
    const opt = currentQ.options[optionIdx];
    const entry = {
      questionId: currentQ.id,
      questionText: currentQ.text,
      answerLabel: opt.label,
      optionIdx,
      note,
      weights: opt.weights,
      ring: currentQ.ring,
    };
    setHistory(h => [...h, entry]);
  };

  const handleBack = () => {
    if (history.length === 0) return;
    setHistory(h => h.slice(0, -1));
    setDone(false);
  };

  const handleJump = (i) => {
    setHistory(h => h.slice(0, i));
    setDone(false);
  };

  const restart = () => {
    setHistory([]);
    setDone(false);
  };

  const winner = useMemo(() => {
    const ranked = window.TAXONOMY.sectors
      .map(s => ({ ...s, score: scores[s.id] || 0 }))
      .sort((a, b) => b.score - a.score);
    return ranked[0];
  }, [scores]);

  const chatContext = useMemo(() => {
    if (done && winner) return { kind: 'result', winner };
    if (currentQ) return { kind: 'question', question: currentQ, history };
    return { kind: 'idle' };
  }, [done, winner, currentQ, history]);

  if (done) {
    return (
      <div className={`guide-app guide-app-result tone-${tone} ${chatOpen ? 'chat-on' : 'chat-off'}`}>
        <window.ResultScreen scores={scores} history={history} onRestart={restart} tone={tone} />
        <window.ChatPanel context={chatContext} tone={tone} open={chatOpen} onToggle={() => setChatOpen(o => !o)} />
      </div>
    );
  }

  const focusSectorObj = focusSector ? window.TAXONOMY.sectors.find(s => s.id === focusSector) : null;
  const focusRingObj = focusRing != null ? window.TAXONOMY.rings[focusRing] : null;

  return (
    <div className={`guide-app tone-${tone} ${chatOpen ? 'chat-on' : 'chat-off'}`}>
      <window.Mandala3D focusSector={focusSector} focusRing={focusRing} tone={tone} />

      {focusSectorObj && history.length >= 3 && (
        <div className="sector-hud">
          <div className="sector-hud-eyebrow">Current leaning</div>
          <div className="sector-hud-name" style={{ color: `oklch(0.78 0.18 ${focusSectorObj.hue})` }}>
            {focusSectorObj.label}
          </div>
          <div className="sector-hud-sub">
            {focusSectorObj.sub}
            {focusRingObj && <span className="sector-hud-ring"> · {focusRingObj.label}</span>}
          </div>
        </div>
      )}

      <div className="guide-overlay">
        <div className="overlay-top">
          <div className="brand">
            <div className="brand-mark">◉</div>
            <div className="brand-text">
              <div className="brand-title">Method Atlas <span className="brand-em">Entrepreneur</span></div>
              <div className="brand-sub">A guided path to your analytic technique</div>
            </div>
          </div>
          <div className="overlay-top-right">
            <window.MiniMap focusSector={focusSector} focusRing={focusRing} scores={scores} tone={tone} />
          </div>
        </div>

        <div className="overlay-mid">
          <window.Breadcrumbs history={history} onJump={handleJump} />
        </div>

        <window.DialogBar
          question={currentQ}
          qIndex={qIdx}
          total={total}
          history={history}
          onAnswer={handleAnswer}
          onBack={handleBack}
          tone={tone}
        />
      </div>

      <window.ChatPanel context={chatContext} tone={tone} open={chatOpen} onToggle={() => setChatOpen(o => !o)} />
    </div>
  );
};
