// Token bucket per tenant. Default 60 requests/minute, refilled continuously.
//
//   const { allow } = require('./platform/ratelimit');
//   const verdict = allow(who.tenant);          // { ok, remaining, retry_after_ms }
//   if (!verdict.ok) return send(res, 429, { error: 'rate limited', retry_after_ms: verdict.retry_after_ms });

const DEFAULT_PER_MIN = Number(process.env.RATE_LIMIT_PER_MIN || 60);
const buckets = new Map(); // tenant -> { tokens, updated, capacity, refillPerMs }

function bucketFor(tenant, perMin) {
  const capacity = perMin || DEFAULT_PER_MIN;
  let b = buckets.get(tenant);
  if (!b || b.capacity !== capacity) {
    b = { tokens: capacity, updated: Date.now(), capacity, refillPerMs: capacity / 60_000 };
    buckets.set(tenant, b);
  }
  return b;
}

function refill(b, now) {
  const elapsed = now - b.updated;
  if (elapsed > 0) {
    b.tokens = Math.min(b.capacity, b.tokens + elapsed * b.refillPerMs);
    b.updated = now;
  }
}

// Consume one token for `tenant`. `perMin` overrides the default for tenants on
// a bigger plan (auth.js passes rate_limit_per_min from tenants.json).
function allow(tenant = 'default', perMin) {
  const now = Date.now();
  const b = bucketFor(tenant, perMin);
  refill(b, now);
  if (b.tokens >= 1) {
    b.tokens -= 1;
    return { ok: true, remaining: Math.floor(b.tokens), retry_after_ms: 0 };
  }
  const retry_after_ms = Math.ceil((1 - b.tokens) / b.refillPerMs);
  return { ok: false, remaining: 0, retry_after_ms };
}

// Forget idle buckets so the map does not grow forever (call from a timer).
function sweep(idleMs = 10 * 60_000) {
  const now = Date.now();
  for (const [k, b] of buckets) if (now - b.updated > idleMs) buckets.delete(k);
}

function reset(tenant) {
  if (tenant === undefined) buckets.clear(); else buckets.delete(tenant);
}

module.exports = { allow, sweep, reset, DEFAULT_PER_MIN };
