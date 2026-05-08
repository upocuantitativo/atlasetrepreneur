// ResultScreen — shown when the adaptive flow ends. Sections:
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

window.ResultScreen = function ResultScreen({ scores, history, onRestart, tone = 'serif-dark' }) {
  const sectors = window.TAXONOMY.sectors;
  const ranked = [...sectors]
    .map(s => ({ ...s, score: scores[s.id] || 0 }))
    .sort((a, b) => b.score - a.score);

  const winner = ranked[0];
  const top3 = ranked.slice(0, 3);
  const total = top3.reduce((a, b) => a + b.score, 0) || 1;
  const transformations = buildTransformationConditions(history, winner);

  return (
    <div className={`result-screen tone-${tone}`}>
      <div className="result-inner">
        <div className="result-eyebrow">Recommendation</div>
        <h1 className="result-title">
          <span className="result-title-em" style={{ color: `oklch(0.7 0.22 ${winner.hue})` }}>{winner.label}</span>
        </h1>
        <div className="result-sub">{winner.goal}</div>
        {winner.description && <p className="result-description">{winner.description}</p>}

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
              technique. Only shown when at least one of the user's answers
              has weight 0 (or negative) for the winner while a different
              answer to the same question would have supported it. === */}
        {transformations.length > 0 && (
          <div className="result-section">
            <div className="result-section-eyebrow">
              Conditions for switching to {winner.label}
            </div>
            <p className="result-section-hint">
              The recommendation above reflects the design choices you made.
              Some of those choices carry a <strong>0 weight</strong> for{' '}
              {winner.label} — meaning, in their current form, they are not
              compatible with this technique. To actually apply it you would
              need to <em>transform your design</em> on the points listed below.
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
                    <span className="trans-label">Switch to:</span>
                    <ul className="trans-alt-list">
                      {t.better.map((b, j) => (
                        <li key={j}><em>"{b.label}"</em></li>
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
