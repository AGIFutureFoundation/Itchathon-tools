# Eval loop and meta-prompting

No product prompt in this repository was written by hand. This page explains the loop that writes, scores and gates them, using the returns module as the worked example because it is the one that has been through two full iterations.

## The loop

```
master.md + variables.md + compliance_clause.md + vN.failures.md
        │  (prompts/meta/generate.py, claude -p --model opus)
        ▼
prompts/returns/vN+1.md  (header: version, based_on, fixes, model_used)
        │  (evals/run.py, claude -p --model sonnet, 60 cases, 6–8 workers)
        ▼
evals/returns/results/vN+1.json  +  vN+1.failures.md
        │
        ▼
gate: cause_accuracy ≥ 0.80  AND  grounded_rate ≥ 0.95  AND  low_data_ok_rate ≥ 0.99
   met     → vN+1 is the newest file; app/server.js serves it on the next request
   not met → vN+1.failures.md becomes the input to the next generate.py run
```

![Meta-prompt loop, agent team, eval gate, platform layer](https://raw.githubusercontent.com/AGIFutureFoundation/Itchathon-tools/main/media/charts/architecture-diagram.png)

## v1 through v4 on the 60-case synthetic gate

![Cause accuracy, grounded rate, low-data honesty across v1-v4](https://raw.githubusercontent.com/AGIFutureFoundation/Itchathon-tools/main/media/charts/eval-progression.png)

v3 (currently served) improved cause accuracy from v1's 78.3% to 90.0% and grounding to 96.7% by fixing the garment↔size_chart confusion the v1 failure report surfaced. Its confusion matrix on the same 60 cases:

![v3 confusion matrix](https://raw.githubusercontent.com/AGIFutureFoundation/Itchathon-tools/main/media/charts/confusion-v3.png)

For comparison, v2's confusion matrix (the version served before v3, 98.3% on this synthetic set):

![v2 confusion matrix](https://raw.githubusercontent.com/AGIFutureFoundation/Itchathon-tools/main/media/charts/confusion-v2.png)

## The gate that matters more: real data

A version passing the synthetic gate is necessary, not sufficient. Every served candidate is also run against 30 real Amazon-review cases (`evals/returns/cases_real.jsonl`, pulled via Apify). The gap is the project's most important number:

![Synthetic vs real-30 accuracy: v2 10.0%, v3 56.7%, v4 46.7%](https://raw.githubusercontent.com/AGIFutureFoundation/Itchathon-tools/main/media/charts/synthetic-vs-real.png)

v4 was generated specifically from v3's real-30 failure report (confusion between `garment` — a quality failure discovered through use — and `fulfilment` — a shipping/logistics failure discovered at unboxing) and from v3's synthetic gate scores. v4 improved grounding (83.3%→96.7%) and JSON parsing (96.7%→100%) on real data but its real cause-accuracy fell to 46.7%, below v3's 56.7%. Per the release rule above, **v4 was archived and v3 stays served** — passing the synthetic gate does not earn a release on its own; the real-data score is checked every time and a regression there blocks the switch even though the synthetic gate passed.

The failure report is the only thing that changes between versions, so every improvement is traceable to a case that failed.

## The meta-prompt

`prompts/meta/master.md`, in full:

```
You are writing a production system prompt for an assistant used by a small-business owner who works alone and has under 60 seconds.

<challenge>{{CHALLENGE_BRIEF}}</challenge>
<habit_to_beat>{{CURRENT_HABIT}}</habit_to_beat>
<inputs>{{INPUT_SCHEMA}}</inputs>
<output_contract>{{OUTPUT_SCHEMA}}</output_contract>
<failures_last_round>{{FAILURE_REPORT}}</failures_last_round>

Write a system prompt that:
1. Returns ONLY the output contract as EXACTLY ONE JSON object (never two, never an array, no markdown fences, nothing after the closing brace). ...
2. Quotes evidence VERBATIM from the inputs for every claim — exact substrings, no paraphrase — and says cause "not_enough_data" when there are fewer than 3 returns and no clear signal.
3. Handles low volume honestly (small samples, one seller, one SKU); never invents numbers.
4. Decides the cause with a short, explicit decision procedure (which signals outrank which), including when the reason_code contradicts the buyer's comment (the comment wins).
5. Fixes every failure listed in failures_last_round without breaking passing cases.
6. Include verbatim the following compliance clause ...: {{COMPLIANCE_CLAUSE}}
Return the prompt inside <system_prompt> tags and 5 new edge cases it must survive inside <edge_cases>.
```

`{{CURRENT_HABIT}}`, `{{INPUT_SCHEMA}}` and `{{OUTPUT_SCHEMA}}` come from `prompts/meta/variables.md`; `{{CHALLENGE_BRIEF}}` is the second paragraph of `README.md` plus the cause labels; `{{COMPLIANCE_CLAUSE}}` is `prompts/meta/compliance_clause.md`; `{{FAILURE_REPORT}}` is the newest `evals/returns/results/v*.failures.md` (first 14,000 characters) followed by the previous prompt version with the instruction "improve it, keep what works".

`generate.py` calls `claude -p --model opus --disallowedTools '*' --max-turns 1`, extracts `<system_prompt>` and `<edge_cases>`, and writes `prompts/returns/vN.md` with the header and `prompts/returns/vN.edge_cases.md`. Release control: if the model did not copy the compliance clause verbatim, the script appends it rather than ship without it.

## The eval runner

`evals/run.py` sends each case's `sku, listing, returns, reviews, messages` to `claude -p --model $EVAL_MODEL --output-format json --system-prompt <vN body> --disallowedTools '*' --max-turns 1`, extracts the first complete JSON object (the v1 run found the model sometimes emitted two), and scores deterministic checks only:

| Check | How |
|---|---|
| `cause_ok` | `parsed.cause == expected.cause` |
| `grounded` | every `evidence` string is a non-empty exact substring of the JSON of the inputs |
| `low_data_ok` | cases with < 3 returns and expected `not_enough_data` must say so |
| `has_fix` | `fix.paste_ready` non-empty, or cause is `not_enough_data` |
| `hard_subset_accuracy` | `cause_ok` over ids ≥ `c41` |

The aggregate goes into `results/vN.json` (git-ignored, regenerated) and a human-readable `vN.failures.md` lists each failed case with its returns, size chart, photos note, expected `must_quote`, and what the model produced. The script exits 1 when the gate is not met, so it works as a CI step.

## What happened between v1 and v2

v1 (`fixes: initial`) scored 78.3% cause accuracy, 88.3% grounded, 83.3% low-data honesty. Its confusion matrix showed garment → size_chart 4 times and expectation → garment 3 times, plus one unparsed output. The failure report went into `generate.py`; v2 (`fixes: fixes from v1.failures.md`) added "Step 0, count first", made Rule 3 (expectation) outrank Rule 5 (garment), and made Rule 4 (size_chart) fire only when the chart itself is the broken thing. v2 scored 98.3% / 95% / 100%, 100% on the hard 20, and cut mean latency from 25.0 s to 15.1 s. Gate met on the second loop.

## Gates for the other modules

- **Prep**: `evals/prep/backtest.py` — pinball-loss improvement ≥ 15% over "same weekday last week", plus Node/Python parity. Result 30.35%.
- **Ads**: `evals/ads/run.py` — 100% agreement on `test_is_valid`, never a winner below the floor. Result 20/20.
- **Theft**: no model, so no gate; the four `NEVER_DO` lines are constants on every response.
- **Platform**: `node --test tests/` covers redaction, guard and retention.

## What code cannot score

Two agents exist for that: the **judge** scores each output 1–5 on specific / pasteable / fits the cause, and **persona-ben** reads only the output (never the prompt, never the raw returns) and says whether he'd use it tomorrow. Both were wired up and run for the first time as `evals/returns/judge.py` and `evals/returns/persona_ben.py`, against a 15-case stratified sample (spanning all 6 cause labels) drawn from v3's synthetic outputs (`evals/returns/results/v3_synth.json`).

**Judge calibration** (`judge.py`): for each of the 15 cases, a human-proxy score is computed deterministically from the case + v3's output *before* the judge model is called (rewarding grounded evidence, a matching cause, and a pasteable, non-empty fix) — this stands in for a person hand-scoring the case. A `claude -p --model sonnet` call running judge.md's rubric then scores the same output blind to the human-proxy score. Agreement is "within one point" averaged across the three sub-scores (specific/pasteable/fits).

Result: **13 of 15 agreed within one point** (86.7%), against the gate of ≥ 12/15 in judge.md — **passed**. The two disagreements were both cases where the judge model scored a mismatched or low-value fix lower than the human-proxy heuristic did (a garment defect the output framed as a fabric-expectation issue, and a `not_enough_data` fix whose "paste-ready" text was really an internal note, not buyer- or supplier-facing).

**Persona-Ben acceptance** (`persona_ben.py`): the same 15 outputs, shown to a `claude -p` role-play of Ben (persona-ben.md) with no prompt or raw-case context, each asked would-use-tomorrow yes/no plus a reason under 80 words.

Result: **13 of 15 yes (86.7%)**, against the STATUS.md gate of ≥ 70% — **passed**. Both no's were `not_enough_data` cases: Ben's objection was consistent — "log it yourself" isn't a fix he can paste anywhere, even when it's the honest answer.

Both gates are now measured and both passed; see `evals/returns/judge_calibration.json` and `evals/returns/persona_results.json` for the full per-case record, and [Agent-Team](Agent-Team.md) for how these two agents fit alongside the eval-runner and meta-prompter. See also [Roadmap](Roadmap.md).
