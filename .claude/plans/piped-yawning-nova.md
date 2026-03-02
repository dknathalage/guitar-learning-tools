# Transform Quiz System → A-to-Z Learn-by-Doing Guitar System

## Context

The app currently has a sophisticated adaptive quiz engine (BKT, FSRS, Theta, UCB1 scoring) that **tests** guitar knowledge but never **teaches** it. The user wants an intuitive, progressive learning system covering full guitar fundamentals — from guitar anatomy through song structure — where the practice itself teaches through visual guides, step-by-step breakdowns, and mic-verified exercises. All content is open from the start. Progress is simple checkmarks.

---

## Architecture Overview

**Replace** the entire `src/lib/learning/` engine (~40 files) with a simple `src/lib/curriculum/` module (2 files). **Keep** audio system, music constants, fretboard math, SVG components, and challenge components (adapted). **Add** a new `/learn/[topic]` route for guided step execution.

```
BEFORE:                              AFTER:
learning/engine.js (UCB1)     →      curriculum/curriculum.js (15 topics, ordered steps)
learning/knowledge/ (BKT+θ)   →      curriculum/progress.js (boolean checkmarks)
learning/scheduling/ (FSRS)   →      (deleted)
learning/configs/unified.js   →      Step definitions in curriculum.js
practice/+page.svelte         →      learn/[topic]/+page.svelte
```

---

## Curriculum Structure

**15 topics**, each with ordered steps. Each step is one of 4 types:

| Type | What it does | Completion |
|------|-------------|------------|
| `info` | Visual guide + tips, no mic needed | Click "Got It" |
| `play` | Visual guide + play a note/chord with mic | Hold correct note |
| `sequence` | Visual guide + play notes in order | Complete sequence |
| `transition` | Visual guide + switch between shapes | Complete transitions |

**Topics (in recommended order):**
1. Guitar Anatomy — parts, string names, fret layout
2. Tuning — tune each string with mic verification
3. Open Strings — play each open string cleanly, then in sequence
4. Fretboard Notes — naturals on each string, landmark frets
5. Reading Tabs — tab notation, play simple tabs
6. Open Chords — C, G, Em, Am, D, E shapes + transitions
7. Strumming Patterns — downstrokes → down-up → folk/rock patterns
8. Barre Chords — E-form and A-form barres, moving up the neck
9. Power Chords — two-note shapes, rock riffs
10. Pentatonic Scales — minor/major pentatonic boxes, connecting positions
11. Major & Minor Scales — full 7-note scales across positions
12. CAGED System — 5 shapes tiling the neck, connecting shapes
13. Modes — Ionian through Locrian with characteristic sounds
14. Chord Progressions — I-IV-V, I-V-vi-IV, 12-bar blues
15. Song Structure — verse/chorus/bridge, combining everything

---

## Implementation Steps

### Step 1: Create curriculum data layer
**Create:**
- `src/lib/curriculum/curriculum.js` — Full 15-topic curriculum with step definitions
- `src/lib/curriculum/progress.js` — Simple `localStorage` checkmarks (`{topicId.stepId: true}`)
- `src/lib/curriculum/CLAUDE.md` — Module docs

Progress API: `markStepComplete(topicId, stepId)`, `isStepComplete()`, `getTopicProgress()`, `getOverallProgress()`

### Step 2: Create new UI components
**Create:**
- `src/lib/components/TopicCard.svelte` — Card with title, description, color, progress bar, checkmark
- `src/lib/components/StepList.svelte` — Step sidebar with checkmarks, type icons, current highlight
- `src/lib/components/VisualGuide.svelte` — Dispatches to Fretboard/ChordDiagram/NeckVisualization/custom based on `step.visual.kind`
- `src/lib/components/StepRunner.svelte` — Core component: renders visual guide + tips + challenge component + audio wiring + step completion

### Step 3: Adapt challenge components
**Modify** (minimal changes per component):
- Remove `recall` mode from all challenges (always show full visual guide)
- Simplify `onComplete` callbacks (remove points/multiplier/meta args → just `onComplete()`)
- Make `onWrong` a gentle "try again" (no score penalty)
- Add `customSequence` support to ScaleRunner for tab/open-string exercises
- **Files:** `NoteFind.svelte`, `ChordPlayer.svelte`, `ScaleRunner.svelte`, `ModeTrainer.svelte`, `ChordTransition.svelte`, `IntervalTrainer.svelte`, `StrumPatternTrainer.svelte`, `ChordRecognition.svelte`, `RhythmTrainer.svelte`

### Step 4: Build new routes
**Create:**
- `src/routes/learn/[topic]/+page.svelte` — Topic detail page with step sidebar + StepRunner
- `src/routes/learn/[topic]/+page.js` — `entries()` for static prerendering

**Rewrite:**
- `src/routes/+page.svelte` — Topic grid with progress rings, recommended path badges

**Layout:** Step sidebar (left) + Step content area (right) with visual guide, tips, and challenge. Mobile: sidebar collapses to step dots strip.

### Step 5: Delete old learning engine
**Delete entire directories:**
- `src/lib/learning/` (~40 files — engine, knowledge models, scheduling, selection, tracking, adaptive, configs, persistence)

**Delete files:**
- `src/lib/skilltree.js`, `src/lib/progress.js`
- `src/lib/components/LearningDashboard.svelte`
- `src/lib/components/svg/ThetaSparkline.svelte`, `CoverageHeatmap.svelte`
- `src/routes/practice/` (replaced by `/learn/[topic]`)

**Clean up:**
- `src/routes/caged/+page.svelte` — remove `markVisited()` call
- Any remaining broken imports

### Step 6: Complete curriculum content & documentation
- Fill all 15 topics with concrete steps (visual configs, exercise items, tips)
- Update all `CLAUDE.md` files
- Update root `CLAUDE.md` module map

---

## What Stays Unchanged
- `src/lib/audio/` — Full audio pipeline (YIN, Kalman, CQT, chord/onset detection)
- `src/lib/constants/` — Music theory data (notes, tunings, intervals, chords, scales, modes)
- `src/lib/music/` — Fretboard math, CAGED resolution, SVG rendering
- `src/lib/components/challenges/holdDetection.js` — Sustained-note state machine
- `src/lib/components/challenges/seqFretboard.js` — Sequence rendering
- `src/lib/components/svg/ProgressRing.svelte` — Reused for topic progress
- `src/routes/tuner/` — Standalone tool
- `src/routes/caged/` — Standalone tool (minor cleanup only)
- `src/lib/stores/` — Toast notifications

---

## Verification
1. `npm run build` succeeds with no broken imports
2. Home page shows 15 topic cards with progress indicators
3. Clicking a topic navigates to `/learn/[topic-id]`
4. Info steps show visual + tips + "Got It" button → marks complete
5. Play steps show fretboard + tips + mic detection → correct note marks complete
6. Sequence steps show color-coded sequence → completing sequence marks complete
7. Progress persists across page reloads (localStorage)
8. All topics accessible from start (nothing locked)
9. Tuner and CAGED visualizer still work independently
