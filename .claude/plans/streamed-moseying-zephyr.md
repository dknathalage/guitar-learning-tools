# Cutting-Edge Browser Audio Analysis System

## Context

The current audio pipeline uses monophonic YIN pitch detection in a `requestAnimationFrame` loop, emitting simple `{note, cents, hz, semitones}` events. The learning engine receives only binary correct/wrong + response time. This leaves massive signal on the table: cents data is computed but discarded, there's no chord detection, no rhythm/onset detection, no dynamics tracking, no articulation detection, and octave errors on wound strings are common. This plan upgrades the entire audio pipeline to extract rich features and adds three new exercise types that leverage them.

## Architecture Overview

```
Microphone → AudioWorkletProcessor (real-time thread)
               ├─ YIN pitch + harmonic correction
               ├─ FFT → Chromagram (12-bin pitch class)
               ├─ Spectral flux → Onset detection
               ├─ RMS envelope + dynamics
               ├─ Noise floor calibration
               └─ Feature extraction (cents trajectory, articulation)
                    ↓ (MessagePort)
             AudioManager (main thread)
               ├─ StableNoteTracker (existing logic extracted)
               ├─ ChordDetector (template matching on chromagram)
               ├─ OnsetDetector + IOITracker (rhythm)
               └─ Events: detect | chord | onset | silence | calibrated | analysis
                    ↓
             Challenge Components (consume relevant events)
               ├─ Existing 6 exercises: enhanced with cents/dynamics metadata
               ├─ NEW: ChordRecognition (polyphonic chord detection)
               ├─ NEW: RhythmTrainer (play to timing grid)
               └─ NEW: StrumPatternTrainer (up/down strum patterns)
                    ↓
             Learning Engine (expanded report)
               └─ engine.report(item, ok, timeMs, meta)
                    meta now includes: avgCents, stdCents, timeToStable,
                    rmsDb, dynamics, onsetStrength, chordScore, techniqueScore
```

## Implementation Phases

### Phase 0: AudioWorklet Foundation
**Goal**: Move DSP off main thread. Existing exercises work identically.
**No user-facing changes.**

- Create `src/lib/audio/worklet/guitar-processor.js`
  - `AudioWorkletProcessor` subclass with ring buffer (8192 samples)
  - Port YIN algorithm from `pitch.js` into processor
  - RMS computation per hop
  - Hop size: 512 samples (~10ms at 48kHz), frame size: 4096 samples
  - Post `{type:'analysis', ts, rms, pitch:{hz,confidence,note,cents,semi}}` messages
  - Receive `{type:'configure', config}` and `{type:'calibrate'}` messages
- Create `src/lib/audio/worklet/messages.js` — message type constants
- Extract `StableNoteTracker` class from AudioManager's inline loop logic
- Refactor `AudioManager.js`:
  - `start()`: try `audioWorklet.addModule()`, fallback to existing RAF+AnalyserNode
  - Worklet path: `MediaStreamSource → AudioWorkletNode`, messages via port
  - Fallback path: existing `MediaStreamSource → AnalyserNode` + RAF loop (preserved as `_startRafLoop()`)
  - Both paths emit identical `detect`/`silence` events — callers unaware of backend
- URL resolution for worklet: `new URL('./worklet/guitar-processor.js', import.meta.url)` (Vite handles this). If build issues arise, fallback to Blob URL approach.

**Files**: `worklet/guitar-processor.js` (new), `worklet/messages.js` (new), `AudioManager.js` (refactor)
**Risk**: Vite/SvelteKit worklet module resolution — test with `npm run build` early

### Phase 1: Harmonic Correction + Noise Calibration
**Goal**: Fix octave-up errors on wound strings. Auto-adapt to room noise.

- Create `src/lib/audio/analysis/harmonics.js`
  - `harmonicCorrect(hz, buffer, sampleRate)`: after YIN finds `freq`, check autocorrelation at `tau*2` (corresponding to `freq/2`). If CMND at `tau*2` is < 85% of CMND at `tau`, use `freq/2`. Only applies when `freq > 160Hz` and `freq/2 > FREQ_MIN`.
  - Called inside worklet after YIN, before posting result
