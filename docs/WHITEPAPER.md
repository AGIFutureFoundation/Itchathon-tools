# Sapient.X — Whitepaper

**Four small-business problems. One action each. Every answer tested before it is allowed to appear.**

Powered by AGI Corp · ITCHATHON entry · As of 27 Sep 2026 · https://github.com/AGIFutureFoundation/Itchathon-tools

Every number here comes from a repository file or from the ITCHATHON Challenges brief. Anything else is marked "assumption" and lives in one table in section 9.

## 1. Executive summary

Small shops already have the data that says what went wrong: the return rate, the camera alert, the ad dashboard's "winner", last week's sales. What nobody gives the owner is the next step: one thing to do, in plain words, in under a minute, alone.

Sapient.X is four modules on one platform. Each takes a signal the business already has and returns one action:

- **Returns** — one cause per SKU, the buyer's own words as proof, a fix to paste into the listing.
- **Prep** — one prep number per item for 7am.
- **Ads** — the one ad change worth making this week, or an honest "no winner yet".
- **Theft** — the sentence to say and where to stand in the ten seconds after an alert. No confrontation. No model.

Where a model is involved, its prompt was written by a meta-prompt, scored on labelled cases, and shipped only when it beat the previous version. Returns went from 78.3% to 98.3% cause accuracy in one loop. Prep beats "same weekday last week" by 30.4%. Ads scored 20/20 on statistics honesty. On ten cases built from real Amazon reviews without size charts, returns scored 4/10. That gap feeds the next loop, and we report it rather than hide it.

## 2. The problem

The brief describes four pains with one shape: detection exists, the step after it does not.

**Returns.** A seller above 20% returns on r/AmazonSeller, quoted in the brief:

> the "reason" field customers pick at checkout is useless, everything's either "changed my mind" or "doesn't fit", neither tells me if it's the product, the photos, or the sizing.

Since June 2024 Amazon charges a returns processing fee of 2.9–12.8% above category thresholds. The "Frequently returned item" badge cuts conversion by 25–50%. The only fix the thread found was manual: read your own returns, work out why, rewrite the listing.

**Ads.** The owner pays an agency (about $3,500 a month, per the brief) and does not know what CPA, ROAS, CTR or PMax mean. A calculator told one owner that 135 impressions with 0 conversions versus 122 with 2 had a "winner". Performance Max goes erratic under roughly 30–50 conversions a month.

**Theft.** The camera, or a service like Veesion, already flags the aisle. The person on the floor is alone, the item is worth $10–$20, and nobody has told them what to do in the next ten seconds.

**Prep.** The POS holds every sale. At 7am the shift lead still guesses, usually from last week.

## 3. Why existing tools fail

They were built for volume, budget and staff the small operator does not have.

| Tool class | Built for | What the SMB lacks | Source |
|---|---|---|---|
| Sizing tools (True Fit, Bold Metrics) | Brand storefronts; ~$1,650/month entry | Cannot be installed on a marketplace listing | Brief |
| Marketing agencies | Accounts big enough to test; ~$3,500/month | Enough conversions for a clean A/B test | Brief |
| Google Performance Max | 30–50+ conversions a month | The volume that keeps the automation stable | Brief; `ads.js` |
| AI video analytics | Multi-staff stores; $8–35K installed, or Veesion at a few hundred $/month | A second person to act on the alert; a safe script | Brief |

None fail at detection. They fail because the owner is one person, the sample is small, and the tool stops at the dashboard.

## 4. The insight

Detection is solved; the next step is not.

The real competitor for each module is not a vendor. It is the habit. For returns it is reading returns one ASIN at a time and phoning buyers to say which size to keep. For prep it is "same weekday last week". For ads it is trusting the word "winner". For theft it is doing nothing, or something unsafe.

So each module is scored against the habit. Prep must beat last week's number by at least 15% or it does not ship. Returns must name the right cause on 80% of labelled cases, quote evidence verbatim on 95%, and say "not enough data" whenever the data is thin. Four returns are four sentences, not a statistic.

