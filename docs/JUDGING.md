# Judging criteria — our own honest self-assessment

*Powered by AGI Corp*

The ITCHATHON brief gave three criteria. We scored ourselves against each one using only evidence that exists in this repo — [STATUS.md](../STATUS.md), the eval results, and the whitepaper's pricing hypothesis — and we did not give ourselves a 5 where the evidence doesn't support it. See [the 110-second judging video](../media/judging-demo.mp4) for the live walkthrough.

## 1. How well does the solution target the customer's pain? — **We score: 5**

> *"A problem the owner deals with every week, and the solution removes most of it."*

All four modules are weekly, not occasional, pains, each taken verbatim from the brief:

| Module | The weekly pain | What Sapient.X removes |
|---|---|---|
| Returns | A seller above 20% returns reads every one by hand and phones buyers before they order (`README.md`, the r/AmazonSeller quote in the brief) | Reads the listing + returns once, names one cause with verbatim evidence, hands back a paste-ready fix and a keep-size message — the actual weekly task, not a summary of it |
| Prep | A shift lead guesses prep from memory every single morning | One number per item, under a second, beating the habit (same-weekday-last-week) by **+30.4%** on pinball loss (`evals/prep/results.json`) |
| Ads | An owner pays an agency monthly and can't tell what it bought, or trusts a "winner" a small sample can't support | A plain-English read of the account plus a stats-honesty check that is right **20/20** on `test_is_valid` (`evals/ads/results.json`) |
| Theft | A shop loses $10–20 items regularly with no one knowing what to do in the moment | A rules-only, no-model script delivered in under a second, every time |

Why not lower: these are not edge-of-the-problem features. Returns root-cause replaces the actual manual read; Prep replaces the actual morning guess; the Ads stats check directly prevents the exact "135 vs 122" false-winner mistake named in the brief.

## 2. How easy is it to adopt? — **We score: 4**

> Target: *"Fits the tools they already use, sets up in minutes, and shows a result right away."*

What already meets the bar:
- **No new software to learn.** Every module takes a file or a paste the owner already has: the POS export (Prep), the same campaign export they'd otherwise send an agency (Ads), the listing text and returns (Returns), a camera/Veesion alert (Theft).
- **Results in seconds, not a setup wizard.** Prep returns a forecast in under a second (pure math, no model call). Returns and Ads return a result in 10–55 seconds live-tested (`STATUS.md`), not after a data-pipeline setup.
- **One command to run it**: `node app/server.js`, or `docker compose up`. Zero npm dependencies in the app itself.

Why not 5, honestly: this is a hackathon build, not a finished SaaS onboarding flow. There is no hosted sign-up page yet — an owner (or someone on their behalf) still has to run the server or a Docker container, and campaign/POS data currently has to be pasted or uploaded rather than pulled automatically via an OAuth connection to their ad account or POS. The ASIN-import path (`POST /api/import-asin`, via Apify) is the one module that already removes even the paste step, and is the direction the others should go next.

## 3. How costly is it, and what is the return on running it? — **We score: 4**

> Target: *"A clear price the owner would pay, with the savings in money or hours spelled out."*

The price is explicit, not vague (from `docs/WHITEPAPER.md`'s go-to-market table, clearly marked there as a hypothesis, not a claim):

| Module | Price hypothesis /mo | What it replaces | Named saving |
|---|---|---|---|
| Returns | $49 | Manual returns triage; sizing tools like True Fit/Bold Metrics at **~$1,650/mo** (brief) | Avoids Amazon's returns-processing fee (2.9–12.8% above threshold) and the "Frequently returned item" badge's 25–50% conversion hit (brief) |
| Ads | $39 | An agency retainer at **~$3,500/mo** (brief) | The live demo shows $640/month caught being burned on a zero-lead campaign — one month's Sapient.X price, paid for many times over by one caught mistake |
| Prep | $29 | Guesswork over/under-prep | +30.4% pinball-loss improvement is directly convertible to less waste and fewer stockouts, though we have not yet run a pilot to put a dollar figure on it |
| Theft | $29 | Nothing (the gap is currently unaddressed after detection) | Deterrence value on repeated $10–20 losses; not yet measured against a real shop's shrink numbers |

Why not 5: the pricing is a stated hypothesis, clearly labelled as such in the whitepaper, not a number validated against a paying pilot yet. Prep and Theft's savings are directionally real (backed by the eval numbers above) but not yet translated into a dollar figure from an actual business's books — that is exactly what the 90-day pilot in the roadmap is for.

## Overall

We are not claiming a perfect score. The honest gaps — a hosted onboarding flow, a real pilot's dollar ROI — are also the clearest, most credible next steps, and both are already named in [`STATUS.md`](../STATUS.md)'s roadmap and the whitepaper's next-steps section.
