# Plan: Explore → Practice → Quiz with Algorithm-Driven Mastery

## Context

The app has 7 theory exercises, each with explore/quiz modes (some explore-only). The user wants a structured learning system where each section has 3 modes — **Explore (Why)**, **Practice (How)**, **Quiz (What)** — driven by a mastery algorithm that tracks coverage, accuracy, and speed per item. User is a beginner aiming for applied musicianship. Visual-first approach.

## New Files

```
src/lib/mastery/
  sections.js         # Item space definitions per section (what "full coverage" means)
  algorithm.js        # Pure functions: scoring, item selection, attempt recording
  store.svelte.js     # Reactive Svelte 5 store with localStorage persistence
  CLAUDE.md           # Documentation
```

## Architecture

### Data Model

Single localStorage key `mastery_v1`. Per-item records:

```js
{ n: 0, h: 0, rt: [], last: 0 }  // attempts, hits, last 5 response times (ms), last timestamp
```

Item spaces per section:

| Section | Items | Key format | Example |
|---------|-------|-----------|---------|
| fretboard | 12 notes | `"C#"` | `"A"` |
| intervals | 144 (12×12) | `"${ri}_${semi}"` | `"3_7"` |
| triads | 48 (12×4) | `"${ri}_${typeId}"` | `"0_min"` |
| scales | 72 (12×6 scales/modes) | `"${ri}_${scaleId}"` | `"5_dorian"` |
| sevenths | 60 (12×5) | `"${ri}_${typeId}"` | `"9_m7"` |
| builder | 13 chord types | `"${typeId}"` | `"dim7"` |
| iiVI | 12 keys | `"${keyIndex}"` | `"7"` |

### Mastery Algorithm

**Score** (0–100) = coverage × 0.4 + accuracy × 0.4 + speed × 0.2

- **Coverage**: fraction of item space attempted at least once
- **Accuracy**: total hits / total attempts across all items
- **Speed**: fraction of items with avg response time ≤ target threshold

**Item selection** (weighted random):
- **Practice**: heavily favors unattempted items (weight 10) and low-accuracy items; includes recency bonus
- **Quiz**: favors items seen-but-struggling; spaced repetition style with time decay

### Store API (store.svelte.js)

```
getSectionScore(sectionId) → 0-100
record(sectionId, itemKey, correct, responseTimeMs)
nextPractice(sectionId) → itemKey
nextQuiz(sectionId) → itemKey
resetSection(sectionId)
```

Module-level `$state()` with `$effect()` auto-persist, matching existing `notifications.svelte.js` pattern.

## Exercise Changes (per component)

Each exercise gets a 3-tab bar: **Explore | Practice | Quiz**

### Mode Definitions

| Mode | Purpose | Scoring | Item Selection |
|------|---------|---------|---------------|
| **Explore** | Visual-first theory reference with audio. WHY it works. | None | User chooses freely |
| **Practice** | Interactive drills with feedback. HOW to apply it. | No pressure (feedback only) | Algorithm picks weak items |
| **Quiz** | Timed challenges. WHAT is it? | Tracked (score, streak) | Algorithm picks spaced items |

### Per-Exercise Changes

**FretboardNotes** — Add practice mode: algorithm picks note, user finds all positions. Wire `record()` in practice+quiz.

**IntervalExercise** — Add practice mode: algorithm picks root+interval, user clicks target position, hints after 2 wrong. Wire mastery.

**TriadExercise** — Add practice mode: algorithm picks root+type, auto-plays arpeggio, user identifies type without streak pressure. Wire mastery.

**ScaleExercise** — Add practice + quiz (currently explore-only). Practice: algorithm picks scale, user clicks degrees in order. Quiz: see pattern, identify scale type from choices.

**SeventhChords** — Add practice mode: same as quiz but with audio hints, retry allowed. Wire mastery.

**ChordBuilder** — Rename "build" to "explore". Add practice: algorithm picks chord type, user builds by toggling intervals with hint button. Add quiz: timed build.

**IIVITrainer** — Add practice mode: algorithm picks key, user identifies key from progression with replays allowed. Wire mastery.

## Main Page Changes

`src/routes/+page.svelte` — Add ProgressRing (size 22) next to each sidebar exercise item showing `getSectionScore()`. Color: gray→blue→green→gold at 0/1/50/90%.

## Implementation Order

| Phase | Task | Files |
|-------|------|-------|
| 1 | Mastery foundation | `src/lib/mastery/sections.js`, `algorithm.js`, `store.svelte.js`, `CLAUDE.md` |
| 2 | Main page integration | `src/routes/+page.svelte` |
| 3 | Simple conversions | `FretboardNotes.svelte`, `IntervalExercise.svelte`, `TriadExercise.svelte` |
| 4 | Remaining conversions | `SeventhChords.svelte`, `IIVITrainer.svelte`, `ScaleExercise.svelte`, `ChordBuilder.svelte` |
| 5 | Documentation | `CLAUDE.md` files |

## Verification

1. `npm run dev` — app loads, sidebar shows 0% rings for all sections
2. Open any exercise → 3 tabs visible (Explore / Practice / Quiz)
3. Explore mode works same as before (no mastery tracking)
4. Practice mode: items are algorithm-selected, feedback shown, no score pressure
5. Quiz mode: items are algorithm-selected, score tracked, mastery updates
6. Refresh page → mastery scores persist from localStorage
7. Sidebar rings update as mastery increases
