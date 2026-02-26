# Plan: Extract Parameters, Add Adaptivity, Algorithm Improvements

## Context

The learning engine has ~130 hardcoded parameters scattered across 12+ files. These control pitch detection, knowledge modeling (BKT/FSRS/Theta), item selection scoring, drill triggers, fatigue detection, and mastery criteria. The values are inline magic numbers with no way to override per-exercise, per-student, or adapt at runtime.

This plan:
1. Centralizes all parameters into a three-tier system (fixed / default / adaptive)
2. Makes key parameters adaptive based on student data (pG, pS, pT, drill effectiveness, difficulty)
3. Updates serialization for backward-compatible persistence
4. Updates CLAUDE.md with team coordination rules

## CLAUDE.md Update

Add to root CLAUDE.md:

```
### Agent Coordination Rules

- The **main agent** coordinates only — it must never read, write, or edit source code directly
- All code work is delegated to teammate agents via the Task tool
- Main agent responsibilities: task creation, assignment, review, and user communication
- Teammate agents own specific files and must not modify files outside their scope
```

## Three-Tier Parameter Architecture

### Tier 1: Fixed Constants — `src/lib/learning/constants.js` (new)

Physics, math, and structural constants that never change:

- `FACTOR = 19/81`, `DECAY = -0.5`, `MS_PER_DAY = 86400000`
- `W[0..18]` (19 FSRS weights — fixed until FSRS optimizer is added)
- `FFT_SIZE = 8192`, `FREQ_MIN = 50`, `FREQ_MAX = 1400`
- `MAX_HIST = 5`, `MAX_TIMES = 10`, `MAX_CORRECT_TIMES = 200`, `MAX_CONFUSIONS = 10`, `MAX_RECENT = 5`

### Tier 2: Overridable Defaults — `src/lib/learning/defaults.js` (new)

Sensible defaults organized by subsystem. Can be overridden per-exercise via config or per-student via settings:

```
DEFAULTS = {
  bkt:       { pG, pS, pT }
  theta:     { initial, alpha, lr, skipLr }
  plateau:   { windowSize, threshold, explorationMultiplier }
  sigma:     { base, highAccRange, lowAccRange, accHighThreshold, accLowThreshold }
  offset:    { base, highAccValue, lowAccValue }
  scoring:   { exploitationCap, explorationC, reviewUrgency, confusionBoost,
               difficultyMatchWeight, interleavePenalty, fatigueBias,
               coverageBonus, stuckPenalty, stuckThresholds }
  mastery:   { pLThreshold, minAttempts }
  fsrs:      { desiredRetention, gradeThresholds }
  drills:    { microDrill: {failureCount, windowSize, cooldown},
               confusionDrill: {minOccurrences, cooldown}, overdueMax }
  fatigue:   { sessionWindow, accDropThreshold, rtIncreaseThreshold, recoveryThreshold }
  coldStart: { minQuestions }
  audio:     { stableFrames, rmsThreshold, yinThreshold, confidenceThreshold }
  holdDetection: { confirmMs, wrongMs, cooldownMs }
  transfer:  { cap, clusterMinAttempts }
  unified:   { recallPLThreshold, recallDifficultyBoost, thetaWindow, weaknessBoostScale, minTypeWeight }
}
```

### Tier 3: Adaptive Parameters — runtime-computed, persisted

Parameters the system learns from student data. Stored in engine state:

```
adaptive: {
  pG: null,    // estimated from new-item accuracy
  pS: null,    // estimated from mastered-item error rate
  pT: null,    // estimated from attempts-to-mastery
  drillEffectiveness: { microDrill: {helped, total}, confusionDrill: {helped, total} },
  featureErrorRates: {}  // per-feature difficulty estimates
}
```

### Resolution: `src/lib/learning/params.js` (new)

```
resolveParams(configOverrides = {}, adaptive = {}):
  adaptive (if non-null and sufficient data)
    → config override (per-exercise)
      → DEFAULTS (tier 2)
        → CONSTANTS (tier 1, not overridable)
```

Engine constructor gains optional `paramOverrides` argument. Existing `config.bktParams` remains as backward-compatible alias.

## Serialization: v3 → v4

- Add `adaptive` field to serialized state
- v3 data loads with `adaptive: {}` (all nulls → defaults kick in)
- No changes to v1 migration path
- New fields have safe defaults — no version bump required for backward compat, but bump to v4 for clarity

## Adaptive Algorithm Phases

### Phase 1: Per-exercise pG
- After 20+ attempts on new items (pL < 0.1), `pG = correct/total` on those items
- Clamp [0.01, 0.20]

### Phase 2: Per-student pS
- After 5+ mastered items (pL > 0.9, attempts >= 5), `pS = errors/total` on mastered items
- Clamp [0.02, 0.30]

### Phase 3: Adaptive pT
- Track attempts-to-mastery for each item crossing mastery threshold
- Running average: fast learners (avg < 5) → pT * 1.3, slow learners (avg > 12) → pT * 0.7
- Clamp [0.05, 0.40]

