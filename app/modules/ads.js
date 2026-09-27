'use strict';
// Ads Plain Read module (ITCHATHON Challenge 2).
// CommonJS. exports.register(add) where add(method, path, handler) and handler(body) => Promise<object>.
// Node built-ins only. The stats maths is pure and exported for tests/evals.

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const MODEL = process.env.ADS_MODEL || 'sonnet';
const TIMEOUT_MS = 90_000;
const PROMPT_FILE = path.join(__dirname, '..', '..', 'prompts', 'ads', 'v1.md');

// ---------------------------------------------------------------------------
// Statistics (deterministic, no dependencies)
// ---------------------------------------------------------------------------

const ALPHA = 0.05;             // two-sided significance floor
const MIN_EXPECTED = 5;         // classic rule for the normal approximation
const PMAX_FLOOR = 30;          // conversions/month below which PMax goes erratic
const CAP_CONVERSIONS = 5000;   // above this we stop quoting a number

// Standard normal CDF via erfc (Abramowitz & Stegun 7.1.26, |err| < 1.5e-7). Deterministic.
function erfc(x) {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
    t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 +
    t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
}
function normCdf(z) { return 0.5 * erfc(-z / Math.SQRT2); }
function twoSidedP(z) { return Math.min(1, 2 * (1 - normCdf(Math.abs(z)))); }
const Z_ALPHA = 1.959963984540054; // two-sided 0.05
const Z_BETA = 0.8416212335729143;  // 80% power

// log(n!) with a cached table (sums of logs; exact enough for p-values).
const LOGFACT = [0];
function logFact(n) {
  for (let i = LOGFACT.length; i <= n; i++) LOGFACT.push(LOGFACT[i - 1] + Math.log(i));
  return LOGFACT[n];
}
function logChoose(n, k) { return logFact(n) - logFact(k) - logFact(n - k); }

// Fisher exact test, two-sided (sum of tables at least as extreme as the observed one).
function fisherTwoSided(a, n1, c, n2) {
  const K = a + c, N = n1 + n2;
  if (N > 200000) return null; // keep it cheap; the z-test carries the decision anyway
  const lp = k => logChoose(n1, k) + logChoose(n2, K - k) - logChoose(N, K);
  const obs = lp(a);
  let p = 0;
  const lo = Math.max(0, K - n2), hi = Math.min(K, n1);
  for (let k = lo; k <= hi; k++) {
    const v = lp(k);
    if (v <= obs + 1e-9) p += Math.exp(v);
  }
  return Math.min(1, p);
}

