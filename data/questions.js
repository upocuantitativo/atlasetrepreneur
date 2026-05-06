// Question bank — adaptive flow.
//
// PHILOSOPHY
//   - Phase A (Q1–Q5) is fixed and ALWAYS shown. Weights here are deliberately
//     soft (max 2) so that no single answer can crown a winner in the first
//     2–3 questions. The leader has to be earned across the whole interview.
//   - Phase B (Q6–Q7) are universal sharpeners on data structure / linearity.
//   - Phase C is ADAPTIVE. Each adaptive question carries a `showIf(scores,
//     history)` predicate. Only the disambiguators relevant to the user's
//     current top-2 candidates fire. These late questions carry stronger
//     weights (3–4) precisely because they target the live ambiguity.
//   - Phase D (Q-FINAL-*) is always shown and closes with reporting and
//     triangulation choices.
//
// HELPER PREDICATES
//   topPair(scores)   → array of the two best-scoring sector ids.
//   topPairIncludes(scores, [a,b])  → true if both ids are within top-3.
//   leaderIs(scores, id)  → true if id is the current leader.
//   leaderInside(scores, ids) → true if leader is one of ids.

(function () {
  function rank(scores) {
    return Object.entries(scores || {}).sort((a, b) => b[1] - a[1]).map(e => e[0]);
  }
  function topPair(scores)               { return rank(scores).slice(0, 2); }
  function topThree(scores)              { return rank(scores).slice(0, 3); }
  function leaderIs(scores, id)          { return rank(scores)[0] === id; }
  function leaderInside(scores, ids)     { return ids.includes(rank(scores)[0]); }
  function topPairIncludesBoth(scores, ids) {
    const t3 = topThree(scores);
    return ids.every(id => t3.includes(id));
  }
  function topThreeIncludes(scores, id) {
    return topThree(scores).includes(id);
  }
  function gap(scores) {
    const r = rank(scores);
    if (r.length < 2) return 0;
    return (scores[r[0]] || 0) - (scores[r[1]] || 0);
  }
  // expose helpers so app.jsx can use them
  window.QHELPERS = { rank, topPair, topThree, leaderIs, leaderInside, topPairIncludesBoth, topThreeIncludes, gap };
})();

