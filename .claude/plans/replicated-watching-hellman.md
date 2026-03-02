# Plan: Make Theory Trainer the Root Page + Remove Dead Code

## Context

The Theory Trainer (7 interactive exercises) was just built at `/theory`. The current home page (`/`) is a curriculum dashboard with a topic grid and progress tracking that links to a step-by-step `/learn/[topic]` system. The user wants the Theory Trainer to become the primary root content and all curriculum/learn system code removed.

## Changes

### 1. Replace home page with Theory Trainer content

**Move** the theory page content into the root route:
- `src/routes/+page.svelte` — replace entirely with the content from `src/routes/theory/+page.svelte`
- Remove the back-to-home link (it IS the home now)
- Add tool links for Tuner and CAGED Visualizer into the sidebar (below exercises)

**Delete** the theory sub-route (no longer needed):
- `src/routes/theory/+page.svelte`
- `src/routes/theory/+page.js`

### 2. Delete the curriculum/learn system (22 files + 2 directories)

**Learn route:**
- `src/routes/learn/[topic]/+page.svelte`
- `src/routes/learn/[topic]/+page.js`
- `src/routes/learn/` directory

**Curriculum data:**
- `src/lib/curriculum/curriculum.js`
- `src/lib/curriculum/progress.js`
- `src/lib/curriculum/CLAUDE.md`
- `src/lib/curriculum/` directory

**Curriculum UI components:**
- `src/lib/components/TopicCard.svelte`
- `src/lib/components/StepList.svelte`
- `src/lib/components/StepRunner.svelte`
- `src/lib/components/VisualGuide.svelte`

**Challenge components (only used by StepRunner):**
- `src/lib/components/challenges/NoteFind.svelte`
- `src/lib/components/challenges/ChordPlayer.svelte`
- `src/lib/components/challenges/ScaleRunner.svelte`
- `src/lib/components/challenges/ChordTransition.svelte`
- `src/lib/components/challenges/IntervalTrainer.svelte`
- `src/lib/components/challenges/ModeTrainer.svelte`
- `src/lib/components/challenges/StrumPatternTrainer.svelte`
- `src/lib/components/challenges/ChordRecognition.svelte`
- `src/lib/components/challenges/RhythmTrainer.svelte`
- `src/lib/components/challenges/PitchDisplay.svelte`

**Already-unused challenge components:**
- `src/lib/components/challenges/ChordToneFind.svelte`
- `src/lib/components/challenges/StringTraversal.svelte`

**Challenge support files:**
- `src/lib/components/challenges/holdDetection.js`
- `src/lib/components/challenges/seqFretboard.js`

### 3. Update documentation

- `src/lib/components/CLAUDE.md` — remove curriculum/challenge component docs, keep theory + SVG sections
- `src/routes/CLAUDE.md` — remove learn route, update root route description
- Root `CLAUDE.md` — remove `curriculum/` and `learn/` from directory structure

### Kept intact
- `/caged` — CAGED Visualizer (independent)
- `/tuner` — Chromatic Tuner (independent)
- `src/lib/audio/` — audio pipeline (used by tuner + theory)
- `src/lib/constants/` — music theory constants (used everywhere)
- `src/lib/music/` — fretboard math, CAGED, SVG rendering
- `src/lib/components/svg/` — SVG widget components
- `src/lib/components/theory/` — theory exercise components
- `src/lib/components/Toast.svelte` — notification system
- `src/lib/stores/` — notification store

## Verification

1. `npm run build` — static prerendering succeeds
2. Navigate to `/` — Theory Trainer loads with sidebar + 7 exercises
3. Navigate to `/caged` and `/tuner` — still work
4. Confirm no dangling imports (build would fail if any exist)