function toNum(v) {
  if (v === undefined || v === null || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function cleanVariants(variants) {
  if (!Array.isArray(variants)) return [];
  return variants.map((v, i) => ({
    name: String((v && v.name) || `Variant ${String.fromCharCode(65 + i)}`),
    impressions: toNum(v && v.impressions),
    conversions: toNum(v && v.conversions),
    spend: v && v.spend !== undefined ? toNum(v.spend) : undefined,
  }));
}

// Sample size per variant (impressions) for 80% power, two-sided alpha .05, to detect a 30% relative lift.
function impressionsForLift(p1) {
  const p2 = Math.min(0.999, p1 * 1.3);
  const pbar = (p1 + p2) / 2;
  const num = Z_ALPHA * Math.sqrt(2 * pbar * (1 - pbar)) + Z_BETA * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
  return Math.ceil((num * num) / ((p2 - p1) * (p2 - p1)));
}

/**
 * Core stats. Returns the response body for POST /api/ads/stats.
 * Method: two-proportion pooled z-test WITH Yates continuity correction, p from the normal
 * approximation. Fisher's exact (two-sided) is reported alongside as p_value_fisher.
 * A test is only "valid" when (a) two or more variants have impressions, (b) the input is sane,
 * (c) every expected cell count (n_i * p_pooled, n_i * (1 - p_pooled)) is >= 5.
 * Winner is declared ONLY when valid AND p_value < 0.05. Never below the floor.
 */
function computeStats(body) {
  const input = body || {};
  const all = cleanVariants(input.variants);
  const periodDays = toNum(input.period_days) > 0 ? toNum(input.period_days) : 30;
  const problems = [];

  for (const v of all) {
    if (!Number.isFinite(v.impressions) || !Number.isFinite(v.conversions)) problems.push(`${v.name}: impressions/conversions are not numbers`);
    else if (v.impressions < 0 || v.conversions < 0) problems.push(`${v.name}: negative counts`);
    else if (v.conversions > v.impressions) problems.push(`${v.name}: more conversions than impressions`);
  }
  const usable = problems.length ? [] : all.filter(v => v.impressions > 0);
  const totalConv = all.reduce((s, v) => s + (Number.isFinite(v.conversions) && v.conversions > 0 ? v.conversions : 0), 0);
  const monthlyConv = totalConv * (30 / periodDays);

  const base = {
    method: 'two-proportion pooled z-test with Yates continuity correction (normal approximation); Fisher exact two-sided reported as p_value_fisher',
    variants_compared: [],
    test_is_valid: false,
    p_value: null,
    p_value_fisher: null,
    z: null,
    rates: {},
    min_conversions_needed_per_variant: null,
    min_conversions_message: '',
    verdict: 'no winner yet',
    plain_read: '',
    pmax_ready: monthlyConv >= PMAX_FLOOR,
    monthly_conversions: Math.round(monthlyConv * 10) / 10,
    reasons: [],
  };

  if (problems.length) {
    base.reasons = problems;
    base.plain_read = 'The numbers do not add up (' + problems[0] + '), so nothing can be concluded yet.';
    return base;
  }
  if (usable.length < 2) {
    base.reasons.push(usable.length === 0 ? 'no variant has any impressions' : 'only one variant has impressions');
    base.plain_read = usable.length === 0
      ? 'Nothing has been shown to anyone yet, so there is nothing to compare.'
      : 'Only one variant has been shown, so there is nothing to compare it against yet.';
    return base;
  }

  // Top two by conversions, then by impressions, then input order (stable).
  const ranked = usable.map((v, i) => ({ ...v, i })).sort((a, b) =>
    (b.conversions - a.conversions) || (b.impressions - a.impressions) || (a.i - b.i));
  const A = ranked[0], B = ranked[1];
  base.variants_compared = [A.name, B.name];

  const n1 = A.impressions, x1 = A.conversions, n2 = B.impressions, x2 = B.conversions;
  const p1 = x1 / n1, p2 = x2 / n2;
  const pooled = (x1 + x2) / (n1 + n2);
  base.rates = { [A.name]: round(p1, 6), [B.name]: round(p2, 6), pooled: round(pooled, 6) };

  // Expected cell counts under the null.
  const expected = [n1 * pooled, n1 * (1 - pooled), n2 * pooled, n2 * (1 - pooled)];
  const minExpected = Math.min(...expected);
  const enough = minExpected >= MIN_EXPECTED;
  if (!enough) {
    base.reasons.push(`smallest expected cell count is ${round(minExpected, 2)} (needs >= ${MIN_EXPECTED}); the normal approximation does not hold`);
  }

  // z with continuity correction
  let z = 0, p = 1;
  if (pooled > 0 && pooled < 1) {
    const se = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2));
    const cc = 0.5 * (1 / n1 + 1 / n2);
    const diff = Math.max(0, Math.abs(p1 - p2) - cc);
    z = diff / se;
    p = twoSidedP(z);
  }
  base.z = round(z, 4);
  base.p_value = round(p, 6);
  base.p_value_fisher = (() => { const f = fisherTwoSided(x1, n1, x2, n2); return f === null ? null : round(f, 6); })();

  // Sample size for a 30% relative lift at the observed baseline (the lower rate, else pooled, else 1%).
  let baseline = Math.min(p1, p2);
  let baselineNote = 'observed lower rate';
  if (baseline <= 0) { baseline = pooled; baselineNote = 'observed pooled rate'; }
  if (baseline <= 0) { baseline = 0.01; baselineNote = 'assumed 1% because nothing has converted yet'; }
  if (baseline >= 0.999) baseline = 0.99;
  const nImp = impressionsForLift(baseline);
  const needConv = Math.ceil(nImp * baseline);
  base.min_conversions_needed_per_variant = needConv;
  base.min_impressions_needed_per_variant = nImp;
  base.min_conversions_message = needConv > CAP_CONVERSIONS
    ? 'more than you can buy this quarter'
    : `about ${needConv} conversions per variant (roughly ${nImp.toLocaleString('en-US')} impressions each at the ${baselineNote}) to see a 30% lift 80% of the time`;

  base.test_is_valid = enough;
  const winner = enough && p < ALPHA;
  if (winner) {
    const best = p1 >= p2 ? A : B;
    base.verdict = `winner: ${best.name}`;
    base.plain_read = `${best.name} converts at ${pct(best === A ? p1 : p2)} versus ${pct(best === A ? p2 : p1)}, and with this much data that gap would appear by chance only ${pct(p)} of the time, so it is a real winner.`;
  } else if (enough) {
    base.plain_read = `${A.name} (${x1} of ${n1}) and ${B.name} (${x2} of ${n2}) are too close to call: a gap this size shows up by chance ${pct(p)} of the time, so keep running until you have ${base.min_conversions_message}.`;
  } else if (pooled > 0.5) {
    base.plain_read = `Nearly everything converts (${x1 + x2} of ${n1 + n2}), so with this few impressions the test cannot tell the two apart; any tool saying "winner" here is guessing.`;
  } else {
    base.plain_read = `${x1 + x2} conversions across ${n1 + n2} impressions is far too little to call anything: you need ${base.min_conversions_message}, so any tool saying "winner" here is guessing.`;
  }
  return base;
}

