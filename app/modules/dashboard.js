'use strict';
// Owner dashboard — one JSON that the home page charts from.
// Aggregates what already exists on disk (eval results, audit rows, theft log,
// prompt headers, tenants). Where a data source is empty it falls back to
// deterministic demo values and says so in `sources` / `demo:true`.
//
// Usage from server.js:  require('./modules/dashboard').register(add)
//   add('GET', '/api/dashboard/summary', handler)   handler(body, req) => Promise<object>

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const EVALS_RETURNS = path.join(ROOT, 'evals', 'returns', 'results');
const EVALS_PREP = path.join(ROOT, 'evals', 'prep', 'results.json');
const EVALS_ADS_CASES = path.join(ROOT, 'evals', 'ads', 'cases.jsonl');
const AUDIT_DIR = path.join(ROOT, 'data', 'audit');
const THEFT_LOG = path.join(ROOT, 'data', 'theft_log.jsonl');
const PROMPTS_RETURNS = path.join(ROOT, 'prompts', 'returns');
const TENANTS = path.join(ROOT, 'config', 'tenants.json');

const CAUSES = ['photos', 'size_chart', 'garment', 'expectation', 'fulfilment', 'not_enough_data'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ZONES = ['beauty aisle', 'spirits', 'electronics', 'till area', 'entrance', 'back wall'];
const PREP_ITEMS = ['Croissant', 'Sourdough loaf', 'Cinnamon roll', 'Quiche slice', 'Soup (portions)', 'Baguette'];

// ---------- small helpers ----------
function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}
function readJsonl(file) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return []; }
  const rows = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try { rows.push(JSON.parse(line)); } catch { /* skip bad line */ }
  }
  return rows;
}
// Deterministic pseudo-random in [0,1) so demo series are stable across polls.
function seeded(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function todayIso() { return new Date().toISOString().slice(0, 10); }
function lastNDays(n) {
  const out = [];
  const now = Date.now();
  for (let i = n - 1; i >= 0; i--) out.push(new Date(now - i * 86_400_000).toISOString().slice(0, 10));
  return out;
}
function weekKey(ts) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return 'unknown';
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const w = Math.ceil(((t - y0) / 86_400_000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(w).padStart(2, '0')}`;
}
function lastNWeekKeys(n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(weekKey(Date.now() - i * 7 * 86_400_000));
  return out;
}

// ---------- audit ----------
function readAllAudit() {
  let files = [];
  try { files = fs.readdirSync(AUDIT_DIR).filter(f => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f)).sort(); }
  catch { return []; }
  const rows = [];
  for (const f of files) rows.push(...readJsonl(path.join(AUDIT_DIR, f)));
  return rows;
}

// ---------- returns ----------
function newestReturnsEval() {
  let best = null;
  try {
    for (const f of fs.readdirSync(EVALS_RETURNS)) {
      const m = /^v(\d+)\.json$/.exec(f);
      if (m && (!best || Number(m[1]) > best.n)) best = { n: Number(m[1]), file: path.join(EVALS_RETURNS, f) };
    }
  } catch { /* none */ }
  if (!best) return null;
  const j = readJson(best.file);
  return j && j.summary ? { ...j.summary, version: j.summary.version || `v${best.n}` } : null;
}
function allReturnsEvals() {
  const out = [];
  try {
    for (const f of fs.readdirSync(EVALS_RETURNS)) {
      const m = /^v(\d+)\.json$/.exec(f);
      if (!m) continue;
      const j = readJson(path.join(EVALS_RETURNS, f));
      if (j && j.summary) out.push({ version: `v${m[1]}`, n: Number(m[1]), ...j.summary });
    }
  } catch { /* none */ }
  return out.sort((a, b) => a.n - b.n);
}

function returnsSection(audit, sources) {
  const ev = newestReturnsEval();
  const evalOut = ev ? {
    version: ev.version,
    model: ev.model || null,
    cases: ev.n || null,
    accuracy: ev.cause_accuracy ?? null,
    grounded: ev.grounded_rate ?? null,
    parsed: ev.parsed_rate ?? null,
    latency_s: ev.mean_latency_s ?? null,
    gate_met: !!ev.gate_met,
  } : { version: 'v2', model: 'sonnet', cases: 60, accuracy: 0.983, grounded: 0.95, parsed: 0.983, latency_s: 15.1, gate_met: true };
  sources.returns_eval = ev ? 'live' : 'demo';

  const rows = audit.filter(r => r.module === 'returns');
  const byCause = Object.fromEntries(CAUSES.map(c => [c, 0]));
  let counted = 0;
  for (const r of rows) {
    const c = r.result_summary && r.result_summary.cause;
    if (c && c in byCause) { byCause[c]++; counted++; }
  }
  let causesDemo = false;
  if (!counted) {
    causesDemo = true;
    const conf = ev && ev.confusion;
    for (const c of CAUSES) byCause[c] = conf && conf[c] && conf[c][c] ? conf[c][c] : { photos: 12, size_chart: 11, garment: 12, expectation: 10, fulfilment: 8, not_enough_data: 6 }[c];
  }
  sources.returns_causes = causesDemo ? 'demo' : 'live';

  // cause x week (last 6 ISO weeks). Live from audit rows if any, else demo spread of the totals.
  const weeks = lastNWeekKeys(6);
  const matrix = CAUSES.map(() => weeks.map(() => 0));
  let weeksLive = false;
  if (!causesDemo) {
    for (const r of rows) {
      const c = r.result_summary && r.result_summary.cause;
      const wi = weeks.indexOf(weekKey(r.ts));
      const ci = CAUSES.indexOf(c);
      if (wi >= 0 && ci >= 0) { matrix[ci][wi]++; weeksLive = true; }
    }
  }
  if (!weeksLive) {
    const rnd = seeded(42);
    CAUSES.forEach((c, ci) => {
      const total = byCause[c];
      let left = total;
      weeks.forEach((_, wi) => {
        const share = wi === weeks.length - 1 ? left : Math.round(total * (0.1 + rnd() * 0.15));
        const v = Math.max(0, Math.min(left, share));
        matrix[ci][wi] = v; left -= v;
      });
    });
  }

  const sizeChartCount = byCause.size_chart;
  return {
    eval: evalOut,
    diagnoses_total: counted || Object.values(byCause).reduce((a, b) => a + b, 0),
    by_cause: byCause,
    by_cause_week: { causes: CAUSES, weeks, matrix, demo: !weeksLive },
    demo: causesDemo,
    headline: {
      number: causesDemo ? 3 : sizeChartCount,
      text: causesDemo ? '3 SKUs need a new size chart' : `${sizeChartCount} SKU${sizeChartCount === 1 ? '' : 's'} need a new size chart`,
    },
  };
}

// ---------- prep ----------
function prepSection(sources) {
  const r = readJson(EVALS_PREP);
  sources.prep_eval = r ? 'live' : 'demo';
  const evalOut = r ? {
    improvement_pct: r.improvement_pct, naive_pinball: r.naive_pinball, model_pinball: r.model_pinball,
    gate_met: !!r.gate_met, gate_threshold_pct: r.gate_threshold_pct, items: r.setup && r.setup.items, days: r.setup && r.setup.days,
  } : { improvement_pct: 30.35, naive_pinball: 4.1372, model_pinball: 2.8815, gate_met: true, gate_threshold_pct: 15, items: 6, days: 84 };

  const items = r && r.by_item ? Object.keys(r.by_item) : PREP_ITEMS;
  const by_item = items.map(name => {
    const it = r && r.by_item && r.by_item[name];
    return { name, naive: it ? it.run_out.naive : null, model: it ? it.run_out.model : null };
  });

  // 7-day prepared vs sold per item — no POS feed is wired, so this is a deterministic demo.
  const days = lastNDays(7);
  const base = { 'Croissant': 48, 'Sourdough loaf': 22, 'Cinnamon roll': 30, 'Quiche slice': 18, 'Soup (portions)': 26, 'Baguette': 34 };
  const rnd = seeded(7);
  const series = items.map(name => {
    const b = base[name] || 20;
    return {
      item: name,
      prepared: days.map((d, i) => Math.round(b * (1 + (i >= 5 ? 0.25 : 0)) * (0.95 + rnd() * 0.15))),
      sold: days.map((d, i) => Math.round(b * (1 + (i >= 5 ? 0.22 : 0)) * (0.8 + rnd() * 0.25))),
    };
  });
  sources.prep_series = 'demo';
  const croissant = series.find(s => s.item === 'Croissant') || series[0];
  const todayPrep = croissant ? croissant.prepared[6] : 42;
  return {
    eval: evalOut,
    by_item,
    series: { days, items: series, demo: true },
    headline: { number: 42, text: `Prep 42 ${croissant ? croissant.item.toLowerCase() + 's' : 'croissants'}, not ${Math.max(todayPrep, 55)}` },
  };
}

// ---------- ads ----------
function adsSection(sources) {
  let ads = null;
  try { ads = require('./ads'); } catch { /* module not written yet */ }
  const cases = readJsonl(EVALS_ADS_CASES);
  let honest = 0, checked = 0, noWinnerExpected = 0;
  if (ads && typeof ads.computeStats === 'function') {
    for (const c of cases) {
      if (!c.variants || !c.expected) continue;
      checked++;
      if (c.expected.test_is_valid === false) noWinnerExpected++;
      try {
        const s = ads.computeStats({ variants: c.variants });
        if (s.test_is_valid === c.expected.test_is_valid) honest++;
      } catch { /* counts as a miss */ }
    }
  }
  sources.ads_honesty = checked ? 'live' : 'demo';
  const honesty = checked
    ? { cases: checked, correct: honest, rate: Math.round((honest / checked) * 1000) / 1000, no_winner_cases: noWinnerExpected }
    : { cases: 20, correct: 20, rate: 1, no_winner_cases: 11 };

  // Spend vs conversions per campaign, 7 days — no ad account is connected, deterministic demo.
  const days = lastNDays(7);
  const rnd = seeded(99);
  const campaigns = [
    { name: 'Headline A', base_spend: 38, cr: 0.010 },
    { name: 'Headline B', base_spend: 41, cr: 0.014 },
    { name: 'Retargeting', base_spend: 22, cr: 0.031 },
  ].map(c => {
    const spend = days.map(() => Math.round(c.base_spend * (0.8 + rnd() * 0.4)));
    const conversions = spend.map(s => Math.round((s / 1.6) * c.cr * 100 * (0.7 + rnd() * 0.6)) / 1);
    return { name: c.name, spend, conversions, spend_total: spend.reduce((a, b) => a + b, 0), conversions_total: conversions.reduce((a, b) => a + b, 0) };
  });
  sources.ads_campaigns = 'demo';

  // The hackathon case (a01) verdict, computed live if the module is there.
  let verdict = 'no winner yet';
  if (ads && cases[0] && typeof ads.computeStats === 'function') {
    try { verdict = ads.computeStats({ variants: cases[0].variants }).verdict || verdict; } catch { /* keep default */ }
  }
  return {
    honesty,
    campaigns: { days, items: campaigns, demo: true },
    headline: { number: 0, text: `${verdict[0].toUpperCase()}${verdict.slice(1)}: keep both ads running` },
  };
}

// ---------- theft ----------
async function theftSection(sources) {
  let live = null;
  try {
    const theft = require('./theft');
    if (typeof theft.summary === 'function') live = await theft.summary();
  } catch { /* fall through */ }
  if (!live) {
    const rows = readJsonl(THEFT_LOG);
    if (rows.length) {
      const by_zone = {}, by_week = {};
      for (const r of rows) {
        const z = r.zone || 'unknown', w = weekKey(r.ts);
        by_zone[z] = by_zone[z] || { events: 0, took_it: 0, deterred: 0, unsure: 0, loss: 0 };
        by_week[w] = by_week[w] || { events: 0, took_it: 0, deterred: 0, unsure: 0, loss: 0 };
        for (const b of [by_zone[z], by_week[w]]) { b.events++; if (r.outcome) b[r.outcome in b ? r.outcome : 'unsure']++; }
      }
      live = { alerts: rows.filter(r => r.kind === 'alert').length, outcomes_logged: rows.filter(r => r.outcome).length, by_zone, by_week };
    }
  }
  const hasData = live && (live.alerts > 0 || live.outcomes_logged > 0);
  sources.theft = hasData ? 'live' : 'demo';

  const weeks = lastNWeekKeys(6);
  let by_zone, by_week, totals, heat;
  if (hasData) {
    by_zone = live.by_zone || {};
    by_week = Object.fromEntries(weeks.map(w => [w, (live.by_week && live.by_week[w]) || { events: 0, took_it: 0, deterred: 0, unsure: 0, loss: 0 }]));
    totals = { alerts: live.alerts, deterred: live.deterred || 0, took_it: live.took_it || 0, unsure: live.unsure || 0, estimated_loss: live.estimated_loss || 0, deterrence_rate: live.deterrence_rate ?? null };
    // zone x weekday is not in the summary; rebuild from the raw log when present.
    const rows = readJsonl(THEFT_LOG).filter(r => r.kind === 'alert');
    const zones = Object.keys(by_zone).length ? Object.keys(by_zone) : [...new Set(rows.map(r => r.zone || 'unknown'))];
    heat = { zones, weekdays: WEEKDAYS, matrix: zones.map(() => WEEKDAYS.map(() => 0)), demo: false };
    for (const r of rows) {
      const zi = zones.indexOf(r.zone || 'unknown');
      const d = new Date(r.ts); const wd = Number.isNaN(d.getTime()) ? -1 : (d.getUTCDay() + 6) % 7;
      if (zi >= 0 && wd >= 0) heat.matrix[zi][wd]++;
    }
  } else {
    const rnd = seeded(2026);
    heat = { zones: ZONES, weekdays: WEEKDAYS, matrix: ZONES.map((z, zi) => WEEKDAYS.map((w, wi) => {
      const hot = (zi === 0 && (wi === 4 || wi === 5)) ? 3 : 0;
      return Math.round(rnd() * (zi < 3 ? 2.4 : 1.2)) + hot;
    })), demo: true };
    by_zone = Object.fromEntries(ZONES.map((z, zi) => {
      const events = heat.matrix[zi].reduce((a, b) => a + b, 0);
      const took = Math.round(events * (zi === 0 ? 0.35 : 0.15));
      return [z, { events, took_it: took, deterred: events - took - (events > 3 ? 1 : 0), unsure: events > 3 ? 1 : 0, loss: took * (zi === 0 ? 10 : 14) }];
    }));
    by_week = Object.fromEntries(weeks.map((w, i) => {
      const events = [4, 6, 5, 8, 7, 9][i];
      const took = [1, 2, 1, 2, 1, 2][i];
      return [w, { events, took_it: took, deterred: events - took - 1, unsure: 1, loss: took * 11 }];
    }));
    const ev = Object.values(by_zone).reduce((a, b) => ({ events: a.events + b.events, took_it: a.took_it + b.took_it, deterred: a.deterred + b.deterred, unsure: a.unsure + b.unsure, loss: a.loss + b.loss }), { events: 0, took_it: 0, deterred: 0, unsure: 0, loss: 0 });
    totals = { alerts: ev.events, deterred: ev.deterred, took_it: ev.took_it, unsure: ev.unsure, estimated_loss: ev.loss, deterrence_rate: ev.events ? Math.round((ev.deterred / ev.events) * 100) / 100 : null };
  }
  // Alerts per week (the summary's by_week counts logged outcomes, so count alert rows directly).
  const alertsByWeek = Object.fromEntries(weeks.map(w => [w, 0]));
  const alertsByZoneThisWeek = {};
  const thisWeek = weeks[weeks.length - 1];
  if (hasData) {
    for (const r of readJsonl(THEFT_LOG)) {
      if (r.kind !== 'alert') continue;
      const w = weekKey(r.ts);
      if (w in alertsByWeek) alertsByWeek[w]++;
      if (w === thisWeek) { const z = r.zone || 'unknown'; alertsByZoneThisWeek[z] = (alertsByZoneThisWeek[z] || 0) + 1; }
    }
  } else {
    weeks.forEach((w, i) => { alertsByWeek[w] = by_week[w].events; });
    alertsByZoneThisWeek['beauty aisle'] = 2;
  }
  const hotZone = Object.entries(alertsByZoneThisWeek).sort((a, b) => b[1] - a[1])[0];
  const topZone = Object.entries(by_zone).sort((a, b) => (b[1].loss - a[1].loss) || (b[1].events - a[1].events))[0];
  const zoneName = hotZone ? hotZone[0] : (topZone ? topZone[0] : 'beauty aisle');
  const zoneAlerts = hotZone ? hotZone[1] : 0;
  return {
    totals,
    by_zone,
    by_week: { weeks, alerts: weeks.map(w => alertsByWeek[w]), rows: weeks.map(w => by_week[w] || { events: 0, took_it: 0, deterred: 0, unsure: 0, loss: 0 }) },
    heat,
    decision_hint: (live && live.decision_hint) || 'Not enough losses in one zone yet to justify changing the layout.',
    demo: !hasData,
    headline: { number: zoneAlerts, text: `${zoneAlerts} alert${zoneAlerts === 1 ? '' : 's'} in ${zoneName} this week` },
  };
}

// ---------- platform ----------
function promptVersions() {
  const scores = Object.fromEntries(allReturnsEvals().map(e => [e.version, e]));
  const out = [];
  try {
    for (const f of fs.readdirSync(PROMPTS_RETURNS)) {
      const m = /^v(\d+)\.md$/.exec(f);
      if (!m) continue;
      const header = {};
      try {
        const text = fs.readFileSync(path.join(PROMPTS_RETURNS, f), 'utf8');
        if (text.startsWith('---')) {
          for (const line of text.split('\n').slice(1)) {
            if (line.trim() === '---') break;
            const kv = /^([\w_]+):\s*(.*)$/.exec(line);
            if (kv) header[kv[1]] = kv[2];
          }
        }
      } catch { /* ignore */ }
      const v = `v${m[1]}`;
      const s = scores[v];
      out.push({ version: v, n: Number(m[1]), model_used: header.model_used || null, fixes: header.fixes || null,
        accuracy: s ? s.cause_accuracy ?? null : null, grounded: s ? s.grounded_rate ?? null : null, gate_met: s ? !!s.gate_met : null });
    }
  } catch { /* none */ }
  return out.sort((a, b) => a.n - b.n);
}

function platformSection(audit, returns, sources) {
  const today = todayIso();
  const todayRows = audit.filter(r => typeof r.ts === 'string' && r.ts.slice(0, 10) === today);
  const tenants = readJson(TENANTS);
  const tenantList = tenants && Array.isArray(tenants.tenants) ? tenants.tenants : [];
  sources.tenants = tenantList.length ? 'live' : 'demo';
  sources.audit = audit.length ? 'live' : 'demo';
  const versions = promptVersions();
  const served = versions.length ? versions[versions.length - 1].version : returns.eval.version;
  const lat = todayRows.map(r => r.latency_ms).filter(Number.isFinite);
  const p50 = lat.length ? lat.sort((a, b) => a - b)[Math.floor(lat.length / 2)] : null;
  return {
    audit_rows_today: todayRows.length,
    audit_rows_total: audit.length,
    audit_by_module: audit.reduce((acc, r) => { acc[r.module || 'unknown'] = (acc[r.module || 'unknown'] || 0) + 1; return acc; }, {}),
    tenants: tenantList.length || 2,
    tenant_plans: tenantList.map(t => ({ tenant: t.tenant, plan: t.plan, modules: (t.modules || []).length })),
    prompt_served: served,
    prompt_versions: versions,
    eval_gate: { met: returns.eval.gate_met, accuracy: returns.eval.accuracy, version: returns.eval.version },
    latency_ms_today_p50: p50,
    latency_s_eval: returns.eval.latency_s,
    retention_days: Number(process.env.AUDIT_RETENTION_DAYS || 90),
  };
}

// ---------- entry ----------
async function summary() {
  const sources = {};
  const audit = readAllAudit();
  const returns = returnsSection(audit, sources);
  const prep = prepSection(sources);
  const ads = adsSection(sources);
  const theft = await theftSection(sources);
  const platform = platformSection(audit, returns, sources);
  return { generated_at: new Date().toISOString(), sources, returns, prep, ads, theft, platform };
}

function register(add) {
  add('GET', '/api/dashboard/summary', async () => summary());
}

module.exports = { register, summary };
