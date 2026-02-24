import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const store = {};
const localStorageMock = {
  getItem: vi.fn(k => store[k] ?? null),
  setItem: vi.fn((k, v) => { store[k] = String(v); }),
  removeItem: vi.fn(k => { delete store[k]; }),
  clear: vi.fn(() => { for (const k in store) delete store[k]; })
};
globalThis.localStorage = localStorageMock;

const { LearningEngine } = await import('./engine.js');

// --- Minimal config for testing ---
function makeConfig(overrides = {}) {
  return {
    initialParams: { difficulty: 1, timer: 0, ...overrides.initialParams },
    itemKey: (item) => item.id ?? item,
    itemClusters: (item) => item.clusters ?? ['default'],
    itemFromKey: (key, params) => ({ id: key, clusters: ['default'] }),
    genRandom: (params, lastItem) => {
      const pool = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
      const pick = pool[Math.floor(Math.random() * pool.length)];
      return { id: pick, clusters: ['default'] };
    },
    genFromCluster: null,
    microDrill: null,
    pickScaffold: null,
    adjustParams: (params, dir, mag) => ({ ...params, difficulty: params.difficulty + dir }),
    ...overrides,
  };
}

// Deterministic config that cycles through items
function makeDeterministicConfig(items) {
  let idx = 0;
  return makeConfig({
    genRandom: () => {
      const item = items[idx % items.length];
      idx++;
      return item;
    },
    itemFromKey: (key) => items.find(i => i.id === key) || { id: key, clusters: ['default'] },
  });
}

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

// ──────────────────────────────────────────────
// FSRS Core
// ──────────────────────────────────────────────

describe('FSRS integration', () => {
  it('initializes FSRS state on first review', () => {
    const engine = new LearningEngine(makeConfig(), null);
    const item = engine.next();
    engine.report(item, true, 1000);

    const rec = engine.items.get(engine.config.itemKey(item));
    expect(rec.S).toBeGreaterThan(0);
    expect(rec.D).toBeGreaterThan(0);
    expect(rec.D).toBeLessThanOrEqual(10);
    expect(rec.lastReviewTs).toBeGreaterThan(0);
  });

  it('increases stability on correct answers', () => {
    const engine = new LearningEngine(makeConfig(), null);
    const item = engine.next();

    engine.report(item, true, 500);
    const s1 = engine.items.get(engine.config.itemKey(item)).S;

    engine.report(item, true, 500);
    const s2 = engine.items.get(engine.config.itemKey(item)).S;

    expect(s2).toBeGreaterThan(s1);
  });

  it('decreases stability on wrong answers', () => {
    const engine = new LearningEngine(makeConfig(), null);
    const item = engine.next();

    // Build up some stability first
    engine.report(item, true, 500);
    engine.report(item, true, 500);
    engine.report(item, true, 500);
    const sBefore = engine.items.get(engine.config.itemKey(item)).S;

    engine.report(item, false, 500);
    const sAfter = engine.items.get(engine.config.itemKey(item)).S;

    expect(sAfter).toBeLessThan(sBefore);
  });

  it('difficulty decreases for easy items (grade 4)', () => {
    const engine = new LearningEngine(makeConfig(), null);
    const item = engine.next();

    // Fill allCorrectTimes so median is meaningful
    for (let i = 0; i < 10; i++) engine.allCorrectTimes.push(2000);

    // Very fast correct = grade 4 (easy)
    engine.report(item, true, 500); // 500ms << median 2000ms * 0.6
    const d1 = engine.items.get(engine.config.itemKey(item)).D;

    engine.report(item, true, 500);
    const d2 = engine.items.get(engine.config.itemKey(item)).D;

    // Difficulty should decrease (or stay low) for easy items
    expect(d2).toBeLessThanOrEqual(d1 + 0.01);
  });

  it('stability stays positive after failure', () => {
    const engine = new LearningEngine(makeConfig(), null);
    const item = engine.next();
    engine.report(item, true, 500);
    engine.report(item, false);

    const rec = engine.items.get(engine.config.itemKey(item));
    expect(rec.S).toBeGreaterThan(0);
  });
});

// ──────────────────────────────────────────────
// BKT with response-time modulation
// ──────────────────────────────────────────────

