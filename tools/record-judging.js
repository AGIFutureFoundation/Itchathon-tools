// Records the 90-second product demo and takes one screenshot per page.
//   node tools/record.js            (server must be running on :3141)
// Output: media/raw/<page>.webm clips + media/<page>.png. tools/make-demo.sh stitches them.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const BASE = process.env.BASE || 'http://localhost:3141';
const ROOT = path.join(__dirname, '..');
const MEDIA = path.join(ROOT, 'media');
const RAW = path.join(MEDIA, 'raw-judging');
fs.mkdirSync(RAW, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Each scene: page, what to click, how long to hold. Durations sum to ~90s incl. transitions.
const SCENES = [
  { name: 'dashboard', url: '/dashboard.html', hold: 13000, run: async p => { await sleep(3500); await p.mouse.wheel(0, 500); await sleep(3000); await p.mouse.wheel(0, 600); await sleep(3000); }, after: async p => { await p.mouse.wheel(0, -1100); } },
  { name: 'returns', url: '/index.html', hold: 27000, run: async p => { await p.click('#load'); await sleep(1500); await p.click('#go'); await p.waitForFunction(() => document.querySelector('#result') && document.querySelector('#result').textContent.trim().length > 40, null, { timeout: 60000 }).catch(() => {}); await sleep(3000); }, after: async p => { await p.mouse.wheel(0, 300); } },
  { name: 'prep', url: '/prep.html', hold: 13000, run: async p => { await p.click('#load'); await sleep(1200); await p.click('#run'); await sleep(2500); const b = await p.$('button[data-pref="sell out"], button[data-pref="waste"]'); if (b) { await b.click(); await sleep(800); await p.click('#run'); } await sleep(2000); }, after: async p => { await p.mouse.wheel(0, 400); } },
  { name: 'ads', url: '/ads.html', hold: 15000, run: async p => { const btn = await p.$('button.primary, button[type=submit], button'); if (btn) await btn.click(); await sleep(3000); }, after: async p => { await p.mouse.wheel(0, 500); } },
  { name: 'theft', url: '/theft.html', hold: 18000, run: async p => { await p.click('#go'); await sleep(6000); const d = await p.$('button[data-outcome="deterred"]'); if (d) await d.click(); await sleep(1500); }, after: async p => { await p.mouse.wheel(0, 500); } },
  { name: 'judging', url: '/dashboard.html', hold: 21000, run: async p => { await p.mouse.wheel(0, 1500); await sleep(5000); await p.mouse.wheel(0, 500); await sleep(5000); }, after: async p => { } },
];

(async () => {
  const browser = await chromium.launch();
  for (const s of SCENES) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: 'dark', recordVideo: { dir: RAW, size: { width: 1440, height: 900 } } });
    const page = await ctx.newPage();
    const t0 = Date.now();
    try {
      await page.goto(BASE + s.url, { waitUntil: 'networkidle', timeout: 30000 });
      await sleep(1500);
      await s.run(page);
    } catch (e) { console.error(`[${s.name}] ${e.message}`); }
    await page.screenshot({ path: path.join(RAW, `${s.name}.png`), fullPage: false });
    if (s.after) { await sleep(1500); await s.after(page).catch(() => {}); }
    const rest = s.hold - (Date.now() - t0);
    if (rest > 0) await sleep(rest);
    const video = page.video();
    await ctx.close();
    const src = await video.path();
    fs.renameSync(src, path.join(RAW, `${s.name}.webm`));
    console.log(`[${s.name}] ${((Date.now() - t0) / 1000).toFixed(1)}s -> media/${s.name}.png, media/raw/${s.name}.webm`);
  }
  await browser.close();
})();
