// MiniMap — small mandala echo with labeled sectors and current position pin.
// Each sector wedge is labeled with its short name on hover and inline when
// focused, so the user can always read "this is X technique".

window.MiniMap = function MiniMap({ focusSector, focusRing, scores, tone = 'serif-dark' }) {
  const sectors = window.TAXONOMY.sectors;
  const rings = window.TAXONOMY.rings;
  const size = 220;
  const cx = size / 2, cy = size / 2;
  const rOuter = size * 0.36;
  const rLabel = size * 0.46;
  const theme = window.MANDALA_TONES[tone] || window.MANDALA_TONES['serif-dark'];

  const max = Math.max(1, ...Object.values(scores || {}));
  const SPAN = 360 / sectors.length;

  const wedge = (angle, span = SPAN) => {
    const a0 = ((angle - span / 2) - 90) * Math.PI / 180;
    const a1 = ((angle + span / 2) - 90) * Math.PI / 180;
    const x0 = cx + rOuter * Math.cos(a0), y0 = cy + rOuter * Math.sin(a0);
    const x1 = cx + rOuter * Math.cos(a1), y1 = cy + rOuter * Math.sin(a1);
    return `M ${cx} ${cy} L ${x0} ${y0} A ${rOuter} ${rOuter} 0 0 1 ${x1} ${y1} Z`;
  };

  let pin = null;
  if (focusSector) {
    const s = sectors.find(s => s.id === focusSector);
    const ringIdx = focusRing != null ? focusRing : 0;
    const radius = rOuter * rings[ringIdx].rNorm * 0.85;
    const a = (s.angle - 90) * Math.PI / 180;
    pin = { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) };
  }

  // Short labels (compact for the mini-map)
  const SHORT = {
    anova: 'CONTRASTS', regression: 'REG/SEM', fsqca: 'fsQCA', plssem: 'PLS-SEM',
    cluster: 'CLUSTER', trees: 'TREES', xai: 'XAI/EBM', deep: 'NEURAL NETWORK',
  };

  return (
    <div className={`mini-map tone-${tone}`}>
      <div className="mini-title">Position</div>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        {sectors.map(s => {
          const score = (scores && scores[s.id]) || 0;
          const intensity = score / max;
          const isFocus = focusSector === s.id;
          return (
            <path key={s.id} d={wedge(s.angle)}
              fill={isFocus
                ? `oklch(0.72 0.20 ${s.hue} / 0.95)`
                : `oklch(0.68 0.18 ${s.hue} / ${0.18 + intensity * 0.55})`}
              stroke={isFocus ? `oklch(0.5 0.22 ${s.hue})` : theme.ringStroke}
              strokeWidth={isFocus ? 1.8 : 0.6}
              strokeOpacity={isFocus ? 1 : 0.45} />
          );
        })}
        {rings.map(r => (
          <circle key={r.id} cx={cx} cy={cy} r={rOuter * r.rNorm}
            fill="none" stroke={theme.ringStroke} strokeOpacity="0.45" strokeWidth="0.6" />
        ))}
        {/* Sector labels around the perimeter */}
        {sectors.map(s => {
          const a = (s.angle - 90) * Math.PI / 180;
          const lx = cx + rLabel * Math.cos(a);
          const ly = cy + rLabel * Math.sin(a);
          const isFocus = focusSector === s.id;
          return (
            <text key={`l-${s.id}`} x={lx} y={ly}
              fill={isFocus ? `oklch(0.45 0.22 ${s.hue})` : theme.label}
              fontSize="9"
              fontFamily={theme.serif}
              fontWeight={isFocus ? 700 : 500}
              letterSpacing="0.08em"
              textAnchor="middle"
              dominantBaseline="middle"
              opacity={isFocus ? 1 : 0.75}>
              {SHORT[s.id] || s.label}
            </text>
          );
        })}
        {pin && (
          <g>
            <circle cx={pin.x} cy={pin.y} r={7} fill={theme.coreGlow} opacity="0.25" />
            <circle cx={pin.x} cy={pin.y} r={3.5} fill={theme.coreGlow} />
          </g>
        )}
      </svg>
    </div>
  );
};

window.Breadcrumbs = function Breadcrumbs({ history, onJump }) {
  if (!history || history.length === 0) return null;
  return (
    <div className="breadcrumbs">
      {history.map((h, i) => (
        <button key={i} className="crumb" onClick={() => onJump(i)}>
          <span className="crumb-q">{h.questionId}</span>
          <span className="crumb-a">{h.answerLabel}</span>
        </button>
      ))}
    </div>
  );
};
