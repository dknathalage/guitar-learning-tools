/** Empty record template */
export function emptyRecord() {
  return { n: 0, h: 0, rt: [], last: 0 };
}

/**
 * Score a section 0-100.
 * coverage (0.4) + accuracy (0.4) + speed (0.2)
 */
export function score(records, section) {
  const { items, targetMs } = section;
  if (items.length === 0) return 0;

  let attempted = 0;
  let totalN = 0;
  let totalH = 0;
  let fast = 0;

  for (const key of items) {
    const r = records[key];
    if (!r || r.n === 0) continue;
    attempted++;
    totalN += r.n;
    totalH += r.h;
    const avgRt = r.rt.reduce((a, b) => a + b, 0) / r.rt.length;
    if (avgRt <= targetMs) fast++;
  }

  const coverage = attempted / items.length;
  const accuracy = totalN > 0 ? totalH / totalN : 0;
  const speed = attempted > 0 ? fast / attempted : 0;

  return Math.round((coverage * 0.4 + accuracy * 0.4 + speed * 0.2) * 100);
}

/**
 * Pick next item for practice mode.
 * Favors unattempted (10), low-accuracy (5), recency bonus (×1.5 if not seen in 60s).
 */
export function nextPractice(records, section) {
  const now = Date.now();
  return weightedPick(section.items, key => {
    const r = records[key];
    let w;
    if (!r || r.n === 0) {
      w = 10;
    } else {
      const acc = r.h / r.n;
      w = acc < 0.5 ? 5 : 1;
    }
    if (!r || !r.last || now - r.last > 60_000) w *= 1.5;
    return w;
  });
}

/**
 * Pick next item for quiz mode.
 * Favors seen-but-struggling (8), stale items (3), unattempted (1).
 * Time since last attempt increases weight.
 */
export function nextQuiz(records, section) {
  const now = Date.now();
  return weightedPick(section.items, key => {
    const r = records[key];
    if (!r || r.n === 0) return 1;
    const acc = r.h / r.n;
    const sinceLast = now - (r.last || 0);
    const stale = sinceLast > 300_000; // 5 min
    let w = acc < 0.7 ? 8 : (stale ? 3 : 1);
    // spaced repetition: scale by minutes since last seen (capped)
    const minsSince = Math.min(sinceLast / 60_000, 30);
    w *= 1 + minsSince * 0.1;
    return w;
  });
}

/**
 * Record an attempt, return a new record object.
 */
export function recordAttempt(record, correct, responseTimeMs) {
  const prev = record || emptyRecord();
  return {
    n: prev.n + 1,
    h: prev.h + (correct ? 1 : 0),
    rt: [...prev.rt, responseTimeMs].slice(-5),
    last: Date.now()
  };
}

