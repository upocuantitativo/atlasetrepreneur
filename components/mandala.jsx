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

  // Camera params are derived AFTER the path useMemo so the disc can be
  // rotated to put the LATEST vertex of the itinerary at the top (north).
  // That keeps the most recent reasoning step in focus while the older
  // vertices fan out toward the front/bottom — the area closest to the
  // viewer with the X-tilt — so the most of the trail stays visible.
  const tiltX = depth ? 28 : 0;

  // Reasoning-path polyline. One vertex per answered question; the radius
  // shrinks monotonically with each answer (outer rim → centre) so
  // points NEVER overlap on the same circle. The angle at each step is the
  // centroid of all cumulative sector scores, which produces an irregular,
  // organic curve that bends toward whichever technique is leading.
  // Labels are placed RADIALLY outward from each vertex to avoid stacking.
  const { path, leaderInfo } = useMemo(() => {
    if (!history || history.length === 0) return { path: [], leaderInfo: null };
    const acc = {};

    // Three concentric BANDS, one per ring:
    //   ring 0 (Analytical goal)   → outermost band, anchored on the outer ring
    //   ring 1 (Data structure)    → middle band, anchored on the middle ring
    //   ring 2 (Assumptions)       → innermost band, anchored on the inner ring
    // Each answered question gets its own sub-radius within its ring's band
    // (chronological order of that ring's answers).  This gives the user the
    // visual story they asked for: goal questions on the outside, data
    // questions in the middle, assumption questions near the centre — and
    // multiple questions of the same type stack as concentric sub-circles.
    const r0 = rings[0] ? rings[0].rNorm : 0.95;
    const r1 = rings[1] ? rings[1].rNorm : 0.65;
    const r2 = rings[2] ? rings[2].rNorm : 0.35;
    const ringBands = [
      { outer: r0,            inner: (r0 + r1) / 2 },     // ring 0 band
      { outer: (r0 + r1) / 2, inner: (r1 + r2) / 2 },     // ring 1 band
      { outer: (r1 + r2) / 2, inner: Math.max(0.06, r2 * 0.25) }, // ring 2 band
    ];

    // Count how many questions exist per ring in the bank (for sub-radius
    // spacing). Falls back to history-only counts if the bank isn't loaded.
    const expectedPerRing = [0, 0, 0];
    const bank = (window.QUESTIONS || []);
    bank.forEach(q => {
      const r = Math.max(0, Math.min(2, q.ring ?? 0));
      expectedPerRing[r]++;
    });
    if (expectedPerRing.every(n => n === 0)) {
      history.forEach(h => {
        const r = Math.max(0, Math.min(2, h.ring ?? 0));
        expectedPerRing[r]++;
      });
    }

    const ringSlot = [0, 0, 0];

    const built = history.map((h, idx) => {
      Object.entries(h.weights || {}).forEach(([k, v]) => { acc[k] = (acc[k] || 0) + v; });
      // Vertex angle: score centroid CLAMPED into the current leader's
      // wedge (see vertexAngleForScores) so the dot always sits inside
      // the sector that is being highlighted.
      const { angleRad, sector } = vertexAngleForScores(acc, sectors);

      // Radius from this question's ring band + sub-slot
      const ring = Math.max(0, Math.min(2, h.ring ?? 0));
      const band = ringBands[ring];
      const slot = ringSlot[ring];
      ringSlot[ring]++;
      const total = Math.max(1, expectedPerRing[ring]);
      const sub = total > 1 ? slot / (total - 1) : 0;            // 0 (outer of band) → 1 (inner of band)
      const radiusNorm = band.outer - (band.outer - band.inner) * sub;
      const radius = rOuter * radiusNorm;

      const x = cx + radius * Math.cos(angleRad);
      const y = cy + radius * Math.sin(angleRad);
      return {
        x, y, angleRad,
        sectorId: sector.id, hue: sector.hue,
        label: shortAnswer(h.answerLabel),
        idx: idx + 1,
        ring,
        isLast: idx === history.length - 1,
      };
    });
    const ranked = Object.entries(acc).sort((a, b) => b[1] - a[1]);
    const leaderId = ranked.length ? ranked[0][0] : null;
    const leader = sectors.find(s => s.id === leaderId);
    return { path: built, leaderInfo: leader ? { label: leader.label, hue: leader.hue, sub: leader.sub } : null };
  }, [history, sectors, rings, rOuter, cx, cy, size, totalQuestions]);

  // Rotate the disc so that the LATEST vertex of the itinerary lands at
  // the top (north). That keeps the most recent reasoning step in
  // focus while pushing the rest of the trail toward the front-bottom
  // of the screen, which is the area closest to the viewer with the
  // X-tilt — i.e. the most visible.
  //
  // We also shift the disc DOWN by ~18% of its size: with the centred
  // 3D layout the disc's projected height (size * cos28° ≈ 0.88·size)
  // overflows shorter viewports, hiding the north pole — i.e. the
  // latest vertex. The downward shift keeps the upper half (where the
  // path always lives, since the latest vertex is rotated to north and
  // the path runs inward toward the centre) inside the viewport at the
  // cost of letting the empty bottom half slip below the fold. This
  // matches the user request: "always half a sphere visible, so the
  // path is always on screen".
  const { rotZ, zoom, translateY } = useMemo(() => {
    const shift = depth ? size * 0.06 : 0;
    if (!depth) return { rotZ: 0, zoom: 1, translateY: 0 };
    if (path.length === 0) {
      // No history yet — fall back to focusSector if any
      if (!focusSector) return { rotZ: 0, zoom: 1, translateY: shift };
      const s = sectors.find(s => s.id === focusSector);
      if (!s) return { rotZ: 0, zoom: 1, translateY: shift };
      return { rotZ: ((-s.angle) + 360) % 360, zoom: 1, translateY: shift };
    }
    const last = path[path.length - 1];
    const mathAngleDeg = Math.atan2(last.y - cy, last.x - cx) * 180 / Math.PI;
    const sectorAngleDeg = mathAngleDeg + 90; // 0° = top in our convention
    const rotZ = ((-sectorAngleDeg) + 360) % 360;
    return { rotZ, zoom: 1, translateY: shift };
  }, [path, focusSector, depth, sectors, cx, cy, size]);

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
        {/* width/height 100%: the plane div is capped by CSS (82vmin), so a
            fixed pixel size here would hang the drawing out of the div —
            off-centre AND orbiting on rotateZ (the CSS pivot is the div
            centre, not the drawing centre). overflow:visible — sector
            names sit at the rim (≈ the viewBox edge at the cardinal
            points); without it the glyph ascenders are clipped, e.g.
            "GROUP CONTRASTS" losing its top half at north. */}
        <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="100%" style={{ overflow: 'visible' }}>
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

          {/* Sector labels — positioned outside the wheel. Each label is
              counter-rotated by -rotZ around its own anchor so it reads
              horizontally on screen no matter which sector the disc has
              been rotated to. A halo stroke (paintOrder) keeps the name
              legible over wedges, the itinerary trail and the backdrop. */}
          {sectors.map(s => {
            const a = (s.angle - 90) * Math.PI / 180;
            const lx = cx + rOuter * 1.08 * Math.cos(a);
            const ly = cy + rOuter * 1.08 * Math.sin(a);
            const isFocus = focusSector === s.id;
            const isDim = focusSector && !isFocus;
            return (
              <g key={`lbl-${s.id}`} opacity={isDim ? 0.42 : 1}
                style={{ transition: 'opacity 0.6s' }}
                transform={`rotate(${-rotZ}, ${lx}, ${ly})`}>
                <text x={lx} y={ly}
                  fill={theme.label}
                  fontSize={size * (isFocus ? 0.031 : 0.025)}
                  fontFamily={theme.serif}
                  textAnchor="middle"
                  fontWeight={isFocus ? 700 : 400}
                  letterSpacing="0.04em"
                  paintOrder="stroke"
                  stroke={theme.halo}
                  strokeWidth={size * 0.0065}
                  strokeLinejoin="round"
                  style={{ textTransform: 'uppercase' }}>
                  {s.label}
                </text>
                <text x={lx} y={ly + size * 0.027}
                  fill={theme.labelDim}
                  fontSize={size * 0.016}
                  fontFamily={theme.serif}
                  textAnchor="middle"
                  paintOrder="stroke"
                  stroke={theme.halo}
                  strokeWidth={size * 0.004}
                  strokeLinejoin="round"
                  fontStyle="italic">
                  {s.sub}
                </text>
              </g>
            );
          })}

          {/* Ring labels — pinned to a fixed SCREEN position (upper-left
              diagonal) instead of the disc's north, so they never fight
              with the focused method name or the latest itinerary label
              at the top, and never sink under the dialog bar at the
              bottom. The disc angle is compensated by rotZ so the label
              lands at the same screen spot after the disc rotates, and
              the text itself is counter-rotated to read horizontally. */}
          {rings.map((r, i) => {
            // Slight radial offset so the ring's own stroke does not
            // strike through the words.
            const radius = rOuter * r.rNorm + size * 0.014;
            const aDisc = ((300 - 90) - rotZ) * Math.PI / 180;
            const x = cx + radius * Math.cos(aDisc);
            const y = cy + radius * Math.sin(aDisc);
            return (
              <text key={`rlbl-${r.id}`}
                x={x} y={y}
                fill={theme.ringLabel}
                fontSize={size * 0.0145}
                fontFamily={theme.serif}
                textAnchor="middle"
                fontStyle="italic"
                letterSpacing="0.18em"
                paintOrder="stroke"
                stroke={theme.halo}
                strokeWidth={size * 0.0035}
                strokeLinejoin="round"
                opacity={focusRing === i ? 1 : 0.55}
                transform={`rotate(${-rotZ}, ${x}, ${y})`}
                style={{ textTransform: 'uppercase' }}>
                {r.label}
              </text>
            );
          })}

          {/* Center node */}
          <circle cx={cx} cy={cy} r={size * 0.012} fill={theme.coreGlow} />
          <circle cx={cx} cy={cy} r={size * 0.024} fill="none"
            stroke={theme.coreGlow} strokeOpacity="0.6" strokeWidth="1" />

          {/* Reasoning-path polyline drawn DIRECTLY on the disc so the
              vertices snap to the same rings the user sees: the first
              vertex lands on the outer ring exactly because both the ring
              circle and the vertex are computed at rOuter * 0.95 in the
              same SVG coordinate space. The path inherits the disc's
              X-tilt and Z-rotation, so it stays welded to the disc no
              matter which sector is in focus. */}
          {path.length > 1 && (
            <polyline
              points={path.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#000"
              strokeOpacity="0.92"
              strokeWidth={size * 0.0042}
              strokeLinecap="round"
              strokeLinejoin="round" />
          )}
          {path.map((p, i) => {
            // Label placement happens in SCREEN space: the text is counter-
            // rotated by -rotZ around the vertex, which composes with the
            // disc's CSS rotateZ into the identity — so an (ox, oy) offset
            // from the vertex maps 1:1 to screen right/down. The LAST
            // vertex is always rotated to north, right under the focused
            // method name, so its label goes DOWNWARD (toward the centre)
            // instead of outward; older vertices label radially outward
            // along their on-screen direction.
            const rotZRad = rotZ * Math.PI / 180;
            const screenAng = p.angleRad + rotZRad;
            const cosS = Math.cos(screenAng), sinS = Math.sin(screenAng);
            const labelDist = size * 0.05;
            const ox = p.isLast ? 0 : labelDist * cosS;
            const oy = p.isLast ? labelDist * 1.1 : labelDist * sinS;
            const anchor = p.isLast ? 'middle'
              : (cosS > 0.4 ? 'start' : cosS < -0.4 ? 'end' : 'middle');
            const baseline = p.isLast ? 'hanging'
              : (sinS > 0.5 ? 'hanging' : sinS < -0.5 ? 'auto' : 'middle');
            return (
              <g key={`pp-${i}`}>
                <circle cx={p.x} cy={p.y} r={size * 0.019}
                  fill="#000" stroke="#fff" strokeWidth={size * 0.0028} />
                <text
                  x={p.x} y={p.y + size * 0.0065}
                  fill="#fff"
                  fontSize={size * 0.017}
                  fontFamily={theme.serif}
                  textAnchor="middle"
                  fontWeight={700}
                  transform={`rotate(${-rotZ}, ${p.x}, ${p.y})`}>{p.idx}</text>
                <text
                  x={p.x + ox} y={p.y + oy}
                  fill="#fff"
                  fontSize={size * 0.026}
                  fontFamily={theme.serif}
                  fontWeight={600}
                  textAnchor={anchor}
                  dominantBaseline={baseline}
                  paintOrder="stroke"
                  stroke="#000"
                  strokeWidth={size * 0.0058}
                  strokeLinejoin="round"
                  transform={`rotate(${-rotZ}, ${p.x}, ${p.y})`}>
                  {p.label}
                </text>
              </g>
            );
          })}
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
    halo: 'rgba(2, 4, 14, 0.85)',
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
    halo: 'rgba(247, 241, 227, 0.92)',
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
    halo: 'rgba(255, 255, 255, 0.94)',
    serif: '"Cormorant Garamond", "EB Garamond", Georgia, serif',
    fillStrong: 0.85, fillMid: 0.65, fillEdge: 0.4,
  },
};

