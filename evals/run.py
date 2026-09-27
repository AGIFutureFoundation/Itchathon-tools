#!/usr/bin/env python3
"""Run a prompt version over the golden cases via `claude -p` and score it.

  python3 evals/run.py --prompt prompts/returns/v1.md [--limit N] [--workers 6]

Writes evals/returns/results/vN.json and vN.failures.md (the failure report the
meta-prompter consumes). Deterministic checks only; the judge scores the rest.
"""
import argparse, json, os, re, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CASES = os.path.join(ROOT, "evals", "returns", "cases.jsonl")
RESULTS = os.path.join(ROOT, "evals", "returns", "results")
LABELS = {"photos", "size_chart", "garment", "expectation", "fulfilment", "not_enough_data"}
MODEL = os.environ.get("EVAL_MODEL", "sonnet")


def load_prompt(path):
    text = open(path).read()
    if text.startswith("---"):
        end = text.find("\n---", 3)
        if end != -1:
            text = text[end + 4:]
    return text.strip()


def extract_json(text):
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        return None
    try:  # first complete object only (models sometimes emit a second one)
        return json.JSONDecoder(strict=False).raw_decode(text[m.start():])[0]
    except Exception:
        pass
    for cand in (m.group(0), text):
        try:
            return json.loads(cand)
        except Exception:
            pass
    # try trimming trailing prose after the last brace
    try:
        return json.loads(text[m.start(): text.rfind("}") + 1])
    except Exception:
        return None


def call(system_prompt, case):
    inputs = {k: case[k] for k in ("sku", "listing", "returns", "reviews", "messages")}
    cmd = ["claude", "-p", "--model", MODEL, "--output-format", "json",
           "--system-prompt", system_prompt, "--disallowedTools", "*",
           "--exclude-dynamic-system-prompt-sections", "--max-turns", "1"]
    t0 = time.time()
    try:
        p = subprocess.run(cmd, input=json.dumps(inputs), capture_output=True, text=True, timeout=240)
        out = json.loads(p.stdout)
        result_text = out.get("result", "")
    except Exception as e:  # timeout / bad json
        return {"id": case["id"], "error": str(e)[:200], "latency": time.time() - t0}
    parsed = extract_json(result_text)
    return {"id": case["id"], "raw": result_text, "parsed": parsed, "latency": round(time.time() - t0, 1)}


