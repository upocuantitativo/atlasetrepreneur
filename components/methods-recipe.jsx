// MethodsRecipe — Pollack 2c replicable workflow.
// Renders the 9-step pipeline as a tailored, copy-able recipe based on
// the user's history and chosen primary technique.

window.MethodsRecipe = function MethodsRecipe({ winner, history, scores }) {
  const sectors = window.TAXONOMY.sectors;
  const ranked = [...sectors].map(s => ({ ...s, score: scores[s.id] || 0 })).sort((a,b) => b.score - a.score);
  const baselines = ranked.slice(1, 5).map(s => s.label).join(', ');
  const usesXAI = winner.id === 'xai' || winner.id === 'deep';
  const usesQCA = ranked.slice(0, 3).some(s => s.id === 'fsqca');

  const steps = [
    {
      n: 1, title: 'Data preparation & leakage-aware EFA',
      body: 'Extract factors from training partition only; apply the trained loadings to validation and test sets. Document item-level inclusion criteria, missingness handling, and standardization.',
    },
    {
      n: 2, title: 'Stratified train / validation / test split',
      body: 'Justify the chosen ratio (commonly 60/20/20 or 70/15/15). Stratify on the outcome and any minority subgroup of theoretical interest. Fix and report the random seed.',
    },
    {
      n: 3, title: 'Hyperparameter search strategy',
      body: 'Specify search type (grid · random · Bayesian), the search space per model, the validation protocol (k-fold or hold-out), and the stopping criterion. Pre-register if possible.',
    },
    {
      n: 4, title: 'Baseline comparison set',
      body: `Always include a transparent baseline. Suggested for this study: logistic / linear regression, ${baselines}. Report each baseline's metrics on the same test partition.`,
    },
    {
      n: 5, title: usesXAI ? 'DeepSHAP / EBM explainability setup' : 'Effect-size & coefficient reporting',
      body: usesXAI
        ? 'Construct background distribution (e.g., 100 stratified samples from training); document the choice of explainer; report stability of attributions across seeds.'
        : 'Report standardized coefficients with bootstrap CIs. For SEM, report all fit indices and modification indices considered.',
    },
    {
      n: 6, title: 'Interaction quantification',
      body: usesXAI
        ? "Pair complementary tools: ALE plots for marginal shape, Friedman's H for global interaction strength, SHAP interaction values for pairwise attribution."
        : 'Pre-specify interaction terms with theoretical justification. Report change in fit (ΔR², ΔAIC) versus the additive model.',
    },
    {
      n: 7, title: 'Threshold choice via decision curve analysis',
      body: 'Tie any classification threshold to a stakeholder-defined cost ratio. Report net benefit across a plausible threshold range; do not optimize threshold on the test set.',
    },
    {
      n: 8, title: usesQCA ? 'Configurational complement (fsQCA)' : 'Optional: configurational triangulation',
      body: 'Calibrate set membership from theory, not from data percentiles alone. Report consistency, raw and unique coverage; show truth-table thresholds and document any case-level reassignments.',
    },
    {
      n: 9, title: 'Robustness checks',
      body: 'Multiple random splits with DeLong tests for AUC differences. Item-level vs construct-level sensitivity analysis. Sensitivity of fsQCA solutions to calibration anchors.',
    },
  ];

  return (
    <div className="recipe-block">
      <div className="result-eyebrow">Replicable methods recipe</div>
      <h2 className="recipe-title">A researcher should be able to follow this.</h2>
      <p className="recipe-lede">
        Below is a tailored nine-step pipeline based on your answers — the
        kind of replicable protocol that lets a fellow researcher reproduce
        your design and that converts a methods <em>description</em> into a
        methods <em>contribution</em>. Pair it with shared code or
        pseudocode in supplementary material.
      </p>
      <ol className="recipe-list">
        {steps.map(s => (
          <li key={s.n}>
            <div className="recipe-num">{String(s.n).padStart(2, '0')}</div>
            <div className="recipe-body">
              <div className="recipe-step-title">{s.title}</div>
              <div className="recipe-step-text">{s.body}</div>
            </div>
          </li>
        ))}
      </ol>
      <div className="recipe-footer">
        Recommended deliverables: pre-registered analysis plan · public
        repository (GitHub / OSF) · supplementary appendix with full
        hyperparameter search results · seeds and software versions.
      </div>
    </div>
  );
};
