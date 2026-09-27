# Sapient.X wiki

*Powered by AGI Corp*

Sapient.X is the AGI Future Foundation entry to ITCHATHON (27 Sep 2026): four small-business modules behind one platform layer, built with a meta-prompt → agent team → eval gate loop. This wiki is the long-form documentation; the [README](../../README.md) is the short version.

> Thesis: detection is solved; the next step is not. Every small shop already has data that says what went wrong. Nobody has told the one person standing there what to do next.

![Sapient.X dashboard: four modules, live 3D charts, eval gate, platform health](https://raw.githubusercontent.com/AGIFutureFoundation/Itchathon-tools/main/media/screenshots/dark/dashboard.png)

## Pages

**Overview**
- [Architecture](Architecture.md) — one Node process, four modules, one platform layer, one build loop
- [Agent-Team](Agent-Team.md) — the seven Claude Code subagents and what each owns
- [Eval-Loop-and-Meta-Prompting](Eval-Loop-and-Meta-Prompting.md) — how prompts are written, scored and gated
- [Metrics](Metrics.md) — the full evals story in one page, for investors and customers

**Modules**
- [Module-Returns](Module-Returns.md) — Why Did It Come Back? (Challenge 1, LLM, v2 at 98.3%)
- [Module-Prep](Module-Prep.md) — Today's Prep (Challenge 4, pure math, 30.4% better than the habit)
- [Module-Ads](Module-Ads.md) — Ads Plain Read (Challenge 2, stats in code, LLM for prose, 100% honesty)
- [Module-Theft](Module-Theft.md) — Ten Seconds After (Challenge 3, rules table, no LLM)

**Platform**
- [Platform-Layer](Platform-Layer.md) — auth, rate limit, audit, redaction, guard, retention
- [Compliance](Compliance.md) — obligations per module and the control that meets each
- [Security](Security.md) — threat model, prompt injection, secrets, what is and is not stored
- [Deployment](Deployment.md) — local, Docker, environment, tenants

**Reference**
- [API-Reference](API-Reference.md) — every route with request and response
- [Data-Model](Data-Model.md) — input/output contracts per module, audit row, theft log
- [Roadmap](Roadmap.md)
- [FAQ](FAQ.md)

## The numbers on one screen

| Module | Gate | Result | Source |
|---|---|---|---|
| Returns | cause accuracy ≥ 80%, grounded ≥ 95%, low-data honesty ≥ 99% | v2: 98.3% / 95% / 100% on 60 cases; hard 20 at 100% | `evals/returns/results/v2.log` |
| Prep | ≥ 15% lower pinball loss than "same weekday last week" | 30.4% (4.14 → 2.88), every item better | `evals/prep/results.json` |
| Ads | 100% agreement on `test_is_valid`, never a winner below the floor | 20/20 | `evals/ads/results.json` |
| Theft | no model; four hard rules on every response | deterministic by construction | `app/modules/theft.js` |

## Publishing this wiki to GitHub

The pages here are written in GitHub-wiki style (`Home.md` is the index, `_Sidebar.md` is the sidebar, links are bare page names). To publish as the GitHub wiki:

```bash
git clone https://github.com/AGIFutureFoundation/Itchathon-tools.wiki.git
cp docs/wiki/*.md Itchathon-tools.wiki/
cd Itchathon-tools.wiki && git add . && git commit -m "wiki" && git push
```

Links of the form `[Architecture](Architecture.md)` resolve both here in the repo and in the wiki. Relative links back into the repo (`../../README.md`, `../COMPLIANCE.md`) only work inside the repository; in the published wiki, follow the repo link at the top instead.

## Where things live

```
app/server.js          HTTP server, module registry, built-in returns route
app/modules/           ads.js  prep.js  theft.js  dashboard.js  apify.js (ASIN import)
app/platform/          auth.js ratelimit.js audit.js redact.js guard.js retention.js
app/public/            dashboard.html (root) index.html (returns) asin-import.html prep.html ads.html theft.html
STATUS.md              score table and loop record, written by the lead
tools/                 demo recorder (record.js) and ffmpeg assembly (make-demo.sh) for media/
prompts/meta/          master.md variables.md compliance_clause.md generate.py
prompts/returns/       v1.md v2.md (+ edge_cases)      prompts/ads/v1.md
evals/run.py           returns eval; evals/prep/backtest.py; evals/ads/run.py
evals/returns/cases.jsonl   60 golden cases; cases_real.jsonl 10 Apify-scraped cases
config/tenants.json    demo tenants and keys
data/                  audit/<day>.jsonl, theft_log.jsonl (runtime state, mounted in Docker)
docs/                  ARCHITECTURE.md COMPLIANCE.md PITCH_NOTES.md wiki/
.claude/agents/        the seven agent definitions
pitch/pitch.html       the pitch page (live copy: https://claude.ai/artifact/ChLDi9GPBXPhhjycapP5Mn)
```