function round(x, d) { const m = 10 ** d; return Math.round(x * m) / m; }
function pct(x) {
  if (x < 0.0001) return '<0.01%';
  return (x * 100).toFixed(x < 0.01 ? 2 : 1) + '%';
}

// ---------------------------------------------------------------------------
// Plain read of accounts (LLM with enforced contract + templated fallback)
// ---------------------------------------------------------------------------

function loadPrompt() {
  let text = fs.readFileSync(PROMPT_FILE, 'utf8');
  if (text.startsWith('---')) {
    const lines = text.split('\n');
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') { text = lines.slice(i + 1).join('\n').trimStart(); break; }
    }
  }
  return text;
}

function runClaude(systemPrompt, userMessage) {
  return new Promise((resolve, reject) => {
    const args = ['-p', '--model', MODEL, '--output-format', 'json', '--disallowedTools', '*', '--max-turns', '1', '--system-prompt', systemPrompt];
    const env = { ...process.env };
    delete env.CLAUDECODE;
    delete env.CLAUDE_CODE_ENTRYPOINT;
    let child;
    try { child = spawn('claude', args, { env, stdio: ['pipe', 'pipe', 'pipe'] }); }
    catch (e) { return reject(e); }
    let out = '', err = '', done = false;
    const timer = setTimeout(() => {
      if (done) return; done = true; child.kill('SIGKILL');
      reject(new Error('claude CLI timed out after 90s'));
    }, TIMEOUT_MS);
    child.stdout.on('data', d => out += d);
    child.stderr.on('data', d => err += d);
    child.on('error', e => { if (!done) { done = true; clearTimeout(timer); reject(e); } });
    child.on('close', code => {
      if (done) return; done = true; clearTimeout(timer);
      if (code !== 0 && !out.trim()) return reject(new Error(`claude exited ${code}: ${err.slice(0, 500)}`));
      resolve(out);
    });
    child.stdin.end(userMessage);
  });
}

function extractFirstJson(text) {
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') { if (--depth === 0) { try { return JSON.parse(text.slice(start, i + 1)); } catch { return null; } } }
  }
  return null;
}

