// ResultScreen — shown when the adaptive flow ends. Sections:
//   0. Header row (title + small itinerary mandala + email box)
//   1. Headline recommendation
//   2. Hypothesis templates the researcher can adopt
//   3. Conditions to defend
//   4. Top candidate techniques
//   5. Assumptions
//   6. Suggested software
//   7. Recommended authors with clickable links + foundational references
//   8. Replicable methods recipe (existing component)
//   9. Comparison to alternatives
//  10. Reasoning trail

const { useState } = React;

// Build the list of "transformation conditions". For the recommended sector,
// we walk every answered question and flag those whose chosen option
// contributes a NON-POSITIVE weight (0, absent or negative) to that sector,
// while OTHER options of the same question contribute positively. Those are
// the design choices the researcher would have to revisit to actually be able
// to apply the recommended technique.
function buildTransformationConditions(history, winner) {
  if (!winner || !history || history.length === 0) return [];
  const bank = window.QUESTIONS || [];
  const conditions = [];
  for (const h of history) {
    const q = bank.find(x => x.id === h.questionId);
    if (!q || !Array.isArray(q.options)) continue;
    const chosenWeight = (h.weights && h.weights[winner.id]) || 0;
    if (chosenWeight > 0) continue;     // chosen answer already supports the winner
    // Any option of the same question that is STRICTLY MORE COMPATIBLE
    // with the winner than the chosen one. This guarantees we usually
    // surface at least two alternatives even when only one option carries
    // a positive weight (the neighbouring 0-weight option is still
    // "less incompatible" than a -2 chosen option).
    const allBetter = q.options
      .map((o, i) => ({
        idx: i,
        label: o.label,
        weight: (o.weights && o.weights[winner.id]) || 0,
      }))
      .filter(o => o.idx !== h.optionIdx && o.weight > chosenWeight)
      .sort((a, b) => b.weight - a.weight);
    if (allBetter.length === 0) continue;
    // Keep up to three alternatives. If positive-weight options exist,
    // prefer those; otherwise fall back to the best non-positive ones so
    // the section always offers at least two alternatives when possible.
    const positives = allBetter.filter(o => o.weight > 0);
    const better = (positives.length >= 2 ? positives : allBetter).slice(0, 3);
    conditions.push({
      questionId: h.questionId,
      questionText: h.questionText,
      chosen: h.answerLabel,
      better,
    });
  }
  return conditions;
}

