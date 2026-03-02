# Ensemble A: Adaptive Quiz Algorithm (IRT + PPE + BKT)

## Context

The current `nextQuiz()` uses hardcoded heuristic weights (struggling items get 8x, stale items 3x, spaced repetition bonus). It feels scattered because it's fundamentally weighted-random across all items. The goal is to replace it with a principled adaptive algorithm that drills weak points, schedules reviews before forgetting, and targets items at the right difficulty level.

## Approach

Three models each contribute a different signal, combined via weighted geometric mean:

| Model | Signal | What it does |
|-------|--------|-------------|
| **IRT** (Item Response Theory) | `difficulty_match` | Targets items in the 50-85% correct zone — not too easy, not too hard |
| **PPE** (Predictive Performance Equation) | `urgency` | Models forgetting — items not reviewed recently become urgent |
| **BKT** (Bayesian Knowledge Tracing) | `1 - P(learned)` | Tracks mastery — deprioritizes truly learned items |

**Selection formula**: `score = irtMatch^w_irt * urgency^w_ppe * (1 - pL)^w_bkt`

Weights self-calibrate via Brier score tracking (models that predict better get more influence).

## Data Model Extension

**Existing `mastery_v1` is untouched.** New state goes in a separate `mastery_v2` localStorage key.

Per-item ensemble state:
```js
{ pL: 0.1, first: 0, spacings: [], b: 0.0 }
// pL = BKT mastery probability, first = first attempt timestamp,
// spacings = last 5 inter-attempt gaps, b = IRT item difficulty
```

Per-section state (under `_sec` key):
```js
{ theta: 0.0, w: [1/3, 1/3, 1/3], brier: [0.25, 0.25, 0.25] }
// theta = IRT learner ability, w = ensemble weights, brier = running Brier scores
```

## Key Design Decisions

- **IRT discrimination fixed at 1.0** (1PL) — not enough data from a single learner for per-item 2PL
- **Item difficulty bootstrapped** from learner accuracy when n >= 3, otherwise from music-theory domain priors (sharps harder than naturals, tritones harder than perfect 5ths, etc.)
- **BKT guess rates** vary per section to match the number of choices (triads: 1/4 = 0.25, fretboard: ~1/12 = 0.08)
- **Selection**: top-5 candidates by ensemble score, then softmax with temperature 0.5 for exploration noise
- **Migration**: lazy — on first access, bootstrap v2 state from existing v1 records

## Files to Modify

### `src/lib/mastery/algorithm.js` (~220 lines added)
- Add constants: `BKT_PARAMS`, `IRT_CFG`, `PPE_CFG`, `ENS_CFG`, `DIFFICULTY_PRIORS`
- Add pure model functions: `irtPredict`, `irtUpdate`, `irtDifficultyMatch`, `bktUpdate`, `bktPredict`, `ppePredict`, `ppeUpdate`
- Add ensemble functions: `ensembleScore`, `updateWeights`, `nextQuizEnsemble`
- Add migration/init functions: `emptyEnsembleRecord`, `emptySectionState`, `migrateItemRecord`, `migrateSectionTheta`, `priorDifficulty`
- Keep all existing functions intact (score, nextPractice, nextQuiz renamed internally, recordAttempt, weightedPick)

### `src/lib/mastery/store.svelte.js` (~45 lines added)
- Add `mastery_v2` load/save alongside existing `mastery_v1`
- Add `ensureSection()` for lazy migration
- Modify `record()` to also update IRT theta/difficulty, BKT pL, PPE spacings, and ensemble weights
- Modify `nextQuiz()` to delegate to `nextQuizEnsemble()`
- Modify `resetSection()` to clear both v1 and v2

### `src/lib/mastery/sections.js` — no changes
### All 7 exercise components — no changes (API contract preserved)

### `src/lib/mastery/CLAUDE.md` — documentation update

## Algorithm Details

### IRT
- `P(correct) = 1 / (1 + exp(-a * (theta - b)))`
- `difficulty_match`: Gaussian peaked at P = 0.65, sigma 0.2
- Theta update: `theta += STEP * (1 - P)` on correct, `theta -= STEP * P` on wrong, with decay `1 / (1 + totalN * 0.01)`
- Difficulty update: symmetric but slower (D_STEP = 0.15 vs STEP = 0.4)

### PPE
- `P = N^0.1 * S^0.1 * T^-0.3` (N = attempts, S = avg spacing hours, T = hours since first)
- `urgency = 1 - P`
- Cold start: n=0 items get urgency 1.0

### BKT
- Standard Bayesian update with P(L0), P(T), P(G), P(S) per section
- P(L) only increases (learning transition applied after each observation)
- Items with P(L) > 0.95 are effectively deprioritized

### Ensemble Meta-Layer
- Each model predicts P(correct) before each response
- Brier score tracked via EMA (alpha = 0.1)
- Weights = inverse-Brier, normalized to sum to 1
- Selection uses weighted geometric mean of the three component scores

## Verification

1. Run `npm run dev` and open the Theory Trainer
2. Start a quiz in any exercise (e.g., Fretboard Notes)
3. Verify items adapt: deliberately get some items wrong, confirm they reappear sooner
4. Verify mastered items fade: get items right repeatedly, confirm they appear less often
5. Verify cold start: reset a section, confirm quiz still works with no prior data
6. Check localStorage for both `mastery_v1` and `mastery_v2` keys
7. Verify existing practice mode and score display are unaffected
