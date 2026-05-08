// ItineraryMap — compact circular mandala that shows the user's reasoning
// trail: sectors as colored wedges, concentric rings for question depth, and
// a polyline connecting the path the user walked. The winning sector is
// highlighted. Used at the top-right of the result screen.

window.ItineraryMap = function ItineraryMap({ history, scores, winnerId, tone = 'serif-dark', size = 200 }) {
  const sectors = (window.TAXONOMY && window.TAXONOMY.sectors) || [];
  const rings = (window.TAXONOMY && window.TAXONOMY.rings) || [];
  if (!sectors.length || !rings.length) return null;

  const cx = size / 2, cy = size / 2;
  const rOuter = size * 0.40;
  const theme = (window.MANDALA_TONES && window.MANDALA_TONES[tone]) || (window.MANDALA_TONES && window.MANDALA_TONES['serif-dark']) || { ringStroke: 'rgba(0,0,0,0.25)', label: '#222', serif: 'serif', coreGlow: '#4f7cff' };

  const max = Math.max(1, ...Object.values(scores || {}));
  const SPAN = 360 / sectors.length;

  const wedge = (angle, span = SPAN) => {
    const a0 = ((angle - span / 2) - 90) * Math.PI / 180;
    const a1 = ((angle + span / 2) - 90) * Math.PI / 180;
    const x0 = cx + rOuter * Math.cos(a0), y0 = cy + rOuter * Math.sin(a0);
    const x1 = cx + rOuter * Math.cos(a1), y1 = cy + rOuter * Math.sin(a1);
    return `M ${cx} ${cy} L ${x0} ${y0} A ${rOuter} ${rOuter} 0 0 1 ${x1} ${y1} Z`;
  };

  // Re-derive the path the same way the big mandala does: ring band per
  // ring index, sub-radius by chronological slot inside the ring, angle by
  // cumulative sector centroid. Kept self-contained so this component
  // can render with just `history` + `scores`.
  const r0 = rings[0] ? rings[0].rNorm : 0.95;
  const r1 = rings[1] ? rings[1].rNorm : 0.65;
  const r2 = rings[2] ? rings[2].rNorm : 0.35;
  const ringBands = [
    { outer: r0,            inner: (r0 + r1) / 2 },
    { outer: (r0 + r1) / 2, inner: (r1 + r2) / 2 },
    { outer: (r1 + r2) / 2, inner: Math.max(0.06, r2 * 0.25) },
  ];

  const expectedPerRing = [0, 0, 0];
  const bank = (window.QUESTIONS || []);
  bank.forEach(q => {
    const r = Math.max(0, Math.min(2, q.ring ?? 0));
    expectedPerRing[r]++;
  });
  if (expectedPerRing.every(n => n === 0) && history) {
    history.forEach(h => {
      const r = Math.max(0, Math.min(2, h.ring ?? 0));
      expectedPerRing[r]++;
    });
  }

  const ringSlot = [0, 0, 0];
  const acc = {};
  const points = (history || []).map((h) => {
    Object.entries(h.weights || {}).forEach(([k, v]) => { acc[k] = (acc[k] || 0) + v; });
    let sumX = 0, sumY = 0, totalScore = 0;
    for (const sec of sectors) {
      const score = acc[sec.id] || 0;
      if (score <= 0) continue;
      const ang = (sec.angle - 90) * Math.PI / 180;
      sumX += score * Math.cos(ang);
      sumY += score * Math.sin(ang);
      totalScore += score;
    }
    const angleRad = totalScore > 0 ? Math.atan2(sumY, sumX) : -Math.PI / 2;
    const ring = Math.max(0, Math.min(2, h.ring ?? 0));
    const band = ringBands[ring];
    const slot = ringSlot[ring];
    ringSlot[ring]++;
    const total = Math.max(1, expectedPerRing[ring]);
    const sub = total > 1 ? slot / (total - 1) : 0;
    const radiusNorm = band.outer - (band.outer - band.inner) * sub;
    const radius = rOuter * radiusNorm;
    return {
      x: cx + radius * Math.cos(angleRad),
      y: cy + radius * Math.sin(angleRad),
      ring,
      qid: h.questionId,
    };
  });

  const polyline = points.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');

  return (
    <div className={`itinerary-map tone-${tone}`}>
      <div className="itinerary-title">Your itinerary</div>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="Reasoning trail">
        <defs>
          <radialGradient id="itin-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={theme.coreGlow || '#4f7cff'} stopOpacity="0.25" />
            <stop offset="100%" stopColor={theme.coreGlow || '#4f7cff'} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r={rOuter * 1.05} fill="url(#itin-glow)" />
        {sectors.map(s => {
          const score = (scores && scores[s.id]) || 0;
          const intensity = score / max;
          const isWinner = s.id === winnerId;
          return (
            <path key={s.id} d={wedge(s.angle)}
              fill={isWinner
                ? `oklch(0.72 0.20 ${s.hue} / 0.95)`
                : `oklch(0.68 0.18 ${s.hue} / ${0.16 + intensity * 0.50})`}
              stroke={isWinner ? `oklch(0.5 0.22 ${s.hue})` : theme.ringStroke}
              strokeWidth={isWinner ? 1.8 : 0.6}
              strokeOpacity={isWinner ? 1 : 0.45} />
          );
        })}
        {rings.map(r => (
          <circle key={r.id} cx={cx} cy={cy} r={rOuter * r.rNorm}
            fill="none" stroke={theme.ringStroke} strokeOpacity="0.42" strokeWidth="0.6" />
        ))}
        {points.length > 1 && (
          <polyline points={polyline}
            fill="none" stroke={theme.coreGlow || '#4f7cff'}
            strokeWidth="1.6" strokeOpacity="0.85"
            strokeLinejoin="round" strokeLinecap="round" />
        )}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={i === points.length - 1 ? 4.5 : 2.8}
              fill={i === points.length - 1 ? (theme.coreGlow || '#4f7cff') : '#fff'}
              stroke={theme.coreGlow || '#4f7cff'} strokeWidth={i === points.length - 1 ? 1.4 : 1} />
            {i === points.length - 1 && (
              <circle cx={p.x} cy={p.y} r={9}
                fill="none" stroke={theme.coreGlow || '#4f7cff'} strokeOpacity="0.35" strokeWidth="1" />
            )}
          </g>
        ))}
      </svg>
      <div className="itinerary-legend">
        <span className="itinerary-step-count">{points.length} step{points.length === 1 ? '' : 's'}</span>
      </div>
    </div>
  );
};