/** Weighted random selection from items using weightFn */
function weightedPick(items, weightFn) {
  let total = 0;
  const weights = items.map(key => {
    const w = weightFn(key);
    total += w;
    return w;
  });
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// ────────────────────────────────────────────────────────────────
// Ensemble algorithm: IRT + BKT + PPE adaptive quiz
// ────────────────────────────────────────────────────────────────

export const BKT_PARAMS = {
  defaultGuess: 0.25,
  defaultSlip: 0.1,
  pL0: 0.1,
  pT: 0.1,
};

export const IRT_CFG = {
  A: 1.0,
  STEP: 0.4,
  D_STEP: 0.15,
  DECAY: 0.01,
  MATCH_PEAK: 0.65,
  MATCH_SIGMA: 0.2,
};

export const PPE_CFG = {
  ALPHA_N: 0.1,
  ALPHA_S: 0.1,
  ALPHA_T: -0.3,
};

export const ENS_CFG = {
  EMA_ALPHA: 0.1,
  TOP_K: 5,
  TEMPERATURE: 0.5,
  INIT_BRIER: 0.25,
};

/** Domain-specific difficulty priors — positive = harder */
export const DIFFICULTY_PRIORS = {
  // Fretboard: sharps/flats harder than naturals
  fretboard: {
    'C#': 0.3, 'D#': 0.3, 'F#': 0.3, 'G#': 0.3, 'A#': 0.3,
  },
  // Intervals: tritone & minor 2nd harder, perfect 5th/octave easier
  intervals: (key) => {
    const semi = parseInt(key.split('_')[1], 10);
    if (semi === 6) return 0.5;   // tritone
    if (semi === 1 || semi === 11) return 0.3; // minor 2nd / major 7th
    if (semi === 7 || semi === 0) return -0.2; // perfect 5th / unison
    return 0.0;
  },
  // Triads: aug/dim harder
  triads: (key) => {
    const type = key.split('_')[1];
    if (type === 'aug' || type === 'dim') return 0.4;
    return 0.0;
  },
  // Sevenths: extended chords harder
  sevenths: (key) => {
    const type = key.split('_')[1];
    if (type === 'dim7' || type === 'm7b5') return 0.4;
    if (type === 'maj7') return 0.2;
    return 0.0;
  },
  // Scales: modes harder than basic scales
  scales: (key) => {
    const id = key.split('_')[1];
    if (id === 'dorian' || id === 'mixolydian') return 0.3;
    if (id === 'min_pent' || id === 'maj_pent') return -0.1;
    return 0.0;
  },
};

// ── IRT (1PL) ──────────────────────────────────────────────────

/** P(correct) under 1PL IRT */
export function irtPredict(theta, b, a = IRT_CFG.A) {
  return 1 / (1 + Math.exp(-a * (theta - b)));
}

/** Update theta and difficulty after an attempt */
export function irtUpdate(theta, b, correct, totalN) {
  const decay = 1 / (1 + totalN * IRT_CFG.DECAY);
  const P = irtPredict(theta, b);
  const thetaStep = IRT_CFG.STEP * decay;
  const dStep = IRT_CFG.D_STEP * decay;

  const newTheta = correct
    ? theta + thetaStep * (1 - P)
    : theta - thetaStep * P;

  const newB = correct
    ? b - dStep * (1 - P)
    : b + dStep * P;

  return { theta: newTheta, b: newB };
}

/** Gaussian difficulty-match score peaked at MATCH_PEAK */
export function irtDifficultyMatch(theta, b) {
  const P = irtPredict(theta, b);
  const diff = P - IRT_CFG.MATCH_PEAK;
  return Math.exp(-(diff * diff) / (2 * IRT_CFG.MATCH_SIGMA * IRT_CFG.MATCH_SIGMA));
}

// ── BKT ────────────────────────────────────────────────────────

/** P(correct) under BKT */
export function bktPredict(pL, pG, pS) {
  return pL * (1 - pS) + (1 - pL) * pG;
}

/** Bayesian knowledge tracing update — pL only increases */
export function bktUpdate(pL, correct, pG, pS, pT) {
  // Posterior P(L|obs)
  const pCorrect = bktPredict(pL, pG, pS);
  let posterior;
  if (correct) {
    posterior = (pL * (1 - pS)) / pCorrect;
  } else {
    posterior = (pL * pS) / (1 - pCorrect);
  }
  // Learning transition: P(L') = P(L|obs) + (1 - P(L|obs)) * pT
  const newPL = posterior + (1 - posterior) * pT;
  // pL only increases
  return Math.max(pL, newPL);
}

// ── PPE (Performance Prediction Equation) ──────────────────────

/** Raw PPE memory strength prediction */
export function ppePredict(n, avgSpacingHrs, totalTimeHrs) {
  if (n === 0 || totalTimeHrs === 0) return 0;
  return Math.pow(n, PPE_CFG.ALPHA_N)
    * Math.pow(Math.max(avgSpacingHrs, 0.001), PPE_CFG.ALPHA_S)
    * Math.pow(totalTimeHrs, PPE_CFG.ALPHA_T);
}

/** Compute urgency (1 - memory strength) from raw attempt data */
export function ppeUrgency(n, spacings, firstTimestamp, now) {
  if (n === 0) return 1.0;
  const totalTimeHrs = (now - firstTimestamp) / 3_600_000;
  if (totalTimeHrs <= 0) return 1.0;
  const avgSpacingHrs = spacings.length > 0
    ? spacings.reduce((a, b) => a + b, 0) / spacings.length / 3_600_000
    : totalTimeHrs;
  const P = ppePredict(n, avgSpacingHrs, totalTimeHrs);
  return Math.max(0, Math.min(1, 1 - P));
}

// ── Ensemble scoring ───────────────────────────────────────────

/** Clamp a value to [lo, hi] */
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/** Weighted geometric mean of scoring signals */
export function ensembleScore(irtMatch, urgency, oneMinusPL, weights) {
  const a = clamp(irtMatch, 0.001, 1);
  const b = clamp(urgency, 0.001, 1);
  const c = clamp(oneMinusPL, 0.001, 1);
  return Math.pow(a, weights[0]) * Math.pow(b, weights[1]) * Math.pow(c, weights[2]);
}

/** EMA Brier score update */
export function brierUpdate(predicted, actual, oldBrier, alpha) {
  const err = (predicted - actual) * (predicted - actual);
  return oldBrier * (1 - alpha) + err * alpha;
}

/** Compute inverse-Brier weights normalized to sum to 1 */
export function updateWeights(brier, emaAlpha) {
  // brier is [irt, ppe, bkt] array of EMA Brier scores
  const inv = brier.map(b => 1 / Math.max(b, 0.001));
  const sum = inv.reduce((a, b) => a + b, 0);
  const w = inv.map(v => v / sum);
  return { w, brier };
}

// ── Selection ──────────────────────────────────────────────────

/** Softmax selection from scored candidates */
function softmaxPick(candidates, temperature) {
  const maxScore = Math.max(...candidates.map(c => c.score));
  const exps = candidates.map(c => Math.exp((c.score - maxScore) / temperature));
  const sum = exps.reduce((a, b) => a + b, 0);
  let r = Math.random() * sum;
  for (let i = 0; i < candidates.length; i++) {
    r -= exps[i];
    if (r <= 0) return candidates[i].key;
  }
  return candidates[candidates.length - 1].key;
}

/**
 * Ensemble-based quiz item selection.
 * items: { [key]: { pL, first, spacings, b, n } }
 * sectionState: { theta, w, brier }
 * cfg: { guess?, slip?, pT? }
 */
export function nextQuizEnsemble(items, sectionState, cfg = {}) {
  const { theta, w } = sectionState;
  const now = Date.now();
  const pG = cfg.guess ?? BKT_PARAMS.defaultGuess;
  const pS = cfg.slip ?? BKT_PARAMS.defaultSlip;

  const scored = [];
  for (const key of Object.keys(items)) {
    const rec = items[key];
    const match = irtDifficultyMatch(theta, rec.b);
    const urg = ppeUrgency(rec.n, rec.spacings, rec.first, now);
    const oneMinusPL = 1 - rec.pL;
    const s = ensembleScore(match, urg, oneMinusPL, w);
    scored.push({ key, score: s });
  }

  // Sort descending and take top-K
  scored.sort((a, b) => b.score - a.score);
  const topK = scored.slice(0, ENS_CFG.TOP_K);

  if (topK.length === 0) return null;
  if (topK.length === 1) return topK[0].key;

  return softmaxPick(topK, ENS_CFG.TEMPERATURE);
}

// ── Init / Migration ───────────────────────────────────────────

/** Empty ensemble item record */
export function emptyEnsembleRecord() {
  return { pL: 0.1, first: 0, spacings: [], b: 0.0, n: 0 };
}

/** Empty section state for ensemble algorithm */
export function emptySectionState() {
  return {
    theta: 0.0,
    w: [1 / 3, 1 / 3, 1 / 3],
    brier: [ENS_CFG.INIT_BRIER, ENS_CFG.INIT_BRIER, ENS_CFG.INIT_BRIER],
  };
}

/** Look up prior difficulty for an item key in a section */
export function priorDifficulty(itemKey, sectionKey) {
  const prior = DIFFICULTY_PRIORS[sectionKey];
  if (!prior) return 0.0;
  if (typeof prior === 'function') return prior(itemKey);
  return prior[itemKey] ?? 0.0;
}

/** Migrate a v1 record to ensemble record format */
export function migrateItemRecord(v1Record, itemKey, sectionKey) {
  if (!v1Record || v1Record.n === 0) return emptyEnsembleRecord();
  const acc = v1Record.h / v1Record.n;
  // Estimate difficulty: low accuracy -> higher difficulty
  const baseDiff = priorDifficulty(itemKey, sectionKey);
  const b = baseDiff + (1 - acc) * 2 - 1; // map 0% -> +1, 100% -> -1
  // Estimate pL from accuracy and attempt count
  const pL = Math.min(0.95, acc * Math.min(v1Record.n / 5, 1));
  return {
    pL,
    first: v1Record.last > 0 ? v1Record.last - v1Record.n * 60_000 : 0,
    spacings: v1Record.n > 1
      ? Array(v1Record.n - 1).fill(60_000)  // assume ~1 min spacing
      : [],
    b,
    n: v1Record.n,
  };
}