window.MANDALA_TONES = TONES;

// Vertex angle for a cumulative score map: the centroid (vector sum) of
// all sector scores, CLAMPED into the wedge of the current leader (the
// argmax sector — the same computation app.jsx uses for focusSector, so
// highlight and dot can never disagree). Without the clamp the centroid
// could fall inside a NEIGHBOURING wedge — e.g. scores regression:3,
// plssem:2.5 put the dot visually inside PLS-SEM while Regression was
// the shaded/leading sector. Exposed on window so the recursive
// consistency test can drive the exact same code.
function vertexAngleForScores(acc, sectors) {
  let sumX = 0, sumY = 0, totalScore = 0;
  for (const sec of sectors) {
    const score = acc[sec.id] || 0;
    if (score <= 0) continue;
    const ang = (sec.angle - 90) * Math.PI / 180;
    sumX += score * Math.cos(ang);
    sumY += score * Math.sin(ang);
    totalScore += score;
  }
  let angleRad = totalScore > 0 ? Math.atan2(sumY, sumX) : -Math.PI / 2;

  const ranked = Object.entries(acc).sort((a, b) => b[1] - a[1]);
  const leaderId = ranked.length ? ranked[0][0] : null;
  const sector = sectors.find(s => s.id === leaderId) || sectors[0];

  const span = 360 / sectors.length;
  const centre = (sector.angle - 90) * Math.PI / 180;
  const half = ((span / 2) - 4) * Math.PI / 180;   // 4° margin off the borders
  let d = angleRad - centre;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  angleRad = centre + Math.max(-half, Math.min(half, d));
  return { angleRad, sector };
}
window.__vertexAngleForScores = vertexAngleForScores;

// Compress an answer label into ~3 words for plotting on the polyline.
function shortAnswer(s) {
  if (!s) return '';
  // Drop everything from the first STANDALONE dash (space-surrounded) or
  // parenthesis onward. Hyphens inside words ("pre-specified", "PLS-SEM")
  // must survive — a bare [-] split used to truncate "Test a pre-specified
  // …" down to "Test a pre".
  const cut = s.split(/\s[—–-]\s|[—–]|\(/)[0].trim();
  const words = cut.split(/\s+/);
  const clean = (t) => t.replace(/[\s/,;:]+$/, '');
  if (words.length <= 4) return clean(cut);
  return clean(words.slice(0, 4).join(' ')) + '…';
}
