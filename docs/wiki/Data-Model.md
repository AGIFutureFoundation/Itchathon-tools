# Data model

Input and output contracts per module, plus the two on-disk records. Types are informal: `string`, `number`, `bool`, `[T]`, `T|null`, `?` = optional.

## Returns

**Input** (`prompts/meta/variables.md`, checked by `server.js`: `listing` object and `returns` array required)

```
{ sku?: string,
  listing:  { title: string, bullets: [string], description: string, size_chart: string|null, photos_note: string },
  returns:  [{ reason_code: string, size_ordered: string|null, comment: string }],
  reviews:  [string],
  messages: [string] }
```

Redaction replaces PII inside any string with `[EMAIL_n] [PHONE_n] [ORDER_n] [CARD_n] [IBAN_n] [ADDRESS_n]` before the model sees it; keys are untouched.

**Output** (the contract the meta-prompt enforces; key order fixed, `owner_line` last)

```
{ sku: string,
  cause: "photos"|"size_chart"|"garment"|"expectation"|"fulfilment"|"not_enough_data",
  confidence: number (0..1, never above 0.90 in v2),
  evidence: [string]            // verbatim substrings of the (redacted) input, 2–4 items, never empty
  fix: { what_to_change: "photos"|"size_chart"|"listing_text"|"garment"|"fulfilment"|"none", paste_ready: string },
  keep_size_message: string,    // ≤ 240 chars, buyer-facing, never empty
  owner_line: string,           // one sentence, ≤ 25 words
  _meta:  { prompt_source: string, model: string, latency_ms: number },
  _guard: { ok: bool, issues: [{ code, severity: "error"|"warning", field?, detail? }], injection_score: number } }
```

`what_to_change` must match `cause`: photos→photos, size_chart→size_chart, expectation→listing_text, garment→garment, fulfilment→fulfilment, not_enough_data→none.

**ASIN import** (`POST /api/import-asin`, `app/modules/apify.js`): in `{ asin: string } | { url: string }`; out the input shape above with `listing.bullets: []`, `listing.size_chart: null`, `photos_note` describing the scrape, `returns` built from 1–3 star reviews with a guessed `reason_code`, plus `_meta`.

**Golden case** (`evals/returns/cases.jsonl`): the input above plus `id: "c01".."c60"`, `category` (apparel, beauty, …) and `expected: { cause, must_quote: [string] }`. Every `must_quote` appears verbatim in the inputs. Ids ≥ `c41` form the hard subset.

## Prep

**Input**

```
{ items: [{ name: string, history: [{ date: "YYYY-MM-DD", sold: number }], walk_in?: bool, walk_in_dependent?: bool, typical_bookings?: number }],
  preference?: "run_out"|"neutral"|"waste"   (default neutral),
  context?: { bookings?: number, typical_bookings?: number, events?: [string]|string, weather?: string },
  target_date?: "YYYY-MM-DD" }
```

**Output**

```
{ preference, target_date: string|null, weekday: string|null,
  items: [{ name, prep_qty: number, range: [number, number], why: string,
            _meta: { weekday, target_date, samples, median, quantile, trend, context_mult } }],
  latency_ms }
```

**Card** (`/api/prep/explain`): `{ card: string (3 lines), source: "claude"|"template", model?, error?, latency_ms }`.

## Ads

**Stats input**: `{ variants: [{ name?: string, impressions: number, conversions: number, spend?: number }], period_days?: number }`.

**Stats output**

```
{ method: string, variants_compared: [string, string], test_is_valid: bool,
  p_value: number|null, p_value_fisher: number|null, z: number|null,
  rates: { [name]: number, pooled: number },
  min_conversions_needed_per_variant: number|null, min_impressions_needed_per_variant?: number,
  min_conversions_message: string, verdict: "winner: <name>"|"no winner yet", plain_read: string,
  pmax_ready: bool, monthly_conversions: number, reasons: [string] }
```

**Read input**: `{ goal: "leads"|"sales"|"calls", monthly_budget?: number, campaigns: [{ name, type, spend, impressions, clicks, conversions, conv_value?, period_days? }] }`.

**Read output** (`enforceContract` shape, code-owned fields marked)

```
{ whats_happening: string (≤ 60 words),
  change_next: [{ action, why, expected_effect }] (1–3),
  confidence: number (0..1),
  test_is_valid: bool,              // always copied from stats by code
  numbers_used: [string],           // filtered to strings present in the input
  numbers_dropped?: [string], corrected?: true, fallback_reason?: string,
  stats: <stats output>,
  derived: { total_spend, total_conversions, total_monthly_conversions, monthly_budget, best_campaign,
             flags: [{ campaign, flag: "brand"|"pmax_underfed"|"burning"|"expensive"|"wrong_tool"|"workhorse", detail }] },
  _meta: { source: "model"|"template", model: string|null, prompt_source: "v1.md", latency_ms } }
```

**Ownership**: in `{ platform: "google"|"meta", access: "agency_owns"|"shared"|"owner" }`, out `{ platform, access, headline, steps: [string], step_count }`.

## Theft

**Alert input**: `{ source: "veesion"|"camera"|"manual", zone?: string, item_value_estimate?: number, staff_on_floor: number, repeat_visitor?: bool, person_description?: string (never stored) }`.

**Playbook output**

```
{ action: { primary: string, secondary: string, do_not: [4 fixed strings], followups: [string] },
  script: string, channel: "speaker"|"phone"|"screen"|"till", timing_seconds: 10, log_id: uuid,
  context: { zone, item_value_estimate, staff_on_floor, repeat_visitor, source } }
```

**Log input**: `{ log_id?, ts?, zone?, value?, action_taken?, outcome?: "deterred"|"took_it"|"unsure" }`.

**Harden**: in `{ items: [{ name, price, zone, thefts_30d }] }`, out `{ items: [{ name, zone, price, thefts_30d, loss_30d, score, measure, measure_id: "behind_counter"|"dummy_box"|"tag"|"near_till"|"raise_price", note }], total_loss_30d, rule }`.

## On-disk records

```
audit row   (data/audit/<YYYY-MM-DD>.jsonl, one per request)
  { id: uuid, ts: ISO, tenant, module, kind, prompt_version: string|null, model: string|null,
    latency_ms: number|null, input_sha256: hex, ok: bool,
    result_summary: { cause?, confidence?, channel?, timing_seconds?, log_id?, score?, error? } | null, eval_score?: number }
theft log   (data/theft_log.jsonl)
  alert:   { ts, log_id, kind: "alert", zone, value, source, repeat_visitor, action_taken }
  outcome: { ts, log_id, kind: "outcome", zone, value, action_taken, outcome? }
tenant      (config/tenants.json)   { tenant, name, key, plan, modules: [string], rate_limit_per_min }
prompt      (prompts/returns/vN.md) header between --- fences: version, based_on, fixes, model_used, compliance_clause?; body = system prompt
eval result (evals/returns/results/vN.json)
  { summary: { version, model, n, cause_accuracy, parsed_rate, grounded_rate, low_data_ok_rate, fix_rate,
               owner_line_rate, mean_latency_s, hard_subset_accuracy, gate_met, confusion }, scores: [...], raw: [...] }
```
