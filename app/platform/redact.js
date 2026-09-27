'use strict';
// redact.js — PII redaction that runs BEFORE the model call and BEFORE the grounding check.
//
//   const { redact, wrapUntrusted } = require('./platform/redact');
//   const { value: safeInputs, map } = redact(inputs);   // map: { "[EMAIL_1]": "jane@x.com", ... }
//   prompt user turn = wrapUntrusted(safeInputs);
//   guard.checkOutput(modelJson, safeInputs);            // evidence quotes must match the REDACTED text
//
// Placeholders are stable per distinct value within one call ([EMAIL_1], [EMAIL_2], [PHONE_1] ...),
// contain no digits, and are never re-matched by later passes. Object keys are not redacted.
// Heuristic by design: it prefers a false positive on a buyer's phone number over a miss.

const TYPES = ['EMAIL', 'IBAN', 'ORDER', 'CARD', 'PHONE', 'ADDRESS']; // pass order matters (see below)

const RE = {
  EMAIL: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
  // IBAN: 2 letters, 2 check digits, then 11–30 alphanumerics, optional space groups. Validated with mod-97.
  IBAN: /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){2,7}(?:[ ]?[A-Z0-9]{1,4})?\b/g,
  // Amazon 3-7-7, Etsy receipt/order/transaction ids (9–11 digits after a cue word), "#123456789".
  ORDER: /\b\d{3}-\d{7}-\d{7}\b|\b(?:order|receipt|transaction|txn)\s*(?:id|no\.?|number)?\s*[#:]?\s*\d{9,11}\b|#\d{9,11}\b/gi,
  // 13–19 digits with optional single spaces/dashes; Luhn-checked.
  CARD: /\b(?:\d[ -]?){12,18}\d\b/g,
  // Phone candidates; validated (7–15 digits, not an ISO date, separator or >=10 digits).
  PHONE: /(?:(?:\+|00)\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}(?:[\s.-]?\d{1,4})?/g,
  // "12 Oak Street", "221B Baker St.", "4500 N Main Ave, Apt 3". Number + up to 3 words + street type.
  ADDRESS_US: /\b\d{1,6}[A-Za-z]?(?:\s+(?:N|S|E|W|NE|NW|SE|SW|North|South|East|West))?(?:\s+[A-Za-z][A-Za-z'-]*){1,3}\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Place|Pl|Terrace|Ter|Close|Crescent|Cres|Square|Sq|Highway|Hwy|Parkway|Pkwy|Circle|Cir|Trail|Trl|Row|Gardens|Gdns|Strasse|Straße|Str|Rue|Via|Calle)\b\.?(?:,?\s+(?:Apt|Apartment|Unit|Suite|Ste|Flat|#)\s*[A-Za-z0-9-]+)?/gi,
  // European order: "Musterstraße 12", "Hauptstr. 4a", "Rue de Rivoli 10", "Via Roma 3".
  ADDRESS_EU: /\b(?:[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'-]*(?:straße|strasse|str\.|weg|platz|allee|gasse|ring|damm|ufer|laan|straat|plein|gade|vej)|(?:Rue|Via|Piazza|Calle|Avenida|Plaza|Place|Chemin|Allée|Boulevard)\s+(?:[A-Za-zÀ-ÿ'-]+\s+){1,3})\s*\d{1,5}[A-Za-z]?\b/g,
};
// One pass per entry; several passes may feed the same placeholder type.
const PASSES = [['EMAIL', 'EMAIL'], ['IBAN', 'IBAN'], ['ORDER', 'ORDER'], ['CARD', 'CARD'], ['PHONE', 'PHONE'], ['ADDRESS', 'ADDRESS_US'], ['ADDRESS', 'ADDRESS_EU']];

const STREET_ABBR = /^(st|dr|ct|pl|ln|rd|ave|blvd|sq|ter|cir|trl|hwy|str)\.?$/i;

function luhn(digits) {
  let sum = 0, dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d; dbl = !dbl;
  }
  return sum % 10 === 0;
}