window.QUESTIONS = [
  // ============================================================
  // PHASE A — broad framing. Always shown. Soft weights (max 2).
  // ============================================================
  {
    id: 'Q1',
    ring: 0,
    always: true,
    text: 'What is the core analytic goal of your study?',
    hint: 'Pick the framing that best matches the central purpose of the research question.',
    options: [
      { label: 'Test a pre-specified theoretical model with interpretable parameters',
        weights: { regression: 2, plssem: 1, anova: 1 } },
      { label: 'Estimate paths between latent constructs (e.g. entrepreneurial orientation, self-efficacy)',
        weights: { plssem: 2, regression: 1 } },
      { label: 'Identify equifinal configurations / sufficient conditions ("recipes for success")',
        weights: { fsqca: 2 } },
      { label: 'Maximise out-of-sample prediction accuracy on new cases',
        weights: { trees: 2, deep: 1, xai: 1 } },
      { label: 'Discover non-linear effects & interactions to feed back into theory',
        weights: { xai: 2, trees: 1, deep: 1 } },
      { label: 'Build typologies / discover latent groups (no labelled outcome)',
        weights: { cluster: 2 } },
      { label: 'Compare means across experimental or treatment groups',
        weights: { anova: 2 } },
    ],
  },
  {
    id: 'Q2',
    ring: 0,
    always: true,
    text: 'What is the type of the outcome variable?',
    options: [
      { label: 'Binary (yes/no) — survival, intention, market entry',
        weights: { regression: 2, trees: 1, deep: 1 } },
      { label: 'Continuous (revenue growth, scale score, performance index)',
        weights: { regression: 1, anova: 1, plssem: 1, trees: 1, deep: 1 } },
      { label: 'Count (number of opportunities, patents, fundraising rounds)',
        weights: { regression: 2, trees: 1 } },
      { label: 'Time-to-event (hazard of failure, duration to first sale)',
        weights: { regression: 2, trees: 1, deep: 1 } },
      { label: 'Multiple endogenous latent constructs (path model)',
        weights: { plssem: 2 } },
      { label: 'Set membership — degree of belonging to a fuzzy outcome',
        weights: { fsqca: 2 } },
      { label: 'No outcome variable — exploratory / unsupervised',
        weights: { cluster: 2 } },
    ],
  },
  {
    id: 'Q3',
    ring: 1,
    always: true,
    text: 'Are your key constructs latent (unobservable) or directly measured?',
    hint: 'Latent constructs (e.g. perceived self-efficacy) are estimated from multi-item scales and need a measurement model.',
    options: [
      { label: 'Multiple latent constructs with reflective multi-item scales',
        weights: { plssem: 2 } },
      { label: 'A few latent constructs already aggregated into composite scores',
        weights: { regression: 1, anova: 1, plssem: 1 } },
      { label: 'All directly observed / register / firmographic variables',
        weights: { regression: 1, trees: 1, deep: 1, fsqca: 1 } },
      { label: 'Mix of observed variables and unstructured data (text, image)',
        weights: { deep: 2, xai: 1 } },
    ],
  },
  {
    id: 'Q4',
    ring: 0,
    always: true,
    text: 'How is causality conceptualised in your theory?',
    hint: 'fsQCA assumes asymmetry and equifinality; regression / PLS-SEM assume symmetric net effects.',
    options: [
      { label: 'Symmetric net effects — each predictor adds (or multiplies) independently',
        weights: { regression: 2, plssem: 1, anova: 1 } },
      { label: 'Configurational — outcomes arise from bundles of conditions',
        weights: { fsqca: 2 } },
      { label: 'Asymmetric — the recipe for success differs from that for failure',
        weights: { fsqca: 2 } },
      { label: 'Unknown / driven by data — let the algorithm decide',
        weights: { trees: 2, deep: 1, xai: 1 } },
    ],
  },
  {
    id: 'Q5',
    ring: 1,
    always: true,
    text: 'What is the sample size relative to the number of predictors / conditions?',
    hint: 'Rough order of magnitude is fine.',
    options: [
      { label: 'Very small N (< 50) — case-oriented research',
        weights: { fsqca: 2 } },
      { label: 'Small to moderate N (50–300), few predictors',
        weights: { regression: 1, anova: 1, plssem: 1, fsqca: 1 } },
      { label: 'Moderate N (300–2,000), many predictors',
        weights: { trees: 2, regression: 1, plssem: 1, xai: 1 } },
      { label: 'Large N (2,000–50,000), tabular data',
        weights: { trees: 2, deep: 1, xai: 1 } },
      { label: 'Very large N (> 50,000) or rich item-level data',
        weights: { deep: 2, trees: 1 } },
    ],
  },

  // ============================================================
  // PHASE B — universal sharpeners on data structure. Always shown.
  // ============================================================
  {
    id: 'Q6',
    ring: 1,
    always: true,
    text: 'What is the dominant nature of your predictors / inputs?',
    options: [
      { label: 'All categorical — factorial / experimental design',
        weights: { anova: 2, fsqca: 1 } },
      { label: 'All continuous — composite indices, financial ratios',
        weights: { regression: 1, plssem: 1, cluster: 1 } },
      { label: 'Mixed tabular (categorical + continuous + counts)',
        weights: { trees: 2, regression: 1, xai: 1 } },
      { label: 'Multi-item Likert scales tapping latent constructs',
        weights: { plssem: 2, regression: 1 } },
      { label: 'Unstructured (text, images, sequences, social-media)',
        weights: { deep: 2 } },
    ],
  },
  {
    id: 'Q7',
    ring: 1,
    always: true,
    text: 'How linear are the relationships you expect?',
    options: [
      { label: 'Linear or monotone after standard transformations',
        weights: { regression: 2, plssem: 1, anova: 1 } },
      { label: 'Mildly non-linear with a few interactions',
        weights: { trees: 2, xai: 1, regression: 1 } },
      { label: 'Strongly non-linear, high-order conditional interactions',
        weights: { deep: 2, xai: 2, trees: 1 } },
      { label: 'Configurational, not functional — bundles matter',
        weights: { fsqca: 2 } },
      { label: 'Not applicable — exploratory / unsupervised',
        weights: { cluster: 2 } },
    ],
  },

  // ============================================================
  // PHASE C — ADAPTIVE sharpeners. Each fires only when its predicate is
  // true given the cumulative scores. Heavier weights (3–4) because they
  // target the live ambiguity in the leaderboard.
  // ============================================================

  // C-1: Regression vs. PLS-SEM (fires if both are in top-3)
  {
    id: 'A-RegPls',
    ring: 2,
    showIf: (sc) => window.QHELPERS.topThreeIncludes(sc, 'regression') && window.QHELPERS.topThreeIncludes(sc, 'plssem'),
    text: 'Do you need a measurement model for your constructs, or are observed scores enough?',
    hint: 'PLS-SEM only adds value if you must validate a measurement model with multiple indicators.',
    options: [
      { label: 'Yes — multiple multi-item constructs need measurement validation (loadings, AVE, HTMT)',
        weights: { plssem: 4 } },
      { label: 'I have validated scales already; observed composites are fine',
        weights: { regression: 3, plssem: -1 } },
      { label: 'No latent constructs at all — only observed variables',
        weights: { regression: 4, plssem: -2 } },
    ],
  },

  // C-2: Boosted Trees vs. Deep Learning (fires if both are in top-3)
  {
    id: 'A-TreesDeep',
    ring: 2,
    showIf: (sc) => window.QHELPERS.topThreeIncludes(sc, 'trees') && window.QHELPERS.topThreeIncludes(sc, 'deep'),
    text: 'Are your inputs tabular, or do they include unstructured signals (text, image, audio, sequence)?',
    hint: 'XGBoost dominates tabular benchmarks; deep nets dominate unstructured ones.',
    options: [
      { label: 'Strictly tabular — rows and columns of mixed types',
        weights: { trees: 4, deep: -1 } },
      { label: 'Tabular with embeddings or engineered features from text',
        weights: { trees: 3, xai: 1 } },
      { label: 'Mostly unstructured (pitch text, founder voice, images)',
        weights: { deep: 4, trees: -1 } },
      { label: 'A mix — multimodal model would add value',
        weights: { deep: 3, xai: 1 } },
    ],
  },

  // C-3: Trees vs. Explainable AI (fires if both are in top-3)
  {
    id: 'A-TreesXai',
    ring: 2,
    showIf: (sc) => window.QHELPERS.topThreeIncludes(sc, 'trees') && window.QHELPERS.topThreeIncludes(sc, 'xai'),
    text: 'Is the deliverable a prediction or a theory-relevant explanation?',
    hint: 'Boosted trees are best when the score itself is the deliverable; XAI / EBM is best when the goal is to understand and theorise from the model.',
    options: [
      { label: 'A prediction score for screening or policy targeting',
        weights: { trees: 4, xai: -1 } },
      { label: 'Both prediction AND interpretable feature interactions for the paper',
        weights: { xai: 4, trees: 1 } },
      { label: 'Mostly explanation — I want to surface a non-linear effect for theory',
        weights: { xai: 4, trees: -1 } },
    ],
  },

  // C-4: fsQCA confirmation (fires if fsqca is leader or top-2)
  {
    id: 'A-FsqcaCalib',
    ring: 2,
    showIf: (sc) => window.QHELPERS.topThreeIncludes(sc, 'fsqca'),
    text: 'Can you justify set-membership calibration anchors from theory (full-in / cross-over / full-out)?',
    hint: 'fsQCA only delivers if the calibration is theoretical, not data-driven quantiles.',
    options: [
      { label: 'Yes — anchors are anchored in theory or qualitative knowledge of cases',
        weights: { fsqca: 4 } },
      { label: 'Partially — I would use percentile rules with theoretical sense-check',
        weights: { fsqca: 2 } },
      { label: 'No — I cannot justify clean anchors; better to model functionally',
        weights: { regression: 2, trees: 1, fsqca: -2 } },
    ],
  },

  // C-5: Cluster confirmation (fires if cluster is leader)
  {
    id: 'A-ClusterStability',
    ring: 2,
    showIf: (sc) => window.QHELPERS.leaderIs(sc, 'cluster'),
    text: 'How will you validate the discovered clusters?',
    hint: 'Reviewers expect at least one stability test plus a profiling analysis.',
    options: [
      { label: 'Internal validity (silhouette / gap / BIC) + split-half replication',
        weights: { cluster: 4 } },
      { label: 'Profile clusters with ANOVA / chi-square contrasts then name them theoretically',
        weights: { cluster: 3, anova: 1 } },
      { label: 'Use them as features for a downstream prediction model',
        weights: { cluster: 2, trees: 2, regression: 1 } },
      { label: 'Not sure yet — need guidance',
        weights: { cluster: 1 } },
    ],
  },

  // C-6: ANOVA confirmation (fires if anova is leader)
  {
    id: 'A-AnovaDesign',
    ring: 2,
    showIf: (sc) => window.QHELPERS.leaderIs(sc, 'anova'),
    text: 'How is your design structured?',
    options: [
      { label: 'One factor with ≥3 independent groups (one-way ANOVA)',
        weights: { anova: 4 } },
      { label: 'Two or more factors crossed (factorial ANOVA, interactions of interest)',
        weights: { anova: 4 } },
      { label: 'Repeated measures or mixed (within + between)',
        weights: { anova: 4 } },
      { label: 'Two groups + a continuous covariate to control for (ANCOVA)',
        weights: { anova: 3, regression: 1 } },
      { label: 'Multiple correlated outcomes (MANOVA)',
        weights: { anova: 4 } },
    ],
  },

  // C-7: Deep-learning confirmation (fires if deep is leader)
  {
    id: 'A-DeepReadiness',
    ring: 2,
    showIf: (sc) => window.QHELPERS.leaderIs(sc, 'deep'),
    text: 'Do you have the labelled data and compute to support deep learning?',
    hint: 'A few thousand labels and a GPU are usually the minimum; otherwise XGBoost wins.',
    options: [
      { label: 'Yes — thousands of labels + GPU access (or pretrained backbone to fine-tune)',
        weights: { deep: 4 } },
      { label: 'I can use a pretrained model (BERT, ResNet) and fine-tune the head only',
        weights: { deep: 3, xai: 1 } },
      { label: 'Limited labels — I should fall back to a strong tabular baseline',
        weights: { trees: 3, deep: -2 } },
    ],
  },

  // C-8: Regression diagnostic (fires if regression is leader)
  {
    id: 'A-RegSpec',
    ring: 2,
    showIf: (sc) => window.QHELPERS.leaderIs(sc, 'regression'),
    text: 'Which variant of the regression family fits your outcome best?',
    options: [
      { label: 'Logistic regression (binary outcome, odds ratios)',
        weights: { regression: 4 } },
      { label: 'OLS / linear regression (continuous outcome)',
        weights: { regression: 4 } },
      { label: 'Poisson / Negative Binomial (count outcome)',
        weights: { regression: 4 } },
      { label: 'Cox proportional hazards (time-to-event)',
        weights: { regression: 4 } },
      { label: 'Multilevel / mixed-effects (nested data)',
        weights: { regression: 4 } },
    ],
  },

  // C-9: Tie-breaker for very close races (fires if gap between leader and #2 is small)
  {
    id: 'A-Tiebreak',
    ring: 2,
    showIf: (sc) => {
      const r = window.QHELPERS.rank(sc);
      if (r.length < 2) return false;
      const g = window.QHELPERS.gap(sc);
      return g >= 0 && g <= 1; // very tight race
    },
    text: 'You are between two equally plausible techniques. Which trade-off matters more?',
    hint: 'If the leaderboard is genuinely tied, this is your steering wheel.',
    options: [
      { label: 'Interpretability of parameters and confidence intervals',
        weights: { regression: 3, plssem: 2, anova: 2, fsqca: 1 } },
      { label: 'Configurational logic — multiple paths to the outcome',
        weights: { fsqca: 4 } },
      { label: 'Out-of-sample accuracy on a hold-out test set',
        weights: { trees: 3, deep: 2, xai: 1 } },
      { label: 'Theoretical novelty surfaced by a strong predictive model',
        weights: { xai: 4, trees: 1 } },
      { label: 'Ability to estimate latent constructs jointly',
        weights: { plssem: 3 } },
      { label: 'Discovery of types or trajectories in the data',
        weights: { cluster: 3 } },
    ],
  },

  // ============================================================
  // PHASE D — closing questions. Always shown.
  // ============================================================
  {
    id: 'Q-INTERP',
    ring: 2,
    always: true,
    text: 'How important is interpretability of the model?',
    hint: 'Who needs to understand the model, and at what level of detail?',
    options: [
      { label: 'Critical — non-technical stakeholders need to read parameters',
        weights: { regression: 2, anova: 1, plssem: 1, fsqca: 1 } },
      { label: 'Need feature importance + interaction shape',
        weights: { xai: 3, trees: 1 } },
      { label: 'Useful — global feature importance is enough',
        weights: { trees: 2, xai: 1 } },
      { label: 'Secondary — accuracy first',
        weights: { deep: 2, trees: 1 } },
      { label: 'Not relevant — descriptive / exploratory',
        weights: { cluster: 1 } },
    ],
  },
  {
    id: 'Q-VALID',
    ring: 2,
    always: true,
    text: 'What validation strategy will you commit to?',
    options: [
      { label: 'Hypothesis testing with p-values and confidence intervals',
        weights: { regression: 2, anova: 2, plssem: 1 } },
      { label: 'Bootstrap path significance + PLSpredict',
        weights: { plssem: 3 } },
      { label: 'Train / validation / test split with out-of-sample metrics',
        weights: { trees: 2, deep: 2, xai: 1 } },
      { label: 'Truth-table consistency, coverage and robustness checks',
        weights: { fsqca: 3 } },
      { label: 'Cluster stability — split-half / bootstrap / silhouette',
        weights: { cluster: 3 } },
    ],
  },
  {
    id: 'Q-TRIAN',
    ring: 2,
    always: true,
    text: 'Will you triangulate with a complementary method?',
    hint: 'Many strong entrepreneurship papers pair a primary method with a configurational or predictive complement.',
    options: [
      { label: 'Yes — fsQCA as configurational triangulation',
        weights: { fsqca: 1, xai: 1 } },
      { label: 'Yes — PLS-SEM as the theoretical anchor',
        weights: { plssem: 1, regression: 1 } },
      { label: 'Yes — multiple ML baselines (logistic, RF, XGBoost, NN)',
        weights: { trees: 1, regression: 1, xai: 1, deep: 1 } },
      { label: 'No — single primary method',
        weights: {} },
      { label: 'Undecided — show me the strongest pairing',
        weights: { fsqca: 1, xai: 1, plssem: 1 } },
    ],
  },
];
