'use strict';
// "Today's Prep" — one prep number per item a shift lead can act on.
// Pure math (no LLM) for /api/prep/forecast; optional `claude -p` polish for /api/prep/explain.
//
// Usage from server.js:
//   require('./modules/prep').register((method, path, handler) => { ... });
// handler signature: (body, req) => Promise<object>; return value is sent as JSON.

const { spawn } = require('node:child_process');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKS_BACK = 8;              // same-weekday samples used
const TREND_MIN = 0.8, TREND_MAX = 1.25;
const QUANTILE_BY_PREF = { run_out: 0.65, neutral: 0.5, waste: 0.40 };
const RANGE_LOW_Q = 0.25, RANGE_HIGH_Q = 0.80;
const EVENT_MULT = 1.15;
const RAIN_MULT = 0.90;
const EXPLAIN_TIMEOUT_MS = 60_000;
const EXPLAIN_MODEL = process.env.PREP_MODEL || 'sonnet';

// ---------- small stats ----------
function sortedNums(xs) {
  return xs.map(Number).filter(n => Number.isFinite(n)).sort((a, b) => a - b);
}
// Linear-interpolation quantile on an already sorted array (numpy default / R type 7).
function quantileSorted(s, q) {
  if (!s.length) return 0;
  if (s.length === 1) return s[0];
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}
function mean(xs) { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0; }

// Parse "YYYY-MM-DD" as a UTC day so weekday math is timezone-proof.
function parseDay(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}
function addDays(d, n) { return new Date(d.getTime() + n * 86_400_000); }
function isoDay(d) { return d.toISOString().slice(0, 10); }

// ---------- core forecast for one item ----------
function forecastItem(item, preference, context, targetDate) {
  const name = String(item.name || 'item');
  const rows = (Array.isArray(item.history) ? item.history : [])
    .map(r => ({ d: parseDay(r.date), sold: Number(r.sold) }))
    .filter(r => r.d && Number.isFinite(r.sold))
    .sort((a, b) => a.d - b.d);

  if (!rows.length) {
    return { name, prep_qty: 0, range: [0, 0], why: 'No sales history yet, so there is nothing to forecast for ' + name + '.' };
  }

  const lastDay = rows[rows.length - 1].d;
  const target = targetDate || addDays(lastDay, 1);
  const wd = target.getUTCDay();
  const dayName = DAY_NAMES[wd] + 's';

  // Same-weekday values, most recent WEEKS_BACK of them.
  const sameWd = rows.filter(r => r.d.getUTCDay() === wd && r.d < target).map(r => r.sold).slice(-WEEKS_BACK);
  // Fallback when there are no same-weekday samples: use everything.
  const sample = sortedNums(sameWd.length ? sameWd : rows.map(r => r.sold));
  const median = quantileSorted(sample, 0.5);
  const q = QUANTILE_BY_PREF[preference] ?? 0.5;
  const base = quantileSorted(sample, q);

  // Recent 2-week trend: mean(last 14 days) / mean(previous 14 days), clamped.
  const recent = rows.filter(r => r.d >= addDays(target, -14) && r.d < target).map(r => r.sold);
  const prior = rows.filter(r => r.d >= addDays(target, -28) && r.d < addDays(target, -14)).map(r => r.sold);
  let trend = 1;
  if (recent.length >= 7 && prior.length >= 7 && mean(prior) > 0) {
    trend = Math.min(TREND_MAX, Math.max(TREND_MIN, mean(recent) / mean(prior)));
  }

  // Context multipliers.
  const ctx = context || {};
  let ctxMult = 1;
  const drivers = [];
  const typicalBookings = Number(ctx.typical_bookings ?? item.typical_bookings);
  const bookings = Number(ctx.bookings);
  if (Number.isFinite(bookings) && Number.isFinite(typicalBookings) && typicalBookings > 0 && bookings > typicalBookings) {
    // Bookings above the median day add proportionally (half-weight, capped at +50%).
    const m = Math.min(1.5, 1 + 0.5 * (bookings / typicalBookings - 1));
    ctxMult *= m;
    drivers.push(`${bookings} bookings vs a usual ${typicalBookings} adds ${Math.round((m - 1) * 100)}%`);
  }
  const events = Array.isArray(ctx.events) ? ctx.events.filter(Boolean) : (ctx.events ? [String(ctx.events)] : []);
  if (events.length) {
    ctxMult *= EVENT_MULT;
    drivers.push(`${events[0]} adds 15%`);
  }
  const rainy = /rain|storm|shower|drizzle|snow/i.test(String(ctx.weather || ''));
  const walkIn = item.walk_in === true || item.walk_in_dependent === true;
  if (rainy && walkIn) {
    ctxMult *= RAIN_MULT;
    drivers.push('rain trims walk-ins 10%');
  }

  const mult = trend * ctxMult;
  const prep = Math.max(0, Math.round(base * mult));
  let low = Math.max(0, Math.round(quantileSorted(sample, RANGE_LOW_Q) * mult));
  let high = Math.max(0, Math.round(quantileSorted(sample, RANGE_HIGH_Q) * mult));
  if (low > prep) low = prep;
  if (high < prep) high = prep;

  // One plain sentence naming the driver.
  const parts = [`${dayName} median ${Math.round(median)}`];
  const trendPct = Math.round((trend - 1) * 100);
  if (trendPct >= 3) parts.push(`trending up ${trendPct}%`);
  else if (trendPct <= -3) parts.push(`trending down ${Math.abs(trendPct)}%`);
  else parts.push('flat trend');
  for (const d of drivers) parts.push(d);
  if (preference === 'run_out') parts.push('you prefer not to run out');
  else if (preference === 'waste') parts.push('you prefer not to waste');
  const why = parts.join(', ') + '.';

  return {
    name, prep_qty: prep, range: [low, high], why,
    _meta: { weekday: DAY_NAMES[wd], target_date: isoDay(target), samples: sample.length, median: Math.round(median * 10) / 10, quantile: q, trend: Math.round(trend * 1000) / 1000, context_mult: Math.round(ctxMult * 1000) / 1000 },
  };
}

