// Audit log — one JSONL file per day under data/audit/. Node built-ins only.
// Every model call (and every deterministic answer, if the caller wants) gets a
// row that ties the answer to a tenant, a module, a prompt version and a model.
// The raw input is NOT stored: only its sha256, so a row can be matched to a
// request without keeping buyer text around.
//
//   const audit = require('./platform/audit');
//   audit.record('diagnose', body, result, { tenant, module: 'returns', prompt_version: 'v3', model, latency_ms });
//   audit.query({ tenant: 'ben', module: 'returns', since: '2026-09-01' });

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const AUDIT_DIR = path.join(__dirname, '..', '..', 'data', 'audit');
const RETENTION_DAYS = Number(process.env.AUDIT_RETENTION_DAYS || 90);

function sha256(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? null);
  return crypto.createHash('sha256').update(text).digest('hex');
}

function dayOf(ts) {
  return new Date(ts).toISOString().slice(0, 10);
}

function fileFor(day) {
  return path.join(AUDIT_DIR, `${day}.jsonl`);
}

// Append one row. Returns the row so the caller can attach its id to the response.
function record(kind, payload, result, meta = {}) {
  const ts = new Date().toISOString();
  const row = {
    id: crypto.randomUUID(),
    ts,
    tenant: meta.tenant || 'default',
    module: meta.module || kind,
    kind,
    prompt_version: meta.prompt_version || null,
    model: meta.model || null,
    latency_ms: Number.isFinite(meta.latency_ms) ? meta.latency_ms : null,
    input_sha256: sha256(payload),
    ok: !(result instanceof Error) && !(result && result.error),
    // A short, non-identifying summary of the result. Callers pass what is safe
    // to keep (a cause label, a score); never the buyer's text.
    result_summary: summarise(result),
  };
  if (meta.eval_score !== undefined) row.eval_score = meta.eval_score;
  try {
    fs.mkdirSync(AUDIT_DIR, { recursive: true });
    fs.appendFileSync(fileFor(dayOf(ts)), JSON.stringify(row) + '\n');
  } catch (e) {
    // Auditing must never take the request down; report and move on.
    console.error('[audit] write failed:', e.message);
  }
  return row;
}

function summarise(result) {
  if (result instanceof Error) return { error: result.message };
  if (!result || typeof result !== 'object') return null;
  const out = {};
  for (const k of ['cause', 'confidence', 'channel', 'timing_seconds', 'log_id', 'score', 'error']) {
    if (result[k] !== undefined) out[k] = result[k];
  }
  return Object.keys(out).length ? out : null;
}

// Read rows matching {tenant, module, since}. `since` is an ISO date or datetime.
// Only opens the day files that can contain matches.
function query({ tenant, module, since, limit = 1000 } = {}) {
  let files = [];
  try { files = fs.readdirSync(AUDIT_DIR).filter(f => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f)).sort(); }
  catch { return []; }
  const sinceDay = since ? dayOf(since) : null;
  const sinceTs = since ? new Date(since).getTime() : -Infinity;
  const rows = [];
  for (const f of files) {
    const day = f.slice(0, 10);
    if (sinceDay && day < sinceDay) continue;
    let text;
    try { text = fs.readFileSync(path.join(AUDIT_DIR, f), 'utf8'); } catch { continue; }
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      let row;
      try { row = JSON.parse(line); } catch { continue; }
      if (tenant && row.tenant !== tenant) continue;
      if (module && row.module !== module) continue;
      if (new Date(row.ts).getTime() < sinceTs) continue;
      rows.push(row);
      if (rows.length >= limit) return rows;
    }
  }
  return rows;
}

// Delete day files older than the retention window (default 90 days).
// Safe to call on startup or from a cron; returns the files removed.
function prune(days = RETENTION_DAYS) {
  const cutoff = dayOf(Date.now() - days * 86_400_000);
  const removed = [];
  let files = [];
  try { files = fs.readdirSync(AUDIT_DIR); } catch { return removed; }
  for (const f of files) {
    const m = /^(\d{4}-\d{2}-\d{2})\.jsonl$/.exec(f);
    if (m && m[1] < cutoff) {
      try { fs.unlinkSync(path.join(AUDIT_DIR, f)); removed.push(f); } catch { /* ignore */ }
    }
  }
  return removed;
}

module.exports = { record, query, prune, sha256, AUDIT_DIR, RETENTION_DAYS };
