'use strict';
// guard.js — output guard + prompt-injection heuristic.
//
//   const { checkOutput, injectionScore, INJECTION_THRESHOLD } = require('./platform/guard');
//   const g = checkOutput(modelJson, redactedInputs, { systemPrompt });
//   if (!g.ok) ...   // g.issues = [{code, severity:'error'|'warning', field, detail}], g.result = cleaned copy
//
// Rules: (a) every evidence quote must be a verbatim substring of the (redacted) inputs;
//        (b) free-text fields may not carry URLs or tell the owner to contact anyone off-marketplace;
//        (c) anything that looks like a system-prompt leak is stripped from free-text fields.
// injectionScore(text) -> 0..1. Scores above INJECTION_THRESHOLD are logged by the caller, never blocked:
// a buyer's angry review can legitimately contain "ignore" and "instructions".

const { redact, PLACEHOLDER_RE } = require('./redact');

const FREE_TEXT_FIELDS = ['paste_ready', 'owner_line', 'change_next', 'keep_size_message', 'script', 'summary', 'plain_read'];
const INJECTION_THRESHOLD = 0.5;

const URL_RE = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|io|co|uk|de|fr|es|it|nl|shop|store|app|ai|me|info|biz|link|ly)\b(?:\/\S*)?/i;
const OFF_PLATFORM_RE = /\b(?:off[- ]platform|outside\s+(?:of\s+)?(?:amazon|etsy|ebay|the\s+(?:platform|marketplace|app))|personal\s+(?:email|number|phone|cell|mobile|whatsapp)|whatsapp|telegram|signal\s+app|facetime|home\s+address)\b/i;
const CONTACT_VERB_RE = /\b(?:call|phone|ring|text|sms|whatsapp|e-?mail|dm|message|reach\s+out\s+to|contact|visit)\b[^.!?\n]{0,50}?\b(?:buyer|buyers|customer|customers|them|him|her|the\s+reviewer|the\s+person)\b/i;
const MARKETPLACE_OK_RE = /\b(?:via|through|in|using|on|with)\s+(?:the\s+)?(?:amazon|etsy|ebay|marketplace|platform|seller\s+central|buyer[- ]seller\s+messag\w*|shop\s+manager|order\s+page|conversations?\s+tab)\b/i;

// Phrases that only occur in our system prompts / prompt scaffolding, never in a buyer-facing answer.
const LEAK_RE = /(?:<\/?system_prompt>|<\/?untrusted_buyer_text>|\bsystem\s+prompt\b|\bYou are RETURNS ROOT-CAUSE\b|##\s*(?:OUTPUT|STEP 0|EVIDENCE|DECISION LADDER|CONFIDENCE|FIX|SILENT CHECKS|COMPLIANCE)\b|\bRule\s+\d\s+—|\bhard contract\b|\bcompliance clause\b|\bdecision ladder\b|\b(?:my|the|these)\s+instructions\s+(?:say|state|tell|require)\b|\bas an ai (?:language )?model\b)/i;

function collectStrings(v, out = []) {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => collectStrings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => collectStrings(x, out));
  return out;
}

function grounded(quote, strings, blob) {
  const q = quote.trim();
  if (!q) return false;
  return strings.some((s) => s.includes(q)) || blob.includes(q);
}

function shingles(text, n) {
  const words = text.split(/\s+/).filter(Boolean);
  const set = new Set();
  for (let i = 0; i + n <= words.length; i++) set.add(words.slice(i, i + n).join(' ').toLowerCase());
  return set;
}

function stripLeaks(text, promptShingles, issues, field) {
  // Split into sentences/lines; drop any that trips LEAK_RE or copies >=10 consecutive words of the system prompt.
  const parts = text.split(/(?<=[.!?\n])\s+|\n/);
  const kept = [];
  for (const part of parts) {
    let leak = LEAK_RE.test(part);
    if (!leak && promptShingles) {
      for (const sh of shingles(part, 10)) if (promptShingles.has(sh)) { leak = true; break; }
    }
    if (leak) issues.push({ code: 'prompt_leak_stripped', severity: 'warning', field, detail: part.slice(0, 120) });
    else kept.push(part);
  }
  return kept.join(' ').replace(/\s{2,}/g, ' ').trim();
}

function walkFreeText(node, fn, pathKey = '') {
  if (Array.isArray(node)) return node.map((x, i) => walkFreeText(x, fn, `${pathKey}[${i}]`));
  if (node && typeof node === 'object') {
    const o = {};
    for (const k of Object.keys(node)) {
      const p = pathKey ? `${pathKey}.${k}` : k;
      o[k] = FREE_TEXT_FIELDS.includes(k) && typeof node[k] === 'string' ? fn(node[k], p) : walkFreeText(node[k], fn, p);
    }
    return o;
  }
  return node;
}

/**
 * checkOutput(result, inputs, opts?) -> { ok, issues, result }
 *  result: parsed model JSON. inputs: the REDACTED inputs given to the model (object or string).
 *  opts.systemPrompt: if given, verbatim 10-word overlaps with it are stripped as leaks.
 *  opts.fields: override the free-text field list.
 */