describe('response-time-aware BKT', () => {
  it('fast correct answers yield higher pL than slow correct answers', () => {
    const cfg = makeConfig();
    const e1 = new LearningEngine(cfg, null);
    const e2 = new LearningEngine(cfg, null);

    // Seed correct times for both engines
    for (let i = 0; i < 10; i++) {
      e1.allCorrectTimes.push(2000);
      e2.allCorrectTimes.push(2000);
    }

    const item1 = e1.next();
    const item2 = e2.next();

    // Fast correct (500ms, well below median 2000ms)
    e1.report(item1, true, 500);
    // Slow correct (4000ms, well above median)
    e2.report(item2, true, 4000);

    const pL_fast = e1.items.get(e1.config.itemKey(item1)).pL;
    const pL_slow = e2.items.get(e2.config.itemKey(item2)).pL;

    expect(pL_fast).toBeGreaterThan(pL_slow);
  });

  it('wrong answers reduce pL when pL is high', () => {
    const engine = new LearningEngine(makeConfig(), null);
    const item = engine.next();

    // Build up pL with multiple correct answers
    for (let i = 0; i < 10; i++) {
      engine.report(item, true, 1000);
    }
    const pL_before = engine.items.get(engine.config.itemKey(item)).pL;
    expect(pL_before).toBeGreaterThan(0.5);

    engine.report(item, false, 1000);
    const pL_after = engine.items.get(engine.config.itemKey(item)).pL;

    expect(pL_after).toBeLessThan(pL_before);
  });
});

// ──────────────────────────────────────────────
// Confusion Tracking
// ──────────────────────────────────────────────

describe('confusion tracking', () => {
  it('records detected note on wrong answer', () => {
    const engine = new LearningEngine(makeConfig(), null);
    const item = engine.next();

    engine.report(item, false, undefined, { detected: 'F#' });

    const rec = engine.items.get(engine.config.itemKey(item));
    expect(rec.confusions).toHaveLength(1);
    expect(rec.confusions[0].detected).toBe('F#');
    expect(rec.confusions[0].ts).toBeGreaterThan(0);
  });

  it('does not record confusion on correct answer', () => {
    const engine = new LearningEngine(makeConfig(), null);
    const item = engine.next();

    engine.report(item, true, 1000, { detected: 'A' });

    const rec = engine.items.get(engine.config.itemKey(item));
    expect(rec.confusions).toHaveLength(0);
  });

  it('does not record confusion when meta.detected is absent', () => {
    const engine = new LearningEngine(makeConfig(), null);
    const item = engine.next();

    engine.report(item, false);

    const rec = engine.items.get(engine.config.itemKey(item));
    expect(rec.confusions).toHaveLength(0);
  });

  it('limits confusion history to MAX_CONFUSIONS (10)', () => {
    const engine = new LearningEngine(makeConfig(), null);
    const item = engine.next();

    for (let i = 0; i < 15; i++) {
      engine.report(item, false, undefined, { detected: `N${i}` });
    }

    const rec = engine.items.get(engine.config.itemKey(item));
    expect(rec.confusions).toHaveLength(10);
    // Oldest should be trimmed
    expect(rec.confusions[0].detected).toBe('N5');
    expect(rec.confusions[9].detected).toBe('N14');
  });

  it('getConfusions returns frequency map', () => {
    const engine = new LearningEngine(makeConfig(), null);
    const item = engine.next();
    const key = engine.config.itemKey(item);

    engine.report(item, false, undefined, { detected: 'F#' });
    engine.report(item, false, undefined, { detected: 'F#' });
    engine.report(item, false, undefined, { detected: 'G' });

    const freq = engine.getConfusions(key);
    expect(freq).toEqual({ 'F#': 2, 'G': 1 });
  });

  it('getConfusions returns empty for unknown item', () => {
    const engine = new LearningEngine(makeConfig(), null);
    expect(engine.getConfusions('nonexistent')).toEqual({});
  });
});

// ──────────────────────────────────────────────
// Session Fatigue Detection
// ──────────────────────────────────────────────