function ibanValid(raw) {
  const s = raw.replace(/\s+/g, '').toUpperCase();
  if (s.length < 15 || s.length > 34) return false;
  const rearranged = s.slice(4) + s.slice(0, 4);
  let rem = 0;
  for (const ch of rearranged) {
    const v = ch >= 'A' && ch <= 'Z' ? String(ch.charCodeAt(0) - 55) : ch;
    for (const d of v) rem = (rem * 10 + (d.charCodeAt(0) - 48)) % 97;
  }
  return rem === 1;
}

const VALID = {
  EMAIL: () => true,
  IBAN: (m) => ibanValid(m),
  ORDER: () => true,
  CARD: (m) => { const d = m.replace(/\D/g, ''); return d.length >= 13 && d.length <= 19 && !/^(\d)\1+$/.test(d) && luhn(d); },
  PHONE: (m) => {
    const d = m.replace(/\D/g, '');
    if (d.length < 7 || d.length > 15) return false;
    if (/^\d{4}-\d{2}-\d{2}$/.test(m.trim()) || /^\d{2}[./-]\d{2}[./-]\d{4}$/.test(m.trim())) return false; // dates
    if (/^\d{4}\s*-\s*\d{4}$/.test(m.trim())) return false; // year ranges "2023-2024"
    const hasSep = /[+()\s.-]/.test(m.trim());
    return hasSep || d.length >= 10;
  },
  ADDRESS: (m) => {
    // Abbreviated street types need at least one real word before them ("12 Oak St" yes, "3 Dr" no).
    const parts = m.trim().split(/[\s,]+/);
    const typeIdx = parts.findIndex((p, i) => i > 0 && STREET_ABBR.test(p));
    if (typeIdx !== -1 && typeIdx < 2) return false;
    return true;
  },
};

function makeState() {
  const perType = {};
  for (const t of TYPES) perType[t] = new Map();
  return { perType, map: {} };
}

function redactString(str, state) {
  let out = str;
  for (const [type, reName] of PASSES) {
    const re = RE[reName];
    re.lastIndex = 0;
    out = out.replace(re, (m) => {
      if (!VALID[type](m)) return m;
      // same value written differently -> same placeholder (555.010.9999 == (555) 010-9999)
      const key = type === 'IBAN' || type === 'CARD' || type === 'PHONE' ? m.replace(/\D/g, '') : m.trim();
      const bucket = state.perType[type];
      let ph = bucket.get(key);
      if (!ph) {
        ph = `[${type}_${bucket.size + 1}]`;
        bucket.set(key, ph);
        state.map[ph] = m.trim();
      }
      // preserve leading/trailing whitespace the regex may have swallowed (phone pass)
      const lead = m.match(/^\s*/)[0], trail = m.match(/\s*$/)[0];
      return lead + ph + trail;
    });
  }
  return out;
}

function walk(v, state) {
  if (typeof v === 'string') return redactString(v, state);
  if (Array.isArray(v)) return v.map((x) => walk(x, state));
  if (v && typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v)) o[k] = walk(v[k], state);
    return o;
  }
  return v;
}

/** redact(text | object) -> { value, map }  where map = { "[EMAIL_1]": "original", ... } */
function redact(input) {
  const state = makeState();
  const value = walk(input, state);
  return { value, map: state.map };
}

/** Wrap already-redacted inputs for the prompt. The clause in prompts/meta/compliance_clause.md
 *  tells the model everything inside this tag is data, never instructions. */
function wrapUntrusted(obj) {
  const json = typeof obj === 'string' ? obj : JSON.stringify(obj);
  // A buyer cannot close the tag early: neutralise any literal closing tag inside the payload.
  const safe = json.replace(/<\/?untrusted_buyer_text>/gi, '[tag_removed]');
  return `<untrusted_buyer_text>\n${safe}\n</untrusted_buyer_text>`;
}

/** True if a string contains a placeholder produced by redact(). */
const PLACEHOLDER_RE = /\[(?:EMAIL|PHONE|ADDRESS|ORDER|CARD|IBAN)_\d+\]/g;

module.exports = { redact, wrapUntrusted, luhn, ibanValid, PLACEHOLDER_RE, TYPES };
