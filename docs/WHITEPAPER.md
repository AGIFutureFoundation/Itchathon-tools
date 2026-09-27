# Owner Console — Whitepaper

**Four small-business problems. One action each. Every answer tested before it is allowed to appear.**

AGI Future Foundation · ITCHATHON entry · As of 27 Sep 2026 · Repo: https://github.com/AGIFutureFoundation/Itchathon-tools

Every number in this document comes from a file in the repository or from the ITCHATHON Challenges brief. Numbers that are neither are marked "assumption" and live in one table in the Go-to-market section.

## 1. Executive summary

Small shops already have the data that says what went wrong. The marketplace shows the return rate. The camera fires when someone pockets an item. The ad dashboard names a "winner". The POS has last week's sales. What nobody gives the owner is the next step: the one thing to do, in plain words, in under a minute, alone.

Owner Console is four modules on one platform. Each takes a signal the business already has and returns one action:

- **Returns** — one cause per SKU, the buyer's own words as proof, a fix to paste into the listing.
- **Prep** — one prep number per item for 7am, scored against the owner's own habit.
- **Ads** — the one ad change worth making this week, and an honest "no winner yet" when the numbers cannot support one.
- **Theft** — the sentence to say and where to stand in the ten seconds after an alert. No confrontation. No model.

Where a model is involved, its prompt was written by a meta-prompt, scored on labelled cases, and shipped only when it beat the previous version. The returns prompt went from 78.3% to 98.3% cause accuracy in one loop. Prep beats "same weekday last week" by 30.4%. Ads scored 20/20 on statistics honesty. On ten cases built from real Amazon reviews, without size charts, the returns prompt scored 4/10. That gap is the input to the next loop, and we report it here rather than hide it.

## 2. The problem

The ITCHATHON brief describes four pains. Read together they have one shape: detection exists, the step after it does not.

**Returns.** A seller above 20% returns on r/AmazonSeller, quoted in the brief:

> the "reason" field customers pick at checkout is useless, everything's either "changed my mind" or "doesn't fit", neither tells me if it's the product, the photos, or the sizing.

Since June 2024 Amazon charges a returns processing fee of 2.9–12.8% above category thresholds. The "Frequently returned item" badge cuts conversion by 25–50%. The only fix the thread found was manual: read your own returns, work out why, rewrite the listing.

**Ads.** The owner pays an agency (around $3,500 a month, per the brief) and does not know what CPA, ROAS, CTR or PMax mean. A calculator told one owner that 135 impressions with 0 conversions versus 122 with 2 had a "winner". Performance Max goes erratic under roughly 30–50 conversions a month, which is where most small accounts sit.

**Theft.** The camera or a service like Veesion already flags the aisle. The person on the floor is alone, the item is worth $10–$20, and nobody has told them what to do in the next ten seconds without putting themselves at risk.

**Prep.** The POS holds every sale. At 7am the shift lead still guesses from memory, usually "what we did last week".

## 3. Why existing tools fail

The tools that exist were built for volume, budget and staff the small operator does not have.

| Tool class | Built for | What the SMB lacks | Source |
|---|---|---|---|
| Sizing tools (True Fit, Bold Metrics) | Brands with their own storefront; ~$1,650/month entry | Cannot be installed on a marketplace listing; the price is the problem | Brief |
| Marketing agencies | Accounts large enough to test; ~$3,500/month | Enough conversions for a clean A/B test; time to learn the jargon | Brief |
| Google Performance Max | Accounts with 30–50+ conversions a month | The volume that keeps the automation stable | Brief; `app/modules/ads.js` (`PMAX_FLOOR = 30`) |
| AI video analytics | Multi-staff stores; $8–35K installed, or Veesion at a few hundred $/month | A second person to act on the alert; a script that is safe to follow | Brief |
| Forecasting suites | Chains with a data team | Any way to beat "same weekday last week" with eight samples | `evals/prep/README.md` |

None of these fail because they detect badly. They fail because the owner is one person, the sample is small, and the tool stops at the dashboard.

## 4. The insight