function cleanCampaigns(campaigns) {
  if (!Array.isArray(campaigns)) return [];
  return campaigns.map((c, i) => {
    const days = toNum(c.period_days) > 0 ? toNum(c.period_days) : 30;
    const spend = toNum(c.spend) || 0, imp = toNum(c.impressions) || 0, clicks = toNum(c.clicks) || 0, conv = toNum(c.conversions) || 0;
    const mult = 30 / days;
    return {
      name: String(c.name || `Campaign ${i + 1}`),
      type: String(c.type || 'unknown').toLowerCase(),
      spend, impressions: imp, clicks, conversions: conv,
      conv_value: c.conv_value !== undefined ? toNum(c.conv_value) : undefined,
      period_days: days,
      monthly_spend: round(spend * mult, 2),
      monthly_conversions: round(conv * mult, 1),
      cost_per_conversion: conv > 0 ? round(spend / conv, 2) : null,
      click_rate: imp > 0 ? round(clicks / imp, 4) : null,
      conversion_rate: clicks > 0 ? round(conv / clicks, 4) : null,
    };
  });
}

// Deterministic observations the model must respect (and the fallback is built from).
function derive(camps, goal, monthlyBudget) {
  const flags = [];
  const totalSpend = camps.reduce((s, c) => s + c.spend, 0);
  const totalConv = camps.reduce((s, c) => s + c.conversions, 0);
  const totalMonthlyConv = camps.reduce((s, c) => s + c.monthly_conversions, 0);
  // Brand campaigns are cheap but capped: people already searching your name. They cannot absorb more money,
  // so they are never the "workhorse" that extra budget should flow to.
  const isBrand = c => /brand/i.test(c.name) || /brand/.test(c.type);
  const withConv = camps.filter(c => c.conversions > 0 && !isBrand(c)).sort((a, b) => a.cost_per_conversion - b.cost_per_conversion);
  const best = withConv[0] || camps.filter(c => c.conversions > 0).sort((a, b) => a.cost_per_conversion - b.cost_per_conversion)[0] || null;
  for (const c of camps) {
    if (isBrand(c) && c.conversions > 0) {
      flags.push({ campaign: c.name, flag: 'brand', detail: `${c.name} is people already searching for your name: cheap (${money(c.cost_per_conversion)} per result) but it cannot grow by adding budget.` });
      continue;
    }
    const share = totalSpend > 0 ? c.spend / totalSpend : 0;
    if (/pmax|performance/.test(c.type) && c.monthly_conversions < PMAX_FLOOR) {
      flags.push({ campaign: c.name, flag: 'pmax_underfed', detail: `Performance Max has ${c.monthly_conversions} conversions a month; below ${PMAX_FLOOR} it cannot learn and will spend erratically.` });
    }
    if (c.spend > 0 && c.conversions === 0 && share >= 0.10) {
      flags.push({ campaign: c.name, flag: 'burning', detail: `${c.name} spent ${money(c.spend)} (${pct(share)} of the total) for zero ${goal}.` });
    } else if (best && c !== best && c.cost_per_conversion !== null && c.cost_per_conversion > 3 * best.cost_per_conversion && share >= 0.10) {
      flags.push({ campaign: c.name, flag: 'expensive', detail: `${c.name} pays ${money(c.cost_per_conversion)} per result versus ${money(best.cost_per_conversion)} in ${best.name}.` });
    }
    if (/display|awareness|video|reach/.test(c.type) && ['leads', 'sales', 'calls'].includes(goal) && c.conversions <= 1 && c.spend > 0) {
      if (!flags.some(f => f.campaign === c.name)) flags.push({ campaign: c.name, flag: 'wrong_tool', detail: `${c.name} is a ${c.type} campaign; it buys eyeballs, not ${goal}, and has ${c.conversions} to show for ${money(c.spend)}.` });
    }
  }
  if (best) flags.push({ campaign: best.name, flag: 'workhorse', detail: `${best.name} produced ${best.conversions} of ${totalConv} ${goal} at ${money(best.cost_per_conversion)} each; it is doing the real work.` });
  return { total_spend: round(totalSpend, 2), total_conversions: totalConv, total_monthly_conversions: round(totalMonthlyConv, 1), monthly_budget: monthlyBudget, best_campaign: best ? best.name : null, flags };
}

function money(x) { return '$' + Number(x).toLocaleString('en-US', { maximumFractionDigits: 0 }); }

