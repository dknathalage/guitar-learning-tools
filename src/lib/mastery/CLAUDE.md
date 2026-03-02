# Mastery System

Mastery tracking with two layers: v1 coverage/accuracy/speed scoring for display, and v2 ensemble algorithm (IRT + BKT + PPE) for adaptive quiz item selection.

## Architecture

```
src/lib/mastery/
  sections.js       # Item space definitions per exercise section
  algorithm.js      # Pure scoring + selection + ensemble functions
  store.svelte.js   # Reactive Svelte 5 store with dual localStorage persistence
```

## Module: `sections.js`

Exports `SECTIONS` — a map of sectionId to `{ items: string[], targetMs: number }`.

| Section | Items | Key Format | Target Ms |
|---------|-------|------------|-----------|
| fretboard | 12 notes | note name (`"A"`, `"C#"`) | 3000 |
| intervals | 144 (12x12) | `"${ri}_${semi}"` | 5000 |
| triads | 48 (12x4) | `"${ri}_${typeId}"` | 5000 |
| scales | 72 (12x6) | `"${ri}_${scaleId}"` | 8000 |
| sevenths | 60 (12x5) | `"${ri}_${typeId}"` | 5000 |
| builder | 13 chord types | `"${typeId}"` | 10000 |
| iiVI | 12 keys | `"${keyIndex}"` | 8000 |

Scale types: major, natural_min, maj_pent, min_pent, dorian, mixolydian.
Triad types: maj, min, aug, dim.
Seventh types: 7, maj7, m7, dim7, m7b5.

## Module: `algorithm.js`

Pure functions, no side effects. Contains both v1 scoring/selection and v2 ensemble algorithm.

### V1 Functions

#### `score(records, section)` -> 0-100

Weighted composite: coverage (0.4) + accuracy (0.4) + speed (0.2).
- Coverage: fraction of items with at least 1 attempt
- Accuracy: total hits / total attempts
- Speed: fraction of attempted items with avg response time <= targetMs

#### `nextPractice(records, section)` -> itemKey

Weighted random selection:
- Unattempted items: weight 10
- Low accuracy (<0.5): weight 5
- Others: weight 1
- Recency bonus: items not seen in 60s get weight x1.5

#### `nextQuiz(records, section)` -> itemKey

V1 fallback weighted random selection:
- Seen but accuracy <0.7: weight 8
- Not seen in 5+ min: weight 3
- Unattempted: weight 1
- Spaced repetition: minutes since last attempt scales weight (capped at 30 min)

#### `recordAttempt(record, correct, responseTimeMs)` -> new record

V1 record shape: `{ n, h, rt, last }`
- `n`: total attempts, `h`: total hits, `rt`: last 5 response times in ms, `last`: timestamp

### V2 Ensemble Algorithm

Three-model ensemble that self-calibrates model weights based on prediction accuracy.

#### Three Models

| Model | What it predicts | Signal for selection |
|-------|-----------------|---------------------|
| **IRT (1PL)** | P(correct) from learner ability (theta) vs item difficulty (b) | Difficulty match — items near the learner's zone of proximal development |
| **BKT** | P(learned) via Bayesian knowledge tracing with guess/slip params | Knowledge gap — items with low P(learned) need more practice |
| **PPE** | Memory strength from repetition count, spacing, and elapsed time | Urgency — items at risk of being forgotten |

#### IRT (Item Response Theory, 1PL)

- `irtPredict(theta, b)`: P(correct) = sigmoid(a * (theta - b))
- `irtUpdate(theta, b, correct, totalN)`: moves theta up/down by step * surprise, adjusts item difficulty b, step decays with totalN
- `irtDifficultyMatch(theta, b)`: Gaussian peaked at P=0.65 — highest score when item is slightly challenging

#### BKT (Bayesian Knowledge Tracing)

- `bktPredict(pL, pG, pS)`: P(correct) = pL*(1-pS) + (1-pL)*pG
- `bktUpdate(pL, correct, pG, pS, pT)`: Bayesian posterior + learning transition, pL only increases
- Guess rate (`pG`) is section-specific: triads=0.25, sevenths=0.20, scales=0.17, fretboard=0.05, etc.

#### PPE (Performance Prediction Equation)

- `ppePredict(n, avgSpacingHrs, totalTimeHrs)`: memory strength from power-law model
- `ppeUrgency(n, spacings, firstTimestamp, now)`: 1 - memory strength (higher = needs review sooner)

#### Ensemble Scoring and Selection

- `ensembleScore(irtMatch, urgency, oneMinusPL, weights)`: weighted geometric mean of the three signals
- `nextQuizEnsemble(items, sectionState, cfg)`: scores all items, takes top-K (5), softmax picks from them with temperature=0.5
- `brierUpdate(predicted, actual, oldBrier, alpha)`: EMA Brier score per model
- `updateWeights(brier)`: inverse-Brier weights normalized to sum to 1 — better-predicting models get higher weight

