## Codebase

SvelteKit SPA with static adapter for GitHub Pages deployment.

```
src/lib/
  constants/music.js          # NOTES, A4, TUNINGS, INTERVALS, CHORD_TYPES
  audio/                      # Audio analysis pipeline — see audio/CLAUDE.md
  music/                      # Fretboard math, CAGED chord resolution, SVG rendering
  learning/                   # Adaptive engine — see learning/CLAUDE.md
  components/challenges/      # Hold detection state machine for mic exercises
src/routes/
  caged/        # CAGED Chord Visualizer
  tuner/        # Guitar Tuner
  exercises/    # Mic-based: note-find, string-traversal, interval
  theory/       # Tap-based: fretboard-quiz, interval-namer, chord-speller
```

Detailed documentation lives in feature-folder `CLAUDE.md` files:
- `src/lib/audio/CLAUDE.md` — pitch detection, chord recognition, onset detection, worklet architecture
- `src/lib/learning/CLAUDE.md` — knowledge models, item selection, drill systems, persistence

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