## 5. Product: Sapient.X

One Node process, no framework, no npm dependencies. Four modules behind one platform layer.

| Module | Signal in | Action out | Measured result | Model? |
|---|---|---|---|---|
| Why Did It Come Back? (Ch. 1) | Listing, size chart, returns, reviews, messages; or an ASIN via Apify | One cause, verbatim quotes checked by code, paste-ready fix, keep-size message | 98.3% cause accuracy on 60 cases; 100% on the hard 20; 15.1 s | Yes, gated |
| Today's Prep (Ch. 4) | POS history, run-out/neutral/waste preference, bookings, events, weather | One prep number per item with a range and a reason; 7am card | Pinball loss 2.88 vs 4.14 for the habit: +30.4% | No |
| Ads Plain Read (Ch. 2) | Campaign export, goal, budget | Plain-English read; one to three changes; `test_is_valid` from a z-test the model cannot flip | 20/20 stats honesty; 135/0 vs 122/2 = "no winner yet" | Yes, contract enforced |
| Ten Seconds After (Ch. 3) | Alert: zone, item value, staff on floor, repeat visitor | Primary and secondary action, script, channel, ten-second timer; monthly "move that shelf?" table | Rules table; same alert, same answer, under a second | No |

Theft is model-free so the answer arrives in under a second, is identical every time, and never contains a sentence a lawyer would not sign. Four fixed lines ride on every response: do not confront or accuse, do not chase, do not touch, do not block the exit.

## 6. How it is built

No product prompt in the repository was written by hand.

1. **Meta-prompt.** `prompts/meta/master.md` takes the brief, the habit to beat, the I/O contracts, the compliance clause and the last failure report, and writes `prompts/<module>/vN.md`.
2. **Agent team.** Seven Claude Code subagents: lead, meta-prompter (the only agent allowed to write product prompts), builder, data-synth (60 labelled cases, 20 deliberately noisy), eval-runner, judge, and persona-ben, the owner who says yes or no.
3. **Eval gate.** `evals/run.py` replays every case through the new prompt and scores deterministic checks only. Returns gate: cause accuracy ≥ 0.80, grounded ≥ 0.95, low-data honesty ≥ 0.99. A failing version produces a failure report, the only input that changes the next version.
4. **Release.** The server loads only the newest version, committed only when it beats the previous one. Every response carries `_meta.prompt_source`.

Before any model output reaches an owner, code checks JSON shape, allowed enum values, and that every evidence quote is a character-for-character substring of the input. If the check fails the owner sees an error, not a plausible guess. Each prompt file has a header with version, parent, fixes and the model that wrote it.

## 7. Evidence

### 7.1 Returns, v1 to v2 (60 synthetic cases, Sonnet)

| Metric | v1 | v2 | Gate |
|---|---|---|---|
| Cause accuracy | 78.3% | **98.3%** | ≥ 80% |
| Hard subset (c41–c60) | 85% | **100%** | — |
| Evidence grounded | 88.3% | **95%** | ≥ 95% |
| Low-data honesty | 83.3% | **100%** | ≥ 99% |
| Mean latency | 25.0 s | 15.1 s | — |

v1 confused garment with size_chart (4 of 12 garment cases) and expectation with garment (3). The failure report went back into the meta-prompt; v2 added "count first", made expectation outrank garment, and made size_chart fire only when the chart itself is broken. One loop closed the gap. Remaining misses: one malformed JSON (c08) and two lightly paraphrased quotes (c30, c55), which the live guard would strip.

### 7.2 Prep

6 items, 84 days, 14-day holdout, pinball loss at tau 0.65 (run-out) and 0.5 (neutral). Habit 4.14, model 2.88: +30.4% (run-out +32.6%, neutral +28.0%), gate ≥ 15%. The model won on every item; Node and Python agree on all 18 forecasts. The POS data is synthetic.

### 7.3 Ads

20 cases through the same `computeStats` the server runs: stats honesty 100%, no failures. The hackathon case returns `test_is_valid: false` and "no winner yet".