Detection is solved; the next step is not.

The real competitor for each module is not a vendor. It is the habit. For returns it is reading returns one ASIN at a time and phoning buyers before they order to tell them which size to keep. For prep it is "same weekday last week". For ads it is trusting the agency's word "winner". For theft it is doing nothing, or doing something unsafe.

So each module is scored against the habit, not against the incumbent. Prep must beat last week's number by at least 15% or it does not ship. Returns must name the right cause on at least 80% of labelled cases, quote evidence verbatim on 95%, and admit "not enough data" every time the data is thin. Four returns are four sentences, not a statistic, and the product says so.

## 5. Product: Owner Console

One Node process, no framework, no npm dependencies. Four modules behind one platform layer.

| Module | Signal in | Action out | Measured result | Model? |
|---|---|---|---|---|
| Why Did It Come Back? (Ch. 1) | Listing, size chart, returns with reason codes and comments, reviews, messages; or an ASIN via Apify | One cause (`photos / size_chart / garment / expectation / fulfilment / not_enough_data`), verbatim quotes checked by code, paste-ready fix, keep-size message | 98.3% cause accuracy on 60 cases; 100% on the hard 20; 15.1 s mean latency | Yes, gated |
| Today's Prep (Ch. 4) | POS history per item, run-out/neutral/waste preference, bookings, events, weather | One prep number per item with a range and a one-sentence reason; optional three-line 7am card | Pinball loss 2.88 vs 4.14 for the habit: +30.4% | No (pure math; card optional) |
| Ads Plain Read (Ch. 2) | Campaign export, goal, budget | What is happening in plain English; one to three changes; `test_is_valid` from a real two-proportion z-test the model cannot flip | 20/20 stats honesty; 135/0 vs 122/2 = "no winner yet" | Yes, with enforced contract |
| Ten Seconds After (Ch. 3) | Camera or Veesion alert: zone, item value, staff on floor, repeat visitor | One primary action, one secondary, a customer-service script, a channel, a ten-second timer; monthly "move that shelf?" table | Rules table; same alert, same answer, under a second; four hard rules on every response | No |

The theft module is deliberately model-free. The answer must arrive in under a second, be identical every time, and never contain a sentence a lawyer would not sign. A rules table gives all three. Every response carries the same four lines: do not confront or accuse, do not chase, do not touch, do not block the exit.

## 6. How it is built

No product prompt in the repository was written by hand.

1. **Meta-prompt.** `prompts/meta/master.md` is filled with the challenge brief, the habit to beat, the input and output contracts, the compliance clause and the failure report from the last eval run. It writes `prompts/<module>/vN.md`.
2. **Agent team.** Seven Claude Code subagents split the work: lead (runs the loop, go/no-go), meta-prompter (the only agent allowed to write product prompts), builder, data-synth (60 labelled cases, 20 deliberately noisy), eval-runner, judge, and persona-ben, the owner who reads the output and says yes or no.
3. **Eval gate.** `evals/run.py` replays every case through the model with the new prompt and scores deterministic checks only. The gate for returns is cause accuracy ≥ 0.80, grounded rate ≥ 0.95, low-data honesty ≥ 0.99. A version that fails produces a failure report; the report is the only input that changes the next version.
4. **Release.** The server loads only the newest prompt version, and a version is committed only when it beats the previous one on the same cases. Every response carries `_meta.prompt_source`, the model and the latency.

Before any model output reaches an owner, code checks it: JSON shape, allowed enum values, and that every evidence quote is a character-for-character substring of the input. If the check fails the owner sees an error, not a plausible guess. Prompts carry a header with version, parent version, the failures they fix, and the model that wrote them.

## 7. Evidence

### 7.1 Returns, v1 to v2 (60 synthetic cases, Sonnet)

| Metric | v1 | v2 | Gate |
|---|---|---|---|
| Cause accuracy | 78.3% | **98.3%** | ≥ 80% |
| Hard subset (c41–c60, 20 noisy cases) | 85% | **100%** | — |
| Evidence grounded (verbatim) | 88.3% | **95%** | ≥ 95% |
| Low-data honesty | 83.3% | **100%** | ≥ 99% |
| Mean latency | 25.0 s | 15.1 s | — |
| Gate met | no | **yes** | |