function checkOutput(result, inputs, opts = {}) {
  const issues = [];
  if (!result || typeof result !== 'object') {
    return { ok: false, issues: [{ code: 'not_an_object', severity: 'error', detail: typeof result }], result };
  }
  const strings = collectStrings(inputs);
  const blob = typeof inputs === 'string' ? inputs : JSON.stringify(inputs);
  const inputPlaceholders = new Set((blob.match(PLACEHOLDER_RE) || []));
  const promptShingles = opts.systemPrompt ? shingles(opts.systemPrompt, 10) : null;
  const fields = opts.fields || FREE_TEXT_FIELDS;

  let out = JSON.parse(JSON.stringify(result));

  // (a) evidence grounding — drop ungrounded quotes, flag as error
  if (Array.isArray(out.evidence)) {
    const keep = [];
    for (const q of out.evidence) {
      if (typeof q === 'string' && grounded(q, strings, blob)) keep.push(q);
      else issues.push({ code: 'evidence_not_verbatim', severity: 'error', field: 'evidence', detail: String(q).slice(0, 160) });
    }
    out.evidence = keep;
  } else if (out.evidence !== undefined) {
    issues.push({ code: 'evidence_not_array', severity: 'error', field: 'evidence' });
  }

  // (b)+(c) free-text checks
  out = walkFreeText(out, (text, field) => {
    if (!fields.includes(field.split('.').pop())) return text;
    if (URL_RE.test(text)) issues.push({ code: 'url_in_output', severity: 'error', field, detail: (text.match(URL_RE) || [''])[0] });
    if (OFF_PLATFORM_RE.test(text)) issues.push({ code: 'off_platform_contact', severity: 'error', field, detail: (text.match(OFF_PLATFORM_RE) || [''])[0] });
    const m = text.match(CONTACT_VERB_RE);
    if (m && !MARKETPLACE_OK_RE.test(text)) {
      issues.push({ code: 'contact_outside_marketplace', severity: 'error', field, detail: m[0].slice(0, 120) });
    }
    // raw PII that was not in the (redacted) inputs = model invented or de-anonymised contact details
    const { map } = redact(text);
    for (const [ph, original] of Object.entries(map)) {
      if (/^\[(?:EMAIL|PHONE|CARD|IBAN)_/.test(ph)) issues.push({ code: 'pii_in_output', severity: 'error', field, detail: original.slice(0, 60) });
    }
    for (const ph of text.match(PLACEHOLDER_RE) || []) {
      if (!inputPlaceholders.has(ph)) issues.push({ code: 'unknown_placeholder', severity: 'warning', field, detail: ph });
    }
    return stripLeaks(text, promptShingles, issues, field);
  });

  const ok = !issues.some((i) => i.severity === 'error');
  return { ok, issues, result: out };
}

// ---- prompt-injection heuristic -------------------------------------------------------------
const INJECTION_PATTERNS = [
  [/\b(?:ignore|disregard|forget|override)\b[^.\n]{0,40}\b(?:previous|prior|above|earlier|all|your|the)\b[^.\n]{0,20}\b(?:instructions?|prompts?|rules|guidelines|directions)\b/i, 0.7],
  [/\b(?:you are now|from now on you|act as|pretend (?:to be|you are)|roleplay as|new persona)\b/i, 0.5],
  [/\b(?:system prompt|developer message|hidden prompt|initial prompt)\b/i, 0.45],
  [/\b(?:reveal|print|show|output|repeat|leak)\b[^.\n]{0,30}\b(?:your|the)\s+(?:instructions|prompt|rules|system message)\b/i, 0.6],
  [/\b(?:respond|reply|answer|output)\s+(?:only\s+)?with\b[^.\n]{0,60}\b(?:json|text|the following|exactly|verbatim)\b/i, 0.35],
  [/\bset\s+(?:the\s+)?(?:cause|confidence|verdict|score|winner|owner_line)\s+(?:to|=|as)\b/i, 0.6],
  [/(?:^|\n)\s*(?:###\s*)?(?:system|assistant|human|user)\s*:/i, 0.4],
  [/<\/?(?:system|assistant|instructions?|system_prompt|untrusted_buyer_text|tool_call|function_call)\b[^>]*>/i, 0.6],
  [/\b(?:jailbreak|DAN mode|do anything now|developer mode enabled)\b/i, 0.6],
  [/\b(?:do not|don't|never)\s+(?:follow|obey|listen to)\b[^.\n]{0,30}\b(?:seller|owner|system|developer|above)\b/i, 0.5],
  [/\b(?:this is (?:a|an) (?:test|authorized|admin|official) (?:message|instruction|override))\b/i, 0.4],
  [/\b(?:important|urgent|attention)\s*[:!]\s*(?:ai|assistant|model|claude|gpt|llm)\b/i, 0.5],
  [/\b(?:claude|chatgpt|gpt-?4|assistant|language model|ai model)\b[^.\n]{0,40}\b(?:you must|you should|please|now)\b/i, 0.35],
  [/[​-‏⁠﻿]/, 0.3],                         // zero-width characters
  [/(?:[A-Za-z0-9+/]{4}){20,}={0,2}/, 0.25],                       // long base64 run
  [/(?:\\u00[0-9a-f]{2}){6,}|(?:&#x?[0-9a-f]+;){6,}/i, 0.3],     // heavy escaping
];

/** injectionScore(text) -> 0..1 combined probability-style score from weighted pattern hits. */
function injectionScore(text) {
  if (text == null) return 0;
  const t = typeof text === 'string' ? text : JSON.stringify(text);
  let notHit = 1;
  for (const [re, w] of INJECTION_PATTERNS) if (re.test(t)) notHit *= 1 - w;
  return Math.round((1 - notHit) * 1000) / 1000;
}

/** Convenience: score and return {score, flagged, hits}. */
function injectionReport(text) {
  const t = typeof text === 'string' ? text : JSON.stringify(text ?? '');
  const hits = INJECTION_PATTERNS.filter(([re]) => re.test(t)).map(([re]) => re.source.slice(0, 50));
  const score = injectionScore(t);
  return { score, flagged: score >= INJECTION_THRESHOLD, hits };
}

module.exports = { checkOutput, injectionScore, injectionReport, INJECTION_THRESHOLD, FREE_TEXT_FIELDS };
