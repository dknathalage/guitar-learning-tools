# Guitar Learning

An adaptive guitar practice app with mic-based exercises, theory quizzes, and a CAGED chord visualizer. Built with SvelteKit and deployed to GitHub Pages.

**Live app:** [dknathalage.github.io/guitar-learning](https://dknathalage.github.io/guitar-learning/)

## Features

| Tool | Type | Description |
|------|------|-------------|
| **Note Find** | Mic | Play the note shown on the fretboard |
| **String Traversal** | Mic | Navigate notes across strings |
| **Interval Trainer** | Mic | Identify and play intervals by ear |
| **Fretboard Quiz** | Tap | Name notes at fretboard positions |
| **Interval Namer** | Tap | Name the interval between two notes |
| **Chord Speller** | Tap | Spell out chord tones from a formula |
| **CAGED Visualizer** | Reference | Explore chord shapes across the neck |
| **Guitar Tuner** | Mic | Chromatic tuner with cent deviation |

## Architecture

SvelteKit SPA with static adapter. No backend — all learning state is persisted in `localStorage`.

```
src/lib/
  audio/
    pitch.js              # Multi-candidate YIN pitch detection + pre-emphasis
    AudioManager.js       # Web Audio mic lifecycle + chord/onset routing
    TonePlayer.js         # Sine-wave synthesis for reference tones
    worklet/
      guitar-processor.js # AudioWorkletProcessor (all algorithms inlined)
    analysis/
      harmonics.js        # Multi-candidate harmonic correction (sub/super/3rd)
      chromagram.js       # FFT, Hann window, chromagram, Harmonic Product Spectrum
      templates.js        # Chord template generation + weighted cosine matching
      guitar-weights.js   # Guitar playability priors for chord scoring
      onset.js            # Log-compressed spectral flux, OnsetDetector, IOITracker
      kalman.js           # Kalman pitch tracker (2D state + velocity)
      cepstrum.js         # Cepstral pitch detection + ensemble logic
      cqt.js              # Constant-Q Transform (opt-in chromagram alternative)
      calibration.js      # Noise floor calibration
      features.js         # Articulation detection (vibrato, bend)
  music/
    fretboard.js          # Note math, SVG fretboard rendering, scale sequences
    chords.js             # CAGED shape resolution, chord diagrams, neck overlay
  learning/
    engine.js             # Orchestrator: item selection, reporting, mastery
    scheduling/
      fsrs.js             # Free Spaced Repetition Schedule (memory model)
    knowledge/
      bkt.js              # Bayesian Knowledge Tracing (learning model)
      theta.js            # Item Response Theory (ability estimate)
    selection/
      drills.js           # Micro-drill and confusion drill generators
      scoring.js          # UCB1-inspired candidate scoring
    tracking/
      fatigue.js          # Accuracy/RT sliding window fatigue detection
      coverage.js         # String x fret-zone coverage matrix
      confusion.js        # Per-item confusion frequency tracking
    persistence/
      serializer.js       # Versioned save/load (v4) with migration
  constants/
    music.js              # NOTES, TUNINGS, INTERVALS, CHORD_TYPES
```

---

## Algorithms

### Pitch Detection — Multi-Candidate YIN + Ensemble

The app uses an enhanced [YIN algorithm](http://audition.ens.fr/adc/pdf/2002_JASA_YIN.pdf) running in an AudioWorklet for real-time monophonic pitch detection.

**Pipeline:**

1. Capture raw audio via `getUserMedia` (echo cancellation, noise suppression, and auto-gain disabled)
2. AudioWorklet ring buffer (8192 samples) triggers analysis every 512 samples (HOP_SIZE)
3. Extract 4096-sample frame, compute RMS — adaptive silence threshold
4. Apply pre-emphasis filter (alpha=0.97) to boost fundamentals before YIN
5. Kalman filter predicts expected pitch from previous frames
6. Multi-candidate YIN: collect all CMND local minima, keep top 5, score with transition cost penalties (+0.15 for >6 semi jumps, +0.30 for >10 semi)
7. Adaptive threshold maps RMS to [0.20, 0.10] — conservative when quiet, aggressive when loud
8. Multi-candidate harmonic correction: check sub-octave (hz/2), super-octave (hz×2), and 3rd harmonic (hz/3) with per-candidate CMND thresholds
9. Optional cepstral pitch detection provides a second opinion; ensemble logic boosts confidence when YIN and cepstrum agree
10. Kalman filter update smooths pitch tracking across slides and vibrato
11. StableNoteTracker requires 3 consecutive stable frames before emitting a `detect` event

**Parameters:**

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Frame size | 4096 | ~85ms at 48kHz — resolves E2 (82Hz) |
| Hop size | 512 | ~10.7ms analysis interval |
| Frequency range | 50–1400 Hz | Full standard guitar range |
| YIN threshold | adaptive 0.10–0.20 | Adapts to signal strength |
| Confidence minimum | 85% | Rejects ambiguous detections |
| Stable frames | 3 | Filters transient noise and pick attacks |
| Kalman process noise | 0.01 pitch, 0.005 velocity | Tuned for guitar pitch changes |

**Config flags** for A/B testing:

| Flag | Default | Effect |
|------|---------|--------|
| `enableKalman` | true | Kalman pitch tracking |
| `enableCepstrum` | false | Cepstral ensemble pitch (second opinion) |
| `useCQT` | false | CQT chromagram instead of FFT |

**Pros:**
- Multi-candidate YIN with transition costs reduces octave errors vs single-candidate
- Harmonic correction handles sub-octave, super-octave, and 3rd harmonic errors on wound strings
- Adaptive threshold adjusts to playing dynamics automatically
- Kalman filter smooths pitch through slides and vibrato without adding latency
- Pre-emphasis boosts guitar fundamentals relative to harmonics
- AudioWorklet runs off the main thread — no UI jank

**Cons:**
- ~85ms inherent latency from the analysis window — noticeable on low strings
- Cepstral pitch less accurate below 100Hz due to short quefrency range
- The 50Hz floor would miss drop tunings below D2 (~73Hz)
- Worklet code is duplicated from analysis modules — must be kept in sync manually

---

### Knowledge Tracking — Three-Model Ensemble

Each item (e.g., "note C on string 3 fret 5") is tracked by three models simultaneously:

#### BKT (Bayesian Knowledge Tracing)

Models the probability of *learning* (`pL`) using Bayes' rule.

```
After correct:  pL = (1-pS)*pL / [(1-pS)*pL + pG*(1-pL)]
After wrong:    pL = pS*pL / [pS*pL + (1-pG)*(1-pL)]
Then:           pL = posterior + (1-posterior) * pT_effective
```

- `pG = 0.05` (guess), `pS = 0.15` (slip), `pT = 0.20` (learn)
- Speed modulation: fast correct answers amplify learning rate (1.5x), slow correct answers dampen it (0.5x)
- Mastery threshold: `pL >= 0.80` with at least 3 attempts

#### FSRS (Free Spaced Repetition Schedule)

Models *memory stability* (S) and *retrievability* (R) over time.

```
R(elapsed, S) = (1 + 0.2346 * elapsed/S) ^ -0.5
```

- 4-level grading: fail / hard (slow) / good / easy (fast)
- Stability grows on success, shrinks on failure
- Difficulty (D) adjusts per item on a 1–10 scale
- Schedules next review to maintain 90% target retrievability

#### Theta (Item Response Theory)

Single continuous ability estimate on [0, 1] using a logistic model.

```
p(success) = sigmoid(10 * (theta - difficulty))
theta += lr * (outcome - p(success))
```

- Learning rate: 0.04 normal, 0.12 for skips
- Adaptive sigma for difficulty matching (wider when high accuracy, tighter when struggling)
- Plateau detection: theta range < 0.03 over last 5 snapshots

#### BKT-FSRS Reconciliation

The models can disagree. Reconciliation rules prevent contradictions:

| BKT says | FSRS says | Action |
|----------|-----------|--------|
| Learned (pL > 0.8) | Forgotten (R < 0.5) | `pL = pL*0.8 + R*0.2` (reduce overconfidence) |
| Unsure (pL < 0.4) | Stable (S > 5, R > 0.85) | `pL = pL*0.7 + R*0.3` (boost confidence) |
| Learned (pL > 0.8) | Unstable (S < 0.5, attempts < 5) | Cap pL at 0.7 (lucky streak guard) |

**Ensemble pros:**
- BKT captures within-session learning; FSRS captures across-session forgetting — complementary signals
- Speed modulation in BKT is pedagogically sound — slow correct answers shouldn't count the same as fast ones
- Reconciliation catches the "lucky streak" problem where a few guesses inflate BKT
- Theta enables difficulty-matched item selection (zone of proximal development)
- Cluster-level tracking surfaces weak areas (e.g., "string 3 in the zone_7 region")

**Ensemble cons:**
- Three models with reconciliation logic is complex — BKT and FSRS partially overlap, and the reconciliation code suggests one might be redundant
- BKT parameters are hardcoded — `pG`, `pS`, `pT` should ideally be fit per exercise type or per student
- FSRS uses default weight presets (19 parameters) — scheduling accuracy degrades for non-average learners without personalization
- BKT has no forgetting mechanism — only FSRS models decay over time
- Theta plateau detection is brittle — a student doing easy warm-ups appears "plateaued"

---

### Item Selection — UCB1-Inspired Multi-Objective Scoring

The engine selects the next practice item using a prioritized queue with scored fallback:

**Priority order:**
1. Cold start (first ~7 questions — cycle through exercise types by difficulty)
2. Overdue queue (FSRS items past due date, sorted by overdueness, max 10)
3. Micro-drill queue (triggered by 3+ failures in last 5 attempts)
4. Confusion drill queue (triggered by repeated wrong-answer confusions)
5. Scored candidate selection (UCB1-style)

**Scoring formula:**

```
score = exploitation        # min(0.6, 1 - pL) — prefer unlearned items
      + exploration         # C * sqrt(log(N) / n) — UCB1 term, C=1.2 (1.8 if plateau)
      + reviewUrgency       # (1-R) * weight — FSRS retrievability decay
      + confusionBoost      # 0.3 if item matches recent confusion pattern
      + difficultyMatch     # Gaussian(diff, theta, sigma) * 0.3 — IRT targeting
      + interleave          # -0.3 if same cluster as recent item
      + fatigueBias         # pL * 0.3 if fatigued — shift toward easier items
      + coverageBonus       # 0.2 if under-visited string/zone cell
      + stuckPenalty        # -1.5 if repeated 2+ times with low pL
```

**Pros:**
- Exploration/exploitation balance ensures under-practiced items get attention
- Fatigue awareness shifts difficulty down when accuracy drops or response time rises
- Coverage bonus explicitly fills gaps in the string x fret-zone matrix
- Interleaving penalty avoids blocked practice, which research shows improves retention

**Cons:**
- 9 additive terms with hand-tuned weights — changing one has unpredictable effects on others
- No closed feedback loop — the exploration bonus doesn't update based on whether exploring actually helped
- Fixed priority ordering means overdue items always preempt micro-drills regardless of relative urgency
- Cold start is simplistic — a placement test would estimate ability faster

---

### Drill Systems

#### Micro-Drill

Triggered when an item has 3+ failures in its last 5 attempts (with 8-question cooldown).

Generates practice items at the **nearest fretboard landmark** to the failed position, plus the next-nearest. Landmarks are frets with inlay markers: 0, 3, 5, 7, 9, 12 — the kinesthetic reference points on a real guitar.

#### Confusion Drill

Triggered when the student's wrong answer matches a previously confused value 2+ times (with 10-question cooldown).

Generates an alternation sequence: `[target, confused, target, confused]` — forcing the student to discriminate between the two items they're mixing up.

#### Fatigue Detection

Sliding window over the last 20 responses, split into older (first 10) and newer (last 10):

- **Fatigue onset:** accuracy drops > 20% OR response time increases > 40%
- **Recovery:** newer accuracy returns to within 90% of pre-fatigue level
- **Effect:** biases item selection toward higher-pL (easier) items

---

### Chord Resolution — CAGED System

The chord engine resolves any chord type in any CAGED shape at any root:

1. Calculate the base fret for the shape at the given root note
2. For each voice in the shape, find the chord interval that best matches (mod-12 arithmetic)
3. Adjust fret offsets within a 0–3 range (playable hand span)
4. Check interval coverage — reassign duplicate voices to fill missing intervals
5. Output: voices with fret positions, muted strings, and barre positions

Supports 6 tunings: standard, drop-D, open-G, open-D, DADGAD, half-step-down.

---

## Roadmap

### Near-term

- **Model consolidation** — Evaluate dropping BKT in favor of FSRS retrievability as the sole knowledge signal, eliminating the reconciliation layer
- **Scoring weight optimization** — Log item selections and outcomes, then tune the 9 scoring weights via offline optimization instead of hand-tuning
- **CQT evaluation** — Benchmark CQT chromagram vs FFT chromagram for chord recognition accuracy and enable by default if superior

### Medium-term

- **Placement test** — On first launch, present 10–15 items spanning the difficulty range to bootstrap theta and skip the cold-start phase
- **Cross-exercise knowledge transfer** — Share cluster-level mastery between exercises (e.g., mastering note-find on string 3 zone 7 raises the prior for interval training in the same region)
- **Session planning** — Structure sessions with deliberate arcs: warm-up (high-pL items), challenge zone (items near theta), review (overdue FSRS items), cool-down — mirroring real practice structure
- **Confusion matrix** — Build a full 12x12 note confusion matrix instead of per-item tracking, enabling more targeted discrimination drills
- **Rhythm-based exercises** — Leverage existing onset detection and IOITracker for timing accuracy drills

### Longer-term

- **Sequence-level challenges** — Scale runs, arpeggios, and progressions where note *order* matters, requiring a sequence model rather than item-level tracking
- **FSRS weight personalization** — After ~100+ reviews, fit the 19 FSRS parameters to the student's personal forgetting curve using open-source optimizers
- **Expanded tuning support** — Lower the pitch detection floor below 50Hz and add more alternate tuning presets
- **Polyphonic pitch detection** — Move beyond chromagram-only chord recognition to actual polyphonic pitch tracking

### Completed

- ~~Harmonic-aware pitch correction~~ — Multi-candidate correction for sub-octave, super-octave, and 3rd harmonic errors
- ~~Adaptive BKT parameters~~ — Per-student pG, pS, pT estimation from observed data
- ~~Onset and rhythm detection~~ — Log-compressed spectral flux with OnsetDetector and IOITracker

---

## Development

```sh
npm install
npm run dev
```

### Build and preview

```sh
npm run build
npm run preview
```

### Deploy

Pushes to `main` trigger the GitHub Actions workflow (`.github/workflows/deploy.yml`) which builds and deploys to GitHub Pages.

### Code conventions

- **Svelte 5 runes:** `$state()`, `$derived()`, `$effect()`, `$props()`
- **Abbreviated names:** `ri` = root index, `ct` = chord type, `sh` = shape, `bf` = base fret
- **Constants:** ALL_CAPS (`CFG`, `MAX_FO`, `NF`)
- **Rendering:** SVG via pure functions, scoped `<style>` blocks
- **Routing:** `{ base }` from `$app/paths` for all internal links
- **Audio lifecycle:** `AudioManager` class with `onDestroy` cleanup
