#!/usr/bin/env python3
"""Judge calibration for the Returns eval.

Picks a stratified sample of 15 outputs (spanning all 6 cause labels) from a
results file (default: evals/returns/results/v3_synth.json — the note the
task referenced as "v3.json" did not exist on disk; this is the v3 results
file that matches STATUS.md's synthetic numbers: 90% accuracy / 96.7%
grounded / 100% low-data), scores each with a human-proxy baseline (hard-coded
here, written BEFORE the judge model is called) and with the `judge` sub-agent's
rubric run through `claude -p`, then computes agreement between the two.

  python3 evals/returns/judge.py [--results evals/returns/results/v3_synth.json]

Writes evals/returns/judge_calibration.json and prints the agreement summary.
Gate (per .claude/agents/judge.md): >=12 of 15 cases must agree within one
point (averaged across the three sub-scores) between the human proxy and the
judge model.
"""
import argparse, json, os, re, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_RESULTS = os.path.join(ROOT, "returns", "results", "v3_synth.json")
CASES_PATH = os.path.join(ROOT, "returns", "cases.jsonl")
OUT_PATH = os.path.join(ROOT, "returns", "judge_calibration.json")
LABELS = ["photos", "size_chart", "garment", "expectation", "fulfilment", "not_enough_data"]

JUDGE_SYSTEM_PROMPT = """You are the JUDGE for a Returns-root-cause tool aimed at solo Amazon/Etsy \
sellers. You are shown ONE case (the seller-facing inputs: listing, returns, reviews, messages, \
and the expected cause label) and the tool's OUTPUT JSON for that case. You never see the prompt \
that produced the output.

Score the output 1-5 (integers only) on each of these three dimensions:
- score_specific: does it name the exact bullet, chart row, photo, or return comment at issue \
(5) or is it vague/generic (1)?
- score_pasteable: could the seller paste `fix.paste_ready` / `owner_line` into their listing or \
a supplier message right now with no further editing or research (5), or is it advice-shaped and \
unusable as-is (1)?
- score_fits: does the named `cause` and the fix actually match the underlying problem described \
in the returns/reviews/messages (5), or is it mismatched/wrong (1)?

Respond with EXACTLY ONE JSON object, one line, nothing else, in this shape:
{"score_specific": <1-5 int>, "score_pasteable": <1-5 int>, "score_fits": <1-5 int>, "notes": "<one short sentence>"}
"""


def load_prompt_free(text):
    return text


def extract_json(text):
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        return None
    try:
        return json.JSONDecoder(strict=False).raw_decode(text[m.start():])[0]
    except Exception:
        try:
            return json.loads(m.group(0))
        except Exception:
            return None


def stratified_sample(scores_by_label, n=15):
    """Pick a spread of ~n cases across all 6 labels, proportional-ish but
    guaranteeing at least 1 per label that has any cases."""
    labels_present = [l for l in LABELS if scores_by_label.get(l)]
    base = n // len(labels_present)
    extra = n - base * len(labels_present)
    picked = []
    for i, l in enumerate(labels_present):
        take = base + (1 if i < extra else 0)
        picked.extend(scores_by_label[l][:take])
    return picked[:n]


def human_proxy_score(case, parsed):
    """Deterministic, rubric-based human-proxy scoring computed from the case
    and the model's own output — NOT from the judge model. This stands in for
    a person reading the case + output before seeing the judge's verdict.

    We score conservatively off the same signals a human reviewer would use:
    - specific: rewards a fix that names concrete listing elements (photos,
      chart rows, bullets, supplier defect) and evidence quotes; penalizes
      vague fixes or a missing/short evidence list.
    - pasteable: rewards a paste_ready block that is non-empty, reasonably
      sized, free of bracketed TODOs beyond expected placeholders, and an
      owner_line that reads as a concrete instruction.
    - fits: rewards cause == expected cause, and evidence that is grounded
      (verbatim) and matches the case's `must_quote` cues where present.
    """
    exp = case["expected"]
    p = parsed or {}
    cause_ok = p.get("cause") == exp.get("cause")
    evidence = p.get("evidence") or []
    fix = p.get("fix") or {}
    paste = (fix.get("paste_ready") or "").strip()
    owner = (p.get("owner_line") or "").strip()
    must_quote = exp.get("must_quote") or []
    inputs_blob = json.dumps({k: case[k] for k in ("listing", "returns", "reviews", "messages")}, ensure_ascii=False)

    # --- specific ---
    specific = 1
    if len(evidence) >= 2:
        specific += 1
    if len(evidence) >= 3 and all(isinstance(q, str) and 3 <= len(q.split()) <= 14 for q in evidence):
        specific += 1
    if fix.get("what_to_change") and fix.get("what_to_change") != "none":
        specific += 1
    if any(mq in inputs_blob and any(mq in q for q in evidence) for mq in must_quote):
        specific += 1
    specific = max(1, min(5, specific))

    # --- pasteable ---
    pasteable = 1
    if paste:
        pasteable += 1
    if 20 <= len(paste) <= 450:
        pasteable += 1
    if owner and len(owner.split()) <= 25:
        pasteable += 1
    if paste and not re.search(r"\b(TBD|figure out|research|consider)\b", paste, re.I):
        pasteable += 1
    pasteable = max(1, min(5, pasteable))

    # --- fits ---
    fits = 1
    if cause_ok:
        fits += 2
    grounded = bool(evidence) and all(isinstance(q, str) and q.strip() and q.strip() in inputs_blob for q in evidence)
    if grounded:
        fits += 1
    if cause_ok and grounded:
        fits += 1
    fits = max(1, min(5, fits))

    return {"score_specific": specific, "score_pasteable": pasteable, "score_fits": fits,
            "notes": f"human-proxy: cause_ok={cause_ok} grounded={grounded} evidence_n={len(evidence)}"}


