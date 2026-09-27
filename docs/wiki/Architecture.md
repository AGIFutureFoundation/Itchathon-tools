# Architecture

One Node 24 process, no framework, no npm dependencies in the app. Four modules share one build loop and one platform layer. Everything an owner sees is either deterministic or has passed an eval gate before it was allowed to ship. Source of truth: `docs/ARCHITECTURE.md` and `app/server.js`.

## The four modules

| Module | Route prefix | Owner question | LLM? |
|---|---|---|---|
| Returns ("Why Did It Come Back?") | `/api/diagnose` | Which ONE cause explains this SKU's returns, with verbatim evidence and a paste-ready fix? | yes, `claude -p` with `prompts/returns/vN.md` |
| Prep ("Today's Prep") | `/api/prep/*` | What do I need to have ready before this happens? | forecast: no; 7am card: optional |
| Ads ("Ads Plain Read") | `/api/ads/*` | Which listing/ad change is worth making this week? | stats: no; prose: yes, with enforced contract |
| Theft ("Ten Seconds After") | `/api/theft/*` | The camera fired. What does one person do in the next ten seconds? | **no**, rules table |
| Dashboard | `/api/dashboard/summary` | One JSON for the home page | no |
| ASIN import | `/api/import-asin` | Turn one ASIN into a diagnose input (critical reviews via Apify) | no |

The rule for where the LLM belongs: messy prose in (returns, reviews, messages, an account read) gets a model behind a deterministic guard; four structured fields in (a camera alert, a sales history, two conversion counts) get code. Theft is deliberately LLM-free because the answer has to arrive in under a second, be identical every time for the same alert, and never contain a sentence a lawyer would not sign off.

## Request path

```
authenticate (auth.js)  →  module allowed for tenant?  →  allow(tenant) (ratelimit.js)
  →  parse JSON body (2 MB limit)  →  redact (redact.js, returns only today)
  →  module handler  →  deterministic checks on output (guard.js: shape, enums, verbatim evidence)
  →  audit.record (audit.js)  →  response
```

If the deterministic check fails the owner sees an error, not a plausible guess. Every LLM-backed response carries `_meta: { prompt_source, model, latency_ms }`, and the returns response additionally carries `_guard: { ok, issues, injection_score }`.

## Module registry

`app/server.js` mounts every `app/modules/*.js` that exports `register(add)`:

```js
// Every app/modules/*.js that exports register(add) is mounted automatically.
const routes = new Map(); // "METHOD /path" -> {handler, module}
for (const f of fs.readdirSync(MODULES_DIR).filter(f => f.endsWith('.js')).sort()) {
  const name = f.replace(/\.js$/, '');
  const mod = require(path.join(MODULES_DIR, f));
  if (typeof mod.register === 'function') {
    mod.register((method, route, handler) => routes.set(`${method.toUpperCase()} ${route}`, { handler, module: name }));
  }
}
```

The module name is the file name, and it is what `tenants.json` module lists and audit rows refer to. The returns route is built into `server.js` (it predates the registry) but is registered into the same map under `module: 'returns'` so it gets redaction, guard and audit like the others. Platform modules are loaded with `optional(mod)`: a missing platform file degrades the server rather than crashing it, and `GET /api/health` reports which are present.

## Prompt loading

The server never embeds a prompt. `loadSystemPrompt()` scans `prompts/returns/` for `v(\d+).md`, picks the highest number, strips the `---` header and uses the body as the system prompt. A built-in `FALLBACK_PROMPT` exists only for the case where the directory is missing. This is the mechanism behind the release gate: a version that scores lower is simply never committed as the newest file, so it never serves traffic.

## The shared loop

1. `prompts/meta/master.md` is the meta-prompt. It writes every product prompt version from `prompts/meta/variables.md` plus the failure list of the last run.
2. `.claude/agents/` is the team: lead, builder, meta-prompter, data-synth, eval-runner, judge, persona-ben.
3. `evals/run.py` replays `evals/returns/cases.jsonl` through `claude -p` with a given prompt version and scores it. Results land in `evals/returns/results/vN.json` and `vN.failures.md`.
4. Gate: the server only loads the newest `vN.md`; a version is only committed when its score beats the previous one on the same cases.

See [Eval-Loop-and-Meta-Prompting](Eval-Loop-and-Meta-Prompting.md).

## Platform layer

`app/platform/`: `auth.js` (Bearer key → tenant, plan, modules), `ratelimit.js` (token bucket per tenant), `audit.js` (JSONL per day, sha256 of input), `redact.js` (PII placeholders before the model call), `guard.js` (output checks and injection score), `retention.js` (sweeps). See [Platform-Layer](Platform-Layer.md).

## State on disk

- `data/audit/<YYYY-MM-DD>.jsonl`: one row per request. Never the input, only its hash.
- `data/theft_log.jsonl`: alerts and outcomes (zone, value, action, outcome). `person_description` is never written.
- `prompts/`: versioned prompts with scored headers, in git.
- `config/tenants.json`: tenants as a file, reloaded on change. Swapping it for a table is a one-module change behind `auth.js`.

## Deployment

`Dockerfile` (node:24-alpine + `@anthropic-ai/claude-code`, copies `app/ prompts/ config/`, port 3141). `docker-compose.yml` mounts `./data` and `./prompts:ro` and reads `.env`. Local: `node app/server.js`. See [Deployment](Deployment.md).