- Create `src/lib/audio/analysis/calibration.js`
  - `NoiseCalibrator` class: collects 100 RMS frames (~1s), computes P95 noise floor, sets `rmsThreshold = P95 * 1.5`
  - Triggered on `start()` before first detection
  - Worklet posts `{type:'calibration', noiseFloor, rmsThreshold}` when done
  - AudioManager stores calibrated threshold, emits `calibrated` event
- Add to `constants.js`: `WORKLET_HOP: 512`, `WORKLET_FRAME: 4096`
- Add to `defaults.js`: `calibration: { targetFrames: 100, safetyMultiplier: 1.5 }`, `audio.harmonicCorrectionEnabled: true`
- Tests for both modules

**Files**: `analysis/harmonics.js` (new), `analysis/calibration.js` (new), + tests, `constants.js`, `defaults.js` (modify)
**Depends on**: Phase 0

### Phase 2: Rich Feature Extraction
**Goal**: Dynamics, intonation curves, articulation detection. Expanded detect event.

- Create `src/lib/audio/analysis/features.js`
  - `rmsToDb(rmsLinear)` → dBFS
  - `detectArticulation(freqHistory, nominalHz)` → `{vibrato, vibratoRate, bend, bendCents, stable}`
    - Vibrato: zero-crossing rate of cents deviation in 4-8Hz range
    - Bend: monotonic cents deviation > 30 cents
    - Stable: std(cents) < 10
  - `intonationStats(centsHistory)` → `{avgCents, stdCents, timeToStable, oscillations}`
- Add feature extraction to worklet (guarded by `enableFeatures` flag):
  - Maintain `freqTrajectory` buffer (last 20 Hz estimates)
  - Compute `centsDelta` (rate of change)
  - Post features in analysis message
- Expand AudioManager `detect` event detail:
  ```
  { note, cents, hz, semitones,          // existing (backward-compatible)
    confidence, rms, rmsDb,               // new
    chromagram, spectralFlux,             // new (null if not enabled)
    centsDelta, freqTrajectory,           // new (null if not enabled)
    articulation: {vibrato, bend, ...} }  // new (null if not enabled)
  ```
- Enhance `PitchDisplay.svelte`: add dynamics meter (RMS bar) and intonation quality indicator
- Tests for features module

**Files**: `analysis/features.js` (new), + test, `worklet/guitar-processor.js`, `AudioManager.js`, `PitchDisplay.svelte` (modify), `defaults.js` (add `enableFeatures` etc.)
**Depends on**: Phase 0. **Can run parallel with Phase 1.**

### Phase 3: Engine Report Expansion + Persistence v5
**Goal**: Learning engine accepts richer metadata. Enhanced FSRS grading. v5 storage.
**Can run fully parallel with Phases 0-2 (no audio dependencies).**

- Add `gradeFromResponseEnhanced(ok, timeMs, medianTime, avgCents, stdCents)` to `scheduling/fsrs.js`
  - Correct + poor intonation (|cents| > 25 or std > 20): downgrade one FSRS level
  - Correct + excellent intonation (|cents| < 5, std < 8): upgrade one level
  - Existing `gradeFromResponse()` untouched, new function used when cents data available
- Modify `engine.js report()`:
  - If `meta.avgCents` present, use `gradeFromResponseEnhanced()` instead of `gradeFromResponse()`
  - Store `meta.avgCents` in new per-item `centsHistory` array (last 10)
  - Store `meta.techniqueScore` in new per-item `techniqueScores` array (last 10)
  - All new logic guarded by null checks — zero impact on existing callers
- Add new per-item record fields in `item-manager.js`:
  - `centsHistory: []`, `avgCents: null`, `techniqueScores: []`
- v4 → v5 migration in `serializer.js`/`migration.js`:
  - Add default values for new fields to all existing item records
  - Add `adaptive.audioFeatures: { calibratedNoiseFloor: null, avgOnsetStrength: null }`
- Update `getMastery()` to expose intonation stats in per-item output
- Migration tests

**Files**: `scheduling/fsrs.js`, `engine.js`, `item-manager.js`, `persistence/serializer.js`, `migration.js`, `constants.js`, `defaults.js` (all modify)

### Phase 4: Enhanced Existing Exercises
**Goal**: All 6 mic-based challenges pass intonation data to engine. Adaptive hold timing.

