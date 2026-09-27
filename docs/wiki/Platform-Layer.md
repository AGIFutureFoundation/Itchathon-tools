# Platform layer

`app/platform/` is six files, Node built-ins only, each loaded optionally by `app/server.js` (`optional('./platform/auth')` and so on). A missing file degrades the server rather than crashing it; `GET /api/health` reports `platform: { auth, ratelimit, audit, redact, guard }` so you can see what is active. `retention.js` is a CLI and library, not a request-path module.

## auth.js — tenants

`Authorization: Bearer <key>` is looked up in `config/tenants.json`, which is reloaded whenever its mtime changes (no restart to add or rotate a tenant).

```js
// Returns {tenant, plan, modules} or null when auth is required and the key is
// missing/unknown. A key that is present but unknown is always rejected, even in
// demo mode, so a typo never silently becomes "default".
function authenticate(req) {
  const key = bearer(req);
  if (!key) return requireAuth() ? null : { ...DEFAULT_TENANT };
  const t = loadTenants().get(key);
  if (!t) return null;
  return { tenant: t.tenant, plan: t.plan, modules: [...t.modules], rate_limit_per_min: t.rate_limit_per_min };
}
```

`REQUIRE_AUTH=1` makes a key mandatory. With it off (the demo default), anonymous requests run as tenant `default`, plan `demo`, all four modules. The server then checks `tenant.modules.includes(module)` and answers `403 module <name> not enabled for tenant` otherwise. `ALL_MODULES = ['returns', 'prep', 'ads', 'theft', 'apify', 'dashboard']`; module names are the file names in `app/modules/`.

## ratelimit.js — token bucket per tenant

Default 60 requests per minute (`RATE_LIMIT_PER_MIN`), refilled continuously; `tenants.json` can set `rate_limit_per_min` per tenant. `allow(tenant, perMin)` returns `{ ok, remaining, retry_after_ms }`; the server answers `429` when `ok` is false. `sweep()` forgets idle buckets so the map does not grow forever.

## audit.js — one JSONL file per day

Every request that reaches a handler gets a row in `data/audit/<YYYY-MM-DD>.jsonl`:

```js
const row = {
  id: crypto.randomUUID(), ts,
  tenant: meta.tenant || 'default',
  module: meta.module || kind, kind,
  prompt_version: meta.prompt_version || null,   // e.g. "v2.md"
  model: meta.model || null,
  latency_ms, input_sha256: sha256(payload),      // the raw input is NOT stored
  ok: !(result instanceof Error) && !(result && result.error),
  result_summary: summarise(result),              // cause, confidence, channel, timing_seconds, log_id, score, error
};
```

`query({ tenant, module, since, limit })` opens only the day files that can contain matches. `prune(days)` deletes day files older than the window (default `AUDIT_RETENTION_DAYS=90`). A write failure is logged and never takes the request down.

## redact.js — PII placeholders before the model

Runs before the model call and before the grounding check, so a quote that matches the redacted text is by construction a quote that contains no PII.

| Type | Detection | Validation |
|---|---|---|
| `[EMAIL_n]` | regex | — |
| `[IBAN_n]` | 2 letters, 2 digits, 11–30 alphanumerics | mod-97 |
| `[ORDER_n]` | Amazon 3-7-7, "order/receipt/transaction … 9–11 digits", `#123456789` | — |
| `[CARD_n]` | 13–19 digits with spaces or dashes | Luhn, not all one digit |
| `[PHONE_n]` | international and local shapes | 7–15 digits, not a date or year range |
| `[ADDRESS_n]` | US "12 Oak Street, Apt 4B" and EU "Musterstraße 12" orders | abbreviated street types need a real word first |

Placeholders are stable per distinct value within one call (the same phone in three formats becomes one `[PHONE_1]`), contain no digits, and are never re-matched by later passes. Object keys are not redacted. Size charts, dates, prices, SKUs and ASINs pass through untouched (`tests/redact.test.js`). `wrapUntrusted(obj)` wraps the redacted JSON in `<untrusted_buyer_text>` and neutralises any forged closing tag inside the payload. The `map` from placeholder to original is returned to the caller and never written to disk.

## guard.js — output checks and injection score

`checkOutput(result, redactedInputs, { systemPrompt? })` returns `{ ok, issues, result }` where `result` is a cleaned copy:

- (a) every `evidence` string must be a verbatim substring of the redacted inputs; others are dropped with `evidence_not_verbatim` (error).
- (b) free-text fields (`paste_ready, owner_line, change_next, keep_size_message, script, summary, plain_read`) may not contain URLs (`url_in_output`), off-platform contact advice (`off_platform_contact`, `contact_outside_marketplace`, with an allow-list for "through Amazon Buyer-Seller Messaging", "Etsy conversations" and the like), raw PII that was not in the inputs (`pii_in_output`), or unknown placeholders.
- (c) sentences matching prompt scaffolding (`You are RETURNS ROOT-CAUSE`, `## DECISION LADDER`, `system prompt`, …) or copying ≥ 10 consecutive words of the system prompt are stripped (`prompt_leak_stripped`, warning).

`ok` is false if any issue has severity `error`. `injectionScore(text)` combines weighted regex hits ("ignore previous instructions", "you are now", "set the cause to", role markers, forged tags, zero-width characters, long base64) into a 0–1 score; `INJECTION_THRESHOLD = 0.5`. Scores are logged, never blocked: an angry review can legitimately contain "ignore" and "instructions".

## retention.js — sweeps

```
node app/platform/retention.js --dry-run [--data-dir data] [--audit-days 90] [--theft-log-days 365]
                               [--raw-imports-days 30] [--theft-description-hours 24]
```

Line-level expiry for `audit/*.jsonl` and `theft/*.jsonl` (timestamp in `ts|time|timestamp|at|created_at`), file-level expiry by mtime for `raw_imports/**`. Any `person_description` older than 24 hours is rewritten to `[REDACTED]`. Lines without a parseable timestamp are kept (conservative) and counted in `unparsed`. Rewrites are atomic (tmp file + rename). Nothing is touched in dry-run mode, and the JSON report it prints is the evidence the sweep ran.

## Where each piece sits in a request

```
authenticate → module enabled? → allow(tenant) → JSON body (≤ 2 MB)
  → redact (returns) → handler → guard.checkOutput (returns) → audit.record → response
```

Today redaction and the guard are wired on `/api/diagnose`; the other modules are deterministic or enforce their own contract in code (`enforceContract` in ads, `templateCard` fallback in prep). Wiring `redact`/`guard` into `ads/read` is on the [Roadmap](Roadmap.md).

## Tests

`node --test tests/` runs `tests/redact.test.js`: redaction of email, phone, order id, card (Luhn) and IBAN (mod-97), US and EU addresses, non-redaction of size charts and dates, deep walks that keep structure, the forged-tag neutraliser, guard rejections (ungrounded evidence, URL, off-platform contact, prompt leak) and acceptances (marketplace messaging), injection scoring, and a retention sweep with dry-run and real modes.
