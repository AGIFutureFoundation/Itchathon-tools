#!/usr/bin/env node
// "Why Did It Come Back?" — demo server. Node 24 built-ins only.
// Serves app/public on :3141 and exposes POST /api/diagnose, which shells out
// to the Claude Code CLI (`claude -p`) with the newest prompts/returns/vN.md
// as the system prompt.

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const PORT = Number(process.env.PORT || 3141);
const MODEL = process.env.RETURNS_MODEL || 'claude-sonnet-5';
const TIMEOUT_MS = 90_000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const PROMPTS_DIR = path.join(__dirname, '..', 'prompts', 'returns');

const FALLBACK_PROMPT = `You are a returns root-cause analyst for small e-commerce apparel sellers.
You receive one JSON case: a listing (title, bullets, description, size_chart, photos_note),
a list of returns (reason_code, size_ordered, comment), reviews, and buyer messages.

Decide the ONE dominant cause of the returns for this SKU. Allowed causes:
  photos        - the images mislead (colour, fit, fabric, styling) versus the delivered item
  size_chart    - the size chart / sizing guidance is wrong or missing, buyers ordered their usual size and it did not fit
  garment       - a product defect or quality problem (stitching, fabric, shrinkage, damage)
  expectation   - listing text over-promises or is ambiguous (material, thickness, use-case)
  fulfilment    - wrong item / wrong size shipped, late, damaged in transit
  not_enough_data - fewer than 3 usable signals or signals contradict each other

Rules:
- Quote evidence VERBATIM from the returns/reviews/messages. Never paraphrase inside "evidence".
- Cite at least 2 quotes when confidence >= 0.6.
- Prefer size_chart over garment when several buyers of DIFFERENT sizes all say "too small" or "too big" the same way.
- Be concrete in the fix: give text the seller can paste directly.
- If cause is size_chart, write keep_size_message: a short, friendly message the seller can send a buyer BEFORE purchase
  to help them pick the size to keep (e.g. "If you are usually an M, order L"). Otherwise use "".

Output ONLY a single JSON object (no prose before it) with exactly this shape:
{"sku":"<short id from title>","cause":"photos|size_chart|garment|expectation|fulfilment|not_enough_data","confidence":0.0-1.0,"evidence":["verbatim quote", "..."],"fix":{"what_to_change":"photos|size_chart|listing_text|garment|fulfilment","paste_ready":"text the seller can paste"},"keep_size_message":"...","owner_line":"one plain sentence for the shop owner"}
After the JSON, on a new line, repeat owner_line as one plain-English sentence.`;

// ---------- prompt loading ----------
function loadSystemPrompt() {
  let best = null;
  try {
    for (const f of fs.readdirSync(PROMPTS_DIR)) {
      const m = /^v(\d+)\.md$/.exec(f);
      if (m) {
        const n = Number(m[1]);
        if (!best || n > best.n) best = { n, file: path.join(PROMPTS_DIR, f) };
      }
    }
  } catch { /* directory missing: fall back */ }
  if (!best) return { text: FALLBACK_PROMPT, source: 'built-in fallback' };
  let text = fs.readFileSync(best.file, 'utf8');
  text = stripHeader(text);
  return { text, source: path.basename(best.file) };
}

function stripHeader(text) {
  if (!text.startsWith('---')) return text;
  const lines = text.split('\n');
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') return lines.slice(i + 1).join('\n').trimStart();
  }
  return text;
}

// ---------- claude CLI ----------
function runClaude(systemPrompt, userMessage) {
  return new Promise((resolve, reject) => {
    const args = [
      '-p',
      '--model', MODEL,
      '--output-format', 'json',
      '--system-prompt', systemPrompt,
      '--tools', '',
    ];
    // Strip nested-session markers so `claude` runs cleanly from inside another Claude Code session.
    const env = { ...process.env };
    delete env.CLAUDECODE;
    delete env.CLAUDE_CODE_ENTRYPOINT;

    const child = spawn('claude', args, { env, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', err = '', done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      child.kill('SIGKILL');
      reject(Object.assign(new Error('claude CLI timed out after 90s'), { raw: out + err, status: 504 }));
    }, TIMEOUT_MS);

    child.stdout.on('data', d => out += d);
    child.stderr.on('data', d => err += d);
    child.on('error', e => { if (!done) { done = true; clearTimeout(timer); reject(Object.assign(e, { raw: err, status: 502 })); } });
    child.on('close', code => {
      if (done) return;
      done = true; clearTimeout(timer);
      if (code !== 0 && !out.trim()) return reject(Object.assign(new Error(`claude exited ${code}`), { raw: err || out, status: 502 }));
      resolve({ stdout: out, stderr: err });
    });
    child.stdin.end(userMessage);
  });
}

// Pull the first balanced {...} object out of text (handles ```json fences).
function extractFirstJson(text) {
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        const candidate = text.slice(start, i + 1);
        try { return { obj: JSON.parse(candidate), end: i + 1 }; } catch { return null; }
      }
    }
  }
  return null;
}

