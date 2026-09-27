# STATUS — Owner Console (ITCHATHON build, 27 Sep 2026)

Frozen prompt for Returns: `prompts/returns/v2.md` (gate met). All four modules mounted; platform layer active.

| Module | Metric | Result | Gate | Status |
| --- | --- | --- | --- | --- |
| Returns (Ch. 1) | Cause accuracy, 60 cases | v1 78.3% → v2 **98.3%** | ≥ 80% | passed |
| Returns | Hard subset (20 noisy cases) | 85% → **100%** | — | passed |
| Returns | Evidence grounded (verbatim) | 88% → **95%** | ≥ 95% | passed |
| Returns | Low-data honesty | 83% → **100%** | 100% | passed |
| Returns | Mean latency | 25.0s → **15.1s** | — | — |
| Prep (Ch. 4) | Pinball loss vs same-weekday-last-week | **+30.4%** (run-out +32.6%, neutral +28.0%) | ≥ 15% | passed |
| Ads (Ch. 2) | Stats honesty on 20 cases | **20/20** | 100% | passed |
| Theft (Ch. 3) | Non-confrontation guarantee | rules table, no LLM; tested | never confronts | passed |
| Returns | **Real** Amazon reviews via Apify, 10 cases (title+description only, no size chart; labels hand-assigned by the data agent) | **4/10 (40%)** — confusions: garment↔size_chart, expectation→size_chart | informational | next loop's failure report (`evals/returns/results/v2_real.failures.md`) |
| Platform | redact / guard / retention tests | 11/11; 0 false positives on golden set | — | passed |

Real-data gap: synthetic 98% vs real 40% is the honest headline for the next meta-prompt loop (v3): real listings lack size charts, so the prompt must weigh review text more and demand fewer chart signals.

Known misses (v2): c08 malformed JSON from the model (1/60); c30, c55 evidence lightly paraphrased.

Loop record: v1 → failure report (garment↔size_chart confusion, double-object output) → meta-prompt → v2. One loop closed the gap.

Run: `node app/server.js` → http://localhost:3141 · Evals: `python3 evals/run.py --prompt prompts/returns/v2.md`, `python3 evals/prep/backtest.py`, `python3 evals/ads/run.py` · Demo: `node tools/record.js && zsh tools/make-demo.sh`
