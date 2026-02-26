# Non-ML Audio Analysis Improvements — Full Overhaul

## Context

The app uses YIN pitch detection + FFT chromagram chord matching in an AudioWorklet. Current accuracy ~95%. This plan ships both incremental DSP fixes and architectural upgrades to push toward ~98%+ without any machine learning.

**Constraint:** Every algorithm change goes in both `guitar-processor.js` (inlined, no imports) and the corresponding `analysis/` module (importable, testable). Real-time budget: ~10ms per hop.

---

## Agent Structure & File Ownership

Work is split by subsystem. Each agent owns specific files and must not modify files outside their scope. A final integration agent merges all analysis module changes into the worklet.

### Agent: pitch-agent
**Owns:** `src/lib/audio/pitch.js`, `src/lib/audio/pitch.test.js`

**Tasks:**
1. **Pre-emphasis filter** — Add `preEmphasis(frame, alpha=0.97)` function. Apply to a copy of the frame before YIN (not FFT). Backward-iterate to avoid overwrite.
2. **Adaptive YIN threshold** — Add `adaptiveYinThreshold(rms, rmsThreshold)` mapping RMS to threshold range [0.20, 0.10]. Add `yinThresholdRange` to defaults.
3. **Multi-candidate YIN** — Replace `yinDetect()` with `yinMultiCandidate(buf, sr, params, prevFreq, K=5)`. Collect all CMND local minima, score with transition cost (penalize >10 semi jumps +0.3, >6 semi +0.15). Returns `{hz, confidence}`.
4. **Tests** for all three: synthesized sines with harmonics, verify octave-error reduction, transition cost behavior.

**Also modifies:** `src/lib/learning/defaults.js` (add `yinThresholdRange` param)

---

### Agent: harmonics-agent
**Owns:** `src/lib/audio/analysis/harmonics.js`, `src/lib/audio/analysis/harmonics.test.js`

**Tasks:**
1. **Multi-candidate harmonic correction** — Replace `harmonicCorrect()`. Check sub-octave (freq/2), super-octave (freq×2), and 3rd harmonic (freq/3). Score each by CMND value. Use per-candidate thresholds: 0.80 for sub/3rd (prefer lower freq), 0.70 for super (stricter). Remove `hz > 160` gate.
2. **Tests:** 3rd harmonic lock on low E (246Hz→82Hz), super-octave correction, existing tests still pass.

---

### Agent: kalman-agent
**Owns:** `src/lib/audio/analysis/kalman.js` (NEW), `src/lib/audio/analysis/kalman.test.js` (NEW)

**Tasks:**
1. **Kalman filter for pitch tracking** — State: `[pitch_semi, velocity_semi_per_frame]`. Predict next pitch, weight multi-candidate YIN results by prediction error. Process noise tuned for guitar. Measurement noise derived from YIN confidence. Reset on silence/large discontinuity.
2. **Tests:** Steady pitch converges, slide tracking (velocity term), vibrato passes through, reset on silence.

---

### Agent: onset-agent
**Owns:** `src/lib/audio/analysis/onset.js`, `src/lib/audio/analysis/onset.test.js`

**Tasks:**
1. **Log-compressed spectral flux** — Modify `spectralFlux(current, previous)` to use `log(1 + 1000 * mag)` before differencing. Add optional `gamma` parameter (default 1000).
2. **Tests:** Verify compression (10x magnitude change ≠ 10x flux), identical spectra → 0, existing OnsetDetector/IOITracker tests still pass.

---

### Agent: chord-agent
**Owns:** `src/lib/audio/analysis/chromagram.js`, `src/lib/audio/analysis/chromagram.test.js`, `src/lib/audio/analysis/templates.js`, `src/lib/audio/analysis/templates.test.js`, `src/lib/audio/analysis/guitar-weights.js` (NEW), `src/lib/audio/analysis/guitar-weights.test.js` (NEW), `src/lib/audio/AudioManager.js`

