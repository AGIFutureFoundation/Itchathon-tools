# FAQ

## What is Owner Console in one sentence?

Four small-business modules (returns root-cause, prep forecasting, ads plain read, theft de-escalation) behind one platform layer, each taking a signal the business already has and returning one action, with every model-backed answer gated by an eval before it ships.

## Why four unrelated problems in one product?

They are not unrelated. In each ITCHATHON challenge the detection already exists (return rate, camera alert, ad dashboard, POS) and the missing piece is what the owner does next. `docs/PITCH_NOTES.md`: "Detection is solved; the next step is not." The four share the build loop, the platform layer, the compliance clause and the audit log.

## Why does the theft module not use a model?

Because the answer has to arrive in under a second, be identical every time for the same alert, and never contain a sentence a lawyer would not sign off. A rules table (`choosePlaybook` in `app/modules/theft.js`) gives all three; every response carries the same four `NEVER_DO` lines. The LLM belongs where the input is messy prose, not where the input is four fields from a camera.

## Why does the prep forecast not use a model either?

The forecast is a quantile of eight same-weekday samples times a clamped trend and a few context multipliers. Code does that exactly and explainably, and the backtest can compare it against the owner's habit with a proper loss function (pinball). The model is used only for the optional three-line 7am card, with a template fallback.

## Who wrote the prompts?

The meta-prompt did. `prompts/meta/master.md` is filled with the contract and the last failure report and run through Opus by `prompts/meta/generate.py`; the output is `prompts/returns/vN.md`. No agent or person edits a product prompt by hand. See [Eval-Loop-and-Meta-Prompting](Eval-Loop-and-Meta-Prompting.md).

## What does "eval gate met" mean exactly?

For returns: `cause_accuracy ≥ 0.80`, `grounded_rate ≥ 0.95`, `low_data_ok_rate ≥ 0.99` on the 60 golden cases. v2 scored 0.983 / 0.95 / 1.0. For prep: pinball-loss improvement ≥ 15% over "same weekday last week" (30.35%). For ads: 100% agreement on `test_is_valid` and never a winner below the floor (20/20). The exact thresholds are in `evals/run.py`, `evals/prep/backtest.py` and `evals/ads/run.py`.

## How does the server know which prompt to use?

It scans `prompts/returns/` for `v(\d+).md` and takes the highest number on each request. A version that failed its eval is never committed, so it never becomes the newest file. The version is stamped into every response as `_meta.prompt_source` and into the audit row.

## What does the model see, and what is stored?

The model sees redacted input: PII replaced with `[EMAIL_1]`, `[PHONE_1]`, `[ORDER_1]` and so on, wrapped in `<untrusted_buyer_text>`. The audit log stores a SHA-256 of the input, never the input, plus labels and scores. The theft module never writes `person_description`. Retention: audit 90 days, raw imports 30 days, theft log 365 days.

## What happens if a quote is not verbatim?

`guard.checkOutput()` drops it and records an `evidence_not_verbatim` error in `_guard.issues`. The eval scores the same thing as `grounded_rate`. v2's two grounding misses (c30, c55) were quotes with a dropped quote mark or a joined fragment.

## What if a buyer's review says "ignore previous instructions"?

It is data. The compliance clause in every prompt says so, `wrapUntrusted()` neutralises forged closing tags, `injectionScore()` logs the attempt (visible as `_guard.injection_score`), and the model runs with no tools and one turn. Nothing is blocked on the score alone, because angry reviews legitimately contain words like "ignore".

## Can the ads module ever call a winner on a small test?

No. `computeStats` declares a winner only when every expected cell count is ≥ 5 and p < 0.05, and `enforceContract` overwrites whatever the model said about `test_is_valid`. The hackathon case (135/0 vs 122/2) returns `no winner yet` with a sentence saying how many conversions would be needed.

## Does it need npm install?

No. The app uses Node 24 built-ins only. The one external dependency is the Claude Code CLI (`claude`), which the LLM routes shell out to. The Docker image installs it globally.

## Can I run it without a model at all?

Yes, partially. Theft, prep forecast, ads stats, ads ownership, dashboard and health work with no model. `/api/diagnose` returns 502; `/api/prep/explain` and `/api/ads/read` fall back to templates and say `source: "template"`.

## How do I add a tenant or rotate a key?

Edit `config/tenants.json`; `auth.js` reloads it on change. Set `REQUIRE_AUTH=1` in production. See [Deployment](Deployment.md).

## Where are the screenshots and the demo video?

`media/dashboard.png`, `media/returns.png`, `media/prep.png`, `media/ads.png`, `media/theft.png`, `media/demo.gif` and `media/demo.mp4`, referenced from the README. The live pitch page is at https://claude.ai/artifact/ChLDi9GPBXPhhjycapP5Mn.

## Is the dashboard data real?

Where a source exists on disk (eval results, audit rows, theft log, prompt headers, tenants) it is live and `sources.<name>` says `"live"`. Where no feed is wired (7-day prep series, per-campaign ad spend) the JSON says `demo: true` and `sources.<name>: "demo"`, and the series are deterministic so they are stable across polls.

## How do I contribute a failing case?

Append it to the module's `cases.jsonl` (see [CONTRIBUTING](../../CONTRIBUTING.md)). For returns, every `must_quote` must appear verbatim in the inputs. A case the current version fails is the most useful kind: it is what produces the next version.

## Who is behind this?

AGI Future Foundation, a foundation building practical AI for small businesses, with a team of seven Claude Code subagents. Issues and questions: https://github.com/AGIFutureFoundation/Itchathon-tools/issues. See [ABOUT](../../ABOUT.md).