function forecast(body) {
  const items = Array.isArray(body && body.items) ? body.items : [];
  if (!items.length) throw Object.assign(new Error('expected {items:[{name, history:[{date, sold}]}], preference, context}'), { status: 400 });
  const preference = ['run_out', 'waste', 'neutral'].includes(body.preference) ? body.preference : 'neutral';
  const context = body.context || {};
  const targetDate = body.target_date ? parseDay(body.target_date) : null;
  const t0 = Date.now();
  const out = items.map(it => forecastItem(it || {}, preference, context, targetDate));
  return {
    preference,
    target_date: out[0]?._meta?.target_date || null,
    weekday: out[0]?._meta?.weekday || null,
    items: out,
    latency_ms: Date.now() - t0,
  };
}

// ---------- 7am card ----------
function templateCard(fc) {
  const items = (fc.items || []).map(i => `${i.name} ${i.prep_qty}`).join(', ');
  const day = fc.weekday ? `${fc.weekday} prep` : 'Prep';
  const pref = fc.preference === 'run_out' ? 'Lean full — better to have a few left than turn people away.'
    : fc.preference === 'waste' ? 'Lean light — sell out is fine today, waste is not.'
    : 'Straight down the middle today.';
  const top = (fc.items || []).slice().sort((a, b) => b.prep_qty - a.prep_qty)[0];
  const note = top && top.why ? `${top.name}: ${top.why}` : pref;
  return [`${day}: ${items}.`, pref, note].join('\n');
}

const EXPLAIN_SYSTEM = `You write the 7am prep text a bakery/restaurant shift lead reads on their phone.
Input: a JSON forecast with items (name, prep_qty, range, why) and the owner's preference (run_out = would rather have leftovers than run out; waste = would rather sell out than throw food away).
Write EXACTLY 3 short lines, plain text, no markdown, no emoji, under 300 characters total:
Line 1: the day and every item with its prep number, in the order given.
Line 2: the single most important driver today (from the why fields), in plain words.
Line 3: one sentence on which way to lean if unsure, matching the owner's preference.
Output only the 3 lines.`;

function runClaude(systemPrompt, stdinText) {
  return new Promise((resolve, reject) => {
    const args = ['-p', '--model', EXPLAIN_MODEL, '--output-format', 'json', '--disallowedTools', '*', '--max-turns', '1', '--system-prompt', systemPrompt];
    const env = { ...process.env };
    delete env.CLAUDECODE;
    delete env.CLAUDE_CODE_ENTRYPOINT;
    let out = '', err = '', done = false;
    const child = spawn('claude', args, { env, stdio: ['pipe', 'pipe', 'pipe'] });
    const timer = setTimeout(() => { if (!done) { done = true; child.kill('SIGKILL'); reject(new Error('claude CLI timed out after 60s')); } }, EXPLAIN_TIMEOUT_MS);
    child.stdout.on('data', d => out += d);
    child.stderr.on('data', d => err += d);
    child.on('error', e => { if (!done) { done = true; clearTimeout(timer); reject(e); } });
    child.on('close', code => {
      if (done) return;
      done = true; clearTimeout(timer);
      if (code !== 0 && !out.trim()) return reject(new Error(`claude exited ${code}: ${err.slice(0, 500)}`));
      resolve(out);
    });
    child.stdin.end(stdinText);
  });
}

async function explain(body) {
  // Accept either a forecast result or the raw forecast request.
  const fc = body && Array.isArray(body.items) && body.items.every(i => typeof i.prep_qty === 'number') ? body : forecast(body);
  const fallback = templateCard(fc);
  const t0 = Date.now();
  try {
    const raw = await runClaude(EXPLAIN_SYSTEM, JSON.stringify({ preference: fc.preference, weekday: fc.weekday, items: fc.items.map(({ name, prep_qty, range, why }) => ({ name, prep_qty, range, why })) }));
    let text = raw;
    try { const cli = JSON.parse(raw); if (cli.is_error) throw new Error('cli error'); text = typeof cli.result === 'string' ? cli.result : String(cli.result ?? ''); } catch (e) { if (e.message === 'cli error') throw e; }
    const lines = text.replace(/```/g, '').split('\n').map(s => s.trim()).filter(Boolean).slice(0, 3);
    if (lines.length < 2) throw new Error('model returned too little text');
    return { card: lines.join('\n'), source: 'claude', model: EXPLAIN_MODEL, latency_ms: Date.now() - t0 };
  } catch (e) {
    return { card: fallback, source: 'template', error: e.message, latency_ms: Date.now() - t0 };
  }
}

function register(add) {
  add('POST', '/api/prep/forecast', async (body) => forecast(body));
  add('POST', '/api/prep/explain', async (body) => explain(body));
}

module.exports = { register, forecast, explain, forecastItem, templateCard, quantileSorted };
