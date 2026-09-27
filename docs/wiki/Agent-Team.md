# Agent team

The build was run by seven Claude Code subagents defined in `.claude/agents/*.md`. Each definition is a short frontmatter block (name, description, model, tools) and a few sentences of instruction. The point of the split is ownership: one agent writes prompts, one writes app code, one writes cases, one scores, and none of them can do another's job.

## The seven

| Agent | Model | Tools | Owns |
|---|---|---|---|
| **lead** | opus | Read, Write, Edit, Bash, Agent | Runs the meta-prompt → eval loop, decides go/no-go at each gate, writes STATUS.md |
| **meta-prompter** | opus | Read, Write, Bash | The only agent allowed to write product prompts (`prompts/returns/vN.md`) |
| **builder** | opus | Read, Write, Edit, Bash | `app/`: the demo, Node, no dependencies, loads the newest prompt at request time |
| **data-synth** | sonnet | Read, Write, Bash | `evals/returns/cases.jsonl`: labelled fixtures with a known cause and verbatim evidence |
| **eval-runner** | haiku | Read, Bash | Runs `evals/run.py`, reports the score table, never edits prompts or cases |
| **judge** | sonnet | Read, Write | Scores what code cannot: is the fix specific, pasteable, does it match the cause |
| **persona-ben** | sonnet | Read | Role-plays the owner; sees only the output; yes/no and one reason |

## Instructions, verbatim

**lead**
> Each loop: (1) run `python3 evals/run.py --prompt prompts/returns/vN.md`, (2) read `evals/returns/results/vN.json` failures, (3) hand the failure report to the meta-prompter to produce vN+1, (4) repeat until the gate (cause accuracy ≥ 0.80, grounded 1.0, low-data admission 1.0) is met. Never edit a product prompt by hand; only the meta-prompter writes prompts.

**meta-prompter**
> Fill the variables in prompts/meta/master.md (CHALLENGE_BRIEF from README.md, FAILURE_REPORT from the newest evals/returns/results/*.failures.md), run it, and write the <system_prompt> block to the next prompts/returns/vN.md with a header ... Never change the output contract keys.

**builder**
> Own app/. Keep the output contract in sync with prompts/returns/vN.md. Never embed a prompt in app code; always load the newest prompts/returns/v*.md at request time.

**data-synth**
> Distribution: photos 12, size_chart 12, garment 12, expectation 10, fulfilment 8, not_enough_data 6. Cases c41–c60 are hard: typos, mixed signals, reason codes that contradict comments. Always run the verification script before finishing.

**eval-runner**
> Run `python3 evals/run.py --prompt prompts/returns/vN.md`. Report the score table only; never edit prompts or cases.

**judge**
> For each output, score 1–5: specific (names the exact bullet/chart row/photo), pasteable (a seller can paste it today), fits the cause. ... Calibration: your scores must agree within one point on ≥12 of 15 hand-scored outputs before your scores gate a release.

**persona-ben**
> You are Ben. You sell apparel on Amazon and Etsy, alone, returns above 20%. You are shown ONLY a product output (never the prompt). Answer in under 80 words: would you use this tomorrow, yes/no, and the one thing that would make you say no. You hate jargon, dashboards, and advice you cannot paste into your listing today.

## Why the separation matters

- **Prompt authorship is a single point.** Because only the meta-prompter writes prompts, and it only writes them from the master meta-prompt plus a failure report, there is no path by which a prompt gets "tweaked" without a scored reason. `generate.py` is the code form of this rule.
- **The scorer cannot fix the thing it scores.** eval-runner has Read and Bash only, and is told to report the table and stop.
- **The judge and Ben never see the prompt.** They score outputs the way an owner would, so a prompt cannot game them by looking well-structured.
- **The builder cannot hardcode a prompt.** `app/server.js` reads `prompts/returns/v*.md` at request time; the only prompt text in code is a fallback for a missing directory.

## Model choices

Opus for the agents that write (lead, meta-prompter, builder); Sonnet for generating cases, judging and role-play; Haiku for the runner, which only needs to execute a script and read numbers. The product prompts themselves were written by Opus and evaluated on Sonnet (the model the server uses by default, `RETURNS_MODEL=sonnet`). The pitch page: "60 cases, Sonnet, prompts written by Opus from the master meta-prompt."

## How the hour went

From the build log on the pitch page: 0:04 repo, seven agent definitions and the master meta-prompt; 0:06 data-synth and builder spawned in parallel; 0:10 eval runner written; 0:13 demo app up; 0:14 prompt v1 written by the meta-prompter; 0:15 an Apify agent fetching real 1–3 star Amazon reviews; 0:19 eval v1 at 78.3%, parser bug fixed (the model emitted two objects), rescored; 0:23 scope widened to all four challenges with prep, ads and theft agents spawned; 0:26 a compliance agent added PII redaction, the injection guard, retention and `COMPLIANCE.md`; 0:29 eval v2 at 98.3%, gate met.

## Running judge and persona-ben

Both agents were referenced in their `.claude/agents/*.md` definitions but had no runnable harness until `evals/returns/judge.py` and `evals/returns/persona_ben.py` were added. Each takes a stratified 15-case sample (all 6 cause labels represented) from a results file, drives the corresponding sub-agent instructions through `claude -p --model sonnet --output-format json --disallowedTools "*" --max-turns 1`, and gates on the number cited in its own `.md` file:

| Agent | Script | What it does | Gate | Measured result |
|---|---|---|---|---|
| **judge** | `evals/returns/judge.py` | Computes a human-proxy 1–5 score (specific/pasteable/fits) from the case + output *before* calling the judge model, then compares to the judge model's blind score on the same output | agree within one point on ≥ 12/15 | **13/15 (86.7%)** — passed |
| **persona-ben** | `evals/returns/persona_ben.py` | Shows Ben only the output JSON (never the prompt or raw case), asks would-use-tomorrow yes/no + reason, under 80 words | yes on ≥ 70% | **13/15 = 86.7% yes** — passed |

Full per-case records: `evals/returns/judge_calibration.json`, `evals/returns/persona_results.json`. Both runs used `evals/returns/results/v3_synth.json` (the v3 synthetic-eval output set) as the source of outputs to score — see [Eval-Loop-and-Meta-Prompting](Eval-Loop-and-Meta-Prompting.md) for the full breakdown, including where the two disagreements and two no's came from.

## Adding an agent

Create `.claude/agents/<name>.md` with `name`, `description`, `model`, `tools` frontmatter and a paragraph of instructions that states what the agent owns and what it must never touch. Keep the tool list minimal: an agent that only needs to read should not have Write.
