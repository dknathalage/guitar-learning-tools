## Codebase

SvelteKit SPA with static adapter for GitHub Pages deployment.

```
src/lib/
  constants/    # Music theory data — notes, tunings, intervals, chords, scales, modes
  audio/        # Audio analysis pipeline — YIN, Kalman, CQT, chord/onset detection
  music/        # Fretboard math, CAGED chord resolution, SVG rendering
  components/   # Svelte 5 UI — theory exercises, SVG widgets, Toast
  mastery/      # Mastery algorithm — scoring, item selection, localStorage persistence
  stores/       # Svelte rune stores (notifications)
src/routes/
  +page.svelte  # Theory Trainer — 7 interactive exercises + tool links
  caged/        # CAGED Chord Visualizer
  tuner/        # Chromatic Guitar Tuner
```

Detailed documentation lives in feature-folder `CLAUDE.md` files:
- `src/lib/audio/CLAUDE.md` — pitch detection, chord recognition, onset detection, worklet architecture
- `src/lib/constants/CLAUDE.md` — music theory constants, tunings, intervals, chord types
- `src/lib/music/CLAUDE.md` — fretboard geometry, CAGED resolution, SVG rendering
- `src/lib/components/CLAUDE.md` — theory exercises, SVG widgets, visualization components
- `src/lib/mastery/CLAUDE.md` — mastery scoring, item selection, persistence
- `src/routes/CLAUDE.md` — page routes, shared patterns, state management

### Code Conventions

- Svelte 5 runes: `$state()`, `$derived()`, `$effect()`, `$props()`
- Abbreviated names: `ri` = root index, `ct` = chord type, `sh` = shape, `bf` = base fret
- ALL_CAPS for constants: `CFG`, `MAX_FO`, `NF`
- SVG rendering via pure functions, scoped `<style>` blocks
- `{ base }` from `$app/paths` for all internal links
- `AudioManager` class for mic lifecycle; `onDestroy` cleanup on navigation
- Exercise configs are self-contained — all domain logic lives in the config, not the engine

### Documentation Rules

- After every feature build, update documentation before committing
- Use `CLAUDE.md` files for all documentation — one per feature folder
- Keep parent-folder `CLAUDE.md` files clean: structure overview + pointers to child docs
- Trickle detailed knowledge down to the feature-folder `CLAUDE.md` where the code lives
- `README.md` is the public-facing project overview; `CLAUDE.md` files are the internal technical reference

### Agent Coordination Rules

- The **main agent** coordinates only — it must never read, write, or edit source code directly
- All code work is delegated to teammate agents via the Task tool
- Main agent responsibilities: task creation, assignment, review, and user communication
- Teammate agents own specific files and must not modify files outside their scope
