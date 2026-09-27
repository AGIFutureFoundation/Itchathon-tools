# Module: Returns ("Why Did It Come Back?")

ITCHATHON Challenge 1. A seller pastes a listing, its size chart, the returns with reason codes and comments, reviews and buyer messages. Output per SKU: one cause, verbatim evidence, a paste-ready fix, a keep-size message. Route: `POST /api/diagnose`. Code: `app/server.js` (`diagnose()`), prompt: `prompts/returns/v2.md`, eval: `evals/run.py`.

## The problem in the seller's words

From the pitch page, quoting a seller above 20% returns on r/AmazonSeller: the reason field customers pick at checkout is useless; everything is "changed my mind" or "doesn't fit", and neither says whether it is the product, the photos or the sizing. Amazon charges a returns processing fee above the category threshold and the "Frequently returned item" badge cuts conversion. Sizing tools that could help start around $1,650 a month and cannot be installed on a marketplace listing. The habit to beat: reading returns one ASIN at a time and phoning buyers before they order to tell them which size to keep.

## Input and output

Input (`prompts/meta/variables.md`):

```
{listing:{title,bullets[],description,size_chart|null,photos_note},
 returns:[{reason_code,size_ordered|null,comment}], reviews:[string], messages:[string]}
```

Output contract (keys in this order, `owner_line` last):

```
{"sku":string,"cause":"photos|size_chart|garment|expectation|fulfilment|not_enough_data",
 "confidence":0..1,"evidence":[verbatim substrings of the inputs],
 "fix":{"what_to_change":"photos|size_chart|listing_text|garment|fulfilment|none","paste_ready":string},
 "keep_size_message":string,"owner_line":string}
```

Cause labels: photos = images misrepresent colour/material/scale; size_chart = chart wrong/missing/inconsistent with garment; garment = product itself runs small/large or poor quality vs stated; expectation = listing text overpromises or is vague; fulfilment = wrong item, damaged in transit, late; not_enough_data = fewer than 3 returns and no clear signal.

## How the served prompt decides (v2)

`prompts/returns/v2.md` was written by the meta-prompter (Opus) from v1's failure report. Its core is a decision ladder run in order:

- **Step 0, count first.** N = number of returns. N < 3 → `not_enough_data` unless three or more independent quotes from reviews/messages name the same concrete defect. N ≥ 3 → `not_enough_data` is forbidden.
- **Rule 0.** The comment beats the reason_code, always.
- **Rule 1, fulfilment.** Only when shipment problems are the largest cluster of return comments.
- **Rule 2, photos.** ≥ 2 quotes say the item differs from the images.
- **Rule 3, expectation** (outranks garment). ≥ 2 quotes attack a non-fit claim in the listing text. Fit words are never expectation.
- **Rule 4, size_chart.** The chart is the broken thing: null with ≥ 2 fit complaints, self-contradicting, contradicting the label on the product, or followed exactly and still wrong.
- **Rule 5, garment.** The physical item is off-spec: consistent fit complaints across ≥ 2 sizes while a chart exists, measured dimensions that differ from the chart, defects.

Evidence rules: exact, contiguous, character-for-character substrings; copy typos; 3–12 words; 2–4 items; never empty, even for `not_enough_data`. Confidence is capped at 0.90. `paste_ready` is literal text for the listing, never advice about it.

## What the server does around the model

```js
const inputs = redact ? redact.redact(body).value : body;     // PII → [EMAIL_1], [PHONE_1] ...
const result = await diagnose(inputs);                          // claude -p --system-prompt <newest vN.md>
const g = guard.checkOutput(result, inputs);                    // every evidence quote must be verbatim in inputs
result._guard = { ok: g.ok, issues: g.issues, injection_score: guard.injectionScore(JSON.stringify(inputs)) };
```

`diagnose()` runs `claude -p --model $RETURNS_MODEL --output-format json --system-prompt ... --tools ''` with a 90-second timeout, pulls the first balanced JSON object out of the reply (the v1 eval found the model sometimes emitted two), and stamps `_meta: { prompt_source, model, latency_ms }`.

## Eval and results

`evals/returns/cases.jsonl` holds 60 labelled cases: photos 12, size_chart 12, garment 12, expectation 10, fulfilment 8, not_enough_data 6. Cases c41–c60 are hard: typos, mixed signals, reason codes that contradict comments. `evals/returns/cases_real.jsonl` adds 10 cases built from real Amazon reviews scraped through Apify (raw JSON in `evals/returns/real/`).

| Metric | v1 | v2 |
|---|---|---|
| cause_accuracy | 0.783 | **0.983** |
| hard_subset_accuracy (c41+) | 0.85 | **1.0** |
| grounded_rate | 0.883 | **0.95** |
| low_data_ok_rate | 0.833 | **1.0** |
| parsed_rate | 0.983 | 0.983 |
| fix_rate | 0.983 | 0.983 |
| mean_latency_s | 25.0 | 15.1 |
| gate_met | false | **true** |

Gate: `cause_accuracy ≥ 0.80 and grounded_rate ≥ 0.95 and low_data_ok_rate ≥ 0.99`.

**Real data.** The same v2 prompt on the 10 Apify-built cases (`evals/returns/results/v2_real.failures.md`): cause accuracy 0.4, grounded 1.0, parsed 1.0, mean latency 48.9 s. Confusions were garment ↔ size_chart and expectation → size_chart. The real listings carry only a title and description, no size chart, so the prompt leans on chart signals that are not there. This is informational, not a gate, and it is the failure report the next loop (v3) should consume: `FAILURES=evals/returns/results/v2_real.failures.md python3 prompts/meta/generate.py`.

**ASIN path.** `POST /api/import-asin` (`app/modules/apify.js`) runs the `junglee/amazon-reviews-scraper` actor for one ASIN, keeps the 1–3 star reviews (10 on the free tier), guesses a `reason_code` per review and returns a diagnose input. The `asin-import.html` page chains it into `/api/diagnose`.

v1 confusion: garment → size_chart 4 times, expectation → garment 3 times. v2 confusion is diagonal except one size_chart case that produced no JSON (c08). The other two v2 failures are grounding: c30 and c55 each contain one quote that paraphrases instead of copying (for example `"24hr protection' is nonsense"` dropped an opening quote mark). Both would be stripped by `guard.checkOutput` in the live server before the owner sees them.

## Run it

```bash
python3 evals/run.py --prompt prompts/returns/v2.md --workers 6     # full run, exit 1 if gate fails
python3 evals/run.py --prompt prompts/returns/v2.md --rescore       # re-score saved raw outputs
python3 prompts/meta/generate.py                                     # write v3 from v2.failures.md
```

`EVAL_MODEL` (default `sonnet`) sets the model for the eval; `RETURNS_MODEL` sets it for the server.
