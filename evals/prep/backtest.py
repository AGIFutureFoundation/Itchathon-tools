#!/usr/bin/env python3
"""Backtest for the Today's Prep forecast (app/modules/prep.js).

Generates 12 weeks of synthetic POS data for 6 items (weekday seasonality + noise
+ one event spike), holds out the last 2 weeks, and compares
  (a) naive: same weekday last week
  (b) model: same-weekday quantile over the last 8 weeks x clamped 2-week trend
using pinball loss at the run_out quantile (0.65) and at neutral (0.5).

The model math is re-implemented here in Python; `--verify-node` cross-checks a
forecasts against the real Node module to guard against drift (skip with --no-node).
Writes evals/prep/results.json.
"""
import json
import math
import os
import random
import subprocess
import sys
from datetime import date, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
PREP_JS = os.path.join(ROOT, "app", "modules", "prep.js")
RESULTS = os.path.join(HERE, "results.json")

WEEKS_BACK = 8
TREND_MIN, TREND_MAX = 0.8, 1.25
QUANTILE_BY_PREF = {"run_out": 0.65, "neutral": 0.5, "waste": 0.40}
GATE_PCT = 15.0

# ---------- same math as prep.js ----------

def quantile_sorted(s, q):
    if not s:
        return 0.0
    if len(s) == 1:
        return float(s[0])
    pos = (len(s) - 1) * q
    lo, hi = math.floor(pos), math.ceil(pos)
    return s[lo] + (s[hi] - s[lo]) * (pos - lo)


def js_round(x):
    # JS Math.round: half goes toward +inf (Python's round is banker's).
    return math.floor(x + 0.5)


def model_forecast(history, target, preference):
    """history: list of (date, sold) sorted; target: date; returns prep_qty (int)."""
    wd = target.weekday()  # Python: Mon=0; only equality matters
    same = [s for d, s in history if d.weekday() == wd and d < target][-WEEKS_BACK:]
    sample = sorted(same if same else [s for _, s in history])
    base = quantile_sorted(sample, QUANTILE_BY_PREF[preference])
    recent = [s for d, s in history if target - timedelta(days=14) <= d < target]
    prior = [s for d, s in history if target - timedelta(days=28) <= d < target - timedelta(days=14)]
    trend = 1.0
    if len(recent) >= 7 and len(prior) >= 7 and sum(prior) > 0:
        trend = min(TREND_MAX, max(TREND_MIN, (sum(recent) / len(recent)) / (sum(prior) / len(prior))))
    return max(0, js_round(base * trend))


def naive_forecast(history, target):
    by_date = dict(history)
    return by_date.get(target - timedelta(days=7))


# ---------- synthetic kitchen ----------

ITEMS = [
    # name, base, weekday multipliers Mon..Sun, noise sd (fraction), growth over 12 weeks
    ("Croissant",       48, [0.70, 0.75, 0.80, 0.90, 1.10, 1.55, 1.45], 0.18, 0.10),
    ("Sourdough loaf",  26, [0.80, 0.80, 0.85, 0.95, 1.20, 1.50, 1.30], 0.14, 0.05),
    ("Cinnamon roll",   32, [0.60, 0.65, 0.70, 0.85, 1.15, 1.70, 1.60], 0.22, 0.15),
    ("Quiche slice",    18, [0.90, 0.95, 1.00, 1.05, 1.15, 1.30, 1.20], 0.20, -0.06),
    ("Soup (portions)", 22, [1.10, 1.15, 1.15, 1.10, 1.00, 0.80, 0.90], 0.18, 0.00),
    ("Baguette",        40, [0.85, 0.90, 0.90, 1.00, 1.25, 1.40, 1.20], 0.12, 0.03),
]
DAYS = 12 * 7
HOLDOUT = 14


def generate(seed=7):
    rnd = random.Random(seed)
    end = date(2026, 9, 26)  # a Saturday; history is the 84 days ending here
    start = end - timedelta(days=DAYS - 1)
    event_day = start + timedelta(days=5 * 7 + 5)  # one Saturday in week 6: street fair
    data = {}
    for name, base, wdm, noise, growth in ITEMS:
        rows = []
        for i in range(DAYS):
            d = start + timedelta(days=i)
            t = i / (DAYS - 1)
            v = base * wdm[d.weekday()] * (1 + growth * t) * (1 + rnd.gauss(0, noise))
            if d == event_day:
                v *= 1.45
            rows.append((d, max(0, js_round(v))))
        data[name] = rows
    return data, start, end, event_day


# ---------- scoring ----------

def pinball(y, q, tau):
    return tau * (y - q) if y >= q else (1 - tau) * (q - y)