v1's confusion was garment ↔ size_chart (4 of 12 garment cases called size_chart) and expectation → garment (3 cases). The failure report went back into the meta-prompt. v2 added "count first", made expectation outrank garment, and made size_chart fire only when the chart itself is the broken thing. One loop closed the gap. Remaining v2 misses: one malformed JSON (c08) and two lightly paraphrased quotes (c30, c55), both of which the live guard would strip before an owner saw them.

### 7.2 Prep

Backtest on 6 items over 84 days with a 14-day holdout, scored by pinball loss at tau 0.65 (run-out) and 0.5 (neutral). Habit: 4.14. Model: 2.88. Improvement 30.4% (run-out +32.6%, neutral +28.0%), gate ≥ 15%. The model beat the habit on every item; the smallest gain was on the flattest item (soup). The Python backtest and the Node module agree on all 18 forecasts. The POS data is synthetic; see Risks.

### 7.3 Ads

20 cases through the same `computeStats` the server runs. Stats honesty 100%, no failures. The hackathon case (135/0 vs 122/2) returns `test_is_valid: false`, verdict "no winner yet", and says roughly how many conversions would be needed to call one.

### 7.4 The honest real-data result

The data agent pulled 54 critical (1–3 star) Amazon reviews for 7 products through Apify for about $0.42 and built 10 cases (r01–r10). On the free tier the product-details pass returned no bullet points and no size chart for any product, so every case has a listing title, a description where Amazon shows one, and `size_chart: null`.

v2 scored **4/10 (40%)** on these cases. Grounding stayed at 100% and every output parsed. The misses were garment ↔ size_chart and expectation → size_chart: with no chart present, the prompt's Rule 4 ("chart is null with two or more fit complaints") fires too readily, and quality complaints about thin fabric get read as fit. Mean latency rose to 48.9 s on the longer real reviews.

What the next loop does: `v2_real.failures.md` becomes the input to `generate.py`. v3 must weigh review text over chart signals, treat "missing chart" as a weaker cue when the listing has no structured data at all, and keep the two `not_enough_data` cases honest. The synthetic score stays the release gate; the real-data score becomes a second, reported number so the two cannot be confused.

### 7.5 Platform

Redaction, guard and retention tests: 11/11, with zero false positives for redaction on the 60 golden cases.

## 8. Enterprise and compliance

**Multi-tenant from the first line.** Every request carries a tenant, a plan and a module list from `auth.js`; rate limits (token bucket, 60 requests a minute by default) and audit are per tenant. A tenant id is never taken from the request body, so no cross-tenant query exists.

**Audit.** One JSONL row per call: tenant, module, prompt version, model, latency, a SHA-256 hash of the input, and a result summary. Never the input itself. Retention 90 days.

**Redaction before the model.** E-mail, phone, order, card, IBAN and address are replaced by stable placeholders before any model call or storage; the placeholder-to-value map lives only in the request and is never written. Buyer text is wrapped as untrusted input, an injection heuristic scores it, and the output guard rejects non-verbatim evidence, URLs, off-marketplace contact advice and prompt leaks. Because grounding is checked against the redacted input, a quote containing a real phone number fails.

**Retention.** Audit 90 days, raw imports 30 days, theft log 365 days, `person_description` blanked after 24 hours and never written by the alert path at all.

**Regulation, per module.**

