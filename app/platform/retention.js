'use strict';
// retention.js — deletes expired records so we never hold data longer than docs/COMPLIANCE.md promises.
//
//   node app/platform/retention.js --dry-run [--data-dir data] [--audit-days 90] [--theft-log-days 365]
//                                  [--raw-imports-days 30] [--theft-description-hours 24]
//   const { sweep } = require('./platform/retention'); sweep(dataDir, { dryRun: true });
//
// Layout (all relative to dataDir):
//   audit/*.jsonl        one JSON object per line, timestamp in ts|time|timestamp|at|created_at   -> line-level expiry
//   theft/*.jsonl        same shape; additionally person_description is blanked after 24h        -> line-level expiry
//   raw_imports/**       uploaded CSV/JSON as received (pre-redaction)                             -> file-level expiry by mtime
// Lines without a parseable timestamp are KEPT (conservative) and counted in `unparsed`.
// Rewrites are atomic (tmp file + rename). Nothing is touched when dryRun is true.

const fs = require('node:fs');
const path = require('node:path');

const DEFAULTS = { auditDays: 90, theftLogDays: 365, rawImportsDays: 30, theftDescriptionHours: 24, dryRun: false, now: null };
const TS_FIELDS = ['ts', 'time', 'timestamp', 'at', 'created_at', 'createdAt'];

function parseTs(rec) {
  for (const f of TS_FIELDS) {
    const v = rec[f];
    if (v == null) continue;
    if (typeof v === 'number') return v < 1e11 ? v * 1000 : v; // seconds vs ms
    if (typeof v === 'string') { const t = Date.parse(v); if (!Number.isNaN(t)) return t; }
  }
  return null;
}

function listFiles(dir, recursive = false) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) { if (recursive) out.push(...listFiles(p, true)); }
    else if (ent.isFile()) out.push(p);
  }
  return out;
}

function atomicWrite(file, content) {
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, file);
}

/** Sweep one JSONL directory. transform(rec, ageMs) may return a modified record (or the same one). */
function sweepJsonl(dir, cutoffMs, now, dryRun, transform) {
  const stats = { files: 0, kept: 0, removed: 0, modified: 0, unparsed: 0, rewritten: [] };
  for (const file of listFiles(dir).filter((f) => f.endsWith('.jsonl'))) {
    stats.files++;
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    const out = [];
    let changed = false;
    for (const line of lines) {
      if (!line.trim()) continue;
      let rec;
      try { rec = JSON.parse(line); } catch { stats.unparsed++; out.push(line); continue; }
      const ts = parseTs(rec);
      if (ts == null) { stats.unparsed++; out.push(line); continue; }
      if (ts < cutoffMs) { stats.removed++; changed = true; continue; }
      if (transform) {
        const next = transform(rec, now - ts);
        if (next !== rec) { stats.modified++; changed = true; out.push(JSON.stringify(next)); stats.kept++; continue; }
      }
      stats.kept++; out.push(line);
    }
    if (changed) {
      stats.rewritten.push(file);
      if (!dryRun) atomicWrite(file, out.length ? out.join('\n') + '\n' : '');
    }
  }
  return stats;
}

function sweepFiles(dir, cutoffMs, dryRun) {
  const stats = { scanned: 0, deleted: [] };
  for (const file of listFiles(dir, true)) {
    stats.scanned++;
    if (fs.statSync(file).mtimeMs < cutoffMs) {
      stats.deleted.push(file);
      if (!dryRun) fs.unlinkSync(file);
    }
  }
  if (!dryRun) pruneEmptyDirs(dir);
  return stats;
}

function pruneEmptyDirs(dir) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const p = path.join(dir, ent.name);
    pruneEmptyDirs(p);
    if (fs.readdirSync(p).length === 0) fs.rmdirSync(p);
  }
}

/** sweep(dataDir, opts) -> report. See header for opts. */
function sweep(dataDir, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const now = o.now || Date.now();
  const day = 86400000;
  const dryRun = !!o.dryRun;
  const descCutoffMs = o.theftDescriptionHours * 3600000;

  const audit = sweepJsonl(path.join(dataDir, 'audit'), now - o.auditDays * day, now, dryRun);
  const theft = sweepJsonl(path.join(dataDir, 'theft'), now - o.theftLogDays * day, now, dryRun, (rec, ageMs) => {
    // free-text description of a person is the most sensitive field we ever hold; blank it after 24h
    if (ageMs > descCutoffMs && rec.person_description && rec.person_description !== '[REDACTED]') {
      return { ...rec, person_description: '[REDACTED]' };
    }
    return rec;
  });
  const rawImports = sweepFiles(path.join(dataDir, 'raw_imports'), now - o.rawImportsDays * day, dryRun);

  return {
    dryRun, dataDir, now: new Date(now).toISOString(),
    policy: { auditDays: o.auditDays, theftLogDays: o.theftLogDays, rawImportsDays: o.rawImportsDays, theftDescriptionHours: o.theftDescriptionHours },
    audit, theft, rawImports,
    totals: {
      linesRemoved: audit.removed + theft.removed,
      linesModified: theft.modified,
      filesRewritten: audit.rewritten.length + theft.rewritten.length,
      filesDeleted: rawImports.deleted.length,
    },
  };
}

function cli(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) args[key] = true;
    else { args[key] = /^\d+$/.test(next) ? Number(next) : next; i++; }
  }
  const dataDir = args.dataDir || process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
  const opts = {
    dryRun: !!args.dryRun,
    auditDays: args.auditDays ?? DEFAULTS.auditDays,
    theftLogDays: args.theftLogDays ?? DEFAULTS.theftLogDays,
    rawImportsDays: args.rawImportsDays ?? DEFAULTS.rawImportsDays,
    theftDescriptionHours: args.theftDescriptionHours ?? DEFAULTS.theftDescriptionHours,
  };
  const report = sweep(dataDir, opts);
  console.log(JSON.stringify(report, null, 2));
  if (report.dryRun) console.error('dry run: nothing was changed');
}

if (require.main === module) cli(process.argv.slice(2));

module.exports = { sweep, sweepJsonl, sweepFiles, parseTs, DEFAULTS };