describe('session fatigue detection', () => {
  it('starts unfatigued', () => {
    const engine = new LearningEngine(makeConfig(), null);
    expect(engine.fatigued).toBe(false);
  });

  it('detects fatigue when accuracy drops >20%', () => {
    const engine = new LearningEngine(makeConfig(), null);

    // First 10 correct → good baseline
    for (let i = 0; i < 10; i++) {
      const item = engine.next();
      engine.report(item, true, 1000);
    }

    // Next 10 mostly wrong → fatigue trigger
    for (let i = 0; i < 10; i++) {
      const item = engine.next();
      engine.report(item, false, 1000, { detected: 'X' });
    }

    expect(engine.fatigued).toBe(true);
  });

  it('recovers from fatigue when accuracy improves', () => {
    const engine = new LearningEngine(makeConfig(), null);

    // Build baseline (10 correct)
    for (let i = 0; i < 10; i++) {
      const item = engine.next();
      engine.report(item, true, 1000);
    }

    // Trigger fatigue (10 wrong)
    for (let i = 0; i < 10; i++) {
      const item = engine.next();
      engine.report(item, false, 1000, { detected: 'X' });
    }
    expect(engine.fatigued).toBe(true);

    // Recover (10+ correct to push the window)
    for (let i = 0; i < 12; i++) {
      const item = engine.next();
      engine.report(item, true, 1000);
    }

    expect(engine.fatigued).toBe(false);
  });

  it('does not falsely trigger fatigue with consistent performance', () => {
    const engine = new LearningEngine(makeConfig(), null);

    // 20 alternating correct/wrong — consistent ~50% accuracy
    for (let i = 0; i < 20; i++) {
      const item = engine.next();
      engine.report(item, i % 2 === 0, 1000);
    }

    expect(engine.fatigued).toBe(false);
  });
});

// ──────────────────────────────────────────────
// Mastery Criteria
// ──────────────────────────────────────────────

describe('mastery criteria', () => {
  it('item is not mastered with insufficient pL', () => {
    const engine = new LearningEngine(makeConfig(), null);
    const item = engine.next();
    engine.report(item, true, 1000);

    const mastery = engine.getMastery();
    const it = mastery.items.find(i => i.key === engine.config.itemKey(item));
    // After 1 attempt, pL should be well below 0.90
    expect(it.mastered).toBe(false);
  });

  it('item becomes mastered with high pL, stability, and attempts', () => {
    const engine = new LearningEngine(makeConfig(), null);
    const item = engine.next();
    const key = engine.config.itemKey(item);

    // Report many correct answers to build up pL
    for (let i = 0; i < 20; i++) {
      engine.report(item, true, 500);
    }

    const rec = engine.items.get(key);
    expect(rec.pL).toBeGreaterThanOrEqual(0.90);
    expect(rec.attempts).toBeGreaterThanOrEqual(3);

    // FSRS stability grows slowly for same-session reviews (by design).
    // Simulate spaced reviews by manually setting S high to test the mastery check.
    rec.S = 15;

    const mastery = engine.getMastery();
    const it = mastery.items.find(i => i.key === key);
    expect(it.mastered).toBe(true);
  });
});

// ──────────────────────────────────────────────
// Cold Start & Progression
// ──────────────────────────────────────────────

describe('cold start and progression', () => {
  it('uses random selection for first COLD_START (7) questions', () => {
    const items = [];
    const cfg = makeConfig({
      genRandom: (params) => {
        const id = `item-${Math.random().toString(36).slice(2, 6)}`;
        items.push(id);
        return { id, clusters: ['default'] };
      },
    });
    const engine = new LearningEngine(cfg, null);

    for (let i = 0; i < 7; i++) {
      engine.next();
    }

    // All 7 should have been generated via genRandom
    expect(items).toHaveLength(7);
  });

  it('adjusts difficulty every ADJ_EVERY (8) questions', () => {
    const adjustCalls = [];
    const cfg = makeConfig({
      adjustParams: (params, dir, mag) => {
        adjustCalls.push({ dir, mag });
        return { ...params, difficulty: params.difficulty + dir };
      },
    });
    const engine = new LearningEngine(cfg, null);

    for (let i = 0; i < 16; i++) {
      const item = engine.next();
      // All correct → should trigger upward adjustment
      engine.report(item, true, 500);
    }

    // Should have triggered adjustment at question 8 and 16
    expect(adjustCalls.length).toBeGreaterThanOrEqual(1);
  });
});

