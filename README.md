# Why Did It Come Back? — ITCHATHON Challenge 1 (Returns root-cause)

Seller pastes a listing + size chart + returns + reviews. Output per SKU:
one cause (photos | size_chart | garment | expectation | fulfilment),
verbatim evidence, and a ready-to-paste fix. Built with a meta-prompt → agent team → eval-gate loop.

- `prompts/meta/master.md` — the meta-prompt that writes every product prompt version
- `prompts/returns/vN.md` — generated system prompts, scored in the header
- `evals/returns/cases.jsonl` — 60 golden cases with known cause
- `evals/run.py` — runs a prompt version over the cases via `claude -p`, scores it
- `app/` — the demo (Node, no deps): `node app/server.js` → http://localhost:3141
- `.claude/agents/` — the 7-agent team
