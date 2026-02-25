import { median } from './math-utils.js';
import { ensureItem, ensureCluster, trackRecent } from './item-manager.js';
import { updateFSRS, fsrsRetrievability, gradeFromResponse } from './scheduling/fsrs.js';
import { updateBKT, reconcileBKTFSRS } from './knowledge/bkt.js';
import { updateTheta, checkPlateau, adaptiveSigma, adaptiveOffset } from './knowledge/theta.js';
import { scoreCandidate, isMastered, targetTime } from './selection/scorer.js';
import { shouldMicroDrill, buildOverdueQueue, buildConfusionDrill } from './selection/drills.js';
import { checkFatigue } from './tracking/fatigue.js';
import { getCoverageMatrix, getCoverageCell } from './tracking/coverage.js';
import { topConfusion, getConfusions as getConfusionsFor } from './tracking/confusion.js';
import { LocalStorageAdapter } from './persistence/storage.js';
import { serialize, deserialize, migrateV1 } from './persistence/serializer.js';

let COLD_START = 7;
const MAX_TIMES = 10;
const MAX_HIST = 5;
const MAX_CORRECT_TIMES = 200;
const MAX_CONFUSIONS = 10;
const SESSION_WINDOW = 20;
const MS_PER_DAY = 86400000;

// BKT defaults
const BKT_AUDIO = { pG: 0.05, pS: 0.15, pT: 0.20 };

export class LearningEngine {
  constructor(config, exerciseId, storage = new LocalStorageAdapter()) {
    this.config = config;
    this.exerciseId = exerciseId;
    this.storage = storage;
    this.items = new Map();
    this.clusters = new Map();
    this.questionNumber = 0;
    this.theta = 0.05;
    this.totalAttempts = 0;
    this.allCorrectTimes = [];
    this.recentKeys = [];
    this.lastItem = null;
    this.bkt = config.bktParams || BKT_AUDIO;

    // Session fatigue tracking
    this.sessionWindow = [];
    this.fatigued = false;
    this.preFatigueAccuracy = null;

    // Phase 1: transient queues (not persisted)
    this.microDrillQueue = [];
    this.confusionDrillQueue = [];
    this.overdueQueue = null;
    this.coldStartTypes = null;

    // Phase 2: plateau detection
    this.thetaHistory = [];
    this.plateauDetected = false;

    if (exerciseId) this._load();
  }

