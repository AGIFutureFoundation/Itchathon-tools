# Module: Ads ("Ads Plain Read")

ITCHATHON Challenge 2. The owner pays an agency, does not know what CPA, ROAS, CTR or PMax mean, and should not have to. The module says what is happening with the ad money in plain English and names one to three concrete changes, while refusing to call a "winner" that the numbers cannot support. Code: `app/modules/ads.js`. Prompt: `prompts/ads/v1.md`. Eval: `evals/ads/run.py`.

## Three routes

| Route | LLM | What it does |
|---|---|---|
| `POST /api/ads/stats` | no | Significance test between the two best variants, sample-size floor, verdict |
| `POST /api/ads/read` | yes, with enforced contract and template fallback | Plain-English account read and `change_next` actions |
| `POST /api/ads/ownership` | no | Step list for taking ownership of a Google or Meta account from an agency |

## The statistics (`computeStats`)

Deterministic, no dependencies, pure and exported so the eval runs the exact code the server runs.

```js
const ALPHA = 0.05;             // two-sided significance floor
const MIN_EXPECTED = 5;         // classic rule for the normal approximation
const PMAX_FLOOR = 30;          // conversions/month below which PMax goes erratic
const CAP_CONVERSIONS = 5000;   // above this we stop quoting a number
```

Method: two-proportion pooled z-test with Yates continuity correction, p from the normal approximation (erfc via Abramowitz & Stegun 7.1.26); Fisher's exact two-sided reported alongside as `p_value_fisher`. The top two variants by conversions are compared. A test is `test_is_valid` only when two or more variants have impressions, the input is sane (no negatives, conversions ≤ impressions), and every expected cell count `n_i × p_pooled`, `n_i × (1 − p_pooled)` is ≥ 5. A winner is declared **only** when valid and p < 0.05.

The response also says how much data would be needed: impressions per variant for 80% power at two-sided 0.05 to detect a 30% relative lift at the observed lower rate, and the conversions that implies, in a sentence the owner can read: `about 412 conversions per variant (roughly 41,200 impressions each at the observed lower rate) to see a 30% lift 80% of the time`. Above 5,000 conversions it says `more than you can buy this quarter`.

The hackathon case, `a01` in `evals/ads/cases.jsonl`: Headline A 135 impressions / 0 conversions, Headline B 122 / 2. A calculator said "winner". `computeStats` says `test_is_valid: false`, `verdict: "no winner yet"`, and `plain_read`: `2 conversions across 257 impressions is far too little to call anything ... any tool saying "winner" here is guessing.`

## The plain read (`readAccounts`)

Input: `{ goal: "leads|sales|calls", monthly_budget, campaigns: [{ name, type, spend, impressions, clicks, conversions, conv_value?, period_days }] }`.

Before the model sees anything, `derive()` computes observations the model must respect: the workhorse (most results at lowest cost each, never a brand campaign), leaks (≥ 10% of spend with zero results), expensive campaigns (> 3× the workhorse's cost per result), wrong-tool campaigns (display/video/awareness when the goal is leads, sales or calls), and `pmax_underfed` (Performance Max under 30 conversions a month). The model receives the raw campaigns plus `derived` and `stats`, and `prompts/ads/v1.md` tells it: trust `derived`, copy `stats.test_is_valid` unchanged, and never use "winner", "outperforms", "beats" or "proven" when it is false.

`enforceContract()` then fixes what the model got wrong rather than trusting it:

```js
out.whats_happening = clampWords(String(obj.whats_happening || ''), 60);
out.change_next = ... .slice(0, 3)                              // 1–3 actions with action/why/expected_effect
out.test_is_valid = stats.test_is_valid;                        // always the code's value
if (obj.test_is_valid !== stats.test_is_valid) out.corrected = true;
out.numbers_used = dedupe(nums.filter(s => inputText.includes(s)));   // only numbers that appear in the input
```

If the CLI fails, the JSON is missing, or the model gives no actions, `fallbackRead()` builds the same shape from `derived` alone (`source: "template"`, `fallback_reason`). The response always includes `stats`, `derived` and `_meta: { source, model, prompt_source: "v1.md", latency_ms }`.

## Ownership checklist

`POST /api/ads/ownership` with `{ platform: "google" | "meta", access: "agency_owns" | "shared" | "owner" }` returns a fixed, ordered list of 5–7 steps (customer ID, Manager account / Business Portfolio, admin role, billing, conversion tags / Pixel ownership, downgrade the agency) plus a headline. No model, no URLs in the output; the UI links to the platforms' own help pages. `docs/COMPLIANCE.md` notes this is how the platforms' admin roles work, not legal advice.

## Eval: stats honesty

```bash
python3 evals/ads/run.py
```

Runs all 20 cases through `computeStats` by shelling to `node -e` once. Gate: 100% agreement on `test_is_valid` (and on `verdict` where the case gives one), and the hard rule that a verdict starting with `winner` never appears when `test_is_valid` is false. Result in `evals/ads/results.json`:

```json
{ "n": 20, "stats_honesty_rate": 1.0, "gate_met": true, "failures": [] }
```

Cases cover the hackathon case, a big clean test with a real lift, zero impressions everywhere, one variant never served, a single variant, and other low-n shapes. The dashboard recomputes this live from the cases on each poll.

## Why the floor matters beyond statistics

FTC deceptive-advertising standards (and UK ASA / CAP Code) require a reasonable basis for objective claims. If the read says variant B "won", the owner may reuse that claim. The statistics floor is the substantiation, and the eval enforces it the same way the returns eval enforces `not_enough_data`. See [Compliance](Compliance.md).
