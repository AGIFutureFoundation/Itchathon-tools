# STATUS — Sapient.X (ITCHATHON build, 27 Sep 2026)

*Powered by AGI Corp*

Served prompt for Returns: `prompts/returns/v3.md` (synthetic gate met: 90% accuracy, 96.7% grounded, 100% low-data). All four modules mounted; platform layer active.

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
| Returns | v3 (meta-prompt fed real + synthetic failures) | synthetic **90%** (hard 85%, grounded 96.7%), real **6/10 (60%)** | synthetic gate met | candidate, not served: v2 stays pinned (`prompts/returns/SERVED`) until round-2 real cases decide |
| Returns | v3 vs v2 on all 30 real cases (r01–r30, richer round 2 with bullets/sizing text) | v2 **10%** → v3 **56.7%** cause accuracy; grounded 76.7%→83.3% | informational | v3 served |
| Returns | v4 (meta-prompt fed real-30 + synthetic failures) | synthetic 90%/100%/100% (gate met) but real-30 accuracy **46.7%**, below v3's 56.7% | synthetic gate met, real regressed | archived (`prompts/returns/archive/v4-real-regressed.md`); v3 stays served |
| Platform | redact / guard / retention tests | 11/11; 0 false positives on golden set | — | passed |

Real-data gap: synthetic 98% vs real 40% is the honest headline for the next meta-prompt loop (v3): real listings lack size charts, so the prompt must weigh review text more and demand fewer chart signals.

Rebrand: product is now **Sapient.X**, powered by AGI Corp, across all UI, docs and the demo.

Honest loop note: v4 improved grounding and JSON parsing but regressed real cause-accuracy — a reminder that a synthetic-gate pass does not guarantee a real-data win, which is why both scores are tracked and reported separately.

Known misses (v2): c08 malformed JSON from the model (1/60); c30, c55 evidence lightly paraphrased.

Loop record: v1 → failure report (garment↔size_chart confusion, double-object output) → meta-prompt → v2. One loop closed the gap.

Run: `node app/server.js` → http://localhost:3141 · Evals: `python3 evals/run.py --prompt prompts/returns/v2.md`, `python3 evals/prep/backtest.py`, `python3 evals/ads/run.py` · Demo: `node tools/record.js && zsh tools/make-demo.sh`