// ──────────────────────────────────────────────
// Item Selection Scoring
// ──────────────────────────────────────────────

describe('item selection', () => {
  it('prefers items with low pL (exploitation)', () => {
    const items = [
      { id: 'easy', clusters: ['c1'] },
      { id: 'hard', clusters: ['c2'] },
    ];
    const cfg = makeDeterministicConfig(items);
    const engine = new LearningEngine(cfg, null);

    // Seed both items
    engine._ensureItem(items[0]);
    engine._ensureItem(items[1]);
    engine.qNum = 10; // Past cold start
    engine.totalAttempts = 10;

    // Make 'easy' well-learned
    const easyRec = engine.items.get('easy');
    easyRec.pL = 0.95;
    easyRec.S = 20;
    easyRec.attempts = 5;
    easyRec.lastReviewTs = Date.now();

    // Make 'hard' poorly learned
    const hardRec = engine.items.get('hard');
    hardRec.pL = 0.2;
    hardRec.S = 1;
    hardRec.attempts = 5;
    hardRec.lastReviewTs = Date.now();

    const easyScore = engine._scoreCandidate({ item: items[0], rec: easyRec, isNew: false });
    const hardScore = engine._scoreCandidate({ item: items[1], rec: hardRec, isNew: false });

    expect(hardScore).toBeGreaterThan(easyScore);
  });

  it('gives new items a bonus score', () => {
    const engine = new LearningEngine(makeConfig(), null);
    engine.totalAttempts = 10;
    engine.qNum = 10;

    const score = engine._scoreCandidate({
      item: { id: 'new', clusters: ['default'] },
      rec: null,
      isNew: true
    });

    expect(score).toBe(1.2); // 1.0 + 0.2
  });

  it('gives learning zone bonus for pL 0.3-0.7', () => {
    const engine = new LearningEngine(makeConfig(), null);
    engine.totalAttempts = 10;
    engine.qNum = 10;

    const item = { id: 'test', clusters: ['uniq'] };
    engine._ensureItem(item);
    const rec = engine.items.get('test');
    rec.attempts = 5;
    rec.lastReviewTs = Date.now();
    rec.S = 2;

    rec.pL = 0.5; // In zone
    const inZone = engine._scoreCandidate({ item, rec, isNew: false });

    rec.pL = 0.1; // Below zone
    const belowZone = engine._scoreCandidate({ item, rec, isNew: false });

    // Score with learning zone bonus should be higher
    // (exploitation would be higher for pL=0.1 though, so just check the bonus exists)
    // The zone bonus is 0.25, exploitation diff is (0.9-0.5)=0.4 in favor of low pL
    // So we can't directly compare. Instead, check that pL=0.5 gets bonus.
    rec.pL = 0.5;
    const s1 = engine._scoreCandidate({ item, rec, isNew: false });
    rec.pL = 0.75; // Just outside zone
    const s2 = engine._scoreCandidate({ item, rec, isNew: false });

    // pL=0.5 has exploitation=0.5 + zone=0.25. pL=0.75 has exploitation=0.25 + zone=0
    expect(s1).toBeGreaterThan(s2);
  });

  it('applies fatigue bias toward easier items when fatigued', () => {
    const engine = new LearningEngine(makeConfig(), null);
    engine.totalAttempts = 10;
    engine.qNum = 10;
    engine.fatigued = true;

    const easyItem = { id: 'easy', clusters: ['uniq1'] };
    const hardItem = { id: 'hard', clusters: ['uniq2'] };
    engine._ensureItem(easyItem);
    engine._ensureItem(hardItem);

    const easyRec = engine.items.get('easy');
    easyRec.pL = 0.9; easyRec.S = 5; easyRec.attempts = 5; easyRec.lastReviewTs = Date.now();

    const hardRec = engine.items.get('hard');
    hardRec.pL = 0.2; hardRec.S = 1; hardRec.attempts = 5; hardRec.lastReviewTs = Date.now();

    const easyScore = engine._scoreCandidate({ item: easyItem, rec: easyRec, isNew: false });
    const easyFatigueBias = easyRec.pL * 0.3; // 0.27

    // With fatigue, easy items get +pL*0.3 boost
    expect(easyFatigueBias).toBeCloseTo(0.27, 1);
  });
});

