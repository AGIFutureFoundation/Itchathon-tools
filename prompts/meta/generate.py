#!/usr/bin/env python3
"""Meta-prompter: fills master.md and asks Claude to write prompts/returns/vN.md.
  python3 prompts/meta/generate.py            # next version, uses newest failure report
"""
import glob, json, os, re, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P = lambda *a: os.path.join(ROOT, *a)
master = open(P("prompts/meta/master.md")).read()
vars_ = dict(re.findall(r"^(\w+): (.*)$", open(P("prompts/meta/variables.md")).read(), re.M))
brief = open(P("README.md")).read().split("\n\n")[1] + "\nCause labels: " + vars_["CAUSE_LABELS"]
existing = sorted([f for f in glob.glob(P("prompts/returns/v*.md")) if re.search(r"/v\d+\.md$", f)], key=lambda p: int(re.search(r"v(\d+)", p).group(1)))
n = len(existing) + 1
fails = sorted(glob.glob(P("evals/returns/results/v*.failures.md")), key=lambda p: int(re.search(r"v(\d+)", p).group(1)))
failure_report = open(fails[-1]).read()[:14000] if fails else "First version: no failures yet."
prev = ("\n\nPrevious prompt version (improve it, keep what works):\n" + open(existing[-1]).read()) if existing else ""
compliance = open(P("prompts/meta/compliance_clause.md")).read().strip()  # must appear verbatim in every generated prompt
filled = (master.replace("{{CHALLENGE_BRIEF}}", brief).replace("{{CURRENT_HABIT}}", vars_["CURRENT_HABIT"])
          .replace("{{INPUT_SCHEMA}}", vars_["INPUT_SCHEMA"]).replace("{{OUTPUT_SCHEMA}}", vars_["OUTPUT_SCHEMA"])
          .replace("{{COMPLIANCE_CLAUSE}}", "\n" + compliance + "\n")
          .replace("{{FAILURE_REPORT}}", failure_report + prev))
p = subprocess.run(["claude", "-p", "--model", "opus", "--output-format", "json", "--disallowedTools", "*", "--max-turns", "1", "--exclude-dynamic-system-prompt-sections", "--system-prompt", "You are an expert prompt engineer with no tools and no filesystem. Do not explore anything. Answer only with the <system_prompt> and <edge_cases> tags requested."],
                   input=filled, capture_output=True, text=True, timeout=600)
text = json.loads(p.stdout)["result"]
m = re.search(r"<system_prompt>(.*?)</system_prompt>", text, re.S)
if not m:
    sys.exit("no <system_prompt> in output:\n" + text[:2000])
edge = re.search(r"<edge_cases>(.*?)</edge_cases>", text, re.S)
fixes = "initial" if not fails else "fixes from " + os.path.basename(fails[-1])
body = m.group(1).strip()
if compliance not in body:  # release control: the clause is mandatory, so append it rather than ship without it
    print("warning: model did not copy the compliance clause verbatim; appending it", file=sys.stderr)
    body += "\n\n" + compliance
out = f"---\nversion: {n}\nbased_on: {n-1}\nfixes: {fixes}\nmodel_used: opus\ncompliance_clause: prompts/meta/compliance_clause.md\n---\n{body}\n"
open(P(f"prompts/returns/v{n}.md"), "w").write(out)
if edge:
    open(P(f"prompts/returns/v{n}.edge_cases.md"), "w").write(edge.group(1).strip())
print(f"wrote prompts/returns/v{n}.md ({len(out)} chars)")