function buildEmailHtml({ winner, history, scores, transformations, top3, total }) {
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const css = `
    body { font-family: Georgia, 'EB Garamond', serif; color: #1a1a1a; background: #fafaf6; margin: 0; padding: 0; }
    .wrap { max-width: 640px; margin: 0 auto; padding: 28px 24px; }
    h1 { font-size: 26px; margin: 0 0 4px; color: #0e1530; font-weight: 500; }
    h2 { font-size: 16px; letter-spacing: 0.18em; text-transform: uppercase;
         color: #5e6680; margin: 28px 0 10px; font-weight: 500; font-style: italic; }
    .sub { font-style: italic; color: #5e6680; font-size: 16px; margin: 0 0 18px; }
    p { line-height: 1.55; }
    ul { padding-left: 20px; margin: 0; }
    li { margin: 4px 0; line-height: 1.5; }
    .card { background: #fff; border: 1px solid rgba(26,37,64,0.15); border-radius: 6px;
            padding: 16px 18px; margin: 10px 0; }
    .trail { border-left: 2px solid rgba(26,37,64,0.2); padding-left: 14px; margin: 6px 0 14px; }
    .trail-q { font-style: italic; color: #5e6680; font-size: 13px; }
    .trail-a { font-size: 14px; color: #0e1530; margin-top: 2px; }
    .author { display:block; padding: 8px 0; border-top: 1px solid rgba(26,37,64,0.1); }
    .author:first-child { border-top:none; }
    .author-name { font-weight: 500; color: #0e1530; }
    .author-work { font-style: italic; color: #5e6680; font-size: 13px; }
    a { color: #1a2540; }
    .footer { margin-top: 28px; font-size: 12px; color: #5e6680; font-style: italic;
              border-top: 1px solid rgba(26,37,64,0.15); padding-top: 14px; }
  `;
  const hyps = (winner.hypotheses || []).map(h => `<li>${esc(h)}</li>`).join('');
  const conds = (winner.conditions || []).map(c => `<li>${esc(c)}</li>`).join('');
  const techs = (winner.techniques || []).map(t => `<li>${esc(t)}</li>`).join('');
  const ass   = (winner.assumes || []).map(a => `<li>${esc(a)}</li>`).join('');
  const sw    = (winner.software || []).map(s => `<li>${esc(s)}</li>`).join('');
  const proc  = (winner.procedure || []).map(p => `<li>${esc(p)}</li>`).join('');
  const auths = (winner.authors || []).map(a => `
    <div class="author">
      <div class="author-name">${esc(a.name)}${a.url ? ` &nbsp;<a href="${esc(a.url)}">↗</a>` : ''}</div>
      <div class="author-work">${esc(a.work || '')}</div>
      ${a.why ? `<div style="font-size:13px;color:#5e6680;margin-top:2px;">${esc(a.why)}</div>` : ''}
    </div>`).join('');
  const refs = (winner.keyRefs || []).map(r => `<li>${esc(r)}</li>`).join('');
  const trail = (history || []).map(h => `
    <div class="trail">
      <div class="trail-q">${esc(h.questionId)} · ${esc(h.questionText)}</div>
      <div class="trail-a">→ ${esc(h.answerLabel)}</div>
    </div>`).join('');
  const trans = (transformations || []).length ? `
    <h2>Conditions for switching to ${esc(winner.label)}</h2>
    <p style="font-style:italic;color:#5e6680;font-size:14px;">
      Some of your answers carry a 0 weight for ${esc(winner.label)}. To apply this
      technique you would need to revisit the design points below.
    </p>
    ${transformations.map(t => `
      <div class="card">
        <div style="font-style:italic;font-size:13px;color:#5e6680;">${esc(t.questionId)} · ${esc(t.questionText)}</div>
        <div style="margin-top:6px;"><strong>You chose:</strong> <em>${esc(t.chosen)}</em></div>
        <div style="margin-top:4px;"><strong>The recommendation would be:</strong>
          <ul>${t.better.map(b => `<li><em>${esc(b.label)}</em></li>`).join('')}</ul>
        </div>
      </div>
    `).join('')}
  ` : '';
  const cmp = (top3 || []).map((c, i) => `
    <div class="card" style="${i === 0 ? 'background:#1a2540;color:#fafaf6;' : ''}">
      <div style="font-size:11px;letter-spacing:0.1em;color:${i === 0 ? '#cfe1ff' : '#5e6680'};">0${i + 1}</div>
      <div style="font-size:18px;margin:4px 0;">${esc(c.label)}</div>
      <div style="font-size:13px;color:${i === 0 ? '#cfe1ff' : '#5e6680'};font-style:italic;">${esc(c.sub)} — ${(c.score / total * 100).toFixed(0)}% match</div>
    </div>`).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(winner.label)}</title>
<style>${css}</style></head><body>
<div class="wrap">
  <p style="font-style:italic;letter-spacing:0.18em;text-transform:uppercase;color:#5e6680;font-size:11px;margin:0 0 6px;">Method Atlas — Recommendation</p>
  <h1>${esc(winner.label)}</h1>
  <p class="sub">${esc(winner.goal || winner.sub || '')}</p>
  ${winner.description ? `<p>${esc(winner.description)}</p>` : ''}

  ${hyps ? `<h2>Hypothesis templates you can adopt</h2><ul>${hyps}</ul>` : ''}
  ${conds ? `<h2>When this technique is the right call</h2><ul>${conds}</ul>` : ''}
  ${techs ? `<h2>Top candidate techniques</h2><ul>${techs}</ul>` : ''}
  ${ass ? `<h2>Assumptions to defend</h2><ul>${ass}</ul>` : ''}
  ${sw ? `<h2>Suggested software</h2><ul>${sw}</ul>` : ''}
  ${proc ? `<h2>Procedural checklist</h2><ol>${proc}</ol>` : ''}
  ${auths ? `<h2>Recommended authors</h2><div class="card">${auths}</div>` : ''}
  ${refs ? `<h2>Foundational references</h2><ul>${refs}</ul>` : ''}
  ${trans}
  ${cmp ? `<h2>Alternative candidates</h2>${cmp}` : ''}
  ${trail ? `<h2>Your reasoning trail</h2>${trail}` : ''}

  <div class="footer">
    Generated by Method Atlas — Entrepreneur Research · upo.digital
  </div>