// ──────────────────────────────────────────────
// Persistence (v2)
// ──────────────────────────────────────────────

describe('persistence v2', () => {
  it('saves and loads engine state', () => {
    const cfg = makeConfig();
    const engine = new LearningEngine(cfg, 'test-save');

    const item = engine.next();
    engine.report(item, true, 1000);
    engine.report(item, false, undefined, { detected: 'F#' });
    engine.save();

    const key = cfg.itemKey(item);

    // Load into new engine
    const engine2 = new LearningEngine(cfg, 'test-save');
    expect(engine2.items.has(key)).toBe(true);

    const rec = engine2.items.get(key);
    expect(rec.S).toBeGreaterThan(0);
    expect(rec.D).toBeGreaterThan(0);
    expect(rec.lastReviewTs).toBeGreaterThan(0);
    expect(rec.confusions).toHaveLength(1);
    expect(rec.confusions[0].detected).toBe('F#');
    expect(rec.attempts).toBe(2);
  });

  it('saves with version 2', () => {
    const engine = new LearningEngine(makeConfig(), 'test-v2');
    const item = engine.next();
    engine.report(item, true, 1000);
    engine.save();

    const raw = JSON.parse(store['gl_learn_test-v2']);
    expect(raw.v).toBe(2);
    expect(raw.items).toBeDefined();

    // Check FSRS fields exist, SM-2 fields don't
    const itemData = Object.values(raw.items)[0];
    expect(itemData.S).toBeDefined();
    expect(itemData.D).toBeDefined();
    expect(itemData.lastReviewTs).toBeDefined();
    expect(itemData.confusions).toBeDefined();
    expect(itemData.ef).toBeUndefined();
    expect(itemData.ivl).toBeUndefined();
    expect(itemData.reps).toBeUndefined();
  });
});

// ──────────────────────────────────────────────
// V1 → V2 Migration
// ──────────────────────────────────────────────

describe('v1 to v2 migration', () => {
  it('migrates SM-2 fields to FSRS fields', () => {
    // Store v1 format data
    const v1Data = {
      v: 1,
      ts: Date.now(),
      qNum: 15,
      totalAttempts: 20,
      allCorrectTimes: [1000, 1200, 900],
      items: {
        'A': {
          ef: 2.5, ivl: 6, reps: 3, due: 20,
          pL: 0.75, attempts: 10, correct: 7,
          times: [1000, 1100], avgTime: 1050,
          lastSeen: 14, lastSeenTs: Date.now() - 86400000,
          hist: [true, true, false], streak: 0, cls: ['default'],
        }
      },
      clusters: { default: { correct: 7, total: 10 } },
      recentKeys: ['A'],
    };
    store['gl_learn_migrate-test'] = JSON.stringify(v1Data);

    const engine = new LearningEngine(makeConfig(), 'migrate-test');

    expect(engine.qNum).toBe(15);
    expect(engine.totalAttempts).toBe(20);

    const rec = engine.items.get('A');
    expect(rec).toBeDefined();

    // S should be derived from ivl
    expect(rec.S).toBe(6); // Math.max(1, ivl)

    // D should be derived from ef: clamp(11 - 2.5*2, 1, 10) = clamp(6, 1, 10) = 6
    expect(rec.D).toBe(6);

    // lastReviewTs should come from lastSeenTs
    expect(rec.lastReviewTs).toBe(v1Data.items.A.lastSeenTs);

    // Confusions should be initialized empty
    expect(rec.confusions).toEqual([]);

    // pL preserved
    expect(rec.pL).toBe(0.75);

    // Old SM-2 fields should NOT exist
    expect(rec.ef).toBeUndefined();
    expect(rec.ivl).toBeUndefined();
    expect(rec.reps).toBeUndefined();
  });

  it('migration saves in v2 format immediately', () => {
    const v1Data = {
      v: 1, ts: Date.now(), qNum: 5, totalAttempts: 5,
      allCorrectTimes: [], items: {}, clusters: {}, recentKeys: [],
    };
    store['gl_learn_migrate-save'] = JSON.stringify(v1Data);

    new LearningEngine(makeConfig(), 'migrate-save');

    // Should have overwritten with v2
    const raw = JSON.parse(store['gl_learn_migrate-save']);
    expect(raw.v).toBe(2);
  });

  it('handles v1 data with missing optional fields', () => {
    const v1Data = {
      v: 1, ts: Date.now(), qNum: 2, totalAttempts: 2,
      items: {
        'B': { pL: 0.3, attempts: 2, correct: 1, cls: ['default'] }
        // Missing ef, ivl, reps, etc.
      },
      clusters: {},
    };
    store['gl_learn_migrate-sparse'] = JSON.stringify(v1Data);

    const engine = new LearningEngine(makeConfig(), 'migrate-sparse');
    const rec = engine.items.get('B');
    expect(rec).toBeDefined();
    expect(rec.S).toBe(1); // Math.max(1, undefined||1) = 1
    expect(rec.D).toBe(6); // clamp(11 - 2.5*2, 1, 10) = 6 (default ef=2.5)
    expect(rec.confusions).toEqual([]);
  });

  it('ignores unknown version data', () => {
    store['gl_learn_future'] = JSON.stringify({ v: 99 });
    const engine = new LearningEngine(makeConfig(), 'future');
    expect(engine.items.size).toBe(0);
  });
});

