#!/usr/bin/env python3
"""Persona-Ben acceptance test for the Returns eval.

Role-plays Ben (per .claude/agents/persona-ben.md: a solo apparel seller at
7am with one phone, returns above 20%, hates jargon/dashboards/anything he
can't paste today) against product OUTPUTS ONLY (never the prompt, never the
raw case inputs) via `claude -p`, and asks: would you use this tomorrow,
yes/no, and the one thing that would make you say no — under 80 words.

  python3 evals/returns/persona_ben.py [--results evals/returns/results/v3_synth.json] [--all]

By default runs the same 15 stratified-sample case ids that judge.py picks
(pass --all to run all cases in the results file). Writes
evals/returns/persona_results.json with a summary {n, yes_rate, sample_reasons}.
Gate (STATUS.md gate table): yes_rate >= 70%.
"""
import argparse, json, os, re, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_RESULTS = os.path.join(ROOT, "returns", "results", "v3_synth.json")
CASES_PATH = os.path.join(ROOT, "returns", "cases.jsonl")
OUT_PATH = os.path.join(ROOT, "returns", "persona_results.json")
LABELS = ["photos", "size_chart", "garment", "expectation", "fulfilment", "not_enough_data"]

PERSONA_SYSTEM_PROMPT = """You are Ben. You sell apparel on Amazon and Etsy, alone, returns above 20%. \
You are shown ONLY a product output (never the prompt, never the raw returns/reviews it came from). \
Answer in under 80 words: would you use this tomorrow, yes/no, and the one thing that would make \
you say no. You hate jargon, dashboards, and advice you cannot paste into your listing today.

Respond with EXACTLY ONE JSON object, one line, nothing else:
{"would_use_tomorrow": true|false, "answer": "<your under-80-word answer in Ben's voice>"}
"""


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
    labels_present = [l for l in LABELS if scores_by_label.get(l)]
    base = n // len(labels_present)
    extra = n - base * len(labels_present)
    picked = []
    for i, l in enumerate(labels_present):
        take = base + (1 if i < extra else 0)
        picked.extend(scores_by_label[l][:take])
    return picked[:n]


def call_ben(output_parsed):
    cmd = ["claude", "-p", "--model", "sonnet", "--output-format", "json",
           "--system-prompt", PERSONA_SYSTEM_PROMPT, "--disallowedTools", "*", "--max-turns", "1"]
    t0 = time.time()
    try:
        p = subprocess.run(cmd, input=json.dumps(output_parsed), capture_output=True, text=True, timeout=180)
        out = json.loads(p.stdout)
        result_text = out.get("result", "")
    except Exception as e:
        return {"error": str(e)[:300], "latency": time.time() - t0}
    parsed = extract_json(result_text)
    return {"raw": result_text, "parsed": parsed, "latency": round(time.time() - t0, 1)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--results", default=DEFAULT_RESULTS)
    ap.add_argument("--all", action="store_true", help="run all cases instead of the 15-case sample")
    ap.add_argument("-n", type=int, default=15)
    a = ap.parse_args()

    if not os.path.exists(a.results):
        print(f"ERROR: results file not found: {a.results}", file=sys.stderr)
        sys.exit(1)

    data = json.load(open(a.results))
    cases = {json.loads(l)["id"]: json.loads(l) for l in open(CASES_PATH) if l.strip()}
    scores = data["scores"]
    raw = {r["id"]: r for r in data["raw"]}

    if a.all:
        case_ids = [s["id"] for s in scores]
    else:
        by_label = {}
        for s in scores:
            by_label.setdefault(s["expected"], []).append(s["id"])
        case_ids = stratified_sample(by_label, a.n)

    print(f"Running persona-Ben on {len(case_ids)} cases from {a.results}", flush=True)

    records = []
    for cid in case_ids:
        r = raw.get(cid, {})
        output_parsed = r.get("parsed")
        if output_parsed is None:
            records.append({"id": cid, "error": "no parsed output to show Ben (model output failed to parse)"})
            continue
        res = call_ben(output_parsed)
        parsed = res.get("parsed")
        would_use = bool(parsed.get("would_use_tomorrow")) if parsed else None
        answer = (parsed.get("answer") if parsed else None) or res.get("error")
        print(f"  {cid}: would_use_tomorrow={would_use} :: {answer}", flush=True)
        records.append({
            "id": cid, "would_use_tomorrow": would_use, "answer": answer,
            "raw": res.get("raw"), "error": res.get("error"),
        })

    valid = [r for r in records if r.get("would_use_tomorrow") is not None]
    n_valid = len(valid)
    n_yes = sum(1 for r in valid if r["would_use_tomorrow"])
    yes_rate = round(n_yes / n_valid, 3) if n_valid else 0.0
    gate_met = yes_rate >= 0.70

    sample_reasons = [r["answer"] for r in records if r.get("answer")][:8]

    summary = {
        "n": len(records), "n_valid": n_valid, "n_yes": n_yes, "yes_rate": yes_rate,
        "gate": "yes_rate >= 0.70 (STATUS.md gate table)",
        "gate_met": gate_met,
        "source_results_file": a.results,
        "sample_reasons": sample_reasons,
    }
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    json.dump({"summary": summary, "records": records}, open(OUT_PATH, "w"), indent=1)
    print(json.dumps(summary, indent=1))
    return 0 if gate_met else 1


if __name__ == "__main__":
    sys.exit(main())
