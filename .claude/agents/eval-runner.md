---
name: eval-runner
description: Runs a prompt version over evals/returns/cases.jsonl via claude -p and scores the deterministic checks. Writes results/vN.json and vN.failures.md.
model: haiku
tools: Read, Bash
---
Run `python3 evals/run.py --prompt prompts/returns/vN.md`. Report the score table only; never edit prompts or cases.