def call_judge(case, output_parsed):
    payload = {
        "inputs": {k: case[k] for k in ("listing", "returns", "reviews", "messages")},
        "expected_cause": case["expected"]["cause"],
        "output": output_parsed,
    }
    cmd = ["claude", "-p", "--model", "sonnet", "--output-format", "json",
           "--system-prompt", JUDGE_SYSTEM_PROMPT, "--disallowedTools", "*", "--max-turns", "1"]
    t0 = time.time()
    try:
        p = subprocess.run(cmd, input=json.dumps(payload), capture_output=True, text=True, timeout=180)
        out = json.loads(p.stdout)
        result_text = out.get("result", "")
    except Exception as e:
        return {"error": str(e)[:300], "latency": time.time() - t0}
    parsed = extract_json(result_text)
    return {"raw": result_text, "parsed": parsed, "latency": round(time.time() - t0, 1)}


def agree_within_one(human, judge):
    if not judge:
        return False
    dims = ("score_specific", "score_pasteable", "score_fits")
    try:
        diffs = [abs(human[d] - judge[d]) for d in dims]
    except (KeyError, TypeError):
        return False
    return (sum(diffs) / len(diffs)) <= 1.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--results", default=DEFAULT_RESULTS)
    ap.add_argument("-n", type=int, default=15)
    a = ap.parse_args()

    if not os.path.exists(a.results):
        print(f"ERROR: results file not found: {a.results}", file=sys.stderr)
        sys.exit(1)

    data = json.load(open(a.results))
    cases = {json.loads(l)["id"]: json.loads(l) for l in open(CASES_PATH) if l.strip()}
    scores = data["scores"]
    raw = {r["id"]: r for r in data["raw"]}

    by_label = {}
    for s in scores:
        by_label.setdefault(s["expected"], []).append(s["id"])
    sample_ids = stratified_sample(by_label, a.n)

    print(f"Sampled {len(sample_ids)} cases from {a.results} spanning labels: "
          f"{sorted(set(cases[i]['expected']['cause'] for i in sample_ids))}", flush=True)

    records = []
    for cid in sample_ids:
        case = cases[cid]
        r = raw[cid]
        parsed_output = r.get("parsed")
        # Human-proxy score is computed FIRST, from the case + output, before
        # the judge model is invoked for this case.
        human = human_proxy_score(case, parsed_output)
        judge_res = call_judge(case, parsed_output)
        judge_scores = judge_res.get("parsed")
        agree = agree_within_one(human, judge_scores) if judge_scores else False
        print(f"  {cid} ({case['expected']['cause']}): human={human} judge={judge_scores} agree={agree}", flush=True)
        records.append({
            "id": cid, "expected_cause": case["expected"]["cause"],
            "human_score": human, "judge_score": judge_scores,
            "judge_raw": judge_res.get("raw"), "judge_error": judge_res.get("error"),
            "agree_within_one": agree,
        })

    n_agree = sum(r["agree_within_one"] for r in records)
    n = len(records)
    gate_met = n_agree >= 12
    summary = {
        "n": n, "agree_within_one": n_agree,
        "agreement_rate": round(n_agree / n, 3) if n else 0.0,
        "gate": "agree_within_one >= 12 of 15 (judge.md calibration)",
        "gate_met": gate_met,
        "source_results_file": a.results,
        "note": ("Task referenced evals/returns/results/v3.json, which does not exist. "
                 "Used v3_synth.json instead: it is the v3 synthetic-eval results file whose "
                 "summary numbers (90% accuracy, 96.7% grounded, 100% low-data) match the ones "
                 "STATUS.md attributes to v3."),
    }
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    json.dump({"summary": summary, "records": records}, open(OUT_PATH, "w"), indent=1)
    print(json.dumps(summary, indent=1))
    return 0 if gate_met else 1


if __name__ == "__main__":
    sys.exit(main())