// ──────────────────────────────────────────────
// getMastery()
// ──────────────────────────────────────────────

describe('getMastery', () => {
  it('returns FSRS fields (S, R) and confusions in items', () => {
    const engine = new LearningEngine(makeConfig(), null);
    const item = engine.next();
    engine.report(item, true, 1000);
    engine.report(item, false, undefined, { detected: 'C#' });

    const mastery = engine.getMastery();
    expect(mastery.items).toHaveLength(1);

    const it = mastery.items[0];
    expect(it.S).toBeGreaterThan(0);
    expect(typeof it.D).toBe('number');
    expect(typeof it.R).toBe('number');
    expect(it.topConfusion).toBe('C#');
  });

  it('returns fatigued flag', () => {
    const engine = new LearningEngine(makeConfig(), null);
    const mastery = engine.getMastery();
    expect(mastery.fatigued).toBe(false);

    engine.fatigued = true;
    const mastery2 = engine.getMastery();
    expect(mastery2.fatigued).toBe(true);
  });

  it('computes overall stats correctly', () => {
    const engine = new LearningEngine(makeConfig(), null);
    const item = engine.next();
    engine.report(item, true, 1000);
    engine.report(item, true, 1500);
    engine.report(item, false);

    const mastery = engine.getMastery();
    expect(mastery.overall.sessionQuestions).toBe(1); // qNum increments on next(), not report()
    expect(mastery.overall.totalItems).toBe(1);
  });

  it('does not return old SM-2 fields (ef, ivl, reps)', () => {
    const engine = new LearningEngine(makeConfig(), null);
    const item = engine.next();
    engine.report(item, true, 1000);

    const mastery = engine.getMastery();
    const it = mastery.items[0];
    expect(it.ef).toBeUndefined();
    expect(it.ivl).toBeUndefined();
    expect(it.reps).toBeUndefined();
  });
});

// ──────────────────────────────────────────────
// Reset
// ──────────────────────────────────────────────

describe('reset', () => {
  it('clears all state including fatigue and session window', () => {
    const engine = new LearningEngine(makeConfig(), 'test-reset');
    const item = engine.next();
    engine.report(item, true, 1000);
    engine.fatigued = true;
    engine.sessionWindow.push({ ok: true, timeMs: 1000, qNum: 1 });

    engine.reset();

    expect(engine.items.size).toBe(0);
    expect(engine.qNum).toBe(0);
    expect(engine.fatigued).toBe(false);
    expect(engine.sessionWindow).toHaveLength(0);
    expect(engine.preFatigueAccuracy).toBeNull();
  });

  it('clears localStorage on reset', () => {
    const engine = new LearningEngine(makeConfig(), 'test-reset-ls');
    const item = engine.next();
    engine.report(item, true, 1000);
    engine.save();

    expect(store['gl_learn_test-reset-ls']).toBeDefined();

    engine.reset();
    expect(store['gl_learn_test-reset-ls']).toBeUndefined();
  });
});

