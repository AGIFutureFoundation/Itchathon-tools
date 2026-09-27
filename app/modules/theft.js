// "Ten Seconds After" — Challenge 3 (theft in a one-person shop).
// Cameras and video analytics already detect. This module owns the ten seconds
// AFTER the alert: what one person on the floor does, for a $10-$20 item,
// without confrontation. Deterministic rules table, no LLM, Node built-ins only.
//
// Usage from server.js:  require('./modules/theft').register(add)
//   add(method, path, handler)   handler: (body) => Promise<object>

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const LOG_FILE = path.join(DATA_DIR, 'theft_log.jsonl');

const LOW_VALUE_MAX = 25;         // below this: deterrence only, never escalate
const DEFAULT_TIMING_SECONDS = 10;

// Hard rule: these never appear in a playbook. Every response carries them.
const NEVER_DO = [
  'do not confront or accuse',
  'do not chase or follow out of the shop',
  'do not touch the person or their bag',
  'do not block the exit',
];

// Non-accusatory scripts. All of them are normal customer-service sentences that
// also signal "I have seen you". Chosen deterministically from the alert.
const SCRIPTS = {
  greeting_generic: 'Hi there, let me know if you need a size or a hand with anything.',
  greeting_zone: (zone) => `Hi there, anything I can help you find in the ${zone}?`,
  greeting_repeat: 'Hi, good to see you again, shout if you need anything.',
  till_offer: 'I am just at the till whenever you are ready, I can pop that in a bag for you.',
  speaker_generic: 'Customer service to the shop floor, please. Customer service to the shop floor.',
  two_staff: 'Hi there, my colleague is just over there if you need a hand with anything.',
};

// ---------- helpers ----------
function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function badRequest(msg) {
  return Object.assign(new Error(msg), { status: 400 });
}

// ISO week key, e.g. "2026-W39" — used so the summary groups by week.
function weekKey(ts) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return 'unknown';
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t - yearStart) / 86_400_000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function readLog() {
  let text = '';
  try { text = fs.readFileSync(LOG_FILE, 'utf8'); } catch { return []; }
  const rows = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try { rows.push(JSON.parse(line)); } catch { /* skip corrupt line */ }
  }
  return rows;
}

function appendLog(row) {
  ensureDataDir();
  fs.appendFileSync(LOG_FILE, JSON.stringify(row) + '\n');
}

// ---------- rules ----------
// Returns the playbook for one alert. Pure function: same alert -> same answer.
function choosePlaybook(alert) {
  const zone = String(alert.zone || 'shop floor').trim() || 'shop floor';
  const value = num(alert.item_value_estimate, 0);
  const staff = Math.max(0, Math.floor(num(alert.staff_on_floor, 1)));
  const repeat = Boolean(alert.repeat_visitor);
  const source = String(alert.source || 'manual');
  const alone = staff <= 1;
  const lowValue = value < LOW_VALUE_MAX;

  const followups = [];
  let primary, secondary, script, channel;

  if (alone && lowValue) {
    // The core case: one person, a $10-$20 item. Greet, be visible, make the
    // item not worth the walk. Never leave the till unattended to do it.
    primary = `Greet toward the ${zone} so the person knows they have been seen, then move to the till and stay there`;
    secondary = 'Switch the till screen / shop display to the "customer service" slide (a friendly face, not a warning)';
    script = repeat ? SCRIPTS.greeting_repeat : SCRIPTS.greeting_generic;
    channel = 'speaker';
  } else if (alone && !lowValue) {
    // Higher value, still alone: same tone, but start building the record.
    primary = `Greet toward the ${zone}, offer to hold the item at the till, and stay at the till`;
    secondary = 'Call a second person (neighbouring shop, partner, or landlord contact) to be visible for ten minutes';
    script = SCRIPTS.till_offer;
    channel = 'phone';
  } else if (lowValue) {
    // Two or more staff: one greets, one is simply present near the till.
    primary = `One person greets in the ${zone}; the other stays at the till and stays visible`;
    secondary = 'Keep both people in the person\'s line of sight; no one moves toward the exit';
    script = SCRIPTS.two_staff;
    channel = 'screen';
  } else {
    primary = `One person greets in the ${zone} and offers to carry the item to the till; the other stays at the till`;
    secondary = 'Second person notes the time and description now so the report bundle is ready if needed';
    script = SCRIPTS.till_offer;
    channel = 'till';
  }

  if (repeat) followups.push('note for next visit: greet by the door');
  if (!lowValue) followups.push('call a second person / log for police report bundle');
  if (source === 'veesion' || source === 'camera') followups.push('mark the clip so it is kept with the log entry');

  const log_id = crypto.randomUUID();
  return {
    action: { primary, secondary, do_not: NEVER_DO, followups },
    script,
    channel,
    timing_seconds: DEFAULT_TIMING_SECONDS,
    log_id,
    context: { zone, item_value_estimate: value, staff_on_floor: staff, repeat_visitor: repeat, source },
  };
}

// Fixed list of cheap measures. Ordered from most to least intrusive so the
// ranking below can pick a lighter measure for lighter problems.
const MEASURES = [
  { id: 'behind_counter', label: 'Move behind the counter', when: (t, p) => t >= 6 || (t >= 3 && p >= 15) },
  { id: 'dummy_box', label: 'Replace with a dummy display box, real stock at the till', when: (t, p) => t >= 4 && p >= 10 },
  { id: 'tag', label: 'Add a security tag or spider wrap', when: (t, p) => t >= 3 && p >= 12 },
  { id: 'near_till', label: 'Move the shelf position to within sight of the till', when: (t) => t >= 2 },
  { id: 'raise_price', label: 'Raise the price by the shrink percentage', when: () => true },
];

