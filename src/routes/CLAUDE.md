# Routes

SvelteKit SPA routes. Static adapter (`prerender = true`) for GitHub Pages deployment.

## Route Map

```
+layout.js            # prerender = true (static export)
+layout.svelte        # Root layout: Toast container + children
+page.svelte          # Theory Trainer — 7 interactive exercises + tool links
caged/
  +page.svelte        # CAGED Chord Visualizer
tuner/
  +page.svelte        # Chromatic guitar tuner
```

## Pages

### Home / Theory Trainer (`+page.svelte`)

Interactive music theory exercise hub with sidebar navigation (desktop) or horizontal pill row (mobile). Seven exercises, each with explore and/or quiz modes:

- **Fretboard Notes** — find notes on the fretboard
- **Intervals** — learn and identify intervals
- **Triads** — explore and quiz triad types
- **Scales** — visualize scales with diatonic chords
- **7th Chords** — learn seventh chord voicings
- **Chord Builder** — construct chords from intervals
- **ii-V-I Trainer** — practice ii-V-I progressions in all keys

Uses `TonePlayer` for audio playback (no mic required). Components live in `$lib/components/theory/`.

Sidebar also links to the Tuner and CAGED Visualizer tools.

### CAGED Visualizer (`caged/+page.svelte`)

Interactive chord shape explorer:
- Root note selector (12 chromatic pills)
- Chord type selector (12 types)
- Tuning selector (6 presets + custom)
- Per-shape cards with `ChordDiagram` SVG
- Full `NeckVisualization` showing all shapes across 15 frets
- Optional shape filtering (click to isolate)

### Tuner (`tuner/+page.svelte`)

Chromatic guitar tuner:
- Real-time detected note + cents deviation indicator
- 6 string displays with color-coded tuning status (sharp/flat/in-tune)
- Custom tuning editor (click string to change target note)
- Preset management with localStorage persistence
- Supports all 6 built-in tunings + user-created custom presets

## Shared Patterns

- All routes use `{ base }` from `$app/paths` for internal links (required for GitHub Pages subpath)
- Mic-based pages create `AudioManager` in `onMount` and clean up in `onDestroy`

### Progress Rings & Mastery Integration

The Theory Trainer sidebar shows per-exercise mastery via inline SVG progress rings (22px, `r=8`). `getSectionScore(sectionId)` from `$lib/mastery/store.svelte.js` drives the arc fill. Color progression by score:

| Score | Color | Hex |
|-------|-------|-----|
| 0 | gray | `#555` |
| 1-49 | blue | `#58a6ff` |
| 50-89 | green | `#3fb950` |
| 90-100 | gold | `#d4a017` |

Progress rings are hidden on mobile (pill row layout).
