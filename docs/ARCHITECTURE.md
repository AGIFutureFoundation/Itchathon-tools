# Owner Console — architecture

One Node process, no framework, no npm dependencies in the app. Four modules share one
build loop and one platform layer. Everything an owner sees is either deterministic or
has passed an eval gate before it was allowed to ship.

## The four modules

| Module | Route prefix | Owner question | LLM? |
|---|---|---|---|
| Returns ("Why did it come back?") | `/api/diagnose` | Which ONE cause explains this SKU's returns, with verbatim evidence and a paste-ready fix? | yes, `claude -p` with `prompts/returns/vN.md` |
| Prep | `/api/prep/*` | What do I need to have ready before this happens? | yes, gated |
| Ads | `/api/ads/*` | Which listing/ad change is worth making this week? | yes, gated |
| Ten Seconds After (theft) | `/api/theft/*` | The camera fired. What does one person do in the next ten seconds? | **no** — rules table |

Theft is deliberately LLM-free: the answer has to arrive in under a second, be identical
every time for the same alert, and never contain a sentence a lawyer would not sign off.
A rules table gives all three. The LLM belongs where the input is messy prose (returns,
reviews, messages), not where the input is four fields from a camera.

## The shared loop: meta-prompt → agents → eval gate

1. `prompts/meta/master.md` is the meta-prompt. It writes every product prompt version
   (`prompts/<module>/vN.md`) from `variables.md` plus the failure list of the last run.
2. `.claude/agents/` is the team: lead, builder, meta-prompter, data-synth (golden
   cases), eval-runner, judge, persona-ben (the owner who reads the output).
3. `evals/run.py` replays `evals/<module>/cases.jsonl` through `claude -p` with a given
   prompt version and scores it. Results land in `evals/<module>/results/vN.json`, the
   score is written into the prompt file's header.
4. **Gate:** the server only loads the newest `vN.md`; a version is only committed when
   its score beats the previous one on the same cases. A prompt that scores lower never
   becomes "newest", so it never serves traffic.

## Platform layer (`app/platform/`)

- `auth.js` — `Authorization: Bearer <key>` against `config/tenants.json` →
  `{tenant, plan, modules}`. With `REQUIRE_AUTH=0` (demo) anonymous requests are
  tenant `default` with all modules; a present-but-unknown key is always rejected.
- `ratelimit.js` — token bucket per tenant, 60 req/min default, per-tenant override.
- `audit.js` — one JSONL file per day in `data/audit/`. Row: `ts, tenant, module,
  kind, prompt_version, model, latency_ms, input_sha256, result_summary`. `query()`
  filters by tenant/module/since; `prune()` enforces retention.
- Prompt versioning — `prompts/<module>/vN.md` with a scored header; the served version
  is stamped into every response `_meta.prompt_source` and into the audit row.
- Eval gates as release gates — a prompt version is a release; the eval score is the
  approval. No manual "looks fine".

Request path: `authenticate` → `allow(tenant)` → module handler → deterministic checks on
the output (JSON shape, allowed enum values, verbatim-quote check for evidence) → `audit.record`
→ response. If the deterministic check fails the owner sees an error, not a plausible guess.

## Deployment

`Dockerfile` (node:24-alpine + `@anthropic-ai/claude-code`, copies `app/ prompts/ config/`,
port 3141). `docker-compose.yml` mounts `./data` (state) and `./prompts` (read-only, so a
new prompt version ships without a rebuild) and reads `.env` (`ANTHROPIC_API_KEY`,
`APIFY_TOKEN`, `REQUIRE_AUTH`, `RETURNS_MODEL`). Local: `node app/server.js`.

## Data retention

- Audit rows: 90 days (`AUDIT_RETENTION_DAYS`), pruned by day file.
- No raw buyer PII beyond the request lifetime. The audit row keeps a sha256 of the input,
  never the input. `result_summary` holds labels and scores only.
- Theft: `person_description` is used for the live playbook and never written to disk.
  `theft_log.jsonl` stores zone, value, action and outcome.
- Prompts and eval cases are synthetic or owner-supplied and live in git.

## What "enterprise" means here

- **Multi-tenant** from the first line: every request has a tenant, a plan and a module
  list; limits and audit are per tenant.
- **Versioned prompts with scores.** A prompt is an artefact with a number and a test
  result, not a string in a file someone edited on Friday.
- **Every answer is traceable** to a prompt version, a model, a latency and an audit row
  whose input hash can be matched to the request that produced it.
- **Deterministic checks before any LLM output is shown.** Shape, enums, verbatim
  evidence, and for theft the whole answer, are decided by code, not by the model.
- **Tenants are files, not a database** — deliberately, for this stage. `tenants.json`
  reloads on change; swapping it for a table is a one-module change behind `auth.js`.
