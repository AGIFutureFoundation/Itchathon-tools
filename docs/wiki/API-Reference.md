# API reference

Base URL `http://localhost:3141`. All routes take and return JSON (`Content-Type: application/json`, `Cache-Control: no-store`). Bodies are capped at 2 MB. Errors are `{ "error": string, "raw"?: string }` with the status below.

**Auth**: `Authorization: Bearer <key>` from `config/tenants.json`. Optional while `REQUIRE_AUTH=0` (tenant `default`, all modules). A present-but-unknown key → `401`. Module not on the tenant's plan → `403 module <name> not enabled for tenant`. Over the bucket → `429 rate limit: 60 requests/min per tenant`.

**Common statuses**: `400` bad input (message names the expected shape), `502` model or CLI failure, `504` CLI timeout (90 s).

| Method | Route | Module | LLM |
|---|---|---|---|
| POST | `/api/diagnose` | returns | yes |
| POST | `/api/prep/forecast` | prep | no |
| POST | `/api/prep/explain` | prep | optional |
| POST | `/api/ads/stats` | ads | no |
| POST | `/api/ads/read` | ads | yes |
| POST | `/api/ads/ownership` | ads | no |
| POST | `/api/theft/alert` | theft | no |
| POST | `/api/theft/log` | theft | no |
| GET | `/api/theft/summary` | theft | no |
| POST | `/api/theft/harden` | theft | no |
| GET | `/api/dashboard/summary` | dashboard | no |
| GET | `/api/health` | — | no |

Full field-level contracts are in [Data-Model](Data-Model.md).

---

## POST /api/diagnose

Body: `{ listing: { title, bullets[], description, size_chart|null, photos_note }, returns: [{ reason_code, size_ordered|null, comment }], reviews: [string], messages: [string], sku? }`. `listing` and `returns` are required (`400` otherwise).

Response: the prompt contract plus `_meta` and `_guard`.

```json
{ "sku": "LNX-TEE-RUST-01", "cause": "photos", "confidence": 0.78,
  "evidence": ["way more orange irl", "photos are super filtered"],
  "fix": { "what_to_change": "photos", "paste_ready": "1. Flat lay in daylight ..." },
  "keep_size_message": "...", "owner_line": "Reshoot the main image in daylight today ...",
  "_meta": { "prompt_source": "v2.md", "model": "sonnet", "latency_ms": 14800 },
  "_guard": { "ok": true, "issues": [], "injection_score": 0 } }
```

```bash
curl -s localhost:3141/api/diagnose -H 'Content-Type: application/json' -d @case.json
```

## POST /api/prep/forecast

Body: `{ items: [{ name, history: [{ date: "YYYY-MM-DD", sold }], walk_in?, typical_bookings? }], preference?: "run_out|neutral|waste", context?: { bookings, typical_bookings, events[], weather }, target_date? }`. `items` required.

Response: `{ preference, target_date, weekday, items: [{ name, prep_qty, range: [low, high], why, _meta: { weekday, target_date, samples, median, quantile, trend, context_mult } }], latency_ms }`.

## POST /api/prep/explain

Body: either a forecast response or a forecast request. Response: `{ card: "line1\nline2\nline3", source: "claude" | "template", model?, error?, latency_ms }`.

## POST /api/ads/stats

Body: `{ variants: [{ name, impressions, conversions, spend? }], period_days? (default 30) }`.

Response: `{ method, variants_compared: [A, B], test_is_valid, p_value, p_value_fisher, z, rates: { A, B, pooled }, min_conversions_needed_per_variant, min_impressions_needed_per_variant, min_conversions_message, verdict: "winner: X" | "no winner yet", plain_read, pmax_ready, monthly_conversions, reasons[] }`.

```bash
curl -s localhost:3141/api/ads/stats -H 'Content-Type: application/json' \
  -d '{"variants":[{"name":"Headline A","impressions":135,"conversions":0},{"name":"Headline B","impressions":122,"conversions":2}]}'
# → "test_is_valid": false, "verdict": "no winner yet"
```

## POST /api/ads/read

Body: `{ goal: "leads|sales|calls", monthly_budget?, campaigns: [{ name, type, spend, impressions, clicks, conversions, conv_value?, period_days? }] }`. Empty `campaigns` → `{ error }`.

Response: `{ whats_happening, change_next: [{ action, why, expected_effect }] (1–3), confidence, test_is_valid, numbers_used[], numbers_dropped?, corrected?, fallback_reason?, stats, derived: { total_spend, total_conversions, total_monthly_conversions, monthly_budget, best_campaign, flags: [{ campaign, flag, detail }] }, _meta: { source: "model" | "template", model, prompt_source: "v1.md", latency_ms } }`.

## POST /api/ads/ownership

Body: `{ platform: "google" | "meta", access: "agency_owns" | "shared" | "owner" }`. Response: `{ platform, access, headline, steps[], step_count }`. Wrong values → `{ error }`.

## POST /api/theft/alert

Body: `{ source: "veesion|camera|manual", zone?, item_value_estimate?, staff_on_floor (required), repeat_visitor?, person_description? }`. `person_description` is used for the live answer and never stored.

Response: `{ action: { primary, secondary, do_not: [4 strings], followups[] }, script, channel: "speaker|phone|screen|till", timing_seconds: 10, log_id, context: { zone, item_value_estimate, staff_on_floor, repeat_visitor, source } }`.

```bash
curl -s localhost:3141/api/theft/alert -H 'Content-Type: application/json' \
  -d '{"source":"veesion","zone":"beauty aisle","item_value_estimate":10,"staff_on_floor":1,"repeat_visitor":true}'
```

## POST /api/theft/log

Body: `{ log_id?, ts?, zone?, value?, action_taken?, outcome?: "deterred|took_it|unsure" }`. Response: `{ ok: true, row }`.

## GET /api/theft/summary

Response: `{ alerts, outcomes_logged, deterred, took_it, unsure, deterrence_rate, estimated_loss, by_zone: { [zone]: { events, took_it, deterred, unsure, loss } }, by_week: { "2026-W39": {...} }, top_zone, decision_hint }`.

## POST /api/theft/harden

Body: `{ items: [{ name, price, zone, thefts_30d }] }`. Response: `{ items: [{ name, zone, price, thefts_30d, loss_30d, score, measure, measure_id, note }] (sorted by score desc), total_loss_30d, rule }`.

## GET /api/dashboard/summary

Response: `{ generated_at, sources: { returns_eval, returns_causes, prep_eval, prep_series, ads_honesty, ads_campaigns, theft, tenants, audit }, returns: { eval, diagnoses_total, by_cause, by_cause_week, demo, headline }, prep: { eval, by_item, series, headline }, ads: { honesty, campaigns, headline }, theft: { totals, by_zone, by_week, heat, decision_hint, demo, headline }, platform: { audit_rows_today, audit_rows_total, audit_by_module, tenants, tenant_plans, prompt_served, prompt_versions, eval_gate, latency_ms_today_p50, latency_s_eval, retention_days } }`. Each `sources.*` is `"live"` or `"demo"`; series with no wired feed are marked `demo: true`.

## GET /api/health

Response: `{ ok: true, prompt_source: "v2.md", model, modules: [...], platform: { auth, ratelimit, audit, redact, guard } }`.

## Audit side effect

Every request that reaches a handler appends a row to `data/audit/<today>.jsonl` with `tenant, module, kind, prompt_version, model, latency_ms, input_sha256, ok, result_summary`. See [Platform-Layer](Platform-Layer.md).
