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

  // Full method names, split into (at most) two balanced lines so long
  // names like NEURAL NETWORK or EXPLAINABLE AI / EBM never overflow.
  const wrapLabel = (label) => {
    // Keep the field's own casing for fsQCA; uppercase the rest.
    const up = label === 'fsQCA' ? label : label.toUpperCase();
    if (up.length <= 10) return [up];
    const words = up.split(/\s+/);
    if (words.length === 1) return [up];
    let best = null;
    for (let i = 1; i < words.length; i++) {
      const l1 = words.slice(0, i).join(' ');
      const l2 = words.slice(i).join(' ');
      const span = Math.max(l1.length, l2.length);
      if (!best || span < best.span) best = { span, lines: [l1, l2] };
    }
    return best.lines;
  };

  // The viewBox is padded on every side: the labels sit OUTSIDE the wheel
  // (at rLabel > rOuter), so without the padding the SVG edge truncated
  // them — "NEURAL NETWORK" rendered as "EURAL NETWORK", "PLS-SEM" as
  // "PLS-SE", etc.
  const PAD_X = 48, PAD_Y = 16;

  return (
    <div className={`mini-map tone-${tone}`}>
      <div className="mini-title">Position</div>
      <svg viewBox={`${-PAD_X} ${-PAD_Y} ${size + PAD_X * 2} ${size + PAD_Y * 2}`}
        width={size + PAD_X * 2} height={size + PAD_Y * 2}>
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
        {/* Sector labels around the perimeter — full names, 1-2 lines */}
        {sectors.map(s => {
          const a = (s.angle - 90) * Math.PI / 180;
          const lx = cx + rLabel * Math.cos(a);
          const ly = cy + rLabel * Math.sin(a);
          const isFocus = focusSector === s.id;
          const lines = wrapLabel(s.label);
          const LH = 10;
          const y0 = ly - ((lines.length - 1) * LH) / 2;
          return (
            <text key={`l-${s.id}`} x={lx} y={y0}
              fill={isFocus ? `oklch(0.45 0.22 ${s.hue})` : theme.label}
              fontSize="9"
              fontFamily={theme.serif}
              fontWeight={isFocus ? 700 : 500}
              letterSpacing="0.06em"
              textAnchor="middle"
              dominantBaseline="middle"
              opacity={isFocus ? 1 : 0.75}>
              {lines.map((ln, li) => (
                <tspan key={li} x={lx} dy={li === 0 ? 0 : LH}>{ln}</tspan>
              ))}
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
      {/* Crisp HTML caption for the leading method — this replaces the
          italic sub-labels that used to sit under every method name on
          the tilted big wheel, where the 3D effect made them illegible. */}
      {focusSector && (() => {
        const f = sectors.find(s => s.id === focusSector);
        if (!f) return null;
        return (
          <div className="mini-focus">
            <div className="mini-focus-name" style={{ color: `oklch(0.45 0.2 ${f.hue})` }}>{f.label}</div>
            <div className="mini-focus-sub">{f.sub}</div>
          </div>
        );
      })()}
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
