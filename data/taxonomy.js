// Taxonomy of analytic techniques.
// Each sector is a discipline node on a circle. Eight sectors at 45° spacing.
// Beyond label/angle/hue we now carry:
//   - description     : one-paragraph identity card
//   - hypotheses[]    : worked hypothesis templates a researcher could adopt
//   - conditions[]    : when this technique is the right call
//   - assumes[]       : assumptions to verify and defend
//   - software[]      : recommended toolchain
//   - procedure[]     : tight procedural checklist
//   - authors[]       : recommended authors / works (with clickable links)
//   - keyRefs[]       : foundational references (with DOI / repo links)
//   - chatHints[]     : seed prompts for the local LLM consultation chat
window.TAXONOMY = {
  sectors: [
    {
      id: 'anova',
      label: 'ANOVA / GLM',
      sub: 'Group comparison',
      angle: 0,
      hue: 8,
      techniques: ['One-way ANOVA', 'Factorial ANOVA', 'ANCOVA', 'MANOVA', 'Mixed-effects ANOVA'],
      goal: 'Test mean differences across discrete groups (e.g. training programmes, incubator cohorts, treatment arms).',
      description: 'Family of linear models that decomposes variance to test whether the means of three or more groups differ. The default lens for experimental and quasi-experimental entrepreneurship studies — programme evaluations, treatment comparisons, A/B tests of pedagogical interventions.',
      hypotheses: [
        'H0: μ₁ = μ₂ = μ₃ (no mean differences across treatment groups).',
        'H1: at least one programme mean differs in entrepreneurial intention / self-efficacy / new-venture creation rate.',
        'Interaction: the effect of an incubation programme depends on the entrepreneur\'s prior experience (factorial design).'
      ],
      conditions: [
        'You have ≥3 discrete groups (or 2 groups + a covariate → ANCOVA).',
        'The outcome is metric / continuous (intention scale, growth %, weekly revenue).',
        'You manipulate or sample factor levels rather than relying on observational covariates.',
        'You can defend independence, near-normal residuals, and homogeneity of variance — or use the Welch / robust variants.'
      ],
      assumes: ['Normality of residuals', 'Homoscedasticity (Levene\'s test)', 'Independence of observations', 'Sphericity for repeated measures'],
      procedure: [
        'Define factors and levels theoretically before collecting data.',
        'Run Levene\'s test for variance homogeneity; switch to Welch\'s F if violated.',
        'Inspect residual plots; transform or use rank-based ANOVA when normality fails.',
        'Run the omnibus F; if significant, follow up with Tukey HSD or Bonferroni post-hoc.',
        'Report effect sizes (η², ω², partial η²) in addition to p-values (Lakens, 2013).'
      ],
      software: ['R: aov, afex, ez, emmeans', 'Python: statsmodels, pingouin', 'JASP / jamovi (GUI)', 'SPSS, Stata'],
      authors: [
        { name: 'Daniel Lakens', work: 'Calculating and reporting effect sizes for t-tests and ANOVAs (2013)', url: 'https://doi.org/10.3389/fpsyg.2013.00863', why: 'Effect-size practical primer cited 8,100+ times.' },
        { name: 'Blanca, Alarcón, Arnau, Bono & Bendayan', work: 'Non-normal data: Is ANOVA still a valid option? (Psicothema, 2017)', url: 'https://doi.org/10.7334/psicothema2016.383', why: 'Monte Carlo evidence on robustness of F under non-normality — vital for small entrepreneurship samples.' },
        { name: 'Olejnik & Algina', work: 'Measures of effect size for comparative studies (2000)', url: 'https://doi.org/10.1006/ceps.2000.1040', why: 'Authoritative on choosing and interpreting ω², η², generalised η².' },
        { name: 'Robinson, Stimpson, Huefner & Hunt', work: 'An Attitude Approach to the Prediction of Entrepreneurship (1991)', url: 'https://doi.org/10.1177/104225879101500405', why: 'Classic comparison of entrepreneurs vs non-entrepreneurs using group contrasts.' },
        { name: 'Maxwell & Delaney', work: 'Designing Experiments and Analyzing Data (2017)', url: 'https://www.routledge.com/Designing-Experiments-and-Analyzing-Data-A-Model-Comparison-Perspective/Maxwell-Delaney-Kelley/p/book/9781138892286', why: 'Reference textbook for factorial / repeated-measures ANOVA.' }
      ],
      keyRefs: [
        'Fisher, R. A. (1925). Statistical Methods for Research Workers.',
        'Lakens, D. (2013). Frontiers in Psychology, 4: 863. https://doi.org/10.3389/fpsyg.2013.00863',
        'Blanca et al. (2017). Psicothema, 29(4), 552–557. https://doi.org/10.7334/psicothema2016.383'
      ],
      chatHints: [
        'How do I report effect sizes (η²p) for a 2×3 factorial ANOVA on entrepreneurial intention?',
        'My Levene test rejects homoscedasticity — should I use Welch ANOVA or transform the outcome?',
        'How do I structure a post-hoc analysis when comparing four incubator cohorts?'
      ]
    },
    {
      id: 'regression',
      label: 'Regression / GLM',
      sub: 'Confirmatory parametric models',
      angle: 45,
      hue: 28,
      techniques: ['OLS regression', 'Logistic regression', 'Poisson / Negative-Binomial', 'Multilevel / mixed models', 'Survival (Cox)'],
      goal: 'Test a pre-specified theoretical model with interpretable coefficients and inference on individual predictors.',
      description: 'The interpretable workhorse. Logistic regression remains the standard reference model for binary entrepreneurship outcomes — survival, intention, market entry — because its coefficients translate to odds ratios that stakeholders can read.',
      hypotheses: [
        'H1: prior entrepreneurial exposure raises the log-odds of new-venture entry, controlling for age, gender, education.',
        'H2: each unit of perceived self-efficacy multiplies the odds of intention to start a business by exp(β).',
        'H3: financing constraints negatively moderate the effect of opportunity recognition on venture survival.'
      ],
      conditions: [
        'The outcome is binary, count, continuous or time-to-event and you have a theoretically defensible specification.',
        'N ≥ 10–15 events per predictor (Osborne, 2014) for stable logistic estimates.',
        'You want interpretable parameters with confidence intervals, p-values and odds-ratios.',
        'Functional form is plausibly linear (in the link function) after transformation.'
      ],
      assumes: ['Correct functional form', 'Independence of observations', 'No severe multicollinearity (VIF < 5)', 'Linearity of logit (for logistic)', 'No extreme leverage points'],
      procedure: [
        'Specify the model from theory; pre-register interactions if possible.',
        'Check VIFs and condition indices; drop or combine collinear predictors.',
        'Fit the GLM with the appropriate link (logit, probit, log, identity).',
        'Report coefficients, ORs, 95% CIs, AUROC and Pseudo-R² (logistic) or adjusted R² (OLS).',
        'Run residual diagnostics, influence plots and out-of-sample validation on a hold-out.'
      ],
      software: ['R: lm, glm, lme4, survival, glmnet', 'Python: statsmodels, scikit-learn', 'Stata, SPSS, SAS'],
      authors: [
        { name: 'Jason W. Osborne', work: 'Best Practices in Logistic Regression (SAGE, 2014)', url: 'https://www.researchgate.net/publication/261697623_Best_Practices_in_Logistic_Regression', why: 'The de-facto guide for binary outcome reporting in social science.' },
        { name: 'Andrew Gelman & Jennifer Hill', work: 'Data Analysis Using Regression and Multilevel/Hierarchical Models (2006)', url: 'http://www.stat.columbia.edu/~gelman/arm/', why: 'Bridges classical regression with multilevel structures — typical for nested entrepreneurship data.' },
        { name: 'Frank Harrell', work: 'Regression Modeling Strategies (2nd ed., 2015)', url: 'https://hbiostat.org/rms/', why: 'Authoritative on validation, calibration and overfitting for clinical-style prediction.' },
        { name: 'Galit Shmueli', work: 'To Explain or to Predict? (Statistical Science, 2010)', url: 'https://doi.org/10.1214/10-STS330', why: 'Forces a clean separation between explanatory and predictive modelling — frames the regression vs. ML decision.' }
      ],
      keyRefs: [
        'Osborne, J. W. (2014). Best Practices in Logistic Regression. SAGE.',
        'Gelman, A. & Hill, J. (2006). Data Analysis Using Regression... Cambridge UP.',
        'Shmueli, G. (2010). Statistical Science, 25(3): 289–310. https://doi.org/10.1214/10-STS330'
      ],
      chatHints: [
        'What VIF threshold should I use to drop multicollinear predictors of intention?',
        'How do I interpret an odds ratio of 2.3 for prior self-employment on venture entry?',
        'Should I use Firth\'s penalised logistic regression for my rare-event survival data?'
      ]
    },
    {
      id: 'plssem',
      label: 'PLS-SEM',
      sub: 'Latent constructs & path models',
      angle: 90,
      hue: 60,
      techniques: ['PLS-SEM', 'Composite-based SEM', 'Higher-order constructs', 'PLS-MGA (multi-group)', 'PLSpredict'],
      goal: 'Estimate complex path models with latent constructs (entrepreneurial orientation, self-efficacy, opportunity recognition) when prediction matters and theory is exploratory.',
      description: 'Partial least squares structural equation modelling. Dominant in entrepreneurship and management when constructs are latent, formative or reflective, and the goal is to maximise explained variance in endogenous targets — not to confirm a strict covariance structure.',
      hypotheses: [
        'H1: entrepreneurial orientation → firm performance is mediated by innovation capability.',
        'H2: the path from perceived behavioural control to intention is moderated by gender (multi-group analysis).',
        'H3: a higher-order "dynamic capabilities" construct predicts venture growth above its first-order dimensions.'
      ],
      conditions: [
        'You have multiple latent constructs measured by reflective (or formative) indicators.',
        'Sample size meets the inverse-square-root or 10× rule (≥ 10 indicators on the most complex construct).',
        'The literature is exploratory or aims at prediction — you would not run covariance-based SEM.',
        'You want to evaluate a measurement model and a structural model jointly.'
      ],
      assumes: ['Reflective indicators load > 0.70 on their construct', 'AVE > 0.50 (convergent validity)', 'HTMT < 0.85/0.90 (discriminant validity)', 'No structural collinearity (inner VIF < 3)', 'Bootstrapped path significance (t > 1.96)'],
      procedure: [
        'Step 1 — Measurement model: indicator reliability, composite reliability, AVE, HTMT.',
        'Step 2 — Structural model: inner VIF, path coefficients with bootstrap CIs, R², f², Q².',
        'Run PLSpredict to assess out-of-sample relevance vs. linear benchmark.',
        'For multi-group hypotheses, conduct PLS-MGA with permutation tests.',
        'Report Hair et al. (2022) checklist explicitly in the methods section.'
      ],
      software: ['SmartPLS 4', 'R: seminr, plspm, cSEM', 'Python: semopy (covariance-based)', 'WarpPLS, ADANCO'],
      authors: [
        { name: 'Joseph F. Hair, Christian Ringle & Marko Sarstedt', work: 'A Primer on Partial Least Squares SEM (PLS-SEM), 3rd ed., SAGE 2022', url: 'https://www.smartpls.com/documentation/literature/books/', why: 'Reference manual; their two-step procedure is the journal standard.' },
        { name: 'Joseph F. Hair', work: 'Multivariate Data Analysis (8th ed.)', url: 'https://www.drnishikantjha.com/papersCollection/Multivariate%20Data%20Analysis.pdf', why: 'Cited 240,000+ times — universal rules-of-thumb for multivariate work.' },
        { name: 'Marko Sarstedt', work: 'Most-cited researcher in business / marketing methods', url: 'https://scholar.google.com/citations?user=jonm3R0AAAAJ', why: 'PLSpredict, advanced PLS-SEM applications.' },
        { name: 'Hair, Risher, Sarstedt & Ringle', work: 'When to use and how to report the results of PLS-SEM (EBR, 2019)', url: 'https://doi.org/10.1108/EBR-11-2018-0203', why: 'Concise reporting checklist used by reviewers.' }
      ],
      keyRefs: [
        'Hair et al. (2022). A Primer on PLS-SEM, 3rd ed.',
        'Hair, Risher, Sarstedt & Ringle (2019). EBR, 31(1), 2–24. https://doi.org/10.1108/EBR-11-2018-0203',
        'Sarstedt, Hair, Ringle, Thiele & Gudergan (2016). JBR, 69(10), 3998–4010.'
      ],
      chatHints: [
        'My HTMT ratio is 0.88 between two close constructs — should I drop one or merge?',
        'How do I justify reflective vs. formative measurement for entrepreneurial orientation?',
        'Walk me through interpreting Q² and PLSpredict for a model of venture growth.'
      ]
    },
    {
      id: 'fsqca',
      label: 'fsQCA',
      sub: 'Equifinal configurations',
      angle: 135,
      hue: 320,
      techniques: ['Crisp-set QCA', 'Fuzzy-set QCA', 'Multi-value QCA', 'Necessity / sufficiency analysis', 'Two-step (proximate/remote)'],
      goal: 'Identify combinations of conditions that are sufficient (and/or necessary) for the outcome — recipes, not net effects.',
      description: 'Set-theoretic, configurational method built on Boolean algebra and fuzzy sets. Embraces equifinality (multiple paths to success), conjunctural causation (variables interact in bundles), and asymmetry (the conditions for success differ from those for failure).',
      hypotheses: [
        'H1: high entrepreneurial passion AND high self-efficacy AND tolerance of risk are jointly sufficient for an effectual logic.',
        'H2: institutional support is a necessary (but not sufficient) condition for high-growth ventures.',
        'H3: the recipe for opportunity exploitation in low-support contexts differs from the recipe in well-funded ecosystems (asymmetry).'
      ],
      conditions: [
        'Small-to-medium N (typically 10–150 cases) where regression would be unstable.',
        'You expect multiple equally valid pathways to the same outcome.',
        'Theory suggests bundles of conditions matter more than isolated effects.',
        'You can calibrate sets from theoretical anchors, not just data quantiles.'
      ],
      assumes: ['Calibration is theory-driven', 'Necessity analysed before sufficiency', 'Consistency ≥ 0.80; PRI ≥ 0.65', 'Frequency threshold respects sample size', 'Negation of the outcome analysed separately'],
      procedure: [
        'Calibrate raw scores into fuzzy membership using three anchors (full-in, crossover, full-out).',
        'Run necessity analysis on each condition and its negation; report consistency and coverage.',
        'Build the truth table; set frequency cutoff (≥ 1 for small-N, higher for larger samples) and consistency threshold (≥ 0.80).',
        'Generate parsimonious, intermediate and complex solutions; report the intermediate as primary.',
        'Robustness checks: vary calibration anchors and consistency thresholds; document any case re-classification.'
      ],
      software: ['R: QCA, SetMethods', 'fsQCA software (Ragin, free)', 'Tosmana', 'fs/QCA Pro'],
      authors: [
        { name: 'Charles C. Ragin', work: 'Redesigning Social Inquiry: Fuzzy Sets and Beyond (2008)', url: 'https://press.uchicago.edu/ucp/books/book/chicago/R/bo5973952.html', why: 'Creator of QCA and fsQCA; foundational text.' },
        { name: 'Sven Kraus, Domingo Ribeiro-Soriano & Maximilian Schüssler', work: 'fsQCA in entrepreneurship and innovation research – the rise of a method (IEMJ, 2018)', url: 'https://doi.org/10.1007/s11365-017-0461-8', why: '627+ citations; entry point for the field.' },
        { name: 'Shahrokh Nikou, József Mezei, Eric Liguori & Ayman El Tarabishy', work: 'FsQCA in entrepreneurship research: Opportunities and best practices (JSBM, 2024)', url: 'https://doi.org/10.1080/00472778.2022.2147190', why: 'Step-by-step guide with GEM application — current procedural standard.' },
        { name: 'Carsten Q. Schneider & Claudius Wagemann', work: 'Set-Theoretic Methods for the Social Sciences (Cambridge, 2012)', url: 'https://www.cambridge.org/core/books/settheoretic-methods-for-the-social-sciences/D45F8FB4E821B7B6196DDC0A56A18FA9', why: 'Methodological depth on consistency, PRI and solution types.' },
        { name: 'Stroe, Parida & Wincent', work: 'Effectuation or causation: An fsQCA analysis (JBR, 2018)', url: 'https://doi.org/10.1016/j.jbusres.2018.01.035', why: 'Exemplary application to entrepreneurial decision logic.' },
        { name: 'Ilias O. Pappas & Arch G. Woodside', work: 'fsQCA Guidelines for IS and marketing (IJIM, 2021)', url: 'https://doi.org/10.1016/j.ijinfomgt.2021.102310', why: 'Practical tutorial covering predictive validation.' }
      ],
      keyRefs: [
        'Ragin, C. C. (2008). Redesigning Social Inquiry. Univ. of Chicago Press.',
        'Nikou et al. (2024). JSBM, 62(3), 1531–1548. https://doi.org/10.1080/00472778.2022.2147190',
        'Kraus, Ribeiro-Soriano & Schüssler (2018). IEMJ. https://doi.org/10.1007/s11365-017-0461-8'
      ],
      chatHints: [
        'How do I choose calibration anchors for "high entrepreneurial passion" measured on a 7-point Likert?',
        'My necessity analysis flags an inconsistency above 0.95 but coverage is 0.45 — is the condition trivial?',
        'Should I report the parsimonious or intermediate solution as my primary finding?'
      ]
    },
    {
      id: 'cluster',
      label: 'Clustering',
      sub: 'Unsupervised typologies',
      angle: 180,
      hue: 260,
      techniques: ['k-means', 'Hierarchical (Ward)', 'DBSCAN / HDBSCAN', 'Gaussian mixtures', 'Latent Class / Profile (LCA / LPA)'],
      goal: 'Discover latent groups, types or trajectories without a labelled outcome — entrepreneur archetypes, ecosystem typologies, growth-pattern segments.',
      description: 'Unsupervised learning that partitions cases by similarity. The default method for building data-driven typologies of entrepreneurs, startups or ecosystems when you do not yet have a target variable.',
      hypotheses: [
        'H1: there exist k distinct entrepreneur profiles characterised by combinations of motivation, education and risk-tolerance.',
        'H2: sustainable startups cluster into archetypes that map to differentiated policy needs.',
        'H3: the optimal partition (BIC / silhouette) is stable across split-half replications.'
      ],
      conditions: [
        'No labelled outcome — you need to *find* groups, not predict them.',
        'You can defend the distance metric and feature scaling.',
        'Theory or domain knowledge can later interpret and name the clusters.',
        'You commit to validating stability (split-half, bootstrap, gap statistic).'
      ],
      assumes: ['Meaningful distance metric', 'Comparable feature scales (z-scoring or robust scaling)', 'Latent group structure exists in feature space', 'Outliers handled or flagged (DBSCAN/HDBSCAN)'],
      procedure: [
        'Theory-driven variable selection — Ketchen & Shook warn against irrelevant variables that "fog" the structure.',
        'Standardise features; consider Mahalanobis or Gower for mixed types.',
        'Run hierarchical (Ward) for visual exploration via dendrogram, then k-means on the chosen k.',
        'Validate using silhouette, gap statistic, BIC (for GMM), and split-half replication.',
        'Profile clusters with ANOVA / chi-square contrasts; name them theoretically.'
      ],
      software: ['R: cluster, mclust, dbscan, NbClust', 'Python: scikit-learn, hdbscan, kmodes', 'Mplus (LCA/LPA)', 'Stata gsem'],
      authors: [
        { name: 'David J. Ketchen & Christopher L. Shook', work: 'The Application of Cluster Analysis in Strategic Management Research (SMJ, 1996)', url: 'https://yellowedge.files.wordpress.com/2008/09/ketchen_strategicplanning.pdf', why: '3,500+ citations — required reading for any cluster study in management.' },
        { name: 'Anil K. Jain', work: 'Data Clustering: 50 Years Beyond K-means (PRL, 2010)', url: 'https://doi.org/10.1016/j.patrec.2009.09.011', why: '10,000+ citations; the methodological landscape.' },
        { name: 'Crum, Nelson, de Borst & Byrnes', work: 'The use of cluster analysis in entrepreneurship research (JSBM, 2022)', url: 'https://doi.org/10.1080/00472778.2020.1748475', why: 'Field-specific review (1990–2019) of when clustering is justified.' },
        { name: 'Woo, Cooper, Dunkelberg, Daellenbach & Dennis', work: 'The Development and Interpretation of Entrepreneurial Typologies (JBV, 1991)', url: 'https://www.sciencedirect.com/journal/journal-of-business-venturing', why: 'Classic typology paper — model for "what to do after the dendrogram".' },
        { name: 'Olteanu & Fichter', work: 'Startups as sustainability transformers: a new empirical taxonomy (BSE, 2022)', url: 'https://doi.org/10.1002/bse.3065', why: 'Modern policy-relevant taxonomy of sustainable startups.' },
        { name: 'Ester, Kriegel, Sander & Xu', work: 'A Density-Based Algorithm for Discovering Clusters (DBSCAN, KDD-96)', url: 'https://www.aaai.org/Papers/KDD/1996/KDD96-037.pdf', why: 'Reference for noise-aware clustering of geo / ecosystem data.' }
      ],
      keyRefs: [
        'Ketchen & Shook (1996). SMJ, 17(6), 441–458.',
        'Jain, A. K. (2010). PRL, 31(8), 651–666. https://doi.org/10.1016/j.patrec.2009.09.011',
        'Crum, Nelson, de Borst & Byrnes (2022). JSBM, 60(4), 961–1000.'
      ],
      chatHints: [
        'How do I decide between k-means and HDBSCAN for clustering 1,500 startups by financial traces?',
        'What stability test convinces reviewers my four-cluster solution is real?',
        'Walk me through profiling clusters with chi-square and ANOVA after a Ward solution.'
      ]
    },
    {
      id: 'trees',
      label: 'Boosted Trees',
      sub: 'Out-of-sample prediction',
      angle: 225,
      hue: 168,
      techniques: ['CART', 'Random Forest', 'Gradient Boosting', 'XGBoost / LightGBM', 'CatBoost'],
      goal: 'Predict accurately on tabular entrepreneurship data — survival, funding, exit, market entry — usually the strong baseline that beats logistic regression.',
      description: 'Tree-based ensembles excel on the tabular data that dominate entrepreneurship: GEM micro-files, firmographic panels, survey-plus-register linkages. Random Forest gives robust importance scores; XGBoost / LightGBM typically win on raw accuracy.',
      hypotheses: [
        'H1: boosted trees outperform logistic regression in AUROC for predicting venture entry on GEM cross-country data.',
        'H2: the most predictive variables for first-year survival differ from those that classical theory emphasises.',
        'H3: SHAP interaction values reveal a non-linear effect of self-efficacy that scales with prior exposure.'
      ],
      conditions: [
        'Tabular data with mixed predictors and meaningful class signal.',
        'N sufficient for splits (rule of thumb: ≥ 200 events for stable Random Forest).',
        'Prediction is a deliverable — for policy targeting, screening, scouting.',
        'Discipline of train / validation / test split is non-negotiable.'
      ],
      assumes: ['Sufficient N for honest splits', 'No leakage between feature engineering and resampling', 'Train/validation/test discipline', 'Properly tuned hyperparameters (depth, η, num_round)'],
      procedure: [
        'Stratified train/validation/test split (commonly 70/15/15) with fixed seed.',
        'Tune hyperparameters with k-fold CV on the training set; never touch the test set.',
        'Compare against logistic baseline; report ΔAUROC with DeLong test.',
        'Report feature importance (gain / permutation) and SHAP attributions on the test set.',
        'Calibrate predicted probabilities (Platt / isotonic) before policy use.'
      ],
      software: ['R: rpart, randomForest, xgboost, lightgbm', 'Python: scikit-learn, xgboost, lightgbm, catboost', 'H2O.ai'],
      authors: [
        { name: 'Leo Breiman', work: 'Random Forests (Machine Learning, 2001)', url: 'https://doi.org/10.1023/A:1010933404324', why: 'The seminal paper — bagging + random feature selection.' },
        { name: 'Tianqi Chen & Carlos Guestrin', work: 'XGBoost: A Scalable Tree Boosting System (KDD, 2016)', url: 'https://doi.org/10.1145/2939672.2939785', why: 'Introduction of the system that dominates tabular ML benchmarks.' },
        { name: 'Christian Schade et al.', work: 'Predicting entrepreneurial activity using machine learning (JBV Insights, 2023)', url: 'https://doi.org/10.1016/j.jbvi.2022.e00357', why: 'XGBoost beats logistic regression on 1.19M GEM observations from 99 countries.' },
        { name: 'Pinelopi Koumbarakis & Thierry Volery', work: 'Predicting New Venture Gestation Outcomes With ML Methods (JSBM, 2023)', url: 'https://doi.org/10.1080/00472778.2022.2082453', why: 'Direct application of RF / XGBoost to gestation data.' },
        { name: 'Lior Rokach & Oded Maimon', work: 'Top-Down Induction of Decision Tree Classifiers — A Survey (IEEE, 2005)', url: 'https://doi.org/10.1109/TSMCC.2004.843247', why: 'Concise theoretical survey for the methods section.' }
      ],
      keyRefs: [
        'Breiman, L. (2001). Machine Learning, 45(1), 5–32.',
        'Chen, T. & Guestrin, C. (2016). XGBoost. KDD ’16.',
        'Schade et al. (2023). JBV Insights, 19, e00357.'
      ],
      chatHints: [
        'My XGBoost model has 0.82 AUROC vs. logistic at 0.74 — how do I report this rigorously?',
        'Should I use SHAP or permutation importance to communicate findings to non-technical reviewers?',
        'How do I tune learning_rate and max_depth on a 50k-row entrepreneurial-intention dataset?'
      ]
    },
    {
      id: 'xai',
      label: 'Explainable AI / EBM',
      sub: 'Theory generation from prediction',
      angle: 270,
      hue: 130,
      techniques: ['Explainable Boosting Machine (EBM)', 'SHAP / DeepSHAP', 'ALE plots', "Friedman's H statistic", 'Partial Dependence + ICE'],
      goal: 'Use predictive models as a microscope to surface non-linear effects and conditional interactions that feed back into theory.',
      description: 'A bridge between prediction and explanation. EBM and SHAP give you globally faithful, interpretable attributions — ideal for entrepreneurship studies that want both accuracy and theoretical contribution.',
      hypotheses: [
        'H1: a SHAP analysis identifies a non-linear effect of perceived feasibility above a threshold that classical theory missed.',
        'H2: an EBM reveals a stable interaction between gender and risk-tolerance that holds across resamples.',
        "H3: Friedman's H detects global interaction strength > 0.10 between context and individual variables."
      ],
      conditions: [
        'You have a strong predictive model and want to derive theoretical insights from it.',
        'Stakeholders need explanations, not only predictions.',
        'Interactions matter substantively (not just incidentally).',
        'You can build a stable background distribution for SHAP attributions.'
      ],
      assumes: ['Background distribution available', 'Stakeholder-facing explanations needed', 'Interactions matter substantively', 'Attribution stability across seeds verified'],
      procedure: [
        'Train the strongest predictive model (XGBoost, NN) and a transparent EBM in parallel.',
        'Build a stratified background sample (e.g. 100 cases) for SHAP.',
        'Report mean |SHAP| and SHAP interaction values; show stability across seeds.',
        'Use ALE plots for marginal shape, ICE for individual heterogeneity.',
        "Quantify global interaction strength with Friedman's H."
      ],
      software: ['Python: shap, interpret (EBM), pyale, alibi', 'R: iml, fastshap, ALEPlot', 'Microsoft InterpretML'],
      authors: [
        { name: 'Scott M. Lundberg & Su-In Lee', work: 'A Unified Approach to Interpreting Model Predictions (NeurIPS, 2017)', url: 'https://papers.nips.cc/paper/7062-a-unified-approach-to-interpreting-model-predictions', why: 'Original SHAP paper — game-theoretic attribution.' },
        { name: 'Yann LeCun, Yoshua Bengio & Geoffrey Hinton', work: 'Deep Learning (Nature, 2015)', url: 'https://doi.org/10.1038/nature14539', why: 'Backbone for DeepSHAP and modern attribution.' },
        { name: 'Christoph Molnar', work: 'Interpretable Machine Learning (2nd ed., 2022)', url: 'https://christophm.github.io/interpretable-ml-book/', why: 'Definitive open textbook on PDP, ALE, SHAP, EBM.' },
        { name: 'Rich Caruana et al.', work: 'InterpretML / Explainable Boosting Machine', url: 'https://interpret.ml/', why: 'EBM = glassbox accuracy comparable to RF / XGB.' },
        { name: 'Galit Shmueli', work: 'To Explain or to Predict? (Stat. Sci., 2010)', url: 'https://doi.org/10.1214/10-STS330', why: 'Conceptual scaffolding for the explain-from-prediction paradigm.' }
      ],
      keyRefs: [
        'Lundberg & Lee (2017). NeurIPS.',
        'Molnar, C. (2022). Interpretable Machine Learning.',
        'Shmueli, G. (2010). Statistical Science. https://doi.org/10.1214/10-STS330'
      ],
      chatHints: [
        'How do I report a SHAP interaction value alongside a regression coefficient in the same paper?',
        'Should I prefer EBM over XGBoost+SHAP if interpretability is the deliverable?',
        'How stable do SHAP attributions need to be across seeds to count as evidence?'
      ]
    },
    {
      id: 'deep',
      label: 'Deep Learning',
      sub: 'Neural networks on rich data',
      angle: 315,
      hue: 210,
      techniques: ['MLP', 'CNN (vision)', 'RNN / LSTM', 'Transformers (BERT, LLM finetune)', 'Autoencoders'],
      goal: 'Predict on high-dimensional, unstructured or richly interactive data — pitch-deck text, founder voices, social-media images, platform traces.',
      description: 'Deep neural networks shine where the input is unstructured (text, images, sequences) or where conditional high-order interactions matter. In entrepreneurship: predicting funding rounds from pitch text, classifying founder narratives, forecasting platform-mediated venture survival.',
      hypotheses: [
        'H1: a fine-tuned BERT classifier on pitch-deck text predicts seed-funding outcomes with AUROC > 0.85.',
        'H2: a multimodal model that combines founder voice features with firmographics outperforms either modality alone.',
        'H3: an autoencoder reveals a low-dimensional manifold of entrepreneurial trajectories.'
      ],
      conditions: [
        'Your inputs are unstructured (text, image, audio, sequence) or extremely high-dimensional.',
        'You have ≥ a few thousand labelled examples (or pretrained backbones to fine-tune).',
        'You can afford GPU compute and the engineering discipline DL demands.',
        'Accuracy outweighs full interpretability — pair with XAI for insight.'
      ],
      assumes: ['Rich item-level or unstructured data', 'High-order or conditional interactions plausible', 'Compute resources available', 'Train / validation / test discipline maintained', 'Reproducibility seeds, environments and configs versioned'],
      procedure: [
        'Curate the data; verify train/val/test partitions are leakage-free.',
        'Choose architecture by modality: MLP for tabular, CNN for images, transformer for text/sequence.',
        'Use early stopping on validation; track learning curves to detect overfitting.',
        'Compare against a strong tabular baseline (XGBoost) and against a transparent model (logistic).',
        'Pair with SHAP / DeepSHAP / attention visualisation for partial interpretability.'
      ],
      software: ['Python: PyTorch, TensorFlow / Keras, JAX', 'Hugging Face Transformers, PEFT', 'fastai, PyTorch Lightning', 'NVIDIA / Colab / local Ollama for LLMs'],
      authors: [
        { name: 'Yann LeCun, Yoshua Bengio & Geoffrey Hinton', work: 'Deep Learning (Nature 521, 2015)', url: 'https://doi.org/10.1038/nature14539', why: '79,000+ citations — canonical overview.' },
        { name: 'Ian Goodfellow, Yoshua Bengio & Aaron Courville', work: 'Deep Learning (MIT Press, 2016)', url: 'https://www.deeplearningbook.org/', why: 'Standard graduate-level reference.' },
        { name: 'Tom Mitchell', work: 'Machine Learning (1997)', url: 'https://www.cs.cmu.edu/~tom/files/MachineLearningTomMitchell.pdf', why: 'Foundational treatment of learning algorithms.' },
        { name: 'Martin Obschonka & David B. Audretsch', work: 'Artificial intelligence and big data in entrepreneurship (Small Business Economics, 2020)', url: 'https://doi.org/10.1007/s11187-019-00202-4', why: 'Sets the agenda for AI in entrepreneurship research.' },
        { name: 'Christian Schade et al.', work: 'Predicting entrepreneurial activity using machine learning (JBV Insights, 2023)', url: 'https://doi.org/10.1016/j.jbvi.2022.e00357', why: 'Compares ANN against logistic and tree ensembles on GEM data.' }
      ],
      keyRefs: [
        'LeCun, Bengio & Hinton (2015). Nature, 521. https://doi.org/10.1038/nature14539',
        'Goodfellow, Bengio & Courville (2016). Deep Learning. MIT Press.',
        'Obschonka & Audretsch (2020). Small Bus. Econ.'
      ],
      chatHints: [
        'Should I fine-tune BERT or use a frozen embedding + logistic head for my pitch-text classifier?',
        'How big does my labelled set need to be before deep learning beats XGBoost?',
        'How do I report DL results when interpretability matters to my reviewers?'
      ]
    }
  ],
  rings: [
    { id: 'goal',   label: 'Analytic goal',     sub: 'Why are you modelling?',                  rNorm: 0.95 },
    { id: 'data',   label: 'Data structure',    sub: 'What does your dataset look like?',       rNorm: 0.65 },
    { id: 'assume', label: 'Assumptions',       sub: 'What can you defend?',                    rNorm: 0.35 },
  ],
};
