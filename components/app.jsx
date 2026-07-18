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

const { useState, useMemo, useEffect, useRef } = React;

// One stable session id per page load. Used to correlate every interaction
// (answers, back/jump, chat questions, recommendation, email) on the
// server side. Stored in sessionStorage so a refresh during the same tab
// keeps the same session, but a new tab starts fresh.
function getOrCreateSessionId() {
  try {
    const k = 'atlas_session_id';
    let id = sessionStorage.getItem(k);
    if (!id) {
      id = (window.crypto && crypto.randomUUID && crypto.randomUUID()) ||
           ('s_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10));
      sessionStorage.setItem(k, id);
    }
    return id;
  } catch (e) {
    return 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }
}

// Fire-and-forget tracking. Any failure is silently logged to the console;
// the UI never blocks on the network. Uses keepalive so events that happen
// just before a page unload still get delivered.
function postTrack(sessionId, eventType, payload) {
  if (!sessionId || !eventType) return;
  try {
    fetch('./api.php?action=track', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        session_id: sessionId,
        event_type: eventType,
        ts_ms: Date.now(),
        payload: payload || null,
      }),
    }).catch(() => {});
  } catch (e) { /* swallow */ }
}

window.GuideApp = function GuideApp({ tone = 'serif-dark' }) {
  // Stable session id for this visit
  const sessionIdRef = useRef(getOrCreateSessionId());
  const sessionId = sessionIdRef.current;
  const trackEvent = useMemo(
    () => (type, payload) => postTrack(sessionId, type, payload),
    [sessionId]
  );

  // Emit session_start exactly once per page load (per session id).
  useEffect(() => {
    const k = 'atlas_session_start_emitted';
    try {
      if (sessionStorage.getItem(k) !== sessionId) {
        sessionStorage.setItem(k, sessionId);
        trackEvent('session_start', {
          referrer: document.referrer || null,
          path: window.location.pathname || '/',
          screen: { w: window.innerWidth, h: window.innerHeight },
        });
      }
    } catch (e) { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // history is an *ordered list of answered question entries*. We no longer
  // index the questions array directly because the visible queue changes
  // dynamically.
  const [history, setHistory] = useState([]);
  const [done, setDone] = useState(false);
  // Stack of past recommendations the user has navigated away from by
  // clicking a "the recommendation would be …" alternative. Each entry
  // is a snapshot of the history that produced that previous winner, so
  // the user can return to any earlier recommendation.
  const [recHistory, setRecHistory] = useState([]);
  // Chat is CLOSED by default. The user opens it explicitly via the "Ask"
  // pill (or the floating button on phones). Their choice is remembered.
  const [chatOpen, setChatOpen] = useState(() => {
    const v = localStorage.getItem('atlas_chat_open');
    return v === '1';
  });

  useEffect(() => {
    localStorage.setItem('atlas_chat_open', chatOpen ? '1' : '0');
  }, [chatOpen]);

  // When the user reaches the recommendation, force the consultation chat
  // open ON DESKTOP so they can immediately ask follow-up questions. On
  // phones we leave the FAB visible instead so the result stays readable.
  useEffect(() => {
    if (done && window.matchMedia && window.matchMedia('(min-width: 760px)').matches) {
      setChatOpen(true);
    }
  }, [done]);

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

  // Track question_shown when the active question changes (and is not the
  // very first hit, which is part of session_start). This gives admins a
  // per-step funnel: question_shown → answer pairs.
  useEffect(() => {
    if (!currentQ) return;
    trackEvent('question_shown', {
      questionId: currentQ.id,
      questionText: currentQ.text,
      ring: currentQ.ring,
      stepIndex: history.length,
      optionsCount: (currentQ.options || []).length,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQ && currentQ.id]);

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
    trackEvent('answer', {
      questionId: currentQ.id,
      questionText: currentQ.text,
      ring: currentQ.ring,
      optionIdx,
      answerLabel: opt.label,
      note: note || null,
      weights: opt.weights || {},
      stepIndex: history.length,
    });
  };

  const handleBack = () => {
    if (history.length === 0) return;
    const popped = history[history.length - 1];
    trackEvent('back', { fromQuestionId: popped && popped.questionId, stepIndex: history.length - 1 });
    setHistory(h => h.slice(0, -1));
    setRecHistory([]);            // navigating away invalidates the recommendation stack
    setDone(false);
  };

  const handleJump = (i) => {
    trackEvent('jump', { toIndex: i, fromIndex: history.length });
    setHistory(h => h.slice(0, i));
    setRecHistory([]);
    setDone(false);
  };

  const restart = () => {
    trackEvent('restart', { fromSteps: history.length });
    setHistory([]);
    setRecHistory([]);
    setDone(false);
  };

  // Result-screen feature: clicking a "the recommendation would be …"
  // alternative replays the flow as if the user had picked that option for
  // the matching question. We mutate the matching history entry in place;
  // scores and the winner recompute downstream. The PRIOR state is pushed
  // onto recHistory so the user can revert to any previous recommendation.
  const handleAlternativeClick = (questionId, newOptionIdx) => {
    const bank = window.QUESTIONS || [];
    const q = bank.find(x => x.id === questionId);
    if (!q || !q.options) return;
    const newOpt = q.options[newOptionIdx];
    if (!newOpt) return;
    const prevEntry = history.find(h => h.questionId === questionId);

    // Snapshot the recommendation that's about to be replaced. `winner`
    // here still references the PRIOR state because state hasn't updated
    // yet within this synchronous handler.
    setRecHistory(rh => [...rh, {
      history: history.slice(),
      winnerId: winner ? winner.id : null,
      winnerLabel: winner ? winner.label : null,
      winnerHue: winner ? winner.hue : 0,
      switchedAt: questionId,
      switchedFromLabel: prevEntry ? prevEntry.answerLabel : null,
      at: Date.now(),
    }]);

    setHistory(h => h.map(entry => {
      if (entry.questionId !== questionId) return entry;
      return {
        ...entry,
        optionIdx: newOptionIdx,
        answerLabel: newOpt.label,
        weights: newOpt.weights || {},
      };
    }));
    trackEvent('alternative_click', {
      questionId,
      previousOptionIdx: prevEntry ? prevEntry.optionIdx : null,
      previousAnswerLabel: prevEntry ? prevEntry.answerLabel : null,
      previousWinnerId: winner ? winner.id : null,
      newOptionIdx,
      newAnswerLabel: newOpt.label,
    });
  };

  // Restore a previous recommendation snapshot. We jump straight to the
  // captured history; everything downstream of the chosen snapshot is
  // discarded (linear undo).
  const handleRevertToRecommendation = (idx) => {
    const snap = recHistory[idx];
    if (!snap) return;
    trackEvent('recommendation_revert', {
      toWinnerId: snap.winnerId,
      toWinnerLabel: snap.winnerLabel,
      fromWinnerId: winner ? winner.id : null,
      snapshotIdx: idx,
    });
    setHistory(snap.history);
    setRecHistory(rh => rh.slice(0, idx));
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

  // When the user reaches `done`, log the final winner once.
  const lastWinnerLogged = useRef(null);
  useEffect(() => {
    if (done && winner && lastWinnerLogged.current !== winner.id) {
      lastWinnerLogged.current = winner.id;
      trackEvent('recommendation_shown', {
        winner_id: winner.id,
        winner_label: winner.label,
        scores,
        steps: history.length,
      });
    }
  }, [done, winner, scores, history.length, trackEvent]);

  if (done) {
    return (
      <div className={`guide-app guide-app-result tone-${tone} ${chatOpen ? 'chat-on' : 'chat-off'}`}>
        <window.ResultScreen
          scores={scores}
          history={history}
          onRestart={restart}
          onAlternativeClick={handleAlternativeClick}
          recHistory={recHistory}
          onRevertRecommendation={handleRevertToRecommendation}
          onTrack={trackEvent}
          sessionId={sessionId}
          tone={tone}
        />
        <window.ChatPanel
          context={chatContext}
          tone={tone}
          open={chatOpen}
          onToggle={() => { setChatOpen(o => !o); trackEvent(chatOpen ? 'chat_close' : 'chat_open', { from: 'result' }); }}
          onTrack={trackEvent}
          sessionId={sessionId}
        />
      </div>
    );
  }

  const focusSectorObj = focusSector ? window.TAXONOMY.sectors.find(s => s.id === focusSector) : null;
  const focusRingObj = focusRing != null ? window.TAXONOMY.rings[focusRing] : null;

  return (
    <div className={`guide-app tone-${tone} ${chatOpen ? 'chat-on' : 'chat-off'}`}>
      <window.Mandala3D focusSector={focusSector} focusRing={focusRing}
        history={history} totalQuestions={total}
        isFinal={!currentQ || (qIdx + 1 >= total)}
        tone={tone} />

      {focusSectorObj && history.length >= 1 && (
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
              <div className="brand-title">Method Atlas <span className="brand-em">Entrepreneur Research</span></div>
              <div className="brand-sub">A guided path to your analytic technique</div>
            </div>
          </div>
          <div className="overlay-top-right">
            {history.length > 0 && (
              <window.MiniMap focusSector={focusSector} focusRing={focusRing} scores={scores} tone={tone} />
            )}
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

      <window.ChatPanel
        context={chatContext}
        tone={tone}
        open={chatOpen}
        onToggle={() => { setChatOpen(o => !o); trackEvent(chatOpen ? 'chat_close' : 'chat_open', { from: 'question', questionId: currentQ && currentQ.id }); }}
        onTrack={trackEvent}
        sessionId={sessionId}
      />
    </div>
  );
};
