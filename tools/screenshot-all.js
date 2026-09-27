// tools/screenshot-all.js
// Loads a realistic filled state for each Sapient.X page and captures
// dark/light full-page screenshots at 1440x900, plus mobile dark screenshots
// for dashboard.html and index.html.
//
// Usage: node tools/screenshot-all.js
// Requires the app server running on http://localhost:3141 (playwright lives
// in tools/node_modules).

const path = require('path');
const fs = require('fs');
const { chromium } = require(path.join(__dirname, 'node_modules', 'playwright'));

const BASE = 'http://localhost:3141';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'media', 'screenshots');

for (const sub of ['dark', 'light', 'mobile']) {
  fs.mkdirSync(path.join(OUT, sub), { recursive: true });
}

async function fillDashboard(page) {
  // Dashboard auto-populates its cards (from live data or an inline fallback
  // demo) on load — no button to click. Wait for the headline numbers to move
  // off their initial "–" placeholder.
  await page.waitForFunction(() => {
    const el = document.getElementById('n-returns');
    return el && el.textContent.trim() !== '' && el.textContent.trim() !== '–';
  }, { timeout: 20000 }).catch(() => {});
  // Let the echarts panels finish animating in.
  await page.waitForTimeout(1200);
}

async function fillIndex(page) {
  await page.click('#load');
  await page.click('#go');
  // Diagnose can take up to ~40s per the UI copy ("usually 10-40s").
  await page.waitForFunction(() => {
    const r = document.getElementById('result');
    return r && !r.textContent.includes('Working') && !r.textContent.includes('Result will appear here');
  }, { timeout: 60000 });
  await page.waitForTimeout(300);
}

async function fillPrep(page) {
  await page.click('#load');
  // Clicking Load also triggers run(); wait for the table to populate.
  await page.waitForSelector('#table:not([hidden])', { timeout: 20000 });
  await page.waitForTimeout(300);
}

async function fillAds(page) {
  await page.click('#loadSample');
  await page.click('#readRun');
  await page.waitForFunction(() => {
    const el = document.getElementById('readOut');
    return el && el.textContent.trim().length > 0;
  }, { timeout: 60000 });
  // Also exercise the A/B test card with its prefilled defaults so it isn't empty.
  await page.click('#abRun');
  await page.waitForFunction(() => {
    const el = document.getElementById('abOut');
    return el && el.textContent.trim().length > 0;
  }, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(300);
}

async function fillTheft(page) {
  // Form already ships with sensible prefilled defaults (zone, value, staff).
  await page.click('#go');
  await page.waitForFunction(() => {
    const r = document.getElementById('result');
    return r && r.textContent.includes('What to do now') && !r.textContent.includes('Fire an alert to see');
  }, { timeout: 20000 });
  await page.waitForTimeout(300);
}

const PAGES = [
  { name: 'dashboard.html', fill: fillDashboard, mobile: true },
  { name: 'index.html', fill: fillIndex, mobile: true },
  { name: 'prep.html', fill: fillPrep, mobile: false },
  { name: 'ads.html', fill: fillAds, mobile: false },
  { name: 'theft.html', fill: fillTheft, mobile: false },
];

async function shoot(browser, { name, fill }, { colorScheme, viewport, outDir }) {
  const context = await browser.newContext({ colorScheme, viewport });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  try {
    await page.goto(`${BASE}/${name}`, { waitUntil: 'networkidle', timeout: 30000 });
    await fill(page);
  } catch (err) {
    errors.push(String(err));
  }
  const outPath = path.join(outDir, name.replace('.html', '.png'));
  await page.screenshot({ path: outPath, fullPage: true });
  await context.close();
  return { outPath, errors };
}

async function main() {
  const health = await fetch(`${BASE}/api/health`).catch(() => null);
  if (!health || !health.ok) {
    console.error('Server not responding on :3141. Start it with `node app/server.js &` first.');
    process.exit(1);
  }

  const browser = await chromium.launch();
  const results = [];

  for (const p of PAGES) {
    for (const mode of ['dark', 'light']) {
      const outDir = path.join(OUT, mode);
      const r = await shoot(browser, p, { colorScheme: mode, viewport: { width: 1440, height: 900 }, outDir });
      console.log(`[${mode}] ${p.name} -> ${r.outPath}${r.errors.length ? '  ERRORS: ' + r.errors.join(' | ') : ''}`);
      results.push({ page: p.name, mode, ...r });
    }
    if (p.mobile) {
      const outDir = path.join(OUT, 'mobile');
      const r = await shoot(browser, p, { colorScheme: 'dark', viewport: { width: 390, height: 844 }, outDir });
      console.log(`[mobile-dark] ${p.name} -> ${r.outPath}${r.errors.length ? '  ERRORS: ' + r.errors.join(' | ') : ''}`);
      results.push({ page: p.name, mode: 'mobile-dark', ...r });
    }
  }

  await browser.close();

  const failed = results.filter((r) => r.errors.length);
  console.log(`\nDone. ${results.length} screenshots taken, ${failed.length} with page errors.`);
  if (failed.length) {
    for (const f of failed) console.log(`  FAILED-ish: ${f.page} [${f.mode}]: ${f.errors.join(' | ')}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
