# Method Atlas — Entrepreneur

A guided web tool that walks researchers through an adaptive questionnaire and
recommends the most appropriate predictive analytic technique for their
entrepreneurship study. Built around an eight-sector taxonomy and paired with
a local-LLM chat that answers methodological follow-ups using the supplied
bibliography.

## What's inside

```
Method Atlas.html        # entry point — open in any modern browser
index.html               # design canvas comparing three visual tones
method-atlas-paper.html  # warm-paper variant
method-atlas-editorial.html  # clean editorial variant
styles.css

components/
  app.jsx              # orchestrator — adaptive question flow
  mandala.jsx          # 3D mandala of analytic sectors
  mini-map.jsx         # side mini-map and breadcrumbs
  dialog-bar.jsx       # bottom question dialog
  methods-recipe.jsx   # tailored 9-step methods recipe
  result-screen.jsx    # final recommendation with authors and links
  chat-panel.jsx       # local-LLM consultation panel (right rail, toggleable)

data/
  taxonomy.js          # 8-sector taxonomy with hypotheses, conditions,
                       #   assumptions, software, procedure, authors, links
  questions.js         # 11 questions: soft-weighted opening + adaptive late
                       #   branches + closing questions
  knowledge.js         # bibliography digest fed to the local LLM as
                       #   grounding context

biblio/                 # source bibliography (PDFs excluded from git;
                       #   .docx summaries are tracked)
```

## How the recommendation works

- **Phase A (Q1–Q5)** are always shown with deliberately soft weights so no
  technique can win after only two or three answers.
- **Phase B (Q6–Q7)** sharpen the data structure (predictor types, expected
  linearity).
- **Phase C** is **adaptive**. A pool of branching questions (`A-RegPls`,
  `A-TreesDeep`, `A-TreesXai`, `A-FsqcaCalib`, `A-ClusterStability`,
  `A-AnovaDesign`, `A-DeepReadiness`, `A-RegSpec`, `A-Tiebreak`) only fires
  when its `showIf(scores, history)` predicate evaluates to true given the
  current leaderboard. Late questions therefore target the live ambiguity.
- **Phase D (Q-INTERP, Q-VALID, Q-TRIAN)** close the interview with reporting
  and triangulation choices.

The eight sectors are **ANOVA / GLM**, **Regression / GLM**, **PLS-SEM**,
**fsQCA**, **Clustering**, **Boosted Trees**, **Explainable AI / EBM** and
**Neural Networks**.

## Local LLM (Ollama)

The chat lives on the right rail and stays mounted throughout the
questionnaire and on the result screen. It can be hidden / shown without
disturbing the question dialog.

The chat talks to a local **Ollama** instance over its REST API. Default
model: `llama3.1:8b-instruct-q4_K_M`. Suggested alternatives:
`mistral:7b-instruct`, `qwen2.5:7b-instruct`, `qwen2.5:14b-instruct`,
`gemma2:9b-instruct`, `phi3:medium-128k-instruct`.

### One-time setup

```sh
# 1. Install Ollama
#    macOS / Linux: see https://ollama.com/download
#    Windows: same installer

# 2. Pull a model
ollama pull llama3.1:8b-instruct-q4_K_M

# 3. Start the daemon with browser CORS allowed
#    macOS / Linux:
OLLAMA_ORIGINS=* ollama serve

#    Windows (PowerShell):
$env:OLLAMA_ORIGINS = "*"
ollama serve
```

The chat sends the contents of `data/knowledge.js` (a curated digest of the
bibliography) as the system prompt every turn so the model's answers stay
grounded in the supplied references.

## Bibliography

The directory `biblio/` holds the source documents, including:

- `Artículos de Análisis Predictivo Emprendedor.docx` — the main methodological
  brief.
- `otros enlaces.docx` — author-by-author author index.
- 60+ academic PDFs (excluded from git per project owner; available in the
  source folder).

The chat panel does not load PDFs; it relies on the `data/knowledge.js`
digest, which synthesises the key claims, procedures and authors of each
sector for the local model.

## Deployment

This is a static site. Any static-hosting target works:

- Open `Method Atlas.html` directly in a browser (file:// works).
- Serve the folder with any static server.
- Upload to a hosting account via SFTP / SSH.

## License

Internal research tool for the UPO entrepreneurship group.
