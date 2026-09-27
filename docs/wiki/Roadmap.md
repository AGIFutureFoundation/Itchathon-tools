# Roadmap

What is built, what the repository already points at as the next step, and what is deferred on purpose. Items are drawn from `docs/ARCHITECTURE.md`, `docs/COMPLIANCE.md`, `docs/PITCH_NOTES.md`, the agent definitions and the code comments; nothing here is a promise with a date.

## Where the build stands (27 Sep 2026)

| Module | Status | Evidence |
|---|---|---|
| Returns | prompt v2 passed the gate: 98.3% cause accuracy, 95% grounded, 100% low-data honesty, 100% on the hard 20 | `evals/returns/results/v2.log` |
| Prep | forecast and 7am card shipped; backtest 30.4% better than the habit, Node/Python parity | `evals/prep/results.json` |
| Ads | stats, plain read and ownership checklist shipped; 20/20 stats honesty | `evals/ads/results.json` |
| Theft | playbook, log, summary, harden shipped; rules only | `app/modules/theft.js` |
| Platform | auth, rate limit, audit, redaction, guard, retention; tests pass | `app/platform/`, `tests/` |
| Dashboard | `/api/dashboard/summary` aggregates live data and labels demo series; `dashboard.html` is the root page | `app/modules/dashboard.js` |
| ASIN import | `/api/import-asin` pulls critical reviews via Apify; 10 real cases evaluated (4/10, informational) | `app/modules/apify.js`, `STATUS.md` |

## Next: pilots

The close of the pitch: "We do not sell detection. We sell the next ten seconds, and a record of what happened in them." The next step is to run the four modules with real owners and let their cases drive the eval loop. The mechanics already exist: a failing real case goes into `evals/<module>/cases.jsonl`, the eval runner produces a failure report, the meta-prompter writes the next version, and the gate decides. `evals/returns/cases_real.jsonl` (10 cases built from Apify-scraped Amazon reviews) is the first step down that road.

## Returns

- **Close the real-data gap.** v2 scores 98.3% on synthetic cases and 4/10 on the real Apify cases (`STATUS.md`). Real listings lack size charts, so v3 must weigh review text more and demand fewer chart signals. `generate.py` now accepts `FAILURES=<path>` to point the meta-prompt at `v2_real.failures.md`.
- **ASIN path beyond the free tier.** `/api/import-asin` exists but is capped at 10 reviews per run by the Apify free tier; a paid actor plan lifts that.
- **Judge and persona-Ben in the gate.** The judge's 1–5 rubric (specific, pasteable, fits the cause) needs calibration: agree within one point on ≥ 12 of 15 hand-scored outputs. Ben's yes on ≥ 70% of outputs is listed on the pitch page as a gate criterion but is not yet computed by `evals/run.py`.
- **v3.** The two remaining grounding misses (c30, c55) are lightly paraphrased quotes; the v2 failure report is ready as input to `generate.py`.

## Prep

- A POS export importer (the compliance doc already specifies keeping only `{item, qty, ts, price}` and redacting on import) to replace the dashboard's deterministic 7-day series.
- A weather provider with per-tenant caching and attribution.

## Ads

- Google Ads / Meta Marketing API connections with read-only OAuth tokens stored encrypted, replacing the pasted export.
- Route `/api/ads/read` through `redact()` and `guard.checkOutput()` like `/api/diagnose`, and generate `prompts/ads/vN.md` through `generate.py` so the compliance clause and the eval loop apply to it too.

## Theft

- A camera-vendor webhook (Veesion or generic) posting directly to `/api/theft/alert`.
- A "customer service" display slide for the till screen, referenced in the playbook's secondary action.
- Onboarding checklist for signage and lawful basis, per jurisdiction, as `docs/COMPLIANCE.md` section 3 requires.

## Platform

- **Tenants from a table.** `docs/ARCHITECTURE.md`: tenants are files deliberately, for this stage; swapping `tenants.json` for a table is a one-module change behind `auth.js`.
- **Hash-chained audit lines.** `docs/COMPLIANCE.md` describes each audit line carrying the previous line's hash; `audit.js` today stores `input_sha256` per row without chaining.
- **DSAR tooling.** A command that greps a tenant's audit rows for an order id or text fragment and deletes on request (`retention.js` accepts a one-off cutoff).
- **Zero-data-retention** arrangement with the model provider before processing EU buyer text at scale.
- Keep `STATUS.md` (the lead's score table and loop record) updated after every loop.

## Deliberately not planned

- Any detector. The brief's conclusion is that detection is solved; the product is the step after it.
- Facial recognition, biometrics or re-identification in the theft module. `docs/COMPLIANCE.md`: do not add it later without a full DPIA and legal review.
- Cross-tenant pooling or benchmarking of ad or returns data. Forbidden by the Google and Meta terms and by design.
- Hand-edited product prompts.