- Expand `onComplete` callback signature: `(basePts, mult)` → `(basePts, mult, extraMeta)`
- Each challenge component accumulates `centsBuffer` during hold period:
  - On correct detection: `centsBuffer.push(cents)`
  - On silence/wrong: `centsBuffer = []`
  - On confirm: compute `avgCents`, `stdCents` from buffer, pass as `extraMeta`
- Files to modify (same pattern in each):
  - `NoteFind.svelte`
  - `IntervalTrainer.svelte`
  - `ChordPlayer.svelte`
  - `ChordTransition.svelte`
  - `ScaleRunner.svelte`
  - `ModeTrainer.svelte`
- Modify `practice/+page.svelte`: `onChallengeComplete(basePts, mult, extraMeta)` forwards `extraMeta` to `engine.report()`
- Adaptive hold detection in `holdDetection.js`:
  - Add `setTheta(theta)` method
  - `confirmMs = lerp(maxConfirm, minConfirm, theta)` — higher skill = shorter hold required
  - Add to `defaults.js`: `holdDetection.adaptiveConfirmMs: true`, `holdDetection.confirmMsRange: [200, 500]`

**Files**: 6 challenge `.svelte` files, `holdDetection.js`, `practice/+page.svelte`, `defaults.js` (all modify)
**Depends on**: Phase 3 (engine must accept new meta)

### Phase 5: Chromagram + Chord Detection
**Goal**: Polyphonic chord detection via FFT → chromagram → template matching.

- Implement radix-2 Cooley-Tukey FFT inside worklet (~80 lines, pure JS)
  - 4096-point FFT at 48kHz: ~0.3ms computation, well within real-time budget
  - Hann window applied before FFT
  - Output: magnitude spectrum (Float32Array, fftSize/2+1 bins)
- Create `src/lib/audio/analysis/chromagram.js`
  - `computeChromagram(magnitudes, sampleRate, fftSize)`: fold FFT bins into 12 pitch classes (C through B), weighted by magnitude squared, L2-normalized
  - Frequency range: 65Hz (C2) to 2100Hz (C7)
- Create `src/lib/audio/analysis/templates.js`
  - `buildChordTemplates()`: generate L2-normalized 12-bin chroma vectors for every root × chord type combination from existing `CHORD_TYPES` constant
  - `matchChord(observed, templates, minScore=0.65)`: cosine similarity against all templates, return sorted matches above threshold
- Add to worklet: compute FFT + chromagram when `enableChromagram` flag set, include in analysis message
- Add `ChordDetector` class to AudioManager (or separate utility):
  - Temporal smoothing: average last 5 chromagram frames
  - Stability: same chord match for 3+ consecutive frames
  - Emit `chord` event: `{root, typeId, chordName, score, chromagram}`
- Tests for chromagram computation and template matching

**Files**: `analysis/chromagram.js` (new), `analysis/templates.js` (new), + tests, `worklet/guitar-processor.js`, `AudioManager.js` (modify)
**Depends on**: Phase 0

### Phase 6: Onset Detection
**Goal**: Spectral flux-based onset detection with IOI tracking for rhythm.

- Create `src/lib/audio/analysis/onset.js`
  - `spectralFlux(current, previous)`: half-wave rectified spectral difference between consecutive magnitude frames
  - `OnsetDetector` class: dynamic threshold via median filtering (window=7), peak picking with `minOnsetInterval` (50ms), returns `{strength, timeMs}` or null
  - `IOITracker` class: maintains buffer of onset times (max 32), computes inter-onset intervals, estimates tempo (BPM from median IOI), `matchPattern(targetPattern, toleranceMs)` for rhythm exercises
- Add spectral flux computation to worklet (guarded by `enableOnset`):
  - Store previous magnitude spectrum
  - Compute flux on each hop
  - Run peak picker, post `{type:'onset', ts, strength, spectralFlux}` on detection
- AudioManager emits `onset` events
- Tests

**Files**: `analysis/onset.js` (new), + test, `worklet/guitar-processor.js`, `AudioManager.js` (modify)
**Depends on**: Phase 5 (shares FFT in worklet)

### Phase 7: Chord Recognition Exercise
**Goal**: New exercise — player strums a chord, app identifies it via chromagram.
**Full polished UI via frontend-design skill.**