  next() {
    this.questionNumber++;

    // Cold start: round-robin types sorted by difficulty, then random
    const typeIds = this.config.getTypeIds ? this.config.getTypeIds(this) : [];
    const typeCount = typeIds.length;
    const dynamicColdStart = Math.max(COLD_START, typeCount);
    if (this.questionNumber <= dynamicColdStart) {
      let item;
      if (typeCount > 0 && this.questionNumber <= typeCount) {
        if (!this.coldStartTypes) {
          this.coldStartTypes = [...typeIds];
        }
        const typeId = this.coldStartTypes[this.questionNumber - 1];
        item = this.config.genFromType(typeId, this.lastItem, this);
      } else {
        item = this.config.genRandom(this.lastItem, this);
      }
      this._ensureItem(item);
      this._trackRecent(item);
      this.lastItem = item;
      return item;
    }

    // 1c. Overdue queue (FSRS due-date session planning)
    if (this.overdueQueue === null) {
      this.overdueQueue = buildOverdueQueue(this.items, this.config);
    }
    if (this.overdueQueue.length > 0) {
      const item = this.overdueQueue.shift();
      this._ensureItem(item);
      this._trackRecent(item);
      this.lastItem = item;
      return item;
    }

    // 1a. Micro-drill queue
    if (this.microDrillQueue.length > 0) {
      const item = this.microDrillQueue.shift();
      this._ensureItem(item);
      this._trackRecent(item);
      this.lastItem = item;
      return item;
    }
    if (shouldMicroDrill(this.lastItem, this.items, this.config, this.questionNumber)) {
      const drills = this.config.microDrill ? this.config.microDrill(this.lastItem) : null;
      if (drills && drills.length > 0) {
        this.microDrillQueue = drills.slice(1);
        const item = drills[0];
        this._ensureItem(item);
        this._trackRecent(item);
        this.lastItem = item;
        return item;
      }
    }

    // 1b. Confusion drill queue
    if (this.confusionDrillQueue.length > 0) {
      const item = this.confusionDrillQueue.shift();
      this._ensureItem(item);
      this._trackRecent(item);
      this.lastItem = item;
      return item;
    }
    this.confusionDrillQueue = buildConfusionDrill(
      this.lastItem, this.items, this.config, this.questionNumber,
      (confusedValue, originalItem) => this._itemForConfusedValue(confusedValue, originalItem)
    );
    if (this.confusionDrillQueue.length > 0) {
      const item = this.confusionDrillQueue.shift();
      this._ensureItem(item);
      this._trackRecent(item);
      this.lastItem = item;
      return item;
    }

    // Collect candidates: all known items + 10 new random ones
    const candidates = [];

    for (const [key, record] of this.items) {
      const item = this.config.itemFromKey(key);
      if (!item) continue;
      candidates.push({ item, record, isNew: false });
    }

    for (let i = 0; i < 10; i++) {
      const item = this.config.genRandom(this.lastItem, this);
      const key = this.config.itemKey(item);
      if (!this.items.has(key)) {
        candidates.push({ item, record: null, isNew: true });
      }
    }

    if (candidates.length === 0) {
      const item = this.config.genRandom(this.lastItem, this);
      this._ensureItem(item);
      this._trackRecent(item);
      this.lastItem = item;
      return item;
    }

    // Score candidates
    let bestScore = -Infinity;
    let bestCandidate = candidates[0];

    const state = this._scoringState();
    for (const c of candidates) {
      const sc = { item: c.item, rec: c.record, isNew: c.isNew };
      const score = scoreCandidate(sc, state);
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

  report(item, ok, timeMs, meta = {}) {
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

    rec.lastSeen = this.questionNumber;
    rec.lastSeenTs = Date.now();

    // Confusion tracking
    if (!ok && meta.detected) {
      rec.confusions.push({ detected: meta.detected, ts: Date.now() });
      if (rec.confusions.length > MAX_CONFUSIONS) rec.confusions.shift();
    }

    // FSRS grade
    const med = median(this.allCorrectTimes);
    const grade = gradeFromResponse(ok, timeMs, med);

    // FSRS update
    updateFSRS(rec, grade);

    // BKT update
    updateBKT(rec, ok, timeMs, med, this.bkt);

    // BKT/FSRS reconciliation
    reconcileBKTFSRS(rec);

    // Update cluster stats
    for (const cid of rec.clusters) {
      const cl = this._ensureCluster(cid);
      if (ok) cl.correct++;
      cl.total++;
    }

    // Update theta
    const itemDifficulty = this.config.itemDifficulty ? this.config.itemDifficulty(item) : 0.5;
    const lr = meta.skipped ? 0.12 : 0.04;
    this.theta = updateTheta(this.theta, itemDifficulty, ok, lr);

    // Theta snapshot for plateau detection
    if (this.totalAttempts % 20 === 0) {
      this.thetaHistory.push({ ts: Date.now(), theta: this.theta });
      if (this.thetaHistory.length > 50) this.thetaHistory.shift();
    }
    this.plateauDetected = checkPlateau(this.thetaHistory);

    // Session fatigue tracking
    this.sessionWindow.push({ ok, timeMs: timeMs || 0, questionNumber: this.questionNumber });
    if (this.sessionWindow.length > SESSION_WINDOW) this.sessionWindow.shift();
    const fatigueResult = checkFatigue(this.sessionWindow, this.fatigued, this.preFatigueAccuracy);
    this.fatigued = fatigueResult.fatigued;
    this.preFatigueAccuracy = fatigueResult.preFatigueAccuracy;

    // Auto-save
    if (this.exerciseId) this._save();
  }

  getMastery() {
    const now = Date.now();
    const itemList = [];

    for (const [key, rec] of this.items) {
      const elapsed = rec.lastReviewTs > 0 ? (now - rec.lastReviewTs) / MS_PER_DAY : 0;
      const R = rec.S > 0 && rec.lastReviewTs > 0 ? fsrsRetrievability(elapsed, rec.S) : 0;
      const tc = topConfusion(rec);
      const tt = targetTime(rec, this.allCorrectTimes);
      const fluencyRatio = tt > 0 && rec.avgTime > 0 ? rec.avgTime / tt : 0;
      itemList.push({
        key,
        pL: rec.pL,
        S: rec.S,
        D: rec.D,
        R,
        avgTime: rec.avgTime,
        targetTime: tt,
        fluencyRatio,
        mastered: isMastered(rec),
        attempts: rec.attempts,
        correct: rec.correct,
        streak: rec.streak,
        topConfusion: tc,
      });
    }

    // Cluster stats
    const clusterList = [];
    for (const [id, cl] of this.clusters) {
      const clItems = itemList.filter(i => {
        const rec = this.items.get(i.key);
        return rec && rec.clusters.includes(id);
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
      fatigued: this.fatigued,
      coverage: getCoverageMatrix(this.items),
      overall: {
        avgPL,
        totalItems,
        masteredCount,
        pctMastered: totalItems > 0 ? masteredCount / totalItems : 0,
        avgResponseTime,
        sessionQuestions: this.questionNumber,
        sessionAccuracy: totalAtt > 0 ? totalCorrect / totalAtt : 0,
        theta: this.theta,
        plateauDetected: this.plateauDetected,
      },
    };
  }

  getItemStats(itemKey) {
    const rec = this.items.get(itemKey);
    if (!rec) return null;
    const now = Date.now();
    const elapsed = rec.lastReviewTs > 0 ? (now - rec.lastReviewTs) / MS_PER_DAY : 0;
    const R = rec.S > 0 && rec.lastReviewTs > 0 ? fsrsRetrievability(elapsed, rec.S) : 0;
    const tt = targetTime(rec, this.allCorrectTimes);
    const fluencyRatio = tt > 0 && rec.avgTime > 0 ? rec.avgTime / tt : 0;
    return {
      key: rec.key, pL: rec.pL, S: rec.S, D: rec.D, R, fluencyRatio,
      attempts: rec.attempts, correct: rec.correct, streak: rec.streak,
      topConfusion: topConfusion(rec), avgTime: rec.avgTime,
    };
  }

  getConfusions(itemKey) {
    const rec = this.items.get(itemKey);
    if (!rec || rec.confusions.length === 0) return {};
    return getConfusionsFor(rec);
  }

  reset() {
    if (this.exerciseId) {
      try { this.storage.removeItem(this.exerciseId); } catch (e) { /* noop */ }
    }
    this.items = new Map();
    this.clusters = new Map();
    this.questionNumber = 0;
    this.theta = 0.05;
    this.totalAttempts = 0;
    this.allCorrectTimes = [];
    this.recentKeys = [];
    this.lastItem = null;
    this.sessionWindow = [];
    this.fatigued = false;
    this.preFatigueAccuracy = null;
    this.microDrillQueue = [];
    this.confusionDrillQueue = [];
    this.overdueQueue = null;
    this.coldStartTypes = null;
    this.thetaHistory = [];
    this.plateauDetected = false;
  }

  save() {
    if (this.exerciseId) this._save();
  }

  getCoverageMatrix() {
    return getCoverageMatrix(this.items);
  }

  // --- Private helpers (delegation + state wiring) ---

  _scoringState() {
    return {
      config: this.config,
      theta: this.theta,
      totalAttempts: this.totalAttempts,
      sessionWindow: this.sessionWindow,
      recentKeys: this.recentKeys,
      items: this.items,
      fatigued: this.fatigued,
      plateauDetected: this.plateauDetected,
      allCorrectTimes: this.allCorrectTimes,
    };
  }

  _scoreCandidate(c) {
    const normalized = c.rec !== undefined ? c : { ...c, rec: c.record };
    return scoreCandidate(normalized, this._scoringState());
  }

  _isMastered(rec) {
    return isMastered(rec);
  }

  _topConfusion(rec) {
    return topConfusion(rec);
  }

  _targetTime(rec) {
    return targetTime(rec, this.allCorrectTimes);
  }

  _adaptiveSigma() {
    return adaptiveSigma(this.totalAttempts, this.sessionWindow);
  }

  _adaptiveOffset() {
    return adaptiveOffset(this.totalAttempts, this.sessionWindow);
  }

  _checkPlateau() {
    this.plateauDetected = checkPlateau(this.thetaHistory);
  }

  _checkFatigue() {
    const result = checkFatigue(this.sessionWindow, this.fatigued, this.preFatigueAccuracy);
    this.fatigued = result.fatigued;
    this.preFatigueAccuracy = result.preFatigueAccuracy;
  }

  _ensureItem(item) {
    return ensureItem(this.items, this.clusters, this.config, item);
  }

  _ensureCluster(id) {
    return ensureCluster(this.clusters, id);
  }

  _trackRecent(item) {
    trackRecent(this.recentKeys, this.config, item);
  }

  _getCoverageCell(strCluster, zoneCluster) {
    return getCoverageCell(this.items, strCluster, zoneCluster);
  }

  _reconcileBKTFSRS(rec) {
    reconcileBKTFSRS(rec);
  }

  _shouldMicroDrill() {
    return shouldMicroDrill(this.lastItem, this.items, this.config, this.questionNumber);
  }

  _buildOverdueQueue() {
    this.overdueQueue = buildOverdueQueue(this.items, this.config);
  }

  _buildConfusionDrill() {
    this.confusionDrillQueue = buildConfusionDrill(
      this.lastItem, this.items, this.config, this.questionNumber,
      (confusedValue, originalItem) => this._itemForConfusedValue(confusedValue, originalItem)
    );
  }

  _itemForConfusedValue(confusedValue, originalItem) {
    if (this.config.genFromCluster) {
      try {
        return this.config.genFromCluster('note_' + confusedValue, originalItem);
      } catch { /* fallthrough */ }
    }
    return null;
  }

  _updateTheta(difficulty, ok, lr = 0.04) {
    this.theta = updateTheta(this.theta, difficulty, ok, lr);
  }

  _save() {
    try {
      this.storage.setItem(this.exerciseId, serialize(this));
    } catch (e) {
      // storage may be full or unavailable
    }
  }

  _load() {
    try {
      const raw = this.storage.getItem(this.exerciseId);
      if (!raw) return;

      const result = deserialize(raw);
      if (!result) return;

      if (result.version === 1) {
        const migrated = migrateV1(result.data);
        this._applyLoadedState(migrated);
        if (this.exerciseId) this._save();
        return;
      }

      this._applyLoadedState(result);
    } catch (e) {
      // Corrupt data — start fresh
      this.items = new Map();
      this.clusters = new Map();
    }
  }

  _applyLoadedState(state) {
    this.questionNumber = state.questionNumber;
    this.totalAttempts = state.totalAttempts;
    this.allCorrectTimes = state.allCorrectTimes;
    this.recentKeys = state.recentKeys;
    this.theta = state.theta;
    this.thetaHistory = state.thetaHistory;
    this.items = state.items;
    this.clusters = state.clusters;
  }
}
