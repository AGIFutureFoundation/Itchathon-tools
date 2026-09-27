// Tenant auth — `Authorization: Bearer <key>` looked up in config/tenants.json.
// Unauthenticated requests fall back to tenant "default" with every module so
// the local demo keeps working; set REQUIRE_AUTH=1 to turn that off.
//
//   const { authenticate } = require('./platform/auth');
//   const who = authenticate(req);            // { tenant, plan, modules }
//   if (!who) return send(res, 401, { error: 'missing or unknown API key' });
//   if (!who.modules.includes('theft')) return send(res, 403, ...)

const fs = require('node:fs');
const path = require('node:path');

const TENANTS_FILE = path.join(__dirname, '..', '..', 'config', 'tenants.json');
const ALL_MODULES = ['returns', 'prep', 'ads', 'theft'];
const DEFAULT_TENANT = Object.freeze({ tenant: 'default', plan: 'demo', modules: ALL_MODULES });

let cache = { mtime: 0, byKey: new Map() };

// Reload tenants.json whenever it changes on disk (no restart needed to add a tenant).
function loadTenants() {
  let stat;
  try { stat = fs.statSync(TENANTS_FILE); } catch { cache = { mtime: 0, byKey: new Map() }; return cache.byKey; }
  if (stat.mtimeMs === cache.mtime) return cache.byKey;
  const byKey = new Map();
  try {
    const cfg = JSON.parse(fs.readFileSync(TENANTS_FILE, 'utf8'));
    for (const t of cfg.tenants || []) {
      if (!t.key || !t.tenant) continue;
      byKey.set(t.key, {
        tenant: t.tenant,
        plan: t.plan || 'standard',
        modules: Array.isArray(t.modules) && t.modules.length ? t.modules : ALL_MODULES,
        rate_limit_per_min: t.rate_limit_per_min,
      });
    }
  } catch (e) {
    console.error('[auth] could not read tenants.json:', e.message);
  }
  cache = { mtime: stat.mtimeMs, byKey };
  return byKey;
}

function requireAuth() {
  return process.env.REQUIRE_AUTH === '1' || process.env.REQUIRE_AUTH === 'true';
}

function bearer(req) {
  const h = (req && req.headers && (req.headers.authorization || req.headers.Authorization)) || '';
  const m = /^Bearer\s+(\S+)$/i.exec(String(h).trim());
  return m ? m[1] : null;
}

// Returns {tenant, plan, modules} or null when auth is required and the key is
// missing/unknown. A key that is present but unknown is always rejected, even in
// demo mode, so a typo never silently becomes "default".
function authenticate(req) {
  const key = bearer(req);
  if (!key) return requireAuth() ? null : { ...DEFAULT_TENANT };
  const t = loadTenants().get(key);
  if (!t) return null;
  return { tenant: t.tenant, plan: t.plan, modules: [...t.modules], rate_limit_per_min: t.rate_limit_per_min };
}

function canUse(who, moduleName) {
  return Boolean(who && who.modules.includes(moduleName));
}

module.exports = { authenticate, canUse, requireAuth, ALL_MODULES, TENANTS_FILE };
