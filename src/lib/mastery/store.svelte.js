import { SECTIONS } from '$lib/mastery/sections.js';
import * as algo from '$lib/mastery/algorithm.js';

const STORAGE_KEY = 'mastery_v1';
const STORAGE_KEY_V2 = 'mastery_v2';

/** Per-section BKT guess rates (1 / number of choices) */
const GUESS_RATES = {
  fretboard: 0.05,
  intervals: 0.08,
  triads: 0.25,
  sevenths: 0.20,
  scales: 0.17,
  builder: 0.10,
  iiVI: 0.08,
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function loadV2() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_V2);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

let data = $state(load());
let v2 = $state(loadV2());

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function saveV2() {
  localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(v2));
}

function sectionRecords(sectionId) {
  return data[sectionId] || {};
}

/** Lazily create v2 section state, migrating from v1 if data exists */
function ensureSection(sectionId) {
  if (v2[sectionId]) return;
  const section = SECTIONS[sectionId];
  if (!section) return;
  const v1Records = data[sectionId] || {};
  const items = {};
  for (const key of section.items) {
    const v1Rec = v1Records[key];
    if (v1Rec && v1Rec.n > 0) {
      // migrateItemRecord already incorporates priorDifficulty into b
      items[key] = algo.migrateItemRecord(v1Rec, key, sectionId);
    } else {
      const rec = algo.emptyEnsembleRecord();
      rec.b = algo.priorDifficulty(key, sectionId);
      items[key] = rec;
    }
  }
  v2 = { ...v2, [sectionId]: { _sec: algo.emptySectionState(), ...items } };
  saveV2();
}

export function getSectionScore(sectionId) {
  const section = SECTIONS[sectionId];
  if (!section) return 0;
  return algo.score(sectionRecords(sectionId), section);
}

export function record(sectionId, itemKey, correct, responseTimeMs) {
  // v1 update (unchanged)
  const prev = data[sectionId] || {};
  const rec = prev[itemKey];
  const updated = algo.recordAttempt(rec, correct, responseTimeMs);
  data = { ...data, [sectionId]: { ...prev, [itemKey]: updated } };
  save();

  // v2 ensemble update
  ensureSection(sectionId);
  const sec = v2[sectionId];
  if (!sec) return;
  const itemRec = sec[itemKey];
  if (!itemRec) return;
  const secState = sec._sec;
  const actual = correct ? 1 : 0;

  // Predictions for Brier scoring
  const irtP = algo.irtPredict(secState.theta, itemRec.b);
  const pG = GUESS_RATES[sectionId] ?? algo.BKT_PARAMS.defaultGuess;
  const pS = algo.BKT_PARAMS.defaultSlip;
  const bktP = algo.bktPredict(itemRec.pL, pG, pS);
  const now = Date.now();
  const ppeUrg = algo.ppeUrgency(itemRec.n, itemRec.spacings, itemRec.first, now);
  const ppeP = 1 - ppeUrg; // PPE predicts P(correct) as memory strength

  // IRT update
  const { theta, b } = algo.irtUpdate(secState.theta, itemRec.b, correct, itemRec.n);

  // BKT update
  const newPL = algo.bktUpdate(itemRec.pL, correct, pG, pS, algo.BKT_PARAMS.pT);

  // Spacings update
  const lastTime = itemRec.first > 0 ? (itemRec.spacings.length > 0
    ? now - (itemRec.first + itemRec.spacings.reduce((a, b) => a + b, 0))
    : now - itemRec.first)
    : 0;
  const newSpacings = itemRec.first > 0
    ? [...itemRec.spacings, lastTime].slice(-5)
    : [];
  const newFirst = itemRec.first > 0 ? itemRec.first : now;

  // Brier score updates
  const alpha = algo.ENS_CFG.EMA_ALPHA;
  const newBrier = [
    algo.brierUpdate(irtP, actual, secState.brier[0], alpha),
    algo.brierUpdate(ppeP, actual, secState.brier[1], alpha),
    algo.brierUpdate(bktP, actual, secState.brier[2], alpha),
  ];

  // Update ensemble weights
  const { w } = algo.updateWeights(newBrier, alpha);

  // Build updated v2 state
  const newItem = {
    pL: newPL,
    first: newFirst,
    spacings: newSpacings,
    b,
    n: itemRec.n + 1,
  };
  const newSec = {
    ...sec,
    _sec: { theta, w, brier: newBrier },
    [itemKey]: newItem,
  };
  v2 = { ...v2, [sectionId]: newSec };
  saveV2();
}

export function nextPractice(sectionId) {
  const section = SECTIONS[sectionId];
  if (!section) return null;
  return algo.nextPractice(sectionRecords(sectionId), section);
}

export function nextQuiz(sectionId) {
  const section = SECTIONS[sectionId];
  if (!section) return null;

  // Try ensemble selection
  ensureSection(sectionId);
  const sec = v2[sectionId];
  if (sec && sec._sec) {
    const { _sec, ...items } = sec;
    if (Object.keys(items).length > 0) {
      const pG = GUESS_RATES[sectionId] ?? algo.BKT_PARAMS.defaultGuess;
      const pick = algo.nextQuizEnsemble(items, _sec, { guess: pG });
      if (pick) return pick;
    }
  }

  // Fallback to v1 selection
  return algo.nextQuiz(sectionRecords(sectionId), section);
}

export function resetSection(sectionId) {
  const { [sectionId]: _, ...rest } = data;
  data = rest;
  save();

  const { [sectionId]: _v2, ...restV2 } = v2;
  v2 = restV2;
  saveV2();
}
