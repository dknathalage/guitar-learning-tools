# Progressive Learning Algorithm

## Context

Practice sessions feel random — questions jump between unrelated topics every turn. The engine is optimized for spaced repetition (FSRS + BKT + UCB1) but lacks curriculum sequencing. The interleave penalty actively pushes *away* from same-cluster items. `genRandom()` generates truly random candidates. `pickScaffold()` is fully implemented in every config but never called. No concept of staying on a topic.

## Files to Modify

1. `src/lib/learning/defaults.js` — add `focus` params, reduce interleave penalty, increase cold start
2. `src/lib/learning/engine.js` — focus window state machine, structured candidates, scaffold wiring
3. `src/lib/learning/selection/scorer.js` — focus continuity bonuses in scoring formula
4. `src/lib/learning/configs/unified.js` — progressive difficulty filtering in `genFromType()`

## Changes

### 1. defaults.js

**Add** `focus` block after `coldStart`:
```js
focus: {
  burstMin: 5,              // min questions in a focus window
  burstMax: 8,              // max questions
  exitAccuracy: 0.80,       // early exit if accuracy hits this
  exitMinQuestions: 3,       // min before accuracy-based exit
  candidateSplit: { focused: 6, weak: 2, explore: 2 },
  scaffoldAfterFail: true,
  scaffoldMaxPerBurst: 2,
  typeContinuityBonus: 0.25,
  clusterContinuityBonus: 0.15,
}
```

**Change** `interleavePenalty`: `-0.3` → `-0.05` (stop punishing topical coherence)

**Change** `coldStart.minQuestions`: `7` → `12` (show each type at least twice)

### 2. engine.js

**Add state** (constructor, transient/not persisted):
- `focusType`, `focusCluster`, `focusBurstCount`, `focusBurstCorrect`, `focusBurstTarget`
- `scaffoldQueue`, `scaffoldsThisBurst`, `_lastFocusType`

**Add `_pickFocus()`**: Picks the exercise type with lowest average pL across seen items. Within that type, picks the cluster with lowest pL. Sets burst target (randomized 5–8). If current burst is active and within limits, keeps it. Early exit at 80% accuracy after 3+ questions. Avoids repeating the same type consecutively.

**Add `_resetFocus()`**: Clears all focus state.

**Add `_findWeakCluster()`**: Scans all items, returns cluster ID with lowest average pL (min 2 items seen).

**Modify `next()`** — replace the 10-random-candidate block:
1. Check scaffold queue first (priority after drills)
2. Call `_pickFocus()` to determine/maintain focus
3. Generate structured candidates: 6 from focus type, 2 from weakest cluster, 2 random
4. Pass `focusType`/`focusCluster` to scorer via `_scoringState()`

**Modify `report()`** — after recording answer:
- Track `focusBurstCorrect` on correct answers
- On failure: if `scaffoldAfterFail` and under limit, call `config.pickScaffold(item, focusCluster)` → queue results

**Modify `_scoringState()`**: Add `focusType` and `focusCluster` fields.

**Modify `reset()`**: Clear all focus state.

### 3. scorer.js

**Add focus bonuses** (for both new and existing items):
- `typeContinuityBonus` (+0.25): item's `_type` matches `focusType`
- `clusterContinuityBonus` (+0.15): item shares cluster with `focusCluster`

**Modify new-item scoring**: Apply focus bonuses before returning (currently just returns Gaussian match).

**Modify final return**: Add `focusBonus` to the sum.

### 4. unified.js

**Modify `genFromType()`**: Add progressive difficulty filtering. Compute `progress` based on how far theta exceeds the type's base difficulty. Only accept generated items within `base + progress * span`. Try up to 5 times, then fall back. This ensures early learners see easy shapes (E/A major) before hard ones (C minor 7th).

## What This Feels Like

**Before**: "Find C on string 2... Play D minor chord... What's a minor 3rd... Find Ab on string 5..."

**After**: "Find C on string 2... Find E on string 2... Find G on string 2... *(missed G)* Here's G at fret 0 *(scaffold)*... Find A on string 2... *(burst ends, switch to intervals)* Perfect 5th from C... Perfect 5th from E..."

## Verification

1. `npm run dev` → open practice page
2. Start a session — first 12 questions should cycle through types (cold start)
3. After cold start: questions should cluster by type+topic (5–8 of same type)
4. Miss a note → next question should be a scaffold (easier related item on same string/zone)
5. Get 80%+ accuracy in a burst → should switch to a different type/topic
6. Weak areas should get more focus than strong areas
