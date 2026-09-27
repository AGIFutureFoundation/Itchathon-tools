# Charts

All charts sourced from `evals/returns/results/*.{json,log}`, `evals/prep/results.json`, `evals/ads/results.json`, and `STATUS.md`. Dark theme, module colors from `app/public/console.css`.

- `eval-progression.png` -> `docs/wiki/Eval-Loop-and-Meta-Prompting.md`, `README.md` (Returns cause accuracy/grounded/low-data honesty v1-v4 vs 80% gate)
- `synthetic-vs-real.png` -> `docs/wiki/Eval-Loop-and-Meta-Prompting.md`, `STATUS.md` (headline honest finding: synthetic vs real-30 gap)
- `confusion-v2.png` -> `docs/wiki/Eval-Loop-and-Meta-Prompting.md` (v2 confusion matrix, synthetic 60 cases)
- `confusion-v3.png` -> `docs/wiki/Eval-Loop-and-Meta-Prompting.md` (v3 confusion matrix, served prompt)
- `prep-backtest.png` -> `docs/wiki/Prep-Module.md` or Ch.4 wiki page, `README.md` (naive vs model pinball loss)
- `module-radar.png` -> `README.md`, `pitch/` deck (cross-module gate performance; scaling caveats in caption)
- `architecture-diagram.png` -> `docs/wiki/Architecture.md`, `README.md` (meta-prompt loop, 4 modules, platform layer)

Regenerate with the matplotlib script used to build these (see session scratchpad `make_charts.py`); all figures render at ~150dpi on a #0B1220 background for embedding in dark-mode docs.
