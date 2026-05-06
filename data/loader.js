// loader.js — fetches taxonomy + questions from api.php at startup. If the
// API responds, it overwrites the bundled defaults so admin edits show up
// immediately. If the API fails (offline, dev) the bundled values stand.
//
// Returns a Promise that the entry point awaits before mounting the app.

(function () {
  function adaptSector(s) {
    return {
      ...s,
      // map snake_case columns back into the camelCase the components expect
      hue: typeof s.hue === 'string' ? parseInt(s.hue, 10) : s.hue,
      angle: typeof s.angle === 'string' ? parseFloat(s.angle) : s.angle,
      procedure: s.procedure_steps || s.procedure || [],
      keyRefs: s.key_refs || s.keyRefs || [],
      chatHints: s.chat_hints || s.chatHints || [],
    };
  }
  function buildShowIf(descriptor) {
    if (!descriptor) return null;
    const H = window.QHELPERS;
    if (!H) return null;
    if (descriptor.type === 'leaderIs')           return (sc) => H.leaderIs(sc, descriptor.id);
    if (descriptor.type === 'topThreeIncludes')   return (sc) => (descriptor.ids || []).every(id => H.topThreeIncludes(sc, id));
    if (descriptor.type === 'topThreeIncludesAll')return (sc) => (descriptor.ids || []).every(id => H.topThreeIncludes(sc, id));
    if (descriptor.type === 'tieBreak')           return (sc) => { const r = H.rank(sc); if (r.length < 2) return false; const g = H.gap(sc); return g >= 0 && g <= 1; };
    return null;
  }
  function adaptQuestion(q, options) {
    const opts = options
      .filter(o => o.question_id === q.id)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      .map(o => ({ label: o.label, weights: o.weights || {} }));
    return {
      id: q.id,
      ring: q.ring_index ?? q.ring ?? 0,
      always: !!q.always_show,
      showIf: q.always_show ? null : buildShowIf(q.show_if),
      multiSelect: !!q.multi_select,
      text: q.question_text,
      hint: q.hint || undefined,
      options: opts,
    };
  }

  window.AtlasLoader = {
    async load(apiUrl) {
      const url = apiUrl || './api.php?action=get_all';
      try {
        const res = await fetch(url, { credentials: 'same-origin' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const j = await res.json();
        if (!j || !Array.isArray(j.sectors) || !Array.isArray(j.questions)) throw new Error('bad payload');
        const sectors = j.sectors
          .sort((a,b) => (a.display_order || 0) - (b.display_order || 0))
          .map(adaptSector);
        window.TAXONOMY = {
          sectors,
          rings: (j.rings || []).map(r => ({ id: r.id, label: r.label, sub: r.sub, rNorm: r.r_norm })),
        };
        window.QUESTIONS = j.questions
          .sort((a,b) => (a.display_order || 0) - (b.display_order || 0))
          .map(q => adaptQuestion(q, j.options || []));
        return { source: 'api' };
      } catch (e) {
        console.warn('[AtlasLoader] API unavailable, using bundled defaults:', e.message);
        return { source: 'bundle', error: e.message };
      }
    }
  };
})();