function fallbackRead(camps, derived, stats, goal) {
  const change_next = [];
  const order = { burning: 0, wrong_tool: 1, expensive: 2 };
  const burning = derived.flags.filter(f => f.flag in order).sort((a, b) => order[a.flag] - order[b.flag]);
  const under = derived.flags.find(f => f.flag === 'pmax_underfed');
  const best = camps.find(c => c.name === derived.best_campaign);
  const handled = new Set();
  for (const f of burning.slice(0, 2)) {
    const c = camps.find(x => x.name === f.campaign);
    handled.add(c.name);
    if (f.flag === 'expensive') {
      const half = Math.round(c.monthly_spend / 2);
      change_next.push({
        action: best ? `Cut ${c.name} to half its budget and move ${money(half)} a month to ${best.name}.` : `Cut ${c.name} to half its budget.`,
        why: f.detail,
        expected_effect: best && best.cost_per_conversion ? `Roughly ${Math.floor(half / best.cost_per_conversion)} more ${goal} a month at ${best.name}'s current cost, for the same total spend.` : `Halves the money going to the most expensive results.`,
      });
      continue;
    }
    change_next.push({
      action: best ? `Pause ${c.name} and move its ${money(c.monthly_spend)} a month to ${best.name}.` : `Pause ${c.name}.`,
      why: f.detail,
      expected_effect: best && best.cost_per_conversion ? `Roughly ${Math.floor(c.monthly_spend / best.cost_per_conversion)} more ${goal} a month at ${best.name}'s current cost, instead of none.` : `Stops ${money(c.monthly_spend)} a month leaking with nothing to show.`,
    });
  }
  if (under && change_next.length < 3 && !handled.has(under.campaign)) {
    const c = camps.find(x => x.name === under.campaign);
    change_next.push({
      action: `Do not add budget to ${c.name} yet; if it cannot reach ${PMAX_FLOOR} ${goal} a month on its own, fold its budget into ${best ? best.name : 'your search campaign'}.`,
      why: under.detail,
      expected_effect: 'Fewer wild swings week to week; the money sits where results are already measurable.',
    });
  }
  if (!change_next.length) {
    change_next.push({ action: 'Change nothing this week; collect another 30 days of data.', why: 'No campaign is clearly wasting money and no gap is big enough to act on.', expected_effect: 'A cleaner picture next month without spending anything extra.' });
  }
  const spendLine = `You spent ${money(derived.total_spend)} for ${derived.total_conversions} ${goal}.`;
  const workLine = best ? ` ${best.name} produced ${best.conversions} of them at ${money(best.cost_per_conversion)} each.` : '';
  const wasteLine = burning.length ? ` ${burning.map(f => f.campaign).join(' and ')} spent money with little or nothing to show.` : '';
  const pmaxLine = under ? ` Your Performance Max campaign is starved of data and guessing.` : '';
  const whats = (spendLine + workLine + wasteLine + pmaxLine).trim();
  const numbers_used = [];
  for (const c of camps) { numbers_used.push(String(c.spend), String(c.conversions)); }
  return {
    whats_happening: clampWords(whats, 60),
    change_next: change_next.slice(0, 3),
    confidence: burning.length || under ? 0.7 : 0.5,
    test_is_valid: stats.test_is_valid,
    numbers_used: dedupe(numbers_used),
    source: 'template',
  };
}

function clampWords(s, n) { const w = s.split(/\s+/); return w.length <= n ? s : w.slice(0, n).join(' ') + '…'; }
function dedupe(a) { return [...new Set(a)]; }

function enforceContract(obj, stats, inputText) {
  const out = {};
  out.whats_happening = clampWords(String(obj.whats_happening || ''), 60);
  let cn = Array.isArray(obj.change_next) ? obj.change_next : [];
  cn = cn.filter(x => x && typeof x === 'object').slice(0, 3).map(x => ({
    action: String(x.action || ''), why: String(x.why || ''), expected_effect: String(x.expected_effect || ''),
  })).filter(x => x.action);
  out.change_next = cn;
  let conf = Number(obj.confidence);
  out.confidence = Number.isFinite(conf) ? Math.min(1, Math.max(0, conf)) : 0.5;
  out.test_is_valid = stats.test_is_valid;
  if (typeof obj.test_is_valid !== 'boolean' || obj.test_is_valid !== stats.test_is_valid) out.corrected = true;
  const nums = Array.isArray(obj.numbers_used) ? obj.numbers_used.map(String) : [];
  out.numbers_used = dedupe(nums.filter(s => s && inputText.includes(s)));
  if (nums.length && out.numbers_used.length < nums.length) out.numbers_dropped = nums.filter(s => !inputText.includes(s));
  return out;
}