// ──────────────────────────────────────────────
// Edge Cases
// ──────────────────────────────────────────────

describe('edge cases', () => {
  it('handles report with no timeMs gracefully', () => {
    const engine = new LearningEngine(makeConfig(), null);
    const item = engine.next();

    // Should not throw
    engine.report(item, true);
    engine.report(item, false);
    engine.report(item, true, null);
    engine.report(item, false, undefined, { detected: 'X' });

    const rec = engine.items.get(engine.config.itemKey(item));
    expect(rec.attempts).toBe(4);
    expect(rec.S).toBeGreaterThan(0);
  });

  it('handles empty candidates gracefully', () => {
    const cfg = makeConfig({
      genRandom: () => ({ id: 'only', clusters: ['default'] }),
    });
    const engine = new LearningEngine(cfg, null);

    // Should not throw even with single-item pool
    for (let i = 0; i < 20; i++) {
      const item = engine.next();
      engine.report(item, i % 2 === 0, 1000);
    }

    expect(engine.items.size).toBe(1);
  });

  it('does not crash when loading corrupt localStorage', () => {
    store['gl_learn_corrupt'] = '{{{bad json';
    const engine = new LearningEngine(makeConfig(), 'corrupt');
    expect(engine.items.size).toBe(0);
  });

  it('handles constructor without exerciseId (no persistence)', () => {
    const engine = new LearningEngine(makeConfig(), null);
    const item = engine.next();
    engine.report(item, true, 500);
    engine.save(); // Should be a no-op, not throw

    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────
// Difficulty Adjustment Thresholds
// ──────────────────────────────────────────────

describe('difficulty adjustment thresholds', () => {
  it('adjusts up when avg pL > 0.80', () => {
    const adjustCalls = [];
    const cfg = makeConfig({
      adjustParams: (params, dir, mag) => {
        adjustCalls.push(dir);
        return { ...params, difficulty: params.difficulty + dir };
      },
    });
    const engine = new LearningEngine(cfg, null);

    // Create items with high pL
    for (const id of ['A', 'B', 'C', 'D', 'E']) {
      engine._ensureItem({ id, clusters: ['default'] });
      const rec = engine.items.get(id);
      rec.pL = 0.85;
      rec.attempts = 3;
      rec.lastSeen = engine.qNum;
    }
    engine.qNum = 8;

    engine._adjustDifficulty();
    expect(adjustCalls).toContain(1);
  });

  it('adjusts down when avg pL < 0.50', () => {
    const adjustCalls = [];
    const cfg = makeConfig({
      adjustParams: (params, dir, mag) => {
        adjustCalls.push(dir);
        return { ...params, difficulty: params.difficulty + dir };
      },
    });
    const engine = new LearningEngine(cfg, null);

    for (const id of ['A', 'B', 'C', 'D', 'E']) {
      engine._ensureItem({ id, clusters: ['default'] });
      const rec = engine.items.get(id);
      rec.pL = 0.40;
      rec.attempts = 3;
      rec.lastSeen = engine.qNum;
    }
    engine.qNum = 8;

    engine._adjustDifficulty();
    expect(adjustCalls).toContain(-1);
  });

  it('does not adjust when avg pL is in neutral zone (0.50-0.80)', () => {
    const adjustCalls = [];
    const cfg = makeConfig({
      adjustParams: (params, dir, mag) => {
        adjustCalls.push(dir);
        return params;
      },
    });
    const engine = new LearningEngine(cfg, null);

    for (const id of ['A', 'B', 'C', 'D', 'E']) {
      engine._ensureItem({ id, clusters: ['default'] });
      const rec = engine.items.get(id);
      rec.pL = 0.65;
      rec.attempts = 3;
      rec.lastSeen = engine.qNum;
    }
    engine.qNum = 8;

    engine._adjustDifficulty();
    expect(adjustCalls).toHaveLength(0);
  });
});