function trailingLine(text, from) {
  const rest = text.slice(from).replace(/```/g, '').trim();
  const lines = rest.split('\n').map(s => s.trim()).filter(Boolean);
  return lines.length ? lines[lines.length - 1] : '';
}

async function diagnose(caseBody) {
  const { text: systemPrompt, source } = loadSystemPrompt();
  const t0 = Date.now();
  const { stdout } = await runClaude(systemPrompt, JSON.stringify(caseBody, null, 2));
  let resultText;
  try {
    const cli = JSON.parse(stdout);
    resultText = typeof cli.result === 'string' ? cli.result : JSON.stringify(cli.result ?? cli);
    if (cli.is_error) throw Object.assign(new Error('claude CLI reported an error'), { raw: stdout, status: 502 });
  } catch (e) {
    if (e.status) throw e;
    // Not JSON — maybe plain text; try to salvage.
    resultText = stdout;
  }
  const found = extractFirstJson(resultText);
  if (!found) throw Object.assign(new Error('no JSON object in model output'), { raw: stdout, status: 502 });
  const obj = found.obj;
  const tail = trailingLine(resultText, found.end);
  if (!obj.owner_line && tail) obj.owner_line = tail;
  obj._meta = { prompt_source: source, model: MODEL, latency_ms: Date.now() - t0 };
  return obj;
}

// ---------- http ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

function send(res, status, body, type = 'application/json') {
  const data = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(data);
}

function readBody(req, limit = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let buf = '';
    req.on('data', d => { buf += d; if (buf.length > limit) { reject(new Error('body too large')); req.destroy(); } });
    req.on('end', () => resolve(buf));
    req.on('error', reject);
  });
}

// ---------- .env, platform layer, module registry ----------
try {
  for (const line of fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* no .env */ }

function optional(mod) { try { return require(mod); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') console.error(`[platform] ${mod}: ${e.message}`); return null; } }
const auth = optional('./platform/auth'), ratelimit = optional('./platform/ratelimit'), audit = optional('./platform/audit');
const redact = optional('./platform/redact'), guard = optional('./platform/guard');

// Every app/modules/*.js that exports register(add) is mounted automatically.
const routes = new Map(); // "METHOD /path" -> {handler, module}
const MODULES_DIR = path.join(__dirname, 'modules');
if (fs.existsSync(MODULES_DIR)) {
  for (const f of fs.readdirSync(MODULES_DIR).filter(f => f.endsWith('.js')).sort()) {
    const name = f.replace(/\.js$/, '');
    try {
      const mod = require(path.join(MODULES_DIR, f));
      if (typeof mod.register === 'function') {
        mod.register((method, route, handler) => routes.set(`${method.toUpperCase()} ${route}`, { handler, module: name }));
        console.log(`[modules] mounted ${name}`);
      }
    } catch (e) { console.error(`[modules] ${name} failed to load: ${e.message}`); }
  }
}
// The returns module is built in; it gets redaction + output guard + audit like the others.
routes.set('POST /api/diagnose', {
  module: 'returns',
  handler: async (body) => {
    if (!body.listing || !Array.isArray(body.returns)) {
      throw Object.assign(new Error('expected {listing:{...}, returns:[...], reviews:[], messages:[]}'), { status: 400 });
    }
    const inputs = redact ? redact.redact(body).value : body;
    const result = await diagnose(inputs);
    if (guard) {
      const g = guard.checkOutput(result, inputs);
      result._guard = { ok: g.ok, issues: g.issues };
      if (guard.injectionScore) result._guard.injection_score = guard.injectionScore(JSON.stringify(inputs));
      return g.result || result;
    }
    return result;
  },
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const key = `${req.method} ${url.pathname}`;
  if (routes.has(key)) {
    const { handler, module } = routes.get(key);
    let tenant = { tenant: 'default', modules: null };
    if (auth) {
      try { tenant = auth.authenticate(req) || tenant; }
      catch (e) { return send(res, e.status || 401, { error: e.message }); }
    }
    if (tenant.modules && !tenant.modules.includes(module)) return send(res, 403, { error: `module ${module} not enabled for tenant` });
    if (ratelimit && !ratelimit.allow(tenant.tenant)) return send(res, 429, { error: 'rate limit: 60 requests/min per tenant' });
    let body = {};
    if (req.method !== 'GET') {
      try { body = JSON.parse(await readBody(req) || '{}'); }
      catch (e) { return send(res, 400, { error: 'invalid JSON body: ' + e.message }); }
    }
    const t0 = Date.now();
    try {
      const result = await handler(body, req);
      if (audit) { try { audit.record(module, body, result, { tenant: tenant.tenant, module, prompt_version: result?._meta?.prompt_source, model: result?._meta?.model, latency_ms: Date.now() - t0 }); } catch (e) { console.error('[audit]', e.message); } }
      return send(res, 200, result);
    } catch (e) {
      return send(res, e.status || 502, { error: e.message, raw: (e.raw || '').slice(0, 20000) });
    }
  }
  if (req.method === 'GET' && url.pathname === '/api/health') {
    const { source } = loadSystemPrompt();
    return send(res, 200, { ok: true, prompt_source: source, model: MODEL, modules: [...new Set([...routes.values()].map(r => r.module))],
      platform: { auth: !!auth, ratelimit: !!ratelimit, audit: !!audit, redact: !!redact, guard: !!guard } });
  }
  if (req.method === 'GET') {
    const home = fs.existsSync(path.join(PUBLIC_DIR, 'dashboard.html')) ? '/dashboard.html' : '/index.html';
    let p = url.pathname === '/' ? home : url.pathname;
    const file = path.normalize(path.join(PUBLIC_DIR, p));
    if (!file.startsWith(PUBLIC_DIR)) return send(res, 403, 'forbidden', 'text/plain');
    fs.readFile(file, (err, data) => {
      if (err) return send(res, 404, 'not found', 'text/plain');
      send(res, 200, data, MIME[path.extname(file)] || 'application/octet-stream');
    });
    return;
  }
  send(res, 405, 'method not allowed', 'text/plain');
});

server.listen(PORT, () => {
  const { source } = loadSystemPrompt();
  console.log(`Why Did It Come Back?  http://localhost:${PORT}  (prompt: ${source}, model: ${MODEL})`);
});