### Phase 4: Drill effectiveness
- Tag item with `_drillPending` after drill fires
- Check next 3 attempts for improvement
- Adjust cooldowns: effective (>0.6 rate) → shorter, ineffective (<0.3) → longer

### Phase 5: Difficulty re-estimation
- Track per-feature error rates (accidental, zone, string, etc.)
- After 50+ attempts, weight features by empirical error rate vs global rate

## Team Structure

### 4 Agents

| Agent | Role | Owns (creates/modifies) | Depends on |
|-------|------|------------------------|------------|
| **params-agent** | Parameter infrastructure | `constants.js`, `defaults.js`, `params.js` (all new) | Nothing |
| **persist-agent** | Serialization & migration | `serializer.js`, `migration.js` | params-agent |
| **wiring-agent** | Replace inline constants in all modules | `engine.js`, `scorer.js`, `drills.js`, `fatigue.js`, `theta.js`, `bkt.js`, `item-manager.js`, `AudioManager.js`, `pitch.js`, `holdDetection.js`, `unified.js` | params-agent |
| **adaptive-agent** | Implement adaptive estimators | `adaptive/estimators.js`, `adaptive/drill-tracker.js`, `adaptive/difficulty.js` (all new) + wire into `engine.js` | params-agent, wiring-agent |

### Execution Order

```
Phase A (parallel, no conflicts):
  ├─ params-agent: Create constants.js, defaults.js, params.js + tests
  └─ persist-agent: Design v4 format, add adaptive fields to serializer + tests

Phase B (sequential, depends on A):
  └─ wiring-agent: Replace all inline magic numbers across 11 files
     - B1: engine.js constructor + report + next
     - B2: scorer.js (12+ scoring weights)
     - B3: drills.js (trigger thresholds, cooldowns)
     - B4: fatigue.js, theta.js, bkt.js
     - B5: AudioManager.js, pitch.js, holdDetection.js
     - B6: item-manager.js, unified.js
     - B7: Update existing tests (77 tests must pass)

Phase C (depends on B):
  ├─ adaptive-agent: Implement estimators + wire into engine.report()
  └─ persist-agent: Finalize adaptive state persistence + integration tests
```

### File Ownership (no overlaps during a phase)

- **params-agent** only creates NEW files → zero merge conflicts
- **persist-agent** owns serializer.js and migration.js exclusively
- **wiring-agent** owns all existing learning/audio modules during Phase B
- **adaptive-agent** creates NEW files in `adaptive/` dir, touches engine.js only after wiring-agent is done

## Verification

### Per-task
- `npx vitest run` after every task — all existing tests must pass
- New code ships with its own test file

### Final integration
1. Full test suite: `npx vitest run`
2. Magic number audit: `grep -rn '[0-9]\.' src/lib/learning/ src/lib/audio/` — no inline constants outside constants.js/defaults.js
3. Backward compat: load v3 serialized state → engine starts with default adaptive params
4. Smoke test: practice session with 20+ questions → no behavioral regression
5. Adaptive test: simulate 50+ attempts → verify pG/pS/pT estimates change from null to reasonable values

## Critical Files

| File | Action | Agent |
|------|--------|-------|
| `src/lib/learning/constants.js` | Create | params-agent |
| `src/lib/learning/defaults.js` | Create | params-agent |
| `src/lib/learning/params.js` | Create | params-agent |
| `src/lib/learning/engine.js` | Modify (constructor, report, next) | wiring-agent |
| `src/lib/learning/selection/scorer.js` | Modify (all weights) | wiring-agent |
| `src/lib/learning/selection/drills.js` | Modify (thresholds) | wiring-agent |
| `src/lib/learning/tracking/fatigue.js` | Modify (remove duplicate, use params) | wiring-agent |
| `src/lib/learning/knowledge/theta.js` | Modify (alpha, sigma, offset) | wiring-agent |
| `src/lib/learning/knowledge/bkt.js` | Modify (use resolved params) | wiring-agent |
| `src/lib/learning/item-manager.js` | Modify (transfer cap) | wiring-agent |
| `src/lib/learning/configs/unified.js` | Modify (recall, type thresholds) | wiring-agent |
| `src/lib/audio/AudioManager.js` | Modify (FFT, stable frames) | wiring-agent |
| `src/lib/audio/pitch.js` | Modify (YIN, confidence) | wiring-agent |
| `src/lib/components/challenges/holdDetection.js` | Modify (timing) | wiring-agent |
| `src/lib/learning/persistence/serializer.js` | Modify (v4 format) | persist-agent |
| `src/lib/learning/migration.js` | Modify (v3→v4) | persist-agent |
| `src/lib/learning/adaptive/estimators.js` | Create | adaptive-agent |
| `src/lib/learning/adaptive/drill-tracker.js` | Create | adaptive-agent |
| `src/lib/learning/adaptive/difficulty.js` | Create | adaptive-agent |
| `src/lib/learning/engine.test.js` | Modify (update helpers, add tests) | persist-agent + wiring-agent |
| `CLAUDE.md` | Add agent coordination rules | main agent (before team starts) |
| `src/lib/learning/CLAUDE.md` | Update with new parameter architecture | main agent (after completion) |