- Returns: the seller is controller and we are processor (GDPR Art. 28, CCPA service provider); a DPA is required before production. Amazon's Seller Central Data Protection Policy: PII not held past 30 days after fulfilment, used only for the purpose received, encrypted, access-logged. Etsy API terms: one member's shop only, no aggregation.
- Ads: Google Ads API and Meta Marketing API terms forbid pooling data across advertisers; none exists by design. The statistics floor is the FTC and ASA substantiation for any "won" claim.
- Theft: no video, images, facial recognition or biometrics, so the module stays out of BIPA, GDPR Art. 9 and the EU AI Act's biometric categories. Signage and lawful basis for the camera belong to the store; the onboarding checklist asks. Scripts follow OSHA guidance on avoiding confrontation.
- Prep: POS lines with tender and loyalty ids dropped are not personal data; weather providers' attribution and caching terms are respected.
- Cross-cutting: EU AI Act limited-risk transparency ("Produced by an AI system; check before acting") on every read; Anthropic commercial terms, with a zero-data-retention arrangement to request before EU buyer text at scale; SOC 2 common criteria mapped to the platform files; WCAG 2.1 AA target for the UI.

Eval gates are the change-management record: a prompt ships only when the eval passes and the compliance clause is present verbatim.

## 9. Go-to-market

The build is a hackathon entry. Everything in this section is a plan, not a result. The numbers below are hypotheses and appear nowhere else in this document.

| Item | Value | Status |
|---|---|---|
| Pilot cohort | 5 marketplace sellers (returns, ads) + 3 kitchens (prep, theft where a camera exists) | Assumption |
| Pilot length | 90 days | Assumption |
| Pilot success test | Each module beats the owner's habit on their own cases at the same gates used in the repo; persona-Ben "yes" on ≥ 70% of outputs | Gate numbers from repo; cohort is an assumption |
| Pricing hypothesis, per module per month | Returns $49 · Prep $29 · Ads $39 · Theft $29; a bundle for all four under $120 | Hypothesis, to be tested in the pilot |
| Pricing anchor | The incumbents the brief cites cost $1,650 (sizing) and $3,500 (agency) a month | Brief |

We are not publishing a market size. The brief does not give one and we will not invent one.

What the pilot produces is more valuable than revenue at this stage: real cases with real labels, which are what the eval loop needs. A failing pilot case goes into `evals/<module>/cases.jsonl`, the eval runner produces the failure report, the meta-prompter writes the next version, and the gate decides.

## 10. Roadmap

From the repository's roadmap; nothing here has a date.

- **Pilots.** Run the four modules with real owners and let their cases drive the loop.
- **Real-data loops.** v3 for returns from `v2_real.failures.md`; report the synthetic and real scores side by side for every version.
- **Marketplace and platform integrations.** ASIN-only input on `/api/diagnose` via Apify; a POS export importer; Google Ads and Meta connections with read-only, encrypted OAuth tokens; a camera-vendor webhook (Veesion or generic) into `/api/theft/alert`.
- **Gate hardening.** Judge calibration (agree within one point on ≥ 12 of 15 hand-scored outputs) and the persona-Ben yes-rate added to the release gate; the ads prompt routed through the same redact, guard and generate path as returns.
- **Platform.** Tenants from a table instead of a file; hash-chained audit lines; DSAR tooling; zero-data-retention arrangement with the model provider.

Deliberately not planned: any detector, any biometrics, any cross-tenant pooling, any hand-edited prompt.

## 11. Risks

- **Synthetic-to-real gap.** 98.3% on synthetic cases, 40% on ten real ones. The real set is tiny, has no size charts, and its labels were assigned by one agent. The number will move; the direction is the point of the next loop.
- **Prep is backtested on synthetic POS data.** The 30.4% is against a generated series with known seasonality. A real POS feed may behave differently.
- **Model dependence.** Latency (15.1 s synthetic, 48.9 s on long real reviews) and output format depend on the model provider. Deterministic fallbacks exist for prep and ads; returns fails closed.
- **Marketplace terms.** Amazon and Etsy data policies constrain retention and use; the ASIN path via a scraper needs a terms review before production.
- **Liability in theft scripts.** The module never tells staff to intervene, but the store remains responsible for signage, lawful basis and staff training.
- **Single build, one hour.** The code has run its tests and its demo. It has not run in production.

## 12. Team and contact

Built by AGI Future Foundation with a team of seven Claude Code subagents. Product prompts were written by Opus from the master meta-prompt; evals ran on Sonnet. Licence MIT.