- Create `src/lib/learning/configs/chordRecognition.js`
  - `itemDifficulty(item)`: based on chord type complexity (maj=0.1, min=0.15, 7=0.3, maj7=0.35, m7=0.4)
  - `itemKey(item)`: `root_typeId` (e.g., `"A_min"`)
  - `itemClusters`: root, type, quality (major/minor family)
  - `microDrill`: on failure, simplify to major/minor; drill root note first
  - `genRandom`: pick random root + type, avoid repeating last
- Create `src/lib/components/challenges/ChordRecognition.svelte`
  - Subscribes to `chord` events from AudioManager
  - Shows target chord name + optional chord diagram
  - Hold detection: stable chord match for 500ms confirms
  - Visual feedback: chromagram visualization showing detected vs expected
  - Reports `meta: { detectedChord, chordScore }`
- Register in `configs/unified.js` as type `cr` with difficulty range `{base: 0.30, span: 0.40}`
- Add dispatch branch in `practice/+page.svelte`
- Wire `enableChromagram: true` when chord recognition exercises are active

**Files**: `configs/chordRecognition.js` (new), `ChordRecognition.svelte` (new), `configs/unified.js`, `practice/+page.svelte` (modify)
**Depends on**: Phase 5

### Phase 8: Rhythm Trainer Exercise
**Goal**: New exercise — play notes matching a timing grid with visual metronome.
**Full polished UI via frontend-design skill.**

- Create `src/lib/learning/configs/rhythmTrainer.js`
  - Items: `{pattern: [0, 0.25, 0.5, 0.75], bpm: 80, subdivision: 'quarter', noteToPlay: 'E'}`
  - Difficulty based on tempo and subdivision complexity
  - Clusters: `tempo_slow/med/fast`, `subdivision_quarter/eighth/triplet`
  - Progressive difficulty: quarter notes → eighth notes → triplets → syncopation
- Create `src/lib/components/challenges/RhythmTrainer.svelte`
  - Visual metronome (animated timeline showing target onset positions)
  - Subscribes to `onset` events
  - Uses `IOITracker.matchPattern()` for scoring
  - Visual feedback: show early/late/on-time for each onset
  - Optional: play click track via TonePlayer
  - Reports `meta: { avgErrorMs, patternScore }`
- Register in `configs/unified.js` as type `rt` with difficulty range `{base: 0.15, span: 0.50}`
- Wire `enableOnset: true` when rhythm exercises are active

**Files**: `configs/rhythmTrainer.js` (new), `RhythmTrainer.svelte` (new), `configs/unified.js`, `practice/+page.svelte` (modify)
**Depends on**: Phase 6

### Phase 9: Strum Pattern Trainer Exercise
**Goal**: New exercise — play specific up/down strum patterns to timing.
**Full polished UI via frontend-design skill.**

- Create `src/lib/learning/configs/strumPattern.js`
  - Items: `{pattern: ['D','D','U','D','U'], bpm: 90, chord: 'G'}`
  - Difficulty based on pattern complexity and tempo
  - Strum direction detection via spectral centroid trajectory:
    - Downstroke: spectral centroid rises (low strings first → high strings)
    - Upstroke: spectral centroid falls (high strings first → low strings)
    - Computed from consecutive chromagram/FFT frames within ~30ms onset window
- Create `src/lib/components/challenges/StrumPatternTrainer.svelte`
  - Pattern visualization (D/U arrows with timing grid)
  - Subscribes to `onset` + `analysis` events
  - Validates both timing (IOI) and direction (spectral centroid)
  - Reports `meta: { timingScore, directionScore, patternScore }`
- Register in `configs/unified.js` as type `sp` with difficulty range `{base: 0.25, span: 0.50}`
- Wire both `enableOnset: true` and `enableChromagram: true`

**Files**: `configs/strumPattern.js` (new), `StrumPatternTrainer.svelte` (new), `configs/unified.js`, `practice/+page.svelte` (modify)
**Depends on**: Phase 6

## Agent Parallelization Strategy

```
Time →

Group A (parallel):
  Agent 1: Audio Pipeline       [Phase 0: worklet + AudioManager refactor]
  Agent 2: Learning Engine      [Phase 3: report expansion + v5 migration]

Group B (parallel, after Phase 0):
  Agent 1: DSP Algorithms       [Phase 1: harmonics + calibration]
  Agent 3: Feature Extraction   [Phase 2: features + PitchDisplay]

Group C (parallel, after Groups A+B):
  Agent 4: Challenge Components [Phase 4: cents in existing exercises]
  Agent 5: Chromagram/Chord     [Phase 5: FFT + chromagram + templates]

Group D (after Group C):
  Agent 5: Onset Detection      [Phase 6: spectral flux + IOI]
  Agent 6: New Exercises        [Phases 7-9: chord recognition, rhythm, strum pattern]
    - Uses frontend-design skill for polished UIs
```