**Tasks:**
1. **Harmonic Product Spectrum** — Add `harmonicProductSpectrum(magnitudes, numHarmonics=3)` to `chromagram.js`. Multiply spectrum by downsampled copies at factors 2, 3. Apply before `computeChromagram()`.
2. **EMA chromagram smoothing** — Modify `ChordDetector` in `AudioManager.js`. Replace 5-frame buffer with EMA (alpha=0.3). Re-normalize after EMA update.
3. **Guitar-specific chord weighting** — New `guitar-weights.js`. Playability prior (0.5–1.2) for each chord template based on standard tuning feasibility + real-world frequency. Multiply cosine similarity by prior in `matchChord()`.
4. **Tests:** HPS suppresses harmonics on test signal, EMA convergence, guitar weights boost open chords, penalize impossible voicings.

---

### Agent: cepstrum-agent
**Owns:** `src/lib/audio/analysis/cepstrum.js` (NEW), `src/lib/audio/analysis/cepstrum.test.js` (NEW)

**Tasks:**
1. **Cepstral pitch detection** — `cepstralPitch(frame, sampleRate)`: compute `IFFT(log(|FFT(frame)|²))`, find peak in quefrency range `[sr/FREQ_MAX, sr/FREQ_MIN]`. Return `{hz, strength}`. Reuse FFT from `chromagram.js` (import it).
2. **Ensemble logic** — `ensemblePitch(yinResult, cepstrumResult, kalmanPrediction)`: when YIN and cepstrum agree (within 1 semitone) → high confidence. Disagree → prefer Kalman prediction.
3. **Tests:** Pure sines detected correctly, agreement/disagreement logic, null handling.

---

### Agent: cqt-agent
**Owns:** `src/lib/audio/analysis/cqt.js` (NEW), `src/lib/audio/analysis/cqt.test.js` (NEW)

**Tasks:**
1. **Constant-Q Transform** — Precompute sparse kernel matrix for 72 bins (6 octaves × 12 bins/octave, C2–C8). `computeCQT(frame, kernels)` returns 72-bin magnitude array. `cqtChromagram(cqtBins)` folds octaves into 12 pitch classes.
2. **Tests:** Single sines map to correct CQT bin, A major chord produces clean chromagram, performance benchmark < 3ms.

**Note:** CQT replaces FFT chromagram when enabled. Config flag `useCQT: false` (opt-in).

---

### Agent: worklet-agent (RUNS LAST — after all other agents complete)
**Owns:** `src/lib/audio/worklet/guitar-processor.js`

**Tasks:**
Inline all algorithm changes from the analysis modules into the self-contained worklet:
1. Pre-emphasis before YIN
2. Multi-candidate YIN with adaptive threshold
3. Multi-candidate harmonic correction
4. Kalman filter state tracking
5. Cepstral pitch detection + ensemble logic
6. Log-compressed spectral flux
7. HPS before chromagram folding
8. CQT as opt-in alternative to FFT path
9. Config flags: `enableCepstrum`, `enableKalman`, `useCQT`

**Blocked by:** All other agents completing first.

---

## Execution Order

```
PARALLEL (Phase 1+2+3):
  pitch-agent     ──┐
  harmonics-agent ──┤
  kalman-agent    ──┤
  onset-agent     ──┼── all work on independent files
  chord-agent     ──┤
  cepstrum-agent  ──┤
  cqt-agent       ──┘

SEQUENTIAL (Phase 4):
  worklet-agent   ←── blocked until all above complete
```

## Verification

1. **Unit tests:** Each agent runs `vitest` for their owned test files before marking complete
2. **Regression:** Full `vitest run` after worklet integration
3. **Manual:** Play open low E (no octave errors), fingerpick softly (onsets detected), strum open chords (recognized <100ms), slide between notes (Kalman tracks)
4. **Performance:** Measure per-hop time in worklet, verify <8ms average
5. **A/B toggle:** Config flags allow enabling/disabling each improvement independently