#### Difficulty Priors (`DIFFICULTY_PRIORS`)

Domain-specific initial difficulty offsets (positive = harder):
- **fretboard**: sharps/flats +0.3
- **intervals**: tritone +0.5, minor 2nd/major 7th +0.3, perfect 5th/unison -0.2
- **triads**: aug/dim +0.4
- **sevenths**: dim7/m7b5 +0.4, maj7 +0.2
- **scales**: dorian/mixolydian +0.3, pentatonics -0.1

#### Migration Functions

- `emptyEnsembleRecord()`: `{ pL: 0.1, first: 0, spacings: [], b: 0.0, n: 0 }`
- `emptySectionState()`: `{ theta: 0.0, w: [1/3, 1/3, 1/3], brier: [0.25, 0.25, 0.25] }`
- `migrateItemRecord(v1Record, itemKey, sectionKey)`: converts v1 `{ n, h, rt, last }` to v2 ensemble record, estimating pL from accuracy and b from accuracy + priorDifficulty
- `priorDifficulty(itemKey, sectionKey)`: looks up domain-specific difficulty offset

### Constants

| Constant | Keys | Description |
|----------|------|-------------|
| `BKT_PARAMS` | `defaultGuess: 0.25, defaultSlip: 0.1, pL0: 0.1, pT: 0.1` | BKT defaults |
| `IRT_CFG` | `A: 1.0, STEP: 0.4, D_STEP: 0.15, DECAY: 0.01, MATCH_PEAK: 0.65, MATCH_SIGMA: 0.2` | IRT discrimination, learning rates, target difficulty |
| `PPE_CFG` | `ALPHA_N: 0.1, ALPHA_S: 0.1, ALPHA_T: -0.3` | PPE power-law exponents for repetitions, spacing, time |
| `ENS_CFG` | `EMA_ALPHA: 0.1, TOP_K: 5, TEMPERATURE: 0.5, INIT_BRIER: 0.25` | Ensemble calibration and selection parameters |

## Module: `store.svelte.js`

Reactive store using Svelte 5 runes. Dual persistence: `mastery_v1` (scoring/display) and `mastery_v2` (ensemble state).

### Exports

| Function | Args | Returns | Description |
|----------|------|---------|-------------|
| `getSectionScore` | `sectionId` | `0-100` | Current mastery score (v1) |
| `record` | `sectionId, itemKey, correct, responseTimeMs` | void | Record attempt in both v1 and v2 |
| `nextPractice` | `sectionId` | `itemKey` | Pick next practice item (v1 algorithm) |
| `nextQuiz` | `sectionId` | `itemKey` | Pick next quiz item (v2 ensemble, v1 fallback) |
| `resetSection` | `sectionId` | void | Clear all data for a section (v1 + v2) |

### Persistence

- **v1** (`mastery_v1`): `{ [sectionId]: { [itemKey]: { n, h, rt, last } } }` — used for scoring, practice selection
- **v2** (`mastery_v2`): `{ [sectionId]: { _sec: { theta, w, brier }, [itemKey]: { pL, first, spacings, b, n } } }` — used for ensemble quiz selection
- Both loaded on module init, saved explicitly after each mutation

### Lazy Migration (v1 -> v2)

`ensureSection(sectionId)` is called on first v2 access per section. It:
1. Creates `_sec` with `emptySectionState()` (theta=0, equal weights)
2. For each item: migrates from v1 via `migrateItemRecord()` if data exists, otherwise `emptyEnsembleRecord()` with `priorDifficulty()` applied to `b`
3. Persists to `mastery_v2` — zero-downtime, no bulk migration needed

### Guess Rates (`GUESS_RATES`)

Per-section BKT guess rates derived from exercise UI choice counts:

| Section | Guess Rate | Basis |
|---------|-----------|-------|
| fretboard | 0.05 | open fretboard click |
| intervals | 0.08 | open fretboard click |
| triads | 0.25 | 4 multiple-choice buttons |
| sevenths | 0.20 | 5 multiple-choice buttons |
| scales | 0.17 | 6 scale options |
| builder | 0.10 | interval selection grid |
| iiVI | 0.08 | 12 key options |

### Record Flow (on each attempt)

1. **V1 update**: `recordAttempt()` -> save to `mastery_v1`
2. **V2 update**: `ensureSection()` -> compute predictions from all 3 models -> `irtUpdate()` for theta+b -> `bktUpdate()` for pL -> update spacings (keep last 5) -> `brierUpdate()` per model -> `updateWeights()` -> save to `mastery_v2`

### Quiz Selection Flow

1. `ensureSection()` guarantees v2 state exists
2. `nextQuizEnsemble()` scores all items via weighted geometric mean, takes top-5, softmax picks one
3. Falls back to v1 `nextQuiz()` if ensemble returns null