### 7.4 The honest real-data result

The data agent pulled 54 critical Amazon reviews for 7 products through Apify (about $0.42) and built 10 cases. The free-tier scraper returned no bullet points and no size chart for any product, so every case has `size_chart: null`.

v2 scored **4/10 (40%)**. Grounding stayed at 100% and every output parsed. The misses were garment ↔ size_chart and expectation → size_chart: with no chart present, the rule "chart is null with two or more fit complaints" fires too readily, and thin-fabric complaints get read as fit. Mean latency rose to 48.9 s.

Next loop: `v2_real.failures.md` becomes the input to `generate.py`. v3 must weigh review text over chart signals, treat a missing chart as a weaker cue when the listing has no structured data, and keep the two `not_enough_data` cases honest. The synthetic score stays the release gate; the real score is reported beside it.

### 7.5 Platform

Redaction, guard and retention tests: 11/11, zero redaction false positives on the 60 golden cases.

## 8. Enterprise and compliance

**Multi-tenant.** Every request carries a tenant, plan and module list; rate limits (60/min default) and audit are per tenant. A tenant id never comes from the request body; no cross-tenant query exists.

**Audit.** One JSONL row per call: tenant, module, prompt version, model, latency, SHA-256 of the input, result summary. Never the input itself.

**Redaction and guard.** E-mail, phone, order, card, IBAN and address become stable placeholders before any model call or storage; the placeholder map is never written. Buyer text is wrapped as untrusted and scored for injection; the output guard rejects non-verbatim evidence, URLs, off-marketplace contact advice and prompt leaks. Grounding is checked against the redacted input, so a quote containing a real phone number fails.

**Retention.** Audit 90 days, raw imports 30 days, theft log 365 days, `person_description` blanked after 24 hours.

**Regulation, per module.**

- Returns: seller is controller, we are processor (GDPR Art. 28, CCPA service provider); a DPA precedes production. Amazon's Data Protection Policy: no PII past 30 days after fulfilment, purpose-bound, encrypted, access-logged.
- Ads: Google Ads and Meta Marketing API terms forbid pooling across advertisers; none exists. The statistics floor is the FTC/ASA substantiation for any "won" claim.
- Theft: no video, images or biometrics, so the module stays outside BIPA, GDPR Art. 9 and the EU AI Act's biometric categories. Camera signage and lawful basis belong to the store. Scripts follow OSHA guidance on avoiding confrontation.
- Cross-cutting: EU AI Act limited-risk transparency ("Produced by an AI system; check before acting") on every read; zero-data-retention with the model provider before EU buyer text at scale.

Eval gates are the change-management record: a prompt ships only when the eval passes and the compliance clause is present verbatim.

## 9. Go-to-market

This is a hackathon build; everything here is a plan. The numbers below are hypotheses and appear nowhere else in this document.

| Item | Value | Status |
|---|---|---|
| Pilot cohort | 5 marketplace sellers (returns, ads) + 3 kitchens (prep; theft where a camera exists) | Assumption |
| Pilot length | 90 days | Assumption |
| Pilot success test | Each module beats the owner's habit on their own cases at the repo gates; persona-Ben "yes" ≥ 70% | Gates from repo |
| Pricing hypothesis, per module per month | Returns $49 · Prep $29 · Ads $39 · Theft $29; all four under $120 | Hypothesis |
| Pricing anchor | Incumbents in the brief: $1,650 (sizing), $3,500 (agency) a month | Brief |

We publish no market size. The brief gives none and we will not invent one. The pilot's main output is real cases with real labels: a failing pilot case goes into `evals/<module>/cases.jsonl`, the runner writes the failure report, the meta-prompter writes the next version, and the gate decides.

## 10. Roadmap

Nothing here has a date.