Contact: open an issue at https://github.com/AGIFutureFoundation/Itchathon-tools/issues. Bug reports, new eval cases and pilot interest all go there.

## Appendix A. Eval methodology

`evals/run.py` sends each case's `sku, listing, returns, reviews, messages` to `claude -p` with the prompt under test, `--disallowedTools '*'` and `--max-turns 1`, extracts the first complete JSON object, and scores:

| Check | How |
|---|---|
| `cause_ok` | `parsed.cause == expected.cause` |
| `grounded` | every `evidence` string is a non-empty exact substring of the JSON of the inputs |
| `low_data_ok` | cases with fewer than 3 returns and expected `not_enough_data` must say so |
| `has_fix` | `fix.paste_ready` non-empty, or cause is `not_enough_data` |
| `hard_subset_accuracy` | `cause_ok` over ids ≥ c41 |

Case mix (60): photos 12, size_chart 12, garment 12, expectation 10, fulfilment 8, not_enough_data 6. Real cases (10): garment 3, expectation 3, not_enough_data 2, size_chart 1, fulfilment 1. Prep: pinball loss at tau 0.65 and 0.5 versus same-weekday-last-week, Node/Python parity required. Ads: 100% agreement on `test_is_valid`, and a verdict starting "winner" never appears when it is false. Results: `evals/returns/results/v1.log`, `v2.log`, `v2_real.failures.md`, `evals/prep/results.json`, `evals/ads/results.json`.

## Appendix B. Cause labels

| Label | Meaning |
|---|---|
| `photos` | Images misrepresent colour, material or scale |
| `size_chart` | Chart wrong, missing, or inconsistent with the garment |
| `garment` | The product itself runs small or large, or is poor quality versus stated |
| `expectation` | Listing text overpromises or is vague |
| `fulfilment` | Wrong item, damaged in transit, late |
| `not_enough_data` | Fewer than 3 returns and no clear signal |

## Appendix C. Output contracts

Returns (`POST /api/diagnose`), keys in this order:

```
{"sku":string,
 "cause":"photos|size_chart|garment|expectation|fulfilment|not_enough_data",
 "confidence":0..1,
 "evidence":[verbatim substrings of the inputs],
 "fix":{"what_to_change":"photos|size_chart|listing_text|garment|fulfilment|none","paste_ready":string},
 "keep_size_message":string,
 "owner_line":string}
```

Prep (`POST /api/prep/forecast`): per item `prep_qty`, `range [low, high]`, `why`, and `_meta` with samples, median, quantile, trend and context multiplier.

Ads (`POST /api/ads/read`): `whats_happening` (≤ 60 words), `change_next` (1–3 actions with `action / why / expected_effect`), `test_is_valid` (always the code's value), `numbers_used` (only numbers present in the input), plus `stats` and `derived`.

Theft (`POST /api/theft/alert`): `action { primary, secondary, do_not[4], followups }`, `script`, `channel`, `timing_seconds: 10`, `log_id`.

Every model-backed response also carries `_meta: { prompt_source, model, latency_ms }`.

## Sources

- ITCHATHON Challenges brief (27 Sep 2026) and the Reddit threads it cites: seller quote, Amazon fee range and badge effect, True Fit and agency pricing, PMax threshold, video-analytics and Veesion pricing.
- `STATUS.md`, `docs/ARCHITECTURE.md`, `docs/PITCH_NOTES.md`, `docs/COMPLIANCE.md`, `docs/SECURITY.md`, `pitch/pitch.html`.
- `evals/returns/results/v1.log`, `v2.log`, `v1.failures.md`, `v2.failures.md`, `v2_real.failures.md`; `evals/returns/real/README.md`; `evals/prep/results.json`, `evals/prep/README.md`; `evals/ads/results.json`, `evals/ads/cases.jsonl`.
- `docs/wiki/Module-*.md`, `docs/wiki/Eval-Loop-and-Meta-Prompting.md`, `docs/wiki/Roadmap.md`, `README.md`, `ABOUT.md`.
