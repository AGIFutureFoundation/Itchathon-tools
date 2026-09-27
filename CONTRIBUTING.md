# Contributing

*Powered by AGI Corp*

Sapient.X is a Node 24 app with no npm dependencies, a Python 3 eval suite, and prompts that are generated, not written. Keep it that way.

## The one rule about prompts

Only the meta-prompter writes product prompts. `prompts/<module>/vN.md` files are outputs of `prompts/meta/master.md` filled with the contract in `prompts/meta/variables.md`, the clause in `prompts/meta/compliance_clause.md` and the newest `evals/<module>/results/vN.failures.md`. To improve a prompt, improve the meta-prompt, the variables, or the eval cases, then run `python3 prompts/meta/generate.py` to produce vN+1. Never edit a vN.md by hand, never change the output contract keys, and never embed a prompt string in app code (`app/server.js` loads the newest vN.md at request time).

## Adding a module

1. Create `app/modules/<name>.js` (CommonJS, Node built-ins only) exporting `register(add)`. Call `add(method, '/api/<name>/<route>', handler)` where `handler(body, req) => Promise<object>`; throw `Object.assign(new Error(msg), { status: 400 })` for bad input. The server mounts every file in `app/modules/` automatically and applies auth, rate limiting and audit to it.
2. Put `_meta: { prompt_source, model, latency_ms }` on any LLM-backed response so the audit row and the dashboard can see it. Provide a deterministic template fallback for every LLM call (see `fallbackRead` in `ads.js`, `templateCard` in `prep.js`).
3. Add the module name (the file name) to `ALL_MODULES` in `app/platform/auth.js` and to the relevant tenants in `config/tenants.json`; `apify` and `dashboard` are already listed alongside the four product modules.
4. Add `evals/<name>/` with a runner that writes `results.json` containing `gate_met`, and describe the gate in `docs/wiki/Module-<Name>.md`.
5. Prefer no LLM where the input is a few structured fields (theft, prep forecast, ads stats). Use the LLM only where the input is messy prose.

## Adding eval cases

- Returns: append a line to `evals/returns/cases.jsonl` with `id, sku, category, listing, returns, reviews, messages, expected: { cause, must_quote }`. Every `must_quote` string must appear verbatim in the inputs. Ids `c41` and above count as the hard subset. Keep the label distribution documented in `.claude/agents/data-synth.md`.
- Ads: append to `evals/ads/cases.jsonl` with `id, note, variants[], expected: { test_is_valid, verdict? }`.
- Prep: the backtest is synthetic and seeded (`evals/prep/backtest.py`); change the generator, not the numbers.
- A case that a current version fails is welcome; that is how the next version gets better.

## Gates before merging

- `python3 evals/run.py --prompt prompts/returns/vN.md` exits 0: cause accuracy ≥ 0.80, grounded ≥ 0.95, low-data honesty ≥ 0.99, and no lower than the previous version on the same cases.
- `python3 evals/prep/backtest.py` reports `gate_met: true` (≥ 15% pinball improvement) and `node_parity: ok`.
- `python3 evals/ads/run.py` reports `stats_honesty_rate: 1.0`.
- `node --test tests/` passes (redaction, guard, retention).
- Any generated prompt contains `prompts/meta/compliance_clause.md` verbatim (`generate.py` appends it if the model dropped it).
- Nothing in `data/` and no `.env` is committed. Documentation changes go to `README.md`, `ABOUT.md`, `docs/`, and `docs/wiki/`.