def score(case, r):
    exp = case["expected"]
    inputs_blob = json.dumps({k: case[k] for k in ("listing", "returns", "reviews", "messages")}, ensure_ascii=False)
    p = r.get("parsed") or {}
    s = {"id": case["id"], "expected": exp["cause"], "got": p.get("cause"),
         "parsed": r.get("parsed") is not None,
         "cause_ok": p.get("cause") == exp["cause"],
         "valid_label": p.get("cause") in LABELS}
    ev = p.get("evidence") or []
    s["evidence_n"] = len(ev)
    s["grounded"] = bool(ev) and all(isinstance(q, str) and q.strip() and q.strip() in inputs_blob for q in ev)
    # low-data honesty: <3 returns and no signal must be admitted
    low = len(case["returns"]) < 3 and exp["cause"] == "not_enough_data"
    s["low_data_case"] = low
    s["low_data_ok"] = (p.get("cause") == "not_enough_data") if low else True
    fix = p.get("fix") or {}
    s["has_fix"] = bool(fix.get("paste_ready")) or p.get("cause") == "not_enough_data"
    s["has_owner_line"] = bool(p.get("owner_line"))
    s["latency"] = r.get("latency")
    return s


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--prompt", required=True)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--workers", type=int, default=6)
    ap.add_argument("--rescore", action="store_true", help="re-score the saved raw outputs of this version")
    a = ap.parse_args()
    version = os.path.splitext(os.path.basename(a.prompt))[0]
    system_prompt = load_prompt(a.prompt)
    cases = [json.loads(l) for l in open(CASES) if l.strip()]
    if a.limit:
        cases = cases[: a.limit]
    print(f"{version}: {len(cases)} cases, model {MODEL}, {a.workers} workers", flush=True)
    if a.rescore:
        raws = json.load(open(os.path.join(RESULTS, f"{version}.json")))["raw"]
        for r in raws:
            if "raw" in r:
                r["parsed"] = extract_json(r["raw"])
    else:
        with ThreadPoolExecutor(a.workers) as ex:
            raws = list(ex.map(lambda c: call(system_prompt, c), cases))
    scores = [score(c, r) for c, r in zip(cases, raws)]
    n = len(scores)
    agg = {
        "version": version, "model": MODEL, "n": n,
        "cause_accuracy": round(sum(s["cause_ok"] for s in scores) / n, 3),
        "parsed_rate": round(sum(s["parsed"] for s in scores) / n, 3),
        "grounded_rate": round(sum(s["grounded"] for s in scores) / n, 3),
        "low_data_ok_rate": round(sum(s["low_data_ok"] for s in scores if s["low_data_case"]) / max(1, sum(s["low_data_case"] for s in scores)), 3),
        "fix_rate": round(sum(s["has_fix"] for s in scores) / n, 3),
        "owner_line_rate": round(sum(s["has_owner_line"] for s in scores) / n, 3),
        "mean_latency_s": round(sum((s["latency"] or 0) for s in scores) / n, 1),
        "hard_subset_accuracy": round(sum(s["cause_ok"] for s in scores if s["id"] >= "c41") / max(1, sum(1 for s in scores if s["id"] >= "c41")), 3),
    }
    agg["gate_met"] = agg["cause_accuracy"] >= 0.80 and agg["grounded_rate"] >= 0.95 and agg["low_data_ok_rate"] >= 0.99
    # confusion
    conf = {}
    for s in scores:
        conf.setdefault(s["expected"], {}).setdefault(str(s["got"]), 0)
        conf[s["expected"]][str(s["got"])] += 1
    agg["confusion"] = conf
    os.makedirs(RESULTS, exist_ok=True)
    json.dump({"summary": agg, "scores": scores, "raw": raws}, open(os.path.join(RESULTS, f"{version}.json"), "w"), indent=1)
    # failure report for the meta-prompter
    lines = [f"# Failure report for {version}", "", f"Summary: {json.dumps({k: v for k, v in agg.items() if k != 'confusion'})}", "",
             "## Confusion (expected -> got: count)", json.dumps(conf, indent=1), "", "## Failed cases"]
    for c, s, r in zip(cases, scores, raws):
        if s["cause_ok"] and s["grounded"] and s["low_data_ok"] and s["parsed"]:
            continue
        why = []
        if not s["parsed"]: why.append("no JSON parsed")
        if not s["cause_ok"]: why.append(f"cause expected {s['expected']} got {s['got']}")
        if not s["grounded"]: why.append("evidence not verbatim in inputs")
        if not s["low_data_ok"]: why.append("did not admit not_enough_data")
        p = r.get("parsed") or {}
        lines += [f"### {c['id']} ({c['category']}) — {'; '.join(why)}",
                  f"- returns: {json.dumps(c['returns'])[:600]}",
                  f"- size_chart: {json.dumps(c['listing'].get('size_chart'))[:300]}",
                  f"- photos_note: {c['listing'].get('photos_note','')[:200]}",
                  f"- expected must_quote: {c['expected']['must_quote']}",
                  f"- model evidence: {json.dumps(p.get('evidence'))[:400]}",
                  f"- model owner_line: {p.get('owner_line')}", ""]
    open(os.path.join(RESULTS, f"{version}.failures.md"), "w").write("\n".join(lines))
    print(json.dumps({k: v for k, v in agg.items() if k != "confusion"}, indent=1))
    print("confusion:", json.dumps(conf))
    return 0 if agg["gate_met"] else 1


if __name__ == "__main__":
    sys.exit(main())
