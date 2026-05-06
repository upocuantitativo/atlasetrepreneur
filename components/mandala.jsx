// Mandala3D — the centerpiece. Renders a circular sector chart on an
// SVG plane that we tilt and rotate in CSS 3D space. The "camera" is
// virtual: we move the plane, not a camera, but the perceived effect
// is identical for a single observer.
//
// Props:
//   focusSector: id of the highlighted sector (or null)
//   focusRing:   index of the highlighted ring (or null)
//   tone:        'serif-dark' | 'serif-paper' | 'editorial'

const { useMemo } = React;

window.Mandala3D = function Mandala3D({ focusSector, focusRing, history, totalQuestions, isFinal = false, tone = 'serif-dark', size = 1100, depth = true }) {
  const sectors = window.TAXONOMY.sectors;
  const rings = window.TAXONOMY.rings;
  const cx = size / 2, cy = size / 2;
  const rOuter = size * 0.46;

  // Camera params: very gentle tilt (the disc is almost frontal) so the
  // itinerary drawn on top remains as readable as possible regardless of
  // which sector is in focus. Rotation places the focused sector at the
  // TOP / 12 o'clock so the user reads "you are heading here".
  const { tiltX, rotZ, zoom, translateY } = useMemo(() => {
    if (!depth) return { tiltX: 0, rotZ: 0, zoom: 1, translateY: 0 };
    if (!focusSector) return { tiltX: 8, rotZ: 0, zoom: 1, translateY: 0 };
    const s = sectors.find(s => s.id === focusSector);
    if (!s) return { tiltX: 8, rotZ: 0, zoom: 1, translateY: 0 };
    const rotZ = ((-s.angle) + 360) % 360;
    return { tiltX: 8, rotZ, zoom: 1, translateY: 0 };
  }, [focusSector, focusRing, depth, sectors, size]);

  // Reasoning-path polyline. One vertex per answered question; the radius
  // shrinks monotonically with each answer (outer rim → centre) so
  // points NEVER overlap on the same circle. The angle at each step is the
  // centroid of all cumulative sector scores, which produces an irregular,
  // organic curve that bends toward whichever technique is leading.
  // Labels are placed RADIALLY outward from each vertex to avoid stacking.
  const { path, leaderInfo } = useMemo(() => {
    if (!history || history.length === 0) return { path: [], leaderInfo: null };
    const acc = {};
    const rMax = rOuter * 0.92;
    const rMin = rOuter * 0.08;
    // Estimated total for the spiral. If the caller hasn't told us, use the
    // number of questions in the bank; either way the path keeps tightening.
    const expected = Math.max(history.length, totalQuestions || history.length);
    const built = history.map((h, idx) => {
      Object.entries(h.weights || {}).forEach(([k, v]) => { acc[k] = (acc[k] || 0) + v; });
      // centroid angle from all sectors with non-zero score (vector sum)
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
      // Radius: each answer pulls us one notch closer to the centre.
      const t = (idx + 1) / (expected + 0.6);  // never quite hits 1 mid-flow
      const radius = rMax - (rMax - rMin) * t;
      const x = cx + radius * Math.cos(angleRad);
      const y = cy + radius * Math.sin(angleRad);
      // Outward label position so multiple labels never stack on the same spot
      const labelDist = size * 0.034;
      const lx = cx + (radius + labelDist) * Math.cos(angleRad);
      const ly = cy + (radius + labelDist) * Math.sin(angleRad);
      // Anchor based on quadrant for clean readability
      const cosA = Math.cos(angleRad), sinA = Math.sin(angleRad);
      const anchor = cosA >  0.4 ? 'start' : cosA < -0.4 ? 'end' : 'middle';
      const baseline = sinA >  0.5 ? 'hanging' : sinA < -0.5 ? 'auto' : 'middle';
      // Dominant sector at this step (for colour cues)
      const ranked = Object.entries(acc).sort((a, b) => b[1] - a[1]);
      const leaderId = ranked.length ? ranked[0][0] : null;
      const sector = sectors.find(s => s.id === leaderId) || sectors[0];
      return {
        x, y, lx, ly, anchor, baseline,
        sectorId: sector.id, hue: sector.hue,
        label: shortAnswer(h.answerLabel),
        idx: idx + 1,
        isLast: idx === history.length - 1,
      };
    });
    // Compute the destination badge (centre): current leading sector overall.
    const ranked = Object.entries(acc).sort((a, b) => b[1] - a[1]);
    const leaderId = ranked.length ? ranked[0][0] : null;
    const leader = sectors.find(s => s.id === leaderId);
    return { path: built, leaderInfo: leader ? { label: leader.label, hue: leader.hue, sub: leader.sub } : null };
  }, [history, sectors, rings, rOuter, cx, cy, size, totalQuestions]);

  // Theme palette per tone.
  const theme = TONES[tone] || TONES['serif-dark'];

  // Build sector wedge paths. With N sectors, each spans 360/N degrees.
  const SPAN = 360 / sectors.length;
  const wedge = (angleDeg, span = SPAN, rIn = 0, rOut = rOuter) => {
    const a0 = ((angleDeg - span / 2) - 90) * Math.PI / 180;
    const a1 = ((angleDeg + span / 2) - 90) * Math.PI / 180;
    const x0o = cx + rOut * Math.cos(a0), y0o = cy + rOut * Math.sin(a0);
    const x1o = cx + rOut * Math.cos(a1), y1o = cy + rOut * Math.sin(a1);
    const x0i = cx + rIn * Math.cos(a0),  y0i = cy + rIn * Math.sin(a0);
    const x1i = cx + rIn * Math.cos(a1),  y1i = cy + rIn * Math.sin(a1);
    const large = span > 180 ? 1 : 0;
    if (rIn === 0) {
      return `M ${cx} ${cy} L ${x0o} ${y0o} A ${rOut} ${rOut} 0 ${large} 1 ${x1o} ${y1o} Z`;
    }
    return `M ${x0i} ${y0i} L ${x0o} ${y0o} A ${rOut} ${rOut} 0 ${large} 1 ${x1o} ${y1o} L ${x1i} ${y1i} A ${rIn} ${rIn} 0 ${large} 0 ${x0i} ${y0i} Z`;
  };

  return (
    <div className="mandala-stage" style={{ '--mandala-bg': theme.bg }}>
      {/* Atmospheric backdrop layers */}
      <div className="mandala-atmo" style={{ background: theme.atmo }} />
      <div className="mandala-stars" />

      <div
        className="mandala-plane"
        style={{
          width: size,
          height: size,
          transform: `translateY(${translateY}px) rotateX(${tiltX}deg) rotateZ(${rotZ}deg) scale(${zoom})`,
        }}
      >
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
          <defs>
            <radialGradient id="vignette" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={theme.coreGlow} stopOpacity="0.9" />
              <stop offset="60%" stopColor={theme.coreGlow} stopOpacity="0.05" />
              <stop offset="100%" stopColor={theme.coreGlow} stopOpacity="0" />
            </radialGradient>
            {sectors.map(s => (
              <radialGradient key={`g-${s.id}`} id={`grad-${s.id}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%"  stopColor={`oklch(0.78 0.13 ${s.hue})`} stopOpacity={theme.fillStrong} />
                <stop offset="70%" stopColor={`oklch(0.72 0.15 ${s.hue})`} stopOpacity={theme.fillMid} />
                <stop offset="100%" stopColor={`oklch(0.62 0.16 ${s.hue})`} stopOpacity={theme.fillEdge} />
              </radialGradient>
            ))}
          </defs>

          {/* Glow under the wheel */}
          <circle cx={cx} cy={cy} r={rOuter * 1.18} fill="url(#vignette)" />

          {/* Sector wedges */}
          {sectors.map(s => {
            const isFocus = focusSector === s.id;
            const isDim = focusSector && !isFocus;
            return (
              <g key={s.id}>
                <path
                  d={wedge(s.angle, SPAN, 0, rOuter)}
                  fill={`url(#grad-${s.id})`}
                  opacity={isDim ? 0.32 : (isFocus ? 1 : 0.78)}
                  stroke={isFocus ? `oklch(0.55 0.20 ${s.hue})` : 'none'}
                  strokeWidth={isFocus ? 2 : 0}
                  style={{ transition: 'opacity 0.6s ease' }}
                />
              </g>
            );
          })}

          {/* Concentric rings */}
          {rings.map((r, i) => {
            const radius = rOuter * r.rNorm;
            const isFocus = focusRing === i;
            return (
              <circle
                key={r.id}
                cx={cx} cy={cy} r={radius}
                fill="none"
                stroke={theme.ringStroke}
                strokeWidth={isFocus ? 3.5 : 1.2}
                strokeOpacity={isFocus ? 0.95 : 0.45}
                strokeDasharray={i === 1 ? '6 8' : i === 2 ? '2 6' : 'none'}
                style={{ transition: 'all 0.6s ease' }}
              />
            );
          })}

          {/* Sector divider lines */}
          {sectors.map(s => {
            const a = ((s.angle - SPAN / 2) - 90) * Math.PI / 180;
            const x = cx + rOuter * Math.cos(a);
            const y = cy + rOuter * Math.sin(a);
            return (
              <line key={`div-${s.id}`} x1={cx} y1={cy} x2={x} y2={y}
                stroke={theme.ringStroke} strokeOpacity="0.35" strokeWidth="1" />
            );
          })}

          {/* Sector labels — positioned outside the wheel */}
          {sectors.map(s => {
            const a = (s.angle - 90) * Math.PI / 180;
            const lx = cx + rOuter * 1.08 * Math.cos(a);
            const ly = cy + rOuter * 1.08 * Math.sin(a);
            const isFocus = focusSector === s.id;
            const isDim = focusSector && !isFocus;
            return (
              <g key={`lbl-${s.id}`} opacity={isDim ? 0.25 : 1} style={{ transition: 'opacity 0.6s' }}>
                <text x={lx} y={ly}
                  fill={theme.label}
                  fontSize={size * 0.022}
                  fontFamily={theme.serif}
                  textAnchor="middle"
                  fontWeight={isFocus ? 600 : 400}
                  letterSpacing="0.04em"
                  style={{ textTransform: 'uppercase' }}>
                  {s.label}
                </text>
                <text x={lx} y={ly + size * 0.025}
                  fill={theme.labelDim}
                  fontSize={size * 0.014}
                  fontFamily={theme.serif}
                  textAnchor="middle"
                  fontStyle="italic">
                  {s.sub}
                </text>
              </g>
            );
          })}

          {/* Ring labels — at top of each ring */}
          {rings.map((r, i) => {
            const radius = rOuter * r.rNorm;
            return (
              <text key={`rlbl-${r.id}`}
                x={cx} y={cy - radius - 6}
                fill={theme.ringLabel}
                fontSize={size * 0.013}
                fontFamily={theme.serif}
                textAnchor="middle"
                fontStyle="italic"
                letterSpacing="0.18em"
                opacity={focusRing === i ? 1 : 0.55}
                style={{ textTransform: 'uppercase' }}>
                {r.label}
              </text>
            );
          })}

          {/* Center node */}
          <circle cx={cx} cy={cy} r={size * 0.012} fill={theme.coreGlow} />
          <circle cx={cx} cy={cy} r={size * 0.024} fill="none"
            stroke={theme.coreGlow} strokeOpacity="0.6" strokeWidth="1" />

          {/* Path overlay rendered on a SEPARATE layer below — kept out of
              the tilted plane so the trail is always visible head-on. */}
        </svg>
      </div>

      {/* Reasoning path: separate layer that ROTATES with the disc but does
          NOT inherit the X-tilt. This guarantees the entire itinerary is
          visible no matter which sector is in focus. */}
      <div
        className="mandala-path-layer"
        style={{
          width: size, height: size,
          transform: `rotateZ(${rotZ}deg)`,
        }}
      >
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
          {path.length > 1 && (
            <polyline
              points={path.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#000"
              strokeOpacity="0.9"
              strokeWidth={size * 0.0036}
              strokeLinecap="round"
              strokeLinejoin="round" />
          )}
          {path.map((p, i) => (
            <g key={`pp-${i}`}>
              <circle cx={p.x} cy={p.y} r={size * 0.014}
                fill="#000" stroke="#fff" strokeWidth={size * 0.002} />
              <text
                x={p.x} y={p.y + size * 0.004}
                fill="#fff"
                fontSize={size * 0.011}
                fontFamily={theme.serif}
                textAnchor="middle"
                fontWeight={600}>{p.idx}</text>
              {/* Counter-rotate the label so reading direction stays upright
                  even though the layer itself is rotated with the disc. */}
              <text
                x={p.lx} y={p.ly}
                fill="#fff"
                fontSize={size * 0.013}
                fontFamily={theme.serif}
                textAnchor={p.anchor}
                dominantBaseline={p.baseline}
                paintOrder="stroke"
                stroke="#000"
                strokeWidth={size * 0.0035}
                strokeLinejoin="round"
                transform={`rotate(${-rotZ}, ${p.lx}, ${p.ly})`}>
                {p.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};

const TONES = {
  'serif-dark': {
    bg: 'radial-gradient(ellipse at 50% 40%, #0e1632 0%, #050813 60%, #02030a 100%)',
    atmo: 'radial-gradient(ellipse at 50% 30%, rgba(60, 90, 200, 0.18) 0%, rgba(0,0,0,0) 60%)',
    coreGlow: '#cfe1ff',
    ringStroke: '#8aa4d6',
    ringLabel: '#9bb0d8',
    label: '#e8eeff',
    labelDim: '#9bb0d8',
    serif: '"EB Garamond", "Cormorant Garamond", Georgia, serif',
    fillStrong: 0.55, fillMid: 0.32, fillEdge: 0.15,
  },
  'serif-paper': {
    bg: 'radial-gradient(ellipse at 50% 40%, #f7f1e3 0%, #ece3cd 70%, #d9cdb0 100%)',
    atmo: 'radial-gradient(ellipse at 50% 30%, rgba(120, 80, 30, 0.10) 0%, rgba(0,0,0,0) 60%)',
    coreGlow: '#3a2a18',
    ringStroke: '#3a2a18',
    ringLabel: '#5a4530',
    label: '#1a1208',
    labelDim: '#7a6244',
    serif: '"EB Garamond", "Cormorant Garamond", Georgia, serif',
    fillStrong: 0.7, fillMid: 0.5, fillEdge: 0.3,
  },
  'editorial': {
    bg: 'linear-gradient(180deg, #ffffff 0%, #f5f5f0 100%)',
    atmo: 'radial-gradient(ellipse at 50% 30%, rgba(40, 60, 120, 0.04) 0%, rgba(0,0,0,0) 60%)',
    coreGlow: '#1a2540',
    ringStroke: '#3a4566',
    ringLabel: '#1a2540',
    label: '#0e1530',
    labelDim: '#5e6680',
    serif: '"Cormorant Garamond", "EB Garamond", Georgia, serif',
    fillStrong: 0.85, fillMid: 0.65, fillEdge: 0.4,
  },
};

window.MANDALA_TONES = TONES;

// Compress an answer label into ~3 words for plotting on the polyline.
function shortAnswer(s) {
  if (!s) return '';
  // Drop everything from the first dash, em-dash or parenthesis onward.
  const cut = s.split(/[—–\-(]/)[0].trim();
  const words = cut.split(/\s+/);
  if (words.length <= 4) return cut;
  return words.slice(0, 4).join(' ') + '…';
}