def run_backtest(data, end):
    holdout_start = end - timedelta(days=HOLDOUT - 1)
    per_item = {}
    totals = {"run_out": {"naive": [], "model": []}, "neutral": {"naive": [], "model": []}}
    for name, rows in data.items():
        per_item[name] = {}
        for pref, tau in (("run_out", 0.65), ("neutral", 0.5)):
            ln, lm = [], []
            for d, actual in rows:
                if d < holdout_start:
                    continue
                hist = [(dd, s) for dd, s in rows if dd < d]
                nv = naive_forecast(hist, d)
                mv = model_forecast(hist, d, pref)
                ln.append(pinball(actual, nv, tau))
                lm.append(pinball(actual, mv, tau))
            totals[pref]["naive"] += ln
            totals[pref]["model"] += lm
            per_item[name][pref] = {"naive": sum(ln) / len(ln), "model": sum(lm) / len(lm)}
    summary = {}
    for pref in totals:
        n = sum(totals[pref]["naive"]) / len(totals[pref]["naive"])
        m = sum(totals[pref]["model"]) / len(totals[pref]["model"])
        summary[pref] = {"tau": QUANTILE_BY_PREF[pref], "naive_pinball": n, "model_pinball": m,
                         "improvement_pct": (n - m) / n * 100 if n else 0.0}
    return per_item, summary


def verify_node(data, end):
    """Cross-check Python math against the Node module on the last holdout day."""
    if not os.path.exists(PREP_JS):
        return "skipped (prep.js not found)"
    target = end
    items = []
    expect = {}
    for name, rows in data.items():
        hist = [(d, s) for d, s in rows if d < target]
        items.append({"name": name, "history": [{"date": d.isoformat(), "sold": s} for d, s in hist]})
        expect[name] = {p: model_forecast(hist, target, p) for p in QUANTILE_BY_PREF}
    script = (
        "const p=require(process.argv[1]);const body=JSON.parse(require('fs').readFileSync(0,'utf8'));"
        "const out={};for(const pref of ['run_out','neutral','waste']){const r=p.forecast({...body,preference:pref});"
        "for(const it of r.items){(out[it.name]=out[it.name]||{})[pref]=it.prep_qty;}}"
        "process.stdout.write(JSON.stringify(out));"
    )
    try:
        res = subprocess.run(["node", "-e", script, PREP_JS], input=json.dumps({"items": items, "target_date": target.isoformat()}),
                             capture_output=True, text=True, timeout=30, check=True)
        got = json.loads(res.stdout)
    except Exception as e:  # noqa: BLE001
        return "skipped (%s)" % e
    mismatches = [(n, p, expect[n][p], got.get(n, {}).get(p)) for n in expect for p in expect[n] if expect[n][p] != got.get(n, {}).get(p)]
    if mismatches:
        return "MISMATCH " + "; ".join("%s/%s py=%s node=%s" % m for m in mismatches)
    return "ok (%d item x preference forecasts identical)" % (len(expect) * 3)


def main():
    data, start, end, event_day = generate()
    per_item, summary = run_backtest(data, end)

    print("Today's Prep backtest  |  %d items, %d days (%s to %s), event spike %s, holdout last %d days"
          % (len(data), DAYS, start, end, event_day, HOLDOUT))
    print()
    print("%-18s %-9s %10s %10s %8s" % ("item", "pref", "naive", "model", "gain"))
    for name in per_item:
        for pref in ("run_out", "neutral"):
            r = per_item[name][pref]
            gain = (r["naive"] - r["model"]) / r["naive"] * 100 if r["naive"] else 0
            print("%-18s %-9s %10.2f %10.2f %7.1f%%" % (name, pref, r["naive"], r["model"], gain))
    print("-" * 60)
    for pref in ("run_out", "neutral"):
        s = summary[pref]
        print("%-18s %-9s %10.2f %10.2f %7.1f%%   (tau=%.2f)" % ("ALL", pref, s["naive_pinball"], s["model_pinball"], s["improvement_pct"], s["tau"]))

    naive_all = (summary["run_out"]["naive_pinball"] + summary["neutral"]["naive_pinball"]) / 2
    model_all = (summary["run_out"]["model_pinball"] + summary["neutral"]["model_pinball"]) / 2
    improvement = (naive_all - model_all) / naive_all * 100 if naive_all else 0.0
    gate_met = improvement >= GATE_PCT

    node_check = "not run (--no-node)" if "--no-node" in sys.argv else verify_node(data, end)
    print()
    print("Node parity check: %s" % node_check)
    print("Overall pinball (mean of both quantiles): naive %.3f  model %.3f  improvement %.1f%%  gate(>=%.0f%%) %s"
          % (naive_all, model_all, improvement, GATE_PCT, "MET" if gate_met else "NOT MET"))

    out = {
        "naive_pinball": round(naive_all, 4),
        "model_pinball": round(model_all, 4),
        "improvement_pct": round(improvement, 2),
        "gate_met": bool(gate_met),
        "gate_threshold_pct": GATE_PCT,
        "by_quantile": {p: {k: (round(v, 4) if isinstance(v, float) else v) for k, v in summary[p].items()} for p in summary},
        "by_item": {n: {p: {k: round(v, 4) for k, v in per_item[n][p].items()} for p in per_item[n]} for n in per_item},
        "setup": {"items": len(data), "days": DAYS, "holdout_days": HOLDOUT, "start": start.isoformat(), "end": end.isoformat(),
                  "event_day": event_day.isoformat(), "seed": 7, "baseline": "same weekday last week",
                  "model": "same-weekday quantile over last 8 weeks x clamped(0.8..1.25) 2-week trend"},
        "node_parity": node_check,
    }
    with open(RESULTS, "w") as f:
        json.dump(out, f, indent=2)
    print("wrote %s" % os.path.relpath(RESULTS, ROOT))
    return 0 if gate_met else 1


if __name__ == "__main__":
    sys.exit(main())