async function readAccounts(body) {
  const input = body || {};
  const camps = cleanCampaigns(input.campaigns);
  const goal = ['leads', 'sales', 'calls'].includes(input.goal) ? input.goal : 'leads';
  const monthlyBudget = toNum(input.monthly_budget) || null;
  if (!camps.length) return { error: 'expected {campaigns:[{name,type,spend,impressions,clicks,conversions,period_days}], goal, monthly_budget}' };

  const stats = computeStats({ variants: camps.map(c => ({ name: c.name, impressions: c.impressions, conversions: c.conversions, spend: c.spend })) });
  const derived = derive(camps, goal, monthlyBudget);
  const inputText = JSON.stringify(input);
  const t0 = Date.now();

  let result, model_used = MODEL, source = 'model';
  try {
    const systemPrompt = loadPrompt();
    const user = JSON.stringify({ goal, monthly_budget: monthlyBudget, campaigns: input.campaigns, derived, stats: {
      test_is_valid: stats.test_is_valid, verdict: stats.verdict, p_value: stats.p_value, variants_compared: stats.variants_compared,
      min_conversions_message: stats.min_conversions_message, pmax_ready: stats.pmax_ready, plain_read: stats.plain_read,
    } }, null, 2);
    const stdout = await runClaude(systemPrompt, user);
    let text = stdout;
    try { const cli = JSON.parse(stdout); if (cli.is_error) throw new Error('cli error'); text = typeof cli.result === 'string' ? cli.result : JSON.stringify(cli.result ?? cli); } catch (e) { if (e.message === 'cli error') throw e; }
    const obj = extractFirstJson(text);
    if (!obj) throw new Error('no JSON in model output');
    result = enforceContract(obj, stats, inputText);
    if (!result.change_next.length) throw new Error('model gave no actions');
  } catch (e) {
    result = fallbackRead(camps, derived, stats, goal);
    source = 'template'; model_used = null;
    result.fallback_reason = e.message;
  }
  result.stats = stats;
  result.derived = derived;
  result._meta = { source, model: model_used, prompt_source: path.basename(PROMPT_FILE), latency_ms: Date.now() - t0 };
  return result;
}

// ---------------------------------------------------------------------------
// Ownership checklist (no LLM)
// ---------------------------------------------------------------------------

