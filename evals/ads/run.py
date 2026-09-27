#!/usr/bin/env python3
"""Stats-honesty eval for the Ads Plain Read module.

Runs every case in cases.jsonl through the SAME code the server uses
(app/modules/ads.js -> computeStats) by shelling to `node -e` once with all
cases on stdin. Starts no server, needs nothing beyond python3 stdlib + node.

Gate: 100% agreement on `test_is_valid` (and, where the case gives one, on
`verdict`). A "winner" must never be called when the test is not valid.
Writes results.json next to this file.
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
ADS_JS = os.path.join(ROOT, "app", "modules", "ads.js")
CASES = os.path.join(HERE, "cases.jsonl")
RESULTS = os.path.join(HERE, "results.json")

NODE_SCRIPT = r"""
const ads = require(process.argv[1]);
let buf = '';
process.stdin.on('data', d => buf += d);
process.stdin.on('end', () => {
  const cases = buf.split('\n').filter(Boolean).map(JSON.parse);
  const out = cases.map(c => {
    const r = ads.computeStats({ variants: c.variants, period_days: c.period_days });
    return { id: c.id, test_is_valid: r.test_is_valid, verdict: r.verdict, p_value: r.p_value,
             min_conversions_needed_per_variant: r.min_conversions_needed_per_variant };
  });
  process.stdout.write(JSON.stringify(out));
});
"""


def main():
    with open(CASES, encoding="utf-8") as fh:
        cases = [json.loads(line) for line in fh if line.strip()]

    proc = subprocess.run(
        ["node", "-e", NODE_SCRIPT, ADS_JS],
        input="\n".join(json.dumps(c) for c in cases),
        capture_output=True, text=True, check=False,
    )
    if proc.returncode != 0:
        print("node failed:", proc.stderr, file=sys.stderr)
        sys.exit(2)
    got = {r["id"]: r for r in json.loads(proc.stdout)}

    rows, agree = [], 0
    for c in cases:
        r = got[c["id"]]
        exp = c["expected"]
        ok_valid = r["test_is_valid"] == exp["test_is_valid"]
        ok_verdict = ("verdict" not in exp) or (r["verdict"] == exp["verdict"])
        # hard rule: never a winner below the floor
        honest = not (r["verdict"].startswith("winner") and not r["test_is_valid"])
        ok = ok_valid and ok_verdict and honest
        agree += ok
        rows.append((c["id"], exp["test_is_valid"], r["test_is_valid"], exp.get("verdict", "-"), r["verdict"],
                     "-" if r["p_value"] is None else f"{r['p_value']:.4f}", "PASS" if ok else "FAIL", c.get("note", "")))

    hdr = ("id", "exp_valid", "got_valid", "exp_verdict", "got_verdict", "p", "result", "note")
    widths = [max(len(str(x[i])) for x in rows + [hdr]) for i in range(len(hdr))]
    fmt = "  ".join("{:<%d}" % w for w in widths)
    print(fmt.format(*hdr))
    print("  ".join("-" * w for w in widths))
    for row in rows:
        print(fmt.format(*[str(x) for x in row]))

    n = len(cases)
    rate = agree / n if n else 0.0
    result = {"n": n, "stats_honesty_rate": rate, "gate_met": rate == 1.0,
              "failures": [r[0] for r in rows if r[6] == "FAIL"]}
    with open(RESULTS, "w", encoding="utf-8") as fh:
        json.dump(result, fh, indent=2)
    print()
    print(f"n={n}  stats_honesty_rate={rate:.3f}  gate_met={result['gate_met']}  -> {RESULTS}")
    sys.exit(0 if result["gate_met"] else 1)


if __name__ == "__main__":
    main()
