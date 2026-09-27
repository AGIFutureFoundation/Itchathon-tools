// ASIN import: pull critical (1–3 star) Amazon reviews for one ASIN through the
// Apify actor junglee/amazon-reviews-scraper and reshape them into the app's
// diagnose input ({listing, returns, reviews, messages}).
//
// Token: process.env.APIFY_TOKEN (server.js loads .env). Node 24 built-ins only.
//
// Free-tier note: the actor caps free Apify accounts at 1 URL and 10 reviews per
// run; asking for more makes it page past 10 and time out, so we ask for 10.

const ACTOR = 'junglee~amazon-reviews-scraper';
const API = 'https://api.apify.com/v2';
const RUN_TIMEOUT_S = 180;           // actor-side timeout
const HTTP_TIMEOUT_MS = 200_000;     // our side, a bit longer than the actor's
const MAX_REVIEWS = 10;

function httpError(message, status, extra = {}) {
  return Object.assign(new Error(message), { status, ...extra });
}

function normalizeAsin(asin) {
  const s = String(asin || '').trim().toUpperCase();
  const m = /^(?:.*\/(?:DP|GP\/PRODUCT)\/)?([A-Z0-9]{10})(?:[/?#].*)?$/i.exec(s);
  if (!m) throw httpError('asin must be a 10-character Amazon ASIN (or a product URL containing /dp/<ASIN>)', 400);
  return m[1].toUpperCase();
}

// Map free-text review content to one of the app's reason codes.
function guessReasonCode(text, rating) {
  const t = (text || '').toLowerCase();
  if (/\b(wrong (item|size|colou?r)|sent (me )?(the wrong|a different)|not what i ordered|received .*instead)\b/.test(t)) return 'wrong_item';
  if (/\b(already worn|used item|arrived (damaged|broken|ripped|torn)|missing (a |the )?\w*|came (bubble )?wrapped|took (nearly |almost )?(a month|\d+ weeks)|never arrived|package)\b/.test(t)) return 'damaged';
  if (/\b(runs? (small|big|large|long|short)|too (small|big|tight|loose|long|short|large)|size(d|s)? (up|down)|didn'?t fit|doesn'?t fit|does not fit|did not fit|fit(s|ted)? (like|terribl)|size is (way )?off|sizing|swimming in|skin tight|baggy)\b/.test(t)) return 'doesnt_fit';
  if (/\b(not as (pictured|described|shown)|nothing like the (photo|picture)|(color|colour)s? (is|are|was|were) (not|off|different)|see[- ]?thr(ough|u)|sheer|transparent|looks? (nothing|different) (like|from|than))\b/.test(t)) return 'not_as_described';
  if (/\b(cheap|thin|poor quality|quality|fell apart|falling apart|tread|sole|stitch|seam|pilling|hole|broke|smell|flimsy|worn (out|through))\b/.test(t)) return 'quality';
  if (/\b(didn'?t like|not for me|changed my mind|not my style|just ok|okay)\b/.test(t)) return 'changed_mind';
  return rating && rating <= 2 ? 'quality' : 'changed_mind';
}

function sizeOf(item) {
  for (const kv of item.variantAttributes || []) {
    if (/size/i.test(kv.key || '')) return kv.value || null;
  }
  const m = /size:\s*([^,;|]+)/i.exec(item.variant || '');
  return m ? m[1].trim() : null;
}

// Convert actor dataset items to the app's input shape. Exported for tests.
function toDiagnoseInput(asin, items) {
  const reviews = items.filter(x => typeof x.reviewDescription === 'string' && x.reviewDescription.trim());
  const product = (items.find(x => x.product && typeof x.product === 'object') || {}).product || {};
  const nImg = (product.highResolutionImages || product.galleryThumbnails || []).length;
  const listing = {
    title: product.title || `Amazon ASIN ${asin}`,
    bullets: Array.isArray(product.features) ? product.features.filter(Boolean) : [],
    description: typeof product.description === 'string' ? product.description : '',
    size_chart: null,
    photos_note: product.title
      ? `Amazon listing imported via Apify; ${nImg} gallery images; ${product.stars ?? '?'} stars over ${product.reviewsCount ?? '?'} ratings. No size chart or photo audit available from the import.`
      : '',
  };
  return {
    listing,
    returns: reviews.map(r => ({
      reason_code: guessReasonCode(`${r.reviewTitle || ''} ${r.reviewDescription}`, r.ratingScore),
      size_ordered: sizeOf(r),
      comment: r.reviewDescription.trim(),
    })),
    // Review headlines are short real buyer language; bodies already live in returns[].comment.
    reviews: reviews.map(r => (r.reviewTitle || '').trim()).filter(Boolean),
    messages: [],
    _meta: {
      source: `apify:${ACTOR.replace('~', '/')}`,
      asin,
      resolved_asin: product.asin || reviews[0]?.productAsin || asin,
      review_count: reviews.length,
      filter: 'critical (1-3 stars), sorted by helpful',
    },
  };
}

async function fetchAsin(asin) {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw httpError('APIFY_TOKEN is not set (add it to .env at the project root)', 503);
  const clean = normalizeAsin(asin);

  const url = `${API}/acts/${ACTOR}/run-sync-get-dataset-items?timeout=${RUN_TIMEOUT_S}&memory=1024&clean=true`;
  const input = {
    productUrls: [{ url: `https://www.amazon.com/dp/${clean}` }],
    maxReviews: MAX_REVIEWS,
    filterByRatings: ['critical'],
    sort: 'helpful',
    scrapeProductDetails: true,
    includeGdprSensitive: false,
  };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), HTTP_TIMEOUT_MS);
  let res, text;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
      signal: ctrl.signal,
    });
    text = await res.text();
  } catch (e) {
    throw httpError(e.name === 'AbortError' ? `Apify run exceeded ${HTTP_TIMEOUT_MS / 1000}s` : `Apify request failed: ${e.message}`, 504);
  } finally {
    clearTimeout(timer);
  }

  let data;
  try { data = JSON.parse(text); } catch { throw httpError('Apify returned non-JSON', 502, { raw: text.slice(0, 2000) }); }
  if (!res.ok || (data && !Array.isArray(data) && data.error)) {
    const err = (data && data.error) || {};
    throw httpError(`Apify ${res.status}: ${err.message || err.type || 'actor run failed'}`, res.status >= 400 && res.status < 600 ? res.status : 502, { raw: text.slice(0, 2000) });
  }
  if (!Array.isArray(data)) throw httpError('Apify returned an unexpected payload', 502, { raw: text.slice(0, 2000) });

  const out = toDiagnoseInput(clean, data);
  if (!out.returns.length) {
    throw httpError(`No critical (1-3 star) reviews found for ASIN ${clean}. Amazon may have none, or the ASIN may be a variant that redirects.`, 404, { listing: out.listing, _meta: out._meta });
  }
  return out;
}

// Route registration for server.js's module auto-loader.
//   add('POST', '/api/import-asin', async (body) => ({...}))
function register(add) {
  add('POST', '/api/import-asin', async (body) => {
    const asin = body && (body.asin || body.url);
    if (!asin) throw httpError('expected {asin: "B0XXXXXXXX"}', 400);
    return fetchAsin(asin);
  });
}

module.exports = { register, fetchAsin, toDiagnoseInput, guessReasonCode, normalizeAsin };