const OWNERSHIP = {
  google: {
    agency_owns: [
      'Ask the agency for your 10-digit Google Ads customer ID (top right of Ads Manager). Write it down; it is the account, not the login.',
      'Create your own Google Ads Manager account (MCC) at ads.google.com/home/tools/manager-accounts using a company email you control, not a personal Gmail and not an agency address.',
      'Send the agency a link request from your Manager account (Accounts > Sub-account settings > Link existing account) using that customer ID. Ask them to accept it in writing.',
      'Once linked, add yourself as an Admin user directly on the account (Tools > Access and security > +) and confirm you can log in without the agency.',
      'Move billing to your own card or invoice profile (Billing > Settings) so the account cannot be turned off if the relationship ends.',
      'Ask the agency to transfer ownership of the conversion tags and Google Analytics property to you too; the account is worthless without its conversion history.',
      'Only then downgrade the agency to Standard access, or remove them. Keep a screenshot of the Access page showing you as the only Admin.',
    ],
    shared: [
      'Check what level you actually have: Tools > Access and security. "Standard" or "Read only" is not ownership; you need Admin.',
      'If you are not Admin, ask the agency to promote your login to Admin today. This takes them under a minute.',
      'Check Billing > Settings: if the card or invoice profile is the agency\'s, swap it to yours so spend stops if you part ways.',
      'Check who owns the conversion tracking and Google Analytics property linked to the account; ask for Editor/Owner on both.',
      'Set up your own Manager account and link this account under it, so future agencies get access through you rather than the reverse.',
      'Turn on the weekly account summary email to your address so you see spend and results without asking anyone.',
    ],
    owner: [
      'You own it. Confirm your login is the only Admin (Tools > Access and security) and any agency is Standard access at most.',
      'Enable two-step verification on the Google login that holds the account and store recovery codes somewhere safe.',
      'Grant new partners access through your Manager account link rather than sharing a password; revoke it when the contract ends.',
      'Make sure the Google Analytics property and conversion actions are owned by you, not created inside an agency account.',
      'Set a monthly reminder to open Billing and Change History and check nothing has changed that you did not ask for.',
    ],
  },
  meta: {
    agency_owns: [
      'Create your own Meta Business Portfolio (business.facebook.com) with a company email you control. This is the container that should own everything.',
      'Ask the agency for the Ad Account ID (a long number in Ads Manager under the account name) and the ID of the Facebook Page and Pixel/dataset.',
      'Ad accounts created inside an agency portfolio cannot be transferred. Ask the agency to move the ad account to your portfolio if it was originally yours; if it was theirs, plan to create a new ad account in your portfolio.',
      'Have the agency assign your portfolio as a Partner with full control of the Page and Pixel, then, from your side, claim the Page and Pixel so your portfolio is the owner.',
      'Add your own payment method to the ad account (Billing > Payment settings) so it is not tied to the agency\'s card.',
      'Give the agency back access as a Partner with only the permissions they need (Manage campaigns), not Admin on your portfolio.',
      'Export the last 12 months of campaign reports and audiences before any switch so the history is not lost with the old account.',
    ],
    shared: [
      'Open Business Settings > Ad accounts and look at the "Owned by" line. If it names the agency, you are a guest, not the owner.',
      'Check People: you need Admin on the Business Portfolio that owns the ad account, not just "Ad account admin" on the account itself.',
      'Check Pages and Datasets (Pixels) in Business Settings: both should be owned by your portfolio, not assigned to it by a partner.',
      'Ask the agency to make your portfolio the owner of the Page and Pixel, and to grant your portfolio full control of the ad account.',
      'Move the payment method to your own card so billing cannot be interrupted if the agency relationship ends.',
      'Turn on account-level email notifications and add a second Admin from your company as a backup.',
    ],
    owner: [
      'You own it. Confirm your Business Portfolio owns the Ad Account, the Page and the Pixel/dataset (each shows "Owned by" in Business Settings).',
      'Make sure at least two people at your company are Admins on the portfolio, with two-factor authentication on.',
      'Give agencies access as Partners with task-level permissions, never as Admins on your portfolio.',
      'Keep your own payment method on the ad account; do not let a partner replace it with theirs.',
      'Once a quarter, review Business Settings > Partners and remove anyone who no longer works with you.',
    ],
  },
};

async function ownership(body) {
  const platform = String((body && body.platform) || '').toLowerCase();
  const access = String((body && body.access) || '').toLowerCase();
  if (!OWNERSHIP[platform]) return { error: 'platform must be "google" or "meta"' };
  if (!OWNERSHIP[platform][access]) return { error: 'access must be "agency_owns", "shared" or "owner"' };
  const steps = OWNERSHIP[platform][access];
  const headline = {
    agency_owns: 'The account is in the agency\'s name. Every step below moves one piece into yours.',
    shared: 'You have a login but may not have control. Check the ownership lines first, then close the gaps.',
    owner: 'You already own it. These steps keep it that way.',
  }[access];
  return { platform, access, headline, steps, step_count: steps.length };
}

// ---------------------------------------------------------------------------

function register(add) {
  add('POST', '/api/ads/stats', async body => computeStats(body));
  add('POST', '/api/ads/read', async body => readAccounts(body));
  add('POST', '/api/ads/ownership', async body => ownership(body));
}

module.exports = { register, computeStats, readAccounts, ownership, fallbackRead, derive, cleanCampaigns, enforceContract, _internal: { erfc, normCdf, fisherTwoSided, impressionsForLift } };