</div></body></html>`;
}

function buildEmailText({ winner, history, top3, total }) {
  const lines = [];
  lines.push(`METHOD ATLAS — RECOMMENDATION`);
  lines.push('='.repeat(40));
  lines.push(winner.label);
  if (winner.goal) lines.push(winner.goal);
  if (winner.description) lines.push('\n' + winner.description);
  if ((winner.hypotheses || []).length) {
    lines.push('\nHypothesis templates:');
    winner.hypotheses.forEach((h, i) => lines.push(`  H${i + 1}. ${h}`));
  }
  if ((winner.techniques || []).length) {
    lines.push('\nTop candidate techniques:');
    winner.techniques.forEach(t => lines.push(`  - ${t}`));
  }
  if ((winner.assumes || []).length) {
    lines.push('\nAssumptions to defend:');
    winner.assumes.forEach(a => lines.push(`  - ${a}`));
  }
  if ((winner.authors || []).length) {
    lines.push('\nRecommended authors:');
    winner.authors.forEach(a => lines.push(`  - ${a.name} — ${a.work || ''} ${a.url ? '(' + a.url + ')' : ''}`));
  }
  if ((history || []).length) {
    lines.push('\nYour reasoning trail:');
    history.forEach(h => lines.push(`  ${h.questionId}: ${h.questionText}\n    → ${h.answerLabel}`));
  }
  if ((top3 || []).length) {
    lines.push('\nAlternatives:');
    top3.forEach((c, i) => lines.push(`  0${i + 1}. ${c.label} — ${(c.score / total * 100).toFixed(0)}% match`));
  }
  lines.push('\n— Method Atlas · Entrepreneur Research · upo.digital');
  return lines.join('\n');
}

window.ResultScreen = function ResultScreen({ scores, history, onRestart, onAlternativeClick, onTrack, sessionId, tone = 'serif-dark' }) {
  const sectors = window.TAXONOMY.sectors;
  const ranked = [...sectors]
    .map(s => ({ ...s, score: scores[s.id] || 0 }))
    .sort((a, b) => b.score - a.score);

  const winner = ranked[0];
  const top3 = ranked.slice(0, 3);
  const total = top3.reduce((a, b) => a + b.score, 0) || 1;
  const transformations = buildTransformationConditions(history, winner);

  const [email, setEmail] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState(null);

  const sendEmail = async () => {
    if (emailBusy) return;
    const value = (email || '').trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
      setEmailMsg({ ok: false, text: 'Please enter a valid email address.' });
      return;
    }
    setEmailBusy(true);
    setEmailMsg(null);
    try {
      const html = buildEmailHtml({ winner, history, scores, transformations, top3, total });
      const text = buildEmailText({ winner, history, top3, total });
      const subject = `Method Atlas — Your recommendation: ${winner.label}`;
      const res = await fetch('./api.php?action=send_email', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId || null,
          email: value,
          winner_id: winner.id,
          winner_label: winner.label,
          subject,
          html_body: html,
          text_body: text,
          payload: {
            history: (history || []).map(h => ({
              questionId: h.questionId, answerLabel: h.answerLabel, optionIdx: h.optionIdx,
            })),
            top3: top3.map(c => ({ id: c.id, label: c.label, score: c.score })),
            scores,
          },
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setEmailMsg({ ok: true, text: 'Email sent. Check your inbox (and spam folder if you do not see it).' });
      if (onTrack) onTrack('email_send', { email: value, winner_id: winner.id, status: 'sent' });
    } catch (e) {
      setEmailMsg({ ok: false, text: 'Could not send: ' + (e.message || String(e)) });
      if (onTrack) onTrack('email_send_error', { email: value, error: String(e.message || e) });
    } finally {
      setEmailBusy(false);
    }
  };

  return (
    <div className={`result-screen tone-${tone}`}>
      <div className="result-inner">
        {/* === Top header: title block on the left, mandala + email on the right === */}
        <div className="result-header">
          <div className="result-header-main">
            <div className="result-eyebrow">Recommendation</div>
            <h1 className="result-title">
              <span className="result-title-em" style={{ color: `oklch(0.7 0.22 ${winner.hue})` }}>{winner.label}</span>
            </h1>
            <div className="result-sub">{winner.goal}</div>
            {winner.description && <p className="result-description">{winner.description}</p>}
          </div>
          <aside className="result-header-aside">
            <window.ItineraryMap
              history={history}
              scores={scores}
              winnerId={winner.id}
              tone={tone}
              size={210}
            />
            <div className={`result-email-box ${emailMsg ? (emailMsg.ok ? 'ok' : 'err') : ''}`}>
              <div className="result-email-eyebrow">Email this recommendation</div>
              <p className="result-email-hint">
                We can send you the full recommendation (with hypotheses, authors,
                trail and alternatives) to your inbox.
              </p>
              <div className="result-email-row">
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@institution.edu"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={emailBusy}
                  onKeyDown={e => { if (e.key === 'Enter') sendEmail(); }}
                />
                <button onClick={sendEmail} disabled={emailBusy || !email.trim()}>
                  {emailBusy ? 'Sending…' : 'Send'}
                </button>
              </div>
              {emailMsg && (
                <div className={`result-email-msg ${emailMsg.ok ? 'ok' : 'err'}`}>{emailMsg.text}</div>
              )}
            </div>
          </aside>
        </div>

        {/* === Hypotheses & conditions === */}
        <div className="result-section">
          <div className="result-section-eyebrow">Hypothesis templates you can adopt</div>
          <ul className="hyp-list">
            {(winner.hypotheses || []).map((h, i) => (
              <li key={i}><span className="hyp-marker">H{i + 1}</span><span>{h}</span></li>
            ))}
          </ul>
        </div>

        <div className="result-section">
          <div className="result-section-eyebrow">When this technique is the right call</div>
          <ul className="cond-list">
            {(winner.conditions || []).map((c, i) => (
              <li key={i}><span className="bullet">●</span><span>{c}</span></li>
            ))}
          </ul>
        </div>

        {/* === Two-column grid: techniques + assumptions + software === */}
        <div className="result-grid">
          <div className="result-card">
            <div className="card-eyebrow">Top candidate techniques</div>
            <ul className="tech-list">
              {winner.techniques.map(t => <li key={t}><span className="bullet">·</span>{t}</li>)}
            </ul>
          </div>

          <div className="result-card">
            <div className="card-eyebrow">Assumptions to defend</div>
            <ul className="assume-list">
              {winner.assumes.map(a => <li key={a}><span className="bullet">·</span>{a}</li>)}
            </ul>
          </div>

          <div className="result-card">
            <div className="card-eyebrow">Suggested software</div>
            <ul className="tech-list">
              {(winner.software || []).map(s => <li key={s}><span className="bullet">·</span>{s}</li>)}
            </ul>
          </div>

          {winner.procedure && winner.procedure.length > 0 && (
            <div className="result-card">
              <div className="card-eyebrow">Procedural checklist</div>
              <ol className="proc-list">
                {winner.procedure.map((p, i) => <li key={i}>{p}</li>)}
              </ol>
            </div>
          )}
        </div>

        {/* === Recommended authors with links === */}
        <div className="result-section">
          <div className="result-section-eyebrow">Recommended authors to consult</div>
          <p className="result-section-hint">
            Drawn from the bibliography you supplied. Each link opens the most
            useful entry point — DOI, repository or canonical source — for the
            recommended technique.
          </p>
          <div className="authors-grid">
            {(winner.authors || []).map((a, i) => (
              <a key={i} className="author-card" href={a.url} target="_blank" rel="noreferrer">
                <div className="author-name">{a.name}</div>
                <div className="author-work">{a.work}</div>
                {a.why && <div className="author-why">{a.why}</div>}
                <div className="author-link">Open ↗</div>
              </a>
            ))}
          </div>
        </div>

        {/* === Foundational references === */}
        {winner.keyRefs && winner.keyRefs.length > 0 && (
          <div className="result-section">
            <div className="result-section-eyebrow">Foundational references</div>
            <ul className="refs-list">
              {winner.keyRefs.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}

        {/* === Transformation conditions: design changes the researcher
              would need to make in order to actually apply the recommended
              technique. Clicking an alternative re-runs the recommendation
              as if the user had picked that option. === */}
        {transformations.length > 0 && (
          <div className="result-section">
            <div className="result-section-eyebrow">
              Conditions for switching to {winner.label}
            </div>
            <p className="result-section-hint">
              The recommendation above reflects the design choices you made.
              Some of those choices carry a <strong>0 weight</strong> for{' '}
              {winner.label} — meaning, in their current form, they are not
              compatible with this technique. <strong>Click any alternative
              below</strong> and we will recompute the recommendation as if
              you had chosen that option instead.
            </p>
            <ul className="trans-list">
              {transformations.map((t, i) => (
                <li key={i} className="trans-item">
                  <div className="trans-q">
                    <span className="trans-qid">{t.questionId}</span>
                    {' · '}
                    {t.questionText}
                  </div>
                  <div className="trans-from">
                    <span className="trans-label">You chose:</span>{' '}
                    <em>"{t.chosen}"</em>
                  </div>
                  <div className="trans-to">
                    <span className="trans-label">The recommendation would be:</span>
                    <ul className="trans-alt-list">
                      {t.better.map((b, j) => (
                        <li key={j}>
                          <button
                            type="button"
                            className="trans-alt-btn"
                            onClick={() => onAlternativeClick && onAlternativeClick(t.questionId, b.idx)}
                            title="Recompute the recommendation with this answer">
                            <em>"{b.label}"</em>
                            <span className="trans-alt-cta">use this answer ↻</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* === Alternatives === */}
        <div className="result-section">
          <div className="result-section-eyebrow">Alternative candidates</div>
          <div className="comparison-row">
            {top3.map((c, i) => (
              <div key={c.id} className={`compare-card rank-${i}`}>
                <div className="compare-rank">0{i + 1}</div>
                <div className="compare-label" style={{ color: `oklch(0.7 0.2 ${c.hue})` }}>{c.label}</div>
                <div className="compare-bar">
                  <div className="compare-fill" style={{
                    width: `${(c.score / total * 100).toFixed(0)}%`,
                    background: `oklch(0.65 0.22 ${c.hue})`
                  }} />
                </div>
                <div className="compare-score">{(c.score / total * 100).toFixed(0)}% match</div>
                <div className="compare-sub">{c.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* === Reasoning trail === */}
        <div className="result-section">
          <div className="result-section-eyebrow">Your reasoning trail</div>
          <div className="trail">
            {history.map((h, i) => (
              <div className="trail-item" key={i}>
                <div className="trail-q">{h.questionId} &nbsp; {h.questionText}</div>
                <div className="trail-a">→ {h.answerLabel}</div>
                {h.note && <div className="trail-note">"{h.note}"</div>}
              </div>
            ))}
          </div>
        </div>

        <div className="result-actions">
          <button className="btn-primary" onClick={onRestart}>Begin new inquiry</button>
        </div>

        <window.MethodsRecipe winner={winner} history={history} scores={scores} />
      </div>
    </div>
  );
};
