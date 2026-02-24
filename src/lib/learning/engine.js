const ADJ_EVERY = 10;
const COLD_START = 10;
const C = 1.2; // UCB1 exploration constant
const MS_PER_DAY = 86400000;
const MAX_TIMES = 10;
const MAX_HIST = 5;
const MAX_CORRECT_TIMES = 200;
const STORE_PREFIX = 'gl_learn_';
const VERSION = 1;

// BKT defaults by exercise type
const BKT_QUIZ = { pG: 0.25, pS: 0.05, pT: 0.30 };
const BKT_AUDIO = { pG: 0.05, pS: 0.10, pT: 0.20 };

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function median(arr) {
  return percentile(arr, 50);
}

export class LearningEngine {
  constructor(config, exerciseId) {
    this.config = config;
    this.exerciseId = exerciseId;
    this.items = new Map();
    this.clusters = new Map();
    this.qNum = 0;
    this.params = structuredClone(config.initialParams);
    this.totalAttempts = 0;
    this.allCorrectTimes = [];
    this.recentKeys = [];
    this.lastItem = null;
    this.bkt = this._inferBKT();

    if (exerciseId) this._load();
  }

  next() {
    this.qNum++;

    // Cold start: pure random for first COLD_START questions
    if (this.qNum <= COLD_START) {
      const item = this.config.genRandom(this.params, this.lastItem);
      this._ensureItem(item);
      this._trackRecent(item);
      this.lastItem = item;
      return item;
    }

    // Collect candidates: all known items + 3 new random ones
    const candidates = [];

    // Known items
    for (const [key, rec] of this.items) {
      const item = this.config.itemFromKey(key, this.params);
      candidates.push({ item, rec, isNew: false });
    }

    // New candidates
    for (let i = 0; i < 3; i++) {
      const item = this.config.genRandom(this.params, this.lastItem);
      const key = this.config.itemKey(item);
      if (!this.items.has(key)) {
        candidates.push({ item, rec: null, isNew: true });
      }
    }

    if (candidates.length === 0) {
      const item = this.config.genRandom(this.params, this.lastItem);
      this._ensureItem(item);
      this._trackRecent(item);
      this.lastItem = item;
      return item;
    }

    // Score candidates with UCB1
    let bestScore = -Infinity;
    let bestCandidate = candidates[0];

    for (const c of candidates) {
      const score = this._scoreCandidate(c);
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = c;
      }
    }