function chooseMeasure(thefts, price) {
  for (const m of MEASURES) if (m.when(thefts, price)) return m;
  return MEASURES[MEASURES.length - 1];
}

// ---------- handlers ----------
async function alert(body) {
  if (!body || typeof body !== 'object') throw badRequest('expected a JSON object');
  const source = String(body.source || 'manual');
  if (!['veesion', 'camera', 'manual'].includes(source)) throw badRequest('source must be veesion | camera | manual');
  if (body.staff_on_floor === undefined) throw badRequest('staff_on_floor is required');
  const playbook = choosePlaybook({ ...body, source });
  appendLog({
    ts: new Date().toISOString(),
    log_id: playbook.log_id,
    kind: 'alert',
    zone: playbook.context.zone,
    value: playbook.context.item_value_estimate,
    source,
    repeat_visitor: playbook.context.repeat_visitor,
    action_taken: playbook.action.primary,
    // person_description is intentionally NOT stored: it is for the person on
    // the floor right now, not for a record.
  });
  return playbook;
}

async function log(body) {
  if (!body || typeof body !== 'object') throw badRequest('expected a JSON object');
  const row = {
    ts: body.ts ? new Date(body.ts).toISOString() : new Date().toISOString(),
    log_id: body.log_id || crypto.randomUUID(),
    kind: 'outcome',
    zone: String(body.zone || 'shop floor'),
    value: num(body.value, 0),
    action_taken: String(body.action_taken || ''),
  };
  if (body.outcome !== undefined) {
    const outcome = String(body.outcome);
    if (!['deterred', 'took_it', 'unsure'].includes(outcome)) throw badRequest('outcome must be deterred | took_it | unsure');
    row.outcome = outcome;
  }
  appendLog(row);
  return { ok: true, row };
}

async function summary() {
  const rows = readLog();
  const outcomes = rows.filter(r => r.kind === 'outcome' || r.outcome);
  const alerts = rows.filter(r => r.kind === 'alert');
  const byZone = {};
  const byWeek = {};
  let estimated_loss = 0;
  let deterred = 0, took_it = 0, unsure = 0;

  for (const r of outcomes) {
    const z = r.zone || 'unknown';
    const w = weekKey(r.ts);
    byZone[z] = byZone[z] || { events: 0, took_it: 0, deterred: 0, unsure: 0, loss: 0 };
    byWeek[w] = byWeek[w] || { events: 0, took_it: 0, deterred: 0, unsure: 0, loss: 0 };
    for (const b of [byZone[z], byWeek[w]]) {
      b.events++;
      if (r.outcome === 'took_it') { b.took_it++; b.loss += num(r.value, 0); }
      else if (r.outcome === 'deterred') b.deterred++;
      else b.unsure++;
    }
    if (r.outcome === 'took_it') { took_it++; estimated_loss += num(r.value, 0); }
    else if (r.outcome === 'deterred') deterred++;
    else unsure++;
  }
  for (const b of [...Object.values(byZone), ...Object.values(byWeek)]) b.loss = Math.round(b.loss * 100) / 100;

  const ranked = Object.entries(byZone).sort((a, b) => (b[1].loss - a[1].loss) || (b[1].events - a[1].events));
  const top_zone = ranked.length ? { zone: ranked[0][0], ...ranked[0][1] } : null;
  const total = deterred + took_it + unsure;
  return {
    alerts: alerts.length,
    outcomes_logged: total,
    deterred, took_it, unsure,
    deterrence_rate: total ? Math.round((deterred / total) * 100) / 100 : null,
    estimated_loss: Math.round(estimated_loss * 100) / 100,
    by_zone: byZone,
    by_week: byWeek,
    top_zone,
    decision_hint: top_zone && top_zone.took_it >= 3
      ? `${top_zone.zone} lost ${top_zone.took_it} items this period; worth moving that shelf within sight of the till.`
      : 'Not enough losses in one zone yet to justify changing the layout.',
  };
}

async function harden(body) {
  const items = body && Array.isArray(body.items) ? body.items : null;
  if (!items) throw badRequest('expected {items:[{name, price, zone, thefts_30d}]}');
  const scored = items.map(it => {
    const price = num(it.price, 0);
    const thefts = Math.max(0, Math.floor(num(it.thefts_30d, 0)));
    const measure = chooseMeasure(thefts, price);
    const loss_30d = Math.round(thefts * price * 100) / 100;
    return {
      name: String(it.name || 'item'),
      zone: String(it.zone || 'shop floor'),
      price, thefts_30d: thefts, loss_30d,
      score: thefts * price,
      measure: measure.label,
      measure_id: measure.id,
      note: measure.id === 'raise_price' && thefts > 0
        ? `Shrink is ${Math.round((thefts / Math.max(1, thefts + 20)) * 1000) / 10}% of ~${thefts + 20} units; that is the minimum uplift to break even.`
        : measure.id === 'raise_price' ? 'No recorded thefts: leave it, or price in a small buffer.' : '',
    };
  }).sort((a, b) => b.score - a.score);
  const total_loss_30d = Math.round(scored.reduce((s, x) => s + x.loss_30d, 0) * 100) / 100;
  return { items: scored, total_loss_30d, rule: 'ranked by thefts_30d x price; one cheap measure per item from a fixed list' };
}

function register(add) {
  add('POST', '/api/theft/alert', alert);
  add('POST', '/api/theft/log', log);
  add('GET', '/api/theft/summary', summary);
  add('POST', '/api/theft/harden', harden);
}

module.exports = { register, choosePlaybook, chooseMeasure, alert, log, summary, harden, NEVER_DO };
