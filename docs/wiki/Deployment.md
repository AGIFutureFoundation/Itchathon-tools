# Deployment

One process, one port (3141), no build step, no npm install for the app. The only external binary the LLM modules need is the Claude Code CLI (`claude`), because every model call is `claude -p` on a child process.

## Requirements

- Node 24 (the repo was built and tested on v24.15.0).
- Claude Code CLI on `PATH`, authenticated (or `ANTHROPIC_API_KEY` in the environment). Without it, `/api/diagnose` returns 502; prep and ads fall back to their templates; theft and dashboard work regardless.
- Python 3 for the evals (`evals/run.py`, `evals/prep/backtest.py`, `evals/ads/run.py`).

## Local

```bash
cp .env.example .env
node app/server.js
# Why Did It Come Back?  http://localhost:3141  (prompt: v2.md, model: sonnet)
```

`.claude/launch.json` has a matching `owner-console` configuration for the Claude Code browser preview.

Pages: `/` serves `dashboard.html` when it exists (it does), otherwise `index.html`; `/index.html` (returns), `/asin-import.html`, `/prep.html`, `/ads.html`, `/theft.html`. The dashboard charts from `/api/dashboard/summary`.

## Environment (`.env.example`)

```
APIFY_TOKEN=            # for POST /api/import-asin (ASIN → critical reviews → diagnose input)
ANTHROPIC_API_KEY=
REQUIRE_AUTH=0          # 1 = every /api request needs Authorization: Bearer <key> from config/tenants.json
RETURNS_MODEL=sonnet    # model alias passed to `claude -p --model`
# PORT=3141
# RATE_LIMIT_PER_MIN=60
# AUDIT_RETENTION_DAYS=90
```

Also read by the modules: `ADS_MODEL` (default `sonnet`), `PREP_MODEL` (default `sonnet`), `EVAL_MODEL` for `evals/run.py` (default `sonnet`), `DATA_DIR` for `retention.js`. `server.js` loads `.env` itself (no dotenv package) and never overrides a variable that is already set in the process environment.

## Docker

```dockerfile
FROM node:24-alpine
RUN npm i -g @anthropic-ai/claude-code && npm cache clean --force
WORKDIR /srv
COPY app/ ./app/
COPY prompts/ ./prompts/
COPY config/ ./config/
RUN mkdir -p /srv/data/audit && chown -R node:node /srv
USER node
ENV PORT=3141 NODE_ENV=production REQUIRE_AUTH=0 RETURNS_MODEL=sonnet
EXPOSE 3141
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -qO- http://127.0.0.1:3141/api/health || exit 1
CMD ["node","app/server.js"]
```

```bash
docker compose up --build
```

`docker-compose.yml` publishes 3141, reads `.env`, and mounts two volumes:

- `./data:/srv/data` so audit rows and `theft_log.jsonl` survive rebuilds;
- `./prompts:/srv/prompts:ro` so a new `vN.md` ships without a rebuild. The server picks the highest version number on each request.

`restart: unless-stopped`. Put HTTPS termination and any WAF in a reverse proxy in front of the container.

## Tenants

`config/tenants.json` is reloaded on change. Each entry: `tenant`, `name`, `key`, `plan`, `modules[]`, `rate_limit_per_min`. The two shipped entries are placeholders (`demo-key-ben`, `demo-key-kitchen`) and must be replaced before any real deployment. To rotate a key, edit the file; the next request sees it. Set `REQUIRE_AUTH=1` in production so anonymous requests are refused.

## Health check

```bash
curl -s localhost:3141/api/health
{"ok":true,"prompt_source":"v2.md","model":"sonnet",
 "modules":["ads","apify","dashboard","prep","theft","returns"],
 "platform":{"auth":true,"ratelimit":true,"audit":true,"redact":true,"guard":true}}
```

`prompt_source` is the file the returns route will use on the next request; `platform` shows which optional platform files loaded.

## Retention job

Run daily from cron or a scheduler:

```bash
node app/platform/retention.js --dry-run     # prints the report, changes nothing
node app/platform/retention.js               # audit 90 d, theft log 365 d, raw imports 30 d, person_description 24 h
```

Keep the dry-run output as evidence the sweep ran (`docs/COMPLIANCE.md`).

## Shipping a new prompt version

1. `python3 prompts/meta/generate.py` writes `prompts/returns/vN+1.md` from the newest failure report.
2. `python3 evals/run.py --prompt prompts/returns/vN+1.md` must exit 0 and score no lower than vN.
3. Commit the prompt. With the compose volume, the running container serves it immediately; without it, redeploy.

A version that fails the gate is simply not committed, so it never becomes the newest file and never serves traffic.

## Evals in CI

Each runner exits non-zero when its gate fails: `evals/run.py` (returns), `evals/prep/backtest.py` (prep, also fails on Node/Python disagreement), `evals/ads/run.py` (ads). `node --test tests/` covers the platform layer. The returns eval calls the model 60 times and takes minutes; the other two are seconds and need only Node and Python.