    const item = bestCandidate.item;
    this._ensureItem(item);
    this._trackRecent(item);
    this.lastItem = item;
    return item;
  }

  report(item, ok, timeMs) {
    const rec = this._ensureItem(item);
    rec.attempts++;
    this.totalAttempts++;

    if (ok) rec.correct++;

    // Update history
    rec.hist.push(ok);
    if (rec.hist.length > MAX_HIST) rec.hist.shift();

    // Streak
    if (ok) {
      rec.streak++;
    } else {
      rec.streak = 0;
    }

    // Response time tracking
    if (timeMs != null && timeMs > 0) {
      rec.times.push(timeMs);
      if (rec.times.length > MAX_TIMES) rec.times.shift();
      rec.avgTime = rec.times.reduce((s, t) => s + t, 0) / rec.times.length;

      if (ok) {
        this.allCorrectTimes.push(timeMs);
        if (this.allCorrectTimes.length > MAX_CORRECT_TIMES) {
          this.allCorrectTimes.shift();
        }
      }
    }

    rec.lastSeen = this.qNum;
    rec.lastSeenTs = Date.now();

    // SM-2 quality mapping
    const quality = this._qualityFromResponse(ok, timeMs);

    // SM-2 update
    this._updateSM2(rec, quality);

    // BKT update
    this._updateBKT(rec, ok);

    // Update cluster stats
    for (const cid of rec.cls) {
      const cl = this._ensureCluster(cid);
      if (ok) cl.correct++;
      cl.total++;
    }

    // Difficulty adjustment every ADJ_EVERY questions
    if (this.qNum > 0 && this.qNum % ADJ_EVERY === 0) {
      this._adjustDifficulty();
    }

    // Auto-save
    if (this.exerciseId) this._save();
  }

  getParams() {
    return { ...this.params };
  }

  getMastery() {
    const itemList = [];
    const threshold = this._timeThreshold();

    for (const [key, rec] of this.items) {
      itemList.push({
        key,
        pL: rec.pL,
        ef: rec.ef,
        ivl: rec.ivl,
        reps: rec.reps,
        avgTime: rec.avgTime,
        mastered: this._isMastered(rec, threshold),
        attempts: rec.attempts,
        correct: rec.correct,
        streak: rec.streak,
      });
    }

    // Cluster stats
    const clusterList = [];
    for (const [id, cl] of this.clusters) {
      const clItems = itemList.filter(i => {
        const rec = this.items.get(i.key);
        return rec && rec.cls.includes(id);
      });
      const avgPL = clItems.length > 0 ? clItems.reduce((s, i) => s + i.pL, 0) / clItems.length : 0;
      const masteredCount = clItems.filter(i => i.mastered).length;
      clusterList.push({
        id,
        avgPL,
        total: cl.total,
        correct: cl.correct,
        masteredPct: clItems.length > 0 ? masteredCount / clItems.length : 0,
      });
    }

    // Overall stats
    const totalItems = itemList.length;
    const masteredCount = itemList.filter(i => i.mastered).length;
    const avgPL = totalItems > 0 ? itemList.reduce((s, i) => s + i.pL, 0) / totalItems : 0;
    const recentTimes = this.allCorrectTimes.slice(-20);
    const avgResponseTime = recentTimes.length > 0 ? recentTimes.reduce((s, t) => s + t, 0) / recentTimes.length : 0;
    const totalCorrect = itemList.reduce((s, i) => s + i.correct, 0);
    const totalAtt = itemList.reduce((s, i) => s + i.attempts, 0);

    return {
      items: itemList,
      clusters: clusterList,
      overall: {
        avgPL,
        totalItems,
        masteredCount,
        pctMastered: totalItems > 0 ? masteredCount / totalItems : 0,
        avgResponseTime,
        timeThreshold: threshold,
        sessionQuestions: this.qNum,
        sessionAccuracy: totalAtt > 0 ? totalCorrect / totalAtt : 0,
      },
    };
  }

  reset() {
    if (this.exerciseId) {
      try { localStorage.removeItem(STORE_PREFIX + this.exerciseId); } catch (e) { /* noop */ }
    }
    this.items = new Map();
    this.clusters = new Map();
    this.qNum = 0;
    this.params = structuredClone(this.config.initialParams);
    this.totalAttempts = 0;
    this.allCorrectTimes = [];
    this.recentKeys = [];
    this.lastItem = null;
  }

  save() {
    if (this.exerciseId) this._save();
  }

  // --- Internal methods ---

  _inferBKT() {
    // Check if config provides BKT params
    if (this.config.bktParams) return this.config.bktParams;
    // Heuristic: if config has genQ-style quiz (4-choice), use quiz params
    // Audio exercises don't typically have choices generated in genRandom
    // Check if initialParams has shapes/modes/scales (audio) vs types/intervals (quiz)
    const p = this.config.initialParams;
    if (p.shapes || p.scales || p.modes) return BKT_AUDIO;
    return BKT_QUIZ;
  }

  _qualityFromResponse(ok, timeMs) {
    if (!ok) return 1;

    // Cold start: no time data yet
    if (timeMs == null || this.allCorrectTimes.length < 5) return 4;

    const med = median(this.allCorrectTimes);
    if (med <= 0) return 4;

    if (timeMs < med * 0.6) return 5;
    if (timeMs < med * 1.0) return 4;
    return 3;
  }

  _updateSM2(rec, q) {
    if (q >= 3) {
      if (rec.reps === 0) rec.ivl = 1;
      else if (rec.reps === 1) rec.ivl = 6;
      else rec.ivl = Math.round(rec.ivl * rec.ef);
      rec.reps++;
      rec.ef = Math.max(1.3, rec.ef + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    } else {
      rec.reps = 0;
      rec.ivl = 1;
      // ef unchanged on failure
    }
    rec.due = this.qNum + rec.ivl;
  }

  _updateBKT(rec, ok) {
    const { pG, pS, pT } = this.bkt;
    let posterior;
    if (ok) {
      const denom = rec.pL * (1 - pS) + (1 - rec.pL) * pG;
      posterior = denom > 0 ? (rec.pL * (1 - pS)) / denom : rec.pL;
    } else {
      const denom = rec.pL * pS + (1 - rec.pL) * (1 - pG);
      posterior = denom > 0 ? (rec.pL * pS) / denom : rec.pL;
    }
    rec.pL = posterior + (1 - posterior) * pT;
  }

  _scoreCandidate(c) {
    const { rec, isNew } = c;

    if (isNew) {
      // New items get a flat score that encourages exploration
      return (1 - 0.0) + 0.2; // exploitation(1) + new_bonus(0.2)
    }

    const pL = rec.pL;
    const exploitation = 1 - pL;
    const exploration = C * Math.sqrt(Math.log(this.totalAttempts + 1) / Math.max(1, rec.attempts));

    // Due bonus
    let dueBonus = 0;
    if (rec.due <= this.qNum && rec.ivl > 0) {
      dueBonus = 0.3 * Math.min(3, (this.qNum - rec.due) / rec.ivl);
    }

    // Desirable zone bonus
    const desirable = (pL >= 0.3 && pL <= 0.7) ? 0.15 : 0;

    // Interleave penalty
    let interleave = 0;
    if (this.recentKeys.length > 0) {
      const lastTwo = this.recentKeys.slice(-2);
      for (const rk of lastTwo) {
        const rrec = this.items.get(rk);
        if (rrec) {
          const shared = rec.cls.some(cid => rrec.cls.includes(cid));
          if (shared) { interleave = -0.3; break; }
        }
      }
    }

    return exploitation + exploration + dueBonus + desirable + interleave;
  }

  _isMastered(rec, threshold) {
    return rec.pL >= 0.94 && rec.reps >= 2 && rec.attempts >= 4 &&
      (threshold <= 0 || rec.avgTime <= 0 || rec.avgTime < threshold);
  }

  _timeThreshold() {
    if (this.allCorrectTimes.length < 20) return 0; // not enough data
    return percentile(this.allCorrectTimes, 50) * 1.5;
  }

  _medianTime() {
    return median(this.allCorrectTimes);
  }

  _adjustDifficulty() {
    const seen = [...this.items.values()].filter(r => r.attempts > 0);
    if (seen.length === 0) return;

    // Use only recently-active items (seen in last 2 adjustment windows)
    // so new items with pL=0 don't permanently suppress progression
    const recentWindow = ADJ_EVERY * 2;
    const recent = seen.filter(r => this.qNum - r.lastSeen <= recentWindow);
    const basis = recent.length >= 5 ? recent : seen;
    const avgPL = basis.reduce((s, r) => s + r.pL, 0) / basis.length;
    const recentTimes = this.allCorrectTimes.slice(-20);
    const avgTime = recentTimes.length > 0 ? recentTimes.reduce((s, t) => s + t, 0) / recentTimes.length : 0;
    const threshold = this._timeThreshold();
    const fastEnough = threshold <= 0 || avgTime <= 0 || avgTime < threshold * 1.5;

    let dir;
    if (avgPL > 0.85 && fastEnough) dir = 1;
    else if (avgPL < 0.55) dir = -1;
    else return;

    const midpoint = 0.70;
    const mag = 1 / (1 + Math.exp(-8 * (Math.abs(avgPL - midpoint) - 0.1)));
    this.params = this.config.adjustParams(this.params, dir, mag);
  }

  _ensureItem(item) {
    const key = this.config.itemKey(item);
    if (!this.items.has(key)) {
      const cls = this.config.itemClusters(item);
      const rec = {
        key,
        ef: 2.5,
        ivl: 1,
        reps: 0,
        due: 0,
        pL: 0.0,
        attempts: 0,
        correct: 0,
        times: [],
        avgTime: 0,
        lastSeen: 0,
        lastSeenTs: 0,
        hist: [],
        streak: 0,
        cls,
      };
      this.items.set(key, rec);
      for (const cid of cls) {
        this._ensureCluster(cid);
      }
    }
    return this.items.get(key);
  }

  _ensureCluster(id) {
    if (!this.clusters.has(id)) {
      this.clusters.set(id, { id, correct: 0, total: 0 });
    }
    return this.clusters.get(id);
  }

  _trackRecent(item) {
    const key = this.config.itemKey(item);
    this.recentKeys.push(key);
    if (this.recentKeys.length > 5) this.recentKeys.shift();
  }

  _applyDecay() {
    const now = Date.now();
    for (const rec of this.items.values()) {
      if (rec.lastSeenTs <= 0) continue;
      const daysSince = (now - rec.lastSeenTs) / MS_PER_DAY;
      if (daysSince < 0.01) continue; // less than ~15 min, skip
      const retention = Math.exp(-0.1 * daysSince / Math.sqrt(rec.reps + 1));
      rec.pL = rec.pL * retention;
      if (rec.pL < 0.5) {
        rec.reps = 0;
        rec.ivl = 1;
      }
    }
  }

  _save() {
    try {
      const itemsObj = {};
      for (const [key, rec] of this.items) {
        itemsObj[key] = {
          ef: rec.ef, ivl: rec.ivl, reps: rec.reps, due: rec.due,
          pL: rec.pL, attempts: rec.attempts, correct: rec.correct,
          times: rec.times, avgTime: rec.avgTime,
          lastSeen: rec.lastSeen, lastSeenTs: rec.lastSeenTs,
          hist: rec.hist, streak: rec.streak, cls: rec.cls,
        };
      }
      const clustersObj = {};
      for (const [id, cl] of this.clusters) {
        clustersObj[id] = { correct: cl.correct, total: cl.total };
      }
      const data = {
        v: VERSION,
        ts: Date.now(),
        qNum: this.qNum,
        totalAttempts: this.totalAttempts,
        allCorrectTimes: this.allCorrectTimes,
        items: itemsObj,
        clusters: clustersObj,
        recentKeys: this.recentKeys,
      };
      localStorage.setItem(STORE_PREFIX + this.exerciseId, JSON.stringify(data));
    } catch (e) {
      // localStorage may be full or unavailable
    }
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORE_PREFIX + this.exerciseId);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.v !== VERSION) return;

      this.qNum = data.qNum || 0;
      this.totalAttempts = data.totalAttempts || 0;
      this.allCorrectTimes = data.allCorrectTimes || [];
      this.recentKeys = data.recentKeys || [];

      // Restore items
      if (data.items) {
        for (const [key, r] of Object.entries(data.items)) {
          this.items.set(key, {
            key,
            ef: r.ef ?? 2.5,
            ivl: r.ivl ?? 1,
            reps: r.reps ?? 0,
            due: r.due ?? 0,
            pL: r.pL ?? 0,
            attempts: r.attempts ?? 0,
            correct: r.correct ?? 0,
            times: r.times ?? [],
            avgTime: r.avgTime ?? 0,
            lastSeen: r.lastSeen ?? 0,
            lastSeenTs: r.lastSeenTs ?? 0,
            hist: r.hist ?? [],
            streak: r.streak ?? 0,
            cls: r.cls ?? [],
          });
        }
      }

      // Restore clusters
      if (data.clusters) {
        for (const [id, cl] of Object.entries(data.clusters)) {
          this.clusters.set(id, { id, correct: cl.correct || 0, total: cl.total || 0 });
        }
      }

      // Apply time decay on return
      this._applyDecay();
    } catch (e) {
      // Corrupt data — start fresh
      this.items = new Map();
      this.clusters = new Map();
    }
  }
}