Max 3 agents concurrent. Total ~6 distinct agents across the build.

## File Summary

### New Files (20)
| File | Phase |
|------|-------|
| `src/lib/audio/worklet/guitar-processor.js` | 0 |
| `src/lib/audio/worklet/messages.js` | 0 |
| `src/lib/audio/analysis/harmonics.js` + test | 1 |
| `src/lib/audio/analysis/calibration.js` + test | 1 |
| `src/lib/audio/analysis/features.js` + test | 2 |
| `src/lib/audio/analysis/chromagram.js` + test | 5 |
| `src/lib/audio/analysis/templates.js` + test | 5 |
| `src/lib/audio/analysis/onset.js` + test | 6 |
| `src/lib/learning/configs/chordRecognition.js` | 7 |
| `src/lib/learning/configs/rhythmTrainer.js` | 8 |
| `src/lib/learning/configs/strumPattern.js` | 9 |
| `src/lib/components/challenges/ChordRecognition.svelte` | 7 |
| `src/lib/components/challenges/RhythmTrainer.svelte` | 8 |
| `src/lib/components/challenges/StrumPatternTrainer.svelte` | 9 |

### Modified Files (17)
| File | Phases |
|------|--------|
| `src/lib/audio/AudioManager.js` | 0,1,2,5,6 |
| `src/lib/audio/worklet/guitar-processor.js` | 0,1,2,5,6 |
| `src/lib/learning/constants.js` | 1,5 |
| `src/lib/learning/defaults.js` | 1,2,4 |
| `src/lib/learning/engine.js` | 3 |
| `src/lib/learning/scheduling/fsrs.js` | 3 |
| `src/lib/learning/item-manager.js` | 3 |
| `src/lib/learning/persistence/serializer.js` | 3 |
| `src/lib/learning/migration.js` | 3 |
| `src/lib/components/challenges/holdDetection.js` | 4 |
| `src/lib/components/challenges/NoteFind.svelte` | 4 |
| `src/lib/components/challenges/IntervalTrainer.svelte` | 4 |
| `src/lib/components/challenges/ChordPlayer.svelte` | 4 |
| `src/lib/components/challenges/ChordTransition.svelte` | 4 |
| `src/lib/components/challenges/ScaleRunner.svelte` | 4 |
| `src/lib/components/challenges/ModeTrainer.svelte` | 4 |
| `src/lib/components/challenges/PitchDisplay.svelte` | 2,4 |
| `src/routes/practice/+page.svelte` | 4,7,8,9 |
| `src/lib/learning/configs/unified.js` | 7,8,9 |

### Unchanged
Tuner page (left standalone per decision), TonePlayer, all music modules (fretboard.js, chords.js), all learning subsystems (BKT, theta, fatigue, coverage, confusion, scorer, drills), all SVG components, other routes.

## Verification

1. **Phase 0**: All existing tests pass. All 6 exercises work with worklet (and with RAF fallback if worklet disabled). `npm run build` succeeds.
2. **Phases 1-2**: Test harmonic correction with synthesized wound-string audio. Test calibration with varying noise floors. Feature extraction tests with known frequency trajectories.
3. **Phase 3**: Migration test: load v4 state, verify v5 fields populated with defaults. Verify `gradeFromResponseEnhanced` produces correct grades for edge cases.
4. **Phase 4**: Play each exercise, verify `avgCents`/`stdCents` appear in engine mastery output. Verify adaptive hold timing changes with theta.
5. **Phase 5**: Test chromagram against known chord audio (generate with TonePlayer). Verify template matching accuracy for major/minor/7th chords.
6. **Phase 6**: Test onset detection with rhythmic patterns. Verify IOI tracker tempo estimation.
7. **Phases 7-9**: Play each new exercise end-to-end. Verify items persist and load correctly. Verify unified engine selects new types at appropriate theta levels.
8. **Full integration**: Run full practice session mixing old and new exercises. Verify no regressions in existing exercises. Check localStorage for v5 format with new fields populated.
