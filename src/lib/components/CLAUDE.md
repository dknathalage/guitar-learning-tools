# UI Components

Svelte 5 components for theory exercises and SVG visualization.

## Module Map

```
challenges/
  PitchDisplay.svelte         # Real-time pitch detection readout
  holdDetection.js            # Hold detection state machine
  seqFretboard.js             # Sequence fretboard renderer for scales/modes
svg/
  Fretboard.svelte            # Generic fretboard template with slot for dots
  ChordDiagram.svelte         # 4-fret chord diagram (wraps chords.renderDiagram)
  NeckVisualization.svelte    # 15-fret CAGED neck overlay (wraps chords.renderNeck)
  InteractiveFretboard.svelte # 15-fret interactive fretboard for theory exercises
  NoteDot.svelte              # Reusable circle + label component
  ProgressRing.svelte         # Circular progress indicator
theory/
  ChordCard.svelte            # Compact chord button with root + symbol + degree
  FretboardNotes.svelte       # Find notes on the fretboard (explore, practice, quiz)
  IntervalExercise.svelte     # Learn and identify intervals (explore, practice, quiz)
  TriadExercise.svelte        # Explore and identify triad types (explore, practice, quiz)
  ScaleExercise.svelte        # Visualize scales with diatonic chords (explore, practice, quiz)
  SeventhChords.svelte        # Learn 7th chord voicings (explore, practice, quiz)
  ChordBuilder.svelte         # Build chords from intervals (explore, practice, quiz)
  IIVITrainer.svelte          # Practice ii-V-I progressions (explore, practice, quiz)
  theory-utils.js             # Shared helpers for theory exercises
Toast.svelte                  # Toast notification container
```

## SVG Components

All SVG components use Svelte 5 `$props()` and render inline SVG.

### Fretboard.svelte

Generic fretboard template — renders board structure (strings, frets, nut, inlays, string labels, fret numbers). Uses a Svelte `{@render}` snippet slot for note dots, passing layout params.

### InteractiveFretboard.svelte (`svg/`)

Props: `dots`, `onclick`, `highlightedFrets`

15-fret interactive fretboard SVG. Renders note dots from the `dots` array (each with `str`, `fret`, `note`, `color`). Supports click callbacks for quiz interactions.

## Theory Components

Interactive music theory exercises in `theory/`. All exercise components accept a `tonePlayer` prop (`TonePlayer` instance) for audio playback.

### 3-Tab Pattern (Explore / Practice / Quiz)

All 7 exercises use a consistent 3-tab layout controlled by `let tab = $state('explore')`:

- **Explore** — Reference mode. Browse content freely, no tracking. User selects items manually.
- **Practice** — Drill mode. Items chosen by `nextPractice(sectionId)` from mastery store. Feedback shown (correct/wrong), no time pressure. Records attempts via `record(sectionId, itemKey, correct, responseTimeMs)`.
- **Quiz** — Timed assessment. Items chosen by `nextQuiz(sectionId)`. Timer counts elapsed time. Tracks score (correct/total). Records attempts with response time.

### Mastery Store Integration

Each exercise imports from `$lib/mastery/store.svelte.js`:
- `record(sectionId, itemKey, correct, responseTimeMs)` — log attempt results
- `nextPractice(sectionId)` — get next item for practice mode
- `nextQuiz(sectionId)` — get next item for quiz mode

Section IDs match the keys in `SECTIONS`: `fretboard`, `intervals`, `triads`, `scales`, `sevenths`, `builder`, `iiVI`.

### Tab Bar CSS

Consistent `.tab-bar` styling across exercises — horizontal button row with `.tab-btn` buttons and `.tab-btn.active` highlight. Scoped per-component `<style>` block.

### theory-utils.js

Shared helpers for theory exercises:

| Function | Description |
|----------|-------------|
| `noteFreq(noteName, octave)` | Frequency in Hz (A4 = 440) |
| `allPositions(noteName, maxFret)` | All fretboard `{str, fret}` for a note |
| `intervalsToNotes(rootIndex, intervals)` | Semitone offsets to note names |
| `chordPositions(rootIndex, intervals, maxFret)` | Chord tone positions with degree colors |
| `scalePositions(rootIndex, formula, maxFret)` | Scale tone positions with degree colors |
| `randomNote()` | Random note name |
| `randomKey()` | Random key index 0-11 |
| `DEGREE_COLORS` | 8-color palette for scale/chord degrees |

### ChordCard.svelte

Props: `root`, `quality`, `degree`, `active`, `onclick`

Compact chord button showing chord name (root + symbol) and Roman numeral degree. Used by ScaleExercise and IIVITrainer for diatonic chord displays.

### Exercise Components

| Component | Exercise | Modes |
|-----------|----------|-------|
| `FretboardNotes` | Find notes on the fretboard | explore, practice, quiz |
| `IntervalExercise` | Learn and identify intervals | explore, practice, quiz |
| `TriadExercise` | Explore and identify triad types | explore, practice, quiz |
| `ScaleExercise` | Visualize scales with diatonic chords | explore, practice, quiz |
| `SeventhChords` | Learn 7th chord voicings | explore, practice, quiz |
| `ChordBuilder` | Build chords from intervals | explore, practice, quiz |
| `IIVITrainer` | Practice ii-V-I progressions in all keys | explore, practice, quiz |

### Visualization Components

| Component | Props | Description |
|-----------|-------|-------------|
| `ProgressRing` | `pct, color, size` | Circular arc showing percent complete |
| `ChordDiagram` | `chord, color` | 4-fret chord diagram |
| `NeckVisualization` | `rootIndex, chordType, currentShape` | 15-fret CAGED neck overlay |
| `NoteDot` | `cx, cy, r, fill, label` | Reusable circle + label |
