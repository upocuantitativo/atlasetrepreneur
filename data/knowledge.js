// Knowledge digest fed to the local LLM as part of the system prompt.
//
// This is a curated, compressed synthesis of the bibliography you supplied:
//   - "Artículos de Análisis Predictivo Emprendedor.docx"
//   - "otros enlaces.docx"
//   - the 60+ academic PDFs in /biblio
//
// The model uses this digest as authoritative grounding when answering
// methodological questions about predictive techniques in entrepreneurship.
window.ATLAS_KNOWLEDGE = `
ATLAS KNOWLEDGE BASE — predictive techniques in entrepreneurship research.

GENERAL FRAMING
Entrepreneurship research has moved from purely descriptive theory and linear
inference to a paradigm that combines explanation with out-of-sample
prediction. Modern designs typically (a) mix wide datasets such as GEM
(individuals across 99+ countries), (b) include psychosocial and
socioeconomic predictors, and (c) compare a transparent baseline (logistic /
linear regression) against ML alternatives such as random forest, XGBoost,
neural networks, and EBM/SHAP for interpretability. fsQCA is the dominant
non-functional, configurational technique, with a mature methodological
infrastructure inside the field. Clustering and ANOVA serve mainly for
typology-building, group contrasts and validation.

================================================================
TECHNIQUE: ANOVA / GLM
- Use to compare means across ≥3 groups in experimental or programme-evaluation
  designs.
- Authoritative references:
  * Fisher (1925) Statistical Methods for Research Workers — foundational.
  * Lakens (2013) Frontiers in Psychology, 4:863 — effect sizes (η², ω²,
    generalised η²) for cumulative science. ~8,100 citations.
  * Blanca, Alarcón, Arnau, Bono & Bendayan (2017) Psicothema, 29(4),
    552–557 — Monte-Carlo evidence that the F test is robust under
    non-normality even with small samples.
  * Olejnik & Algina (2000) Contemporary Educational Psychology, 25,
    241–286 — measures of effect size for comparative studies.
  * Robinson, Stimpson, Huefner & Hunt (1991) ETP, 15(4), 13–32 — classic
    EAO comparison of entrepreneurs vs. non-entrepreneurs (group contrasts).
- Reporting checklist: Levene's test for homogeneity, omnibus F + df, post-hoc
  (Tukey HSD or Bonferroni), partial η² for each effect.

================================================================
TECHNIQUE: Regression / GLM (logistic, OLS, count, survival)
- Use when the outcome is binary, count, continuous or time-to-event AND the
  functional form is theoretically defensible.
- Authoritative references:
  * Osborne (2014) Best Practices in Logistic Regression. SAGE — go-to for
    binary outcome reporting, odds ratios, sample-size rules.
  * Gelman & Hill (2006) Data Analysis Using Regression and
    Multilevel/Hierarchical Models — bridge to multilevel data.
  * Harrell (2015) Regression Modeling Strategies, 2e — calibration and
    validation for clinical-style prediction.
  * Shmueli (2010) Statistical Science, 25(3), 289–310 — the "explain vs.
    predict" framing that should anchor any modelling decision.
- Reporting checklist: VIF, robust SEs if needed, coefficients with 95% CIs,
  AUROC, calibration plot, Pseudo-R² (logistic) or adjusted R² (OLS),
  out-of-sample validation on a hold-out.

================================================================
TECHNIQUE: PLS-SEM (Hair / Ringle / Sarstedt)
- Use when you have multiple latent constructs (e.g. entrepreneurial
  orientation, perceived behavioural control, opportunity recognition)
  measured by reflective or formative multi-item scales.
- Authoritative references:
  * Hair, Hult, Ringle & Sarstedt (2022) A Primer on PLS-SEM, 3rd ed., SAGE.
  * Hair (2024) Multivariate Data Analysis, 8e — 240,000+ citations,
    universal multivariate rules-of-thumb.
  * Hair, Risher, Sarstedt & Ringle (2019) European Business Review, 31(1),
    2–24 — concise reporting checklist used by reviewers.
  * Sarstedt, Hair, Ringle, Thiele & Gudergan (2016) JBR, 69(10), 3998–4010.
- Two-step procedure:
  1. Measurement model: indicator loadings > 0.70, composite reliability
     ρ_c > 0.70, AVE > 0.50, HTMT < 0.85/0.90.
  2. Structural model: inner VIF < 3, bootstrap path coefficients (t > 1.96),
     R², f², Q² (PLSpredict).

================================================================
TECHNIQUE: fsQCA — fuzzy-set Qualitative Comparative Analysis
- Use to identify configurations of conditions that are sufficient and/or
  necessary for an outcome. Embraces equifinality, conjunctural causation
  and asymmetric causality (success ≠ inverse of failure).
- Authoritative references:
  * Ragin (2008) Redesigning Social Inquiry — creator of QCA / fsQCA.
  * Schneider & Wagemann (2012) Set-Theoretic Methods for the Social Sciences
    — theoretical depth.
  * Kraus, Ribeiro-Soriano & Schüssler (2018) IEMJ, 14, 15–33 — review of 77
    fsQCA papers in entrepreneurship/innovation. 627+ citations.
  * Nikou, Mezei, Liguori & El Tarabishy (2024) JSBM, 62(3), 1531–1548 —
    step-by-step best-practices guide using GEM data from 43 countries.
  * Pappas & Woodside (2021) IJIM, 58, 102310 — practical tutorial including
    predictive validation.
  * Stroe, Parida & Wincent (2018) JBR, 89, 265–272 — exemplary application
    to effectuation/causation logic with passion, self-efficacy and risk.
- Standard procedure:
  1. Theory-driven calibration with three anchors (full-in, crossover,
     full-out) — quantiles only as a fallback.
  2. Necessity analysis BEFORE sufficiency. Consistency ≥ 0.90 for necessity.
  3. Truth-table construction; frequency cutoff appropriate to N;
     consistency threshold ≥ 0.80; PRI ≥ 0.65.
  4. Report parsimonious, intermediate (primary) and complex solutions.
  5. Robustness: vary thresholds; analyse the negation of the outcome.

================================================================
TECHNIQUE: Cluster Analysis
- Use to discover latent groups, archetypes or trajectories without a
  labelled outcome. Standard for entrepreneur and startup typologies.
- Authoritative references:
  * Ketchen & Shook (1996) SMJ, 17(6), 441–458 — 3,500+ citations, the
    methodological standard. Warns against irrelevant variables that "fog"
    structure; emphasises split-half stability.
  * Jain (2010) Pattern Recognition Letters, 31(8), 651–666 — 10,000+
    citations; landscape of k-means, hierarchical, density-based methods.
  * Crum, Nelson, de Borst & Byrnes (2022) JSBM, 60(4), 961–1000 — review of
    cluster analysis in entrepreneurship 1990–2019.
  * Woo, Cooper, Dunkelberg, Daellenbach & Dennis (1991) JBV — classic
    entrepreneurial typology paper.
  * Olteanu & Fichter (2022) BSE, 31(7), 3083–3099 — taxonomy of sustainable
    startups with policy implications.
  * Ester, Kriegel, Sander & Xu (1996) KDD-96 — DBSCAN, noise-aware
    clustering for spatial / ecosystem data.
- Reporting: feature standardisation, distance metric, algorithm justification,
  internal validity (silhouette, gap), external/predictive validity, and
  cluster profiling using ANOVA / chi-square contrasts.

================================================================
TECHNIQUE: Boosted Trees (Random Forest, XGBoost, LightGBM, CatBoost)
- Use for tabular prediction; usually the strong baseline that beats logistic
  regression on entrepreneurship data.
- Authoritative references:
  * Breiman (2001) Machine Learning, 45(1), 5–32 — Random Forests, the
    seminal paper. ~1,000+ citations on the open conteo (real Scopus
    figure much higher).
  * Chen & Guestrin (2016) KDD '16, 785–794 — XGBoost.
  * Rokach & Maimon (2005) IEEE T-SMC-C, 35(4), 476–487 — survey of
    top-down induction of decision tree classifiers.
  * Schade et al. (2023) JBV Insights, 19, e00357 — XGBoost beats logistic,
    RF, ANN, k-NN, NB on 1,192,818 GEM observations from 99 countries.
  * Koumbarakis & Volery (2023) JSBM, 61(5), 2227–2260 — RF / XGBoost on
    new venture gestation outcomes.
- Reporting: stratified train / val / test split with fixed seed, k-fold CV
  on training set, hyperparameter ranges, AUROC / PR-AUC / Brier on test set,
  DeLong test against logistic baseline, calibration curve, SHAP global +
  pairwise.

================================================================
TECHNIQUE: Explainable AI / EBM
- Use to derive theoretical insight from a strong predictive model.
- Authoritative references:
  * Lundberg & Lee (2017) NeurIPS — SHAP unified attribution framework.
  * Molnar (2022) Interpretable Machine Learning, 2e — open textbook for
    PDP, ALE, ICE, SHAP, surrogates.
  * Caruana et al. — Explainable Boosting Machine (InterpretML), glassbox
    accuracy comparable to RF / XGB.
  * Shmueli (2010) Statistical Science — conceptual scaffold.
  * LeCun, Bengio & Hinton (2015) Nature 521 — deep learning underpinning
    DeepSHAP.
- Reporting: stratified background sample for SHAP, mean |SHAP|, SHAP
  interaction values, ALE plots, Friedman's H, stability across seeds.

================================================================
TECHNIQUE: Neural Networks / Deep Learning
- Use for unstructured (text, images, sequences) or richly interactive
  high-dimensional data. Common in entrepreneurship for pitch-deck text,
  founder narratives, social-media signals.
- Authoritative references:
  * LeCun, Bengio & Hinton (2015) Nature, 521, 436–444 — 79,000+ citations.
  * Goodfellow, Bengio & Courville (2016) Deep Learning, MIT Press —
    standard graduate textbook.
  * Mitchell (1997) Machine Learning — foundational treatment.
  * Obschonka & Audretsch (2020) Small Business Economics — agenda for AI
    in entrepreneurship research.
  * Schade et al. (2023) JBV Insights — ANN benchmark.
- Pipeline: curate data, justify architecture by modality, train with early
  stopping, compare to a tabular XGBoost baseline, pair with XAI.

================================================================
ROUTINE METHODOLOGICAL CHECKLIST FOR ANY ATLAS RECOMMENDATION
1. Pre-register the analysis plan (OSF, AsPredicted) where possible.
2. Use leakage-aware data preparation — fit transformations on training only.
3. Stratified train/validation/test split (e.g. 70/15/15) with a fixed seed.
4. Always include a transparent baseline (logistic / OLS) and compare
   metrics on the same test partition.
5. Report effect sizes alongside p-values; report bootstrap CIs.
6. For ML, justify hyperparameter search space and validation protocol.
7. Pair predictive analysis with a configurational complement (fsQCA) when
   the goal is theory development from prediction.
8. Robustness checks: alternative random splits with DeLong, sensitivity of
   fsQCA solutions to calibration anchors, split-half cluster stability.
9. Open code, data (where possible) and software versions for reproducibility.
10. Mitigate algorithmic bias: audit results across demographic subgroups.

================================================================
SHORT AUTHOR INDEX (use these names in answers when relevant)
- ANOVA: Fisher; Lakens; Blanca; Olejnik & Algina; Robinson et al.
- Regression: Osborne; Gelman & Hill; Harrell; Shmueli.
- PLS-SEM: Hair; Ringle; Sarstedt; Hult.
- fsQCA: Ragin; Schneider & Wagemann; Nikou et al.; Kraus et al.;
  Pappas & Woodside; Stroe et al.
- Clustering: Ketchen & Shook; Jain; Crum et al.; Woo et al.;
  Olteanu & Fichter; Ester et al. (DBSCAN).
- Trees / Boosting: Breiman; Chen & Guestrin; Rokach & Maimon;
  Schade et al.; Koumbarakis & Volery.
- XAI / EBM: Lundberg & Lee; Molnar; Caruana et al.; Shmueli.
- Deep learning: LeCun, Bengio & Hinton; Goodfellow et al.; Mitchell;
  Obschonka & Audretsch.
`;