- **90-day pilots** with real owners, their cases driving the loop.
- **Real-data loops.** v3 for returns from `v2_real.failures.md`; synthetic and real scores reported side by side.
- **Marketplace and platform integrations.** ASIN-only input via Apify; a POS importer; Google Ads and Meta connections with read-only OAuth tokens; a camera-vendor webhook into `/api/theft/alert`.
- **Gate hardening.** Judge calibration (within one point on ≥ 12 of 15 hand-scored outputs) and the persona-Ben yes-rate added to the gate; the ads prompt routed through the same redact, guard and generate path.
- **Platform.** Tenants from a table; hash-chained audit lines; DSAR tooling.

Not planned: any detector, any biometrics, any cross-tenant pooling, any hand-edited prompt.

## 11. Risks

- **Synthetic-to-real gap.** 98.3% synthetic, 40% on ten real cases with no size charts and labels from one agent. The number will move; closing it is the point of the next loop.
- **Prep is backtested on synthetic POS data.** A real feed may behave differently.
- **Model dependence.** Latency (15.1 s synthetic, 48.9 s on real reviews) and output format depend on the provider. Prep and ads fall back to templates; returns fails closed.
- **Marketplace terms.** The ASIN path via a scraper needs a terms review before production.
- **Theft liability.** The module never tells staff to intervene; signage, lawful basis and training remain the store's.
- **One build, one hour.** Tests and demo have run. Production has not.

## 12. Team and contact

Built by AGI Future Foundation with seven Claude Code subagents. Product prompts were written by Opus from the master meta-prompt; evals ran on Sonnet. MIT licence.

Contact: open an issue at https://github.com/AGIFutureFoundation/Itchathon-tools/issues for bug reports, new eval cases and pilot interest.

## Appendix A. Eval methodology

`evals/run.py` sends each case to `claude -p` with the prompt under test, extracts the first complete JSON object, and scores: `cause_ok` (cause matches the label), `grounded` (every evidence string is an exact substring of the inputs), `low_data_ok` (cases with under 3 returns say `not_enough_data`), `has_fix` (`paste_ready` non-empty), and `hard_subset_accuracy` (ids ≥ c41).

Case mix (60): photos 12, size_chart 12, garment 12, expectation 10, fulfilment 8, not_enough_data 6. Real cases (10): garment 3, expectation 3, not_enough_data 2, size_chart 1, fulfilment 1. Prep: pinball loss at tau 0.65 and 0.5 versus same-weekday-last-week, Node/Python parity required. Ads: 100% agreement on `test_is_valid`; "winner" never appears when it is false.

## Appendix B. Cause labels

`photos`: images misrepresent colour, material or scale. `size_chart`: chart wrong, missing, or inconsistent with the garment. `garment`: product runs small or large, or is poor quality versus stated. `expectation`: listing text overpromises or is vague. `fulfilment`: wrong item, damaged in transit, late. `not_enough_data`: fewer than 3 returns and no clear signal.

## Appendix C. Output contracts

Returns (`POST /api/diagnose`), keys in this order:

```
{"sku", "cause": photos|size_chart|garment|expectation|fulfilment|not_enough_data,
 "confidence": 0..1, "evidence": [verbatim substrings],
 "fix": {"what_to_change", "paste_ready"}, "keep_size_message", "owner_line"}
```

Prep: per item `prep_qty`, `range`, `why`. Ads: `whats_happening` (≤ 60 words), `change_next` (1–3 actions), `test_is_valid` (always the code's value), `numbers_used` (only numbers in the input). Theft: `action { primary, secondary, do_not[4], followups }`, `script`, `channel`, `timing_seconds: 10`. Model-backed responses carry `_meta: { prompt_source, model, latency_ms }`.

## Sources

- ITCHATHON Challenges brief (27 Sep 2026) and the Reddit threads it cites: the seller quote and all market figures.
- Repo: `STATUS.md`, `docs/ARCHITECTURE.md`, `docs/PITCH_NOTES.md`, `docs/COMPLIANCE.md`, `docs/SECURITY.md`, `pitch/pitch.html`, `docs/wiki/`.
- Evals: `evals/returns/results/v1.log`, `v2.log`, `v2_real.failures.md`, `evals/returns/real/README.md`, `evals/prep/results.json`, `evals/ads/results.json`.
