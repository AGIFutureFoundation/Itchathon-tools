# About this project and the team

*Powered by AGI Corp*

## AGI Future Foundation

AGI Future Foundation is a foundation building practical AI for small businesses: tools for the person who runs a shop, a kitchen or a marketplace listing alone, and who has under 60 seconds for any answer. Sapient.X is the foundation's entry to the ITCHATHON hackathon (27 September 2026). The repository is at https://github.com/AGIFutureFoundation/Itchathon-tools.

## Why these four challenges

The ITCHATHON brief describes four problems and, read together, they have the same shape. In each one the detection already exists and the missing piece is the step after it.

| Challenge | What already detects | What nobody does | Our module |
|---|---|---|---|
| 1. Returns | The marketplace shows the return rate and charges a fee above the category threshold | Tell the seller which one thing to change in the listing | Why Did It Come Back? |
| 2. Ads | The agency dashboard shows a "winner" | Say honestly whether 135/0 vs 122/2 means anything, and what to change instead | Ads Plain Read |
| 3. Theft | The camera or Veesion flags the aisle | Tell the one person on the floor what to do in the next ten seconds, without confrontation | Ten Seconds After |
| 4. Prep | The POS has every sale | Turn it into one prep number per item at 7am | Today's Prep |

We scored the returns challenge highest and built it first (v2 of its prompt passed the eval gate at 0:29 of the build). The other three were added under the same platform layer and the same eval discipline once the first loop had closed, because the brief's own conclusion is that the four are one product: detection is solved, the next step is not.

## Design principles

These come from the brief and are written into every module.

1. **Beat the habit, not the incumbent.** The competitor for the returns module is not a $1,650-a-month sizing tool; it is a seller reading returns one ASIN at a time and phoning buyers about sizes. The competitor for the prep module is "same weekday last week". Each eval baseline is the habit, and each module must beat it measurably (returns: 98.3% cause accuracy; prep: 30.4% lower pinball loss than the habit).
2. **Work at low volume.** One seller, one SKU, a handful of returns. The returns prompt says `not_enough_data` below three returns with no clear signal; the ads module refuses to call a winner when expected cell counts are under five; the prep model runs on eight same-weekday samples.
3. **Assume the owner is alone.** Every answer is one action, one paste-ready text, one sentence, readable on a phone. The theft playbook never assumes a second person unless the alert says there is one, and never asks the one person to leave the till.
4. **Detection is solved; the last step is not.** No module builds a detector. Each takes a signal the business already has and returns what to do next, plus a record of what happened.

## How the hackathon build ran

The build was one hour with 15-minute checkpoints, run as a Claude Code agent team rather than as hand-written code and prompts.

- **Meta-prompting.** `prompts/meta/master.md` is the only place a product prompt is designed. It is filled with the challenge brief, the habit to beat, the input and output contracts, the compliance clause and the failure report from the last eval run, and it writes `prompts/returns/vN.md`. Nobody edits a product prompt by hand.
- **Seven agents.** Lead (runs the loop, go/no-go), meta-prompter (the only agent allowed to write product prompts), builder (the app), data-synth (60 labelled cases, 20 of them deliberately hard), eval-runner (scores each version), judge (scores what code cannot), persona-ben (the owner who reads the output and says yes or no).
- **Eval gates.** A prompt version is a release and the eval score is its approval: cause accuracy ≥ 80%, evidence grounded ≥ 95%, low-data honesty ≥ 99%. v1 scored 78.3% and failed; its failure report produced v2, which scored 98.3% and passed. The server only ever loads the newest version, and a version is only committed when it beats the previous one.
- **Checkpoints.** 0:00 roadmap and challenge scoring; 0:14 prompt v1; 0:19 eval v1 (78.3%); 0:23 scope widened to all four challenges; 0:26 compliance layer (redaction, injection guard, retention); 0:29 eval v2 (98.3%, gate met).

## Get in touch

Open an issue on the GitHub repository: https://github.com/AGIFutureFoundation/Itchathon-tools/issues. Bug reports, new eval cases and pilot interest are all welcome there. See [CONTRIBUTING.md](CONTRIBUTING.md) for how changes are gated.
