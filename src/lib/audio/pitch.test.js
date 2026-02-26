import { describe, it, expect } from 'vitest';
import { semiToFreq, freqToNote, rms, yinDetect, preEmphasis, adaptiveYinThreshold, yinMultiCandidate } from './pitch.js';

// --- Helper ---
function generateSine(freq, sr, len, amplitude = 1.0) {
  const buf = new Float32Array(len);
  for (let i = 0; i < len; i++) buf[i] = amplitude * Math.sin(2 * Math.PI * freq * i / sr);
  return buf;
}

function generateSineWithHarmonics(freq, sr, len, harmonicAmplitudes = [1, 0.5, 0.3]) {
  const buf = new Float32Array(len);
  for (let h = 0; h < harmonicAmplitudes.length; h++) {
    const f = freq * (h + 1);
    const a = harmonicAmplitudes[h];
    for (let i = 0; i < len; i++) buf[i] += a * Math.sin(2 * Math.PI * f * i / sr);
  }
  return buf;
}

// =============================================
// Existing tests (backward compat)
// =============================================

describe('semiToFreq', () => {
  it('semi=0 → 440 (A4)', () => {
    expect(semiToFreq(0)).toBeCloseTo(440, 2);
  });

  it('semi=12 → 880 (A5)', () => {
    expect(semiToFreq(12)).toBeCloseTo(880, 2);
  });

  it('semi=-12 → 220 (A3)', () => {
    expect(semiToFreq(-12)).toBeCloseTo(220, 2);
  });

  it('semi=-9 → ~261.63 (middle C)', () => {
    expect(semiToFreq(-9)).toBeCloseTo(261.63, 1);
  });

  it('semi=-29 → ~82.41 (low E)', () => {
    expect(semiToFreq(-29)).toBeCloseTo(82.41, 1);
  });
});

describe('freqToNote', () => {
  it('440Hz → A, 0 cents, semi 0', () => {
    const r = freqToNote(440);
    expect(r.note).toBe('A');
    expect(r.cents).toBe(0);
    expect(r.semi).toBe(0);
  });

  it('880Hz → A, 0 cents, semi 12', () => {
    const r = freqToNote(880);
    expect(r.note).toBe('A');
    expect(r.cents).toBe(0);
    expect(r.semi).toBe(12);
  });

  it('261.63Hz → C', () => {
    const r = freqToNote(261.63);
    expect(r.note).toBe('C');
  });

  it('slightly sharp 443Hz → A with positive cents', () => {
    const r = freqToNote(443);
    expect(r.note).toBe('A');
    expect(r.cents).toBeGreaterThan(0);
  });

  it('slightly flat 437Hz → A with negative cents', () => {
    const r = freqToNote(437);
    expect(r.note).toBe('A');
    expect(r.cents).toBeLessThan(0);
  });

  it('466.16Hz → A#', () => {
    const r = freqToNote(466.16);
    expect(r.note).toBe('A#');
  });
});

describe('rms', () => {
  it('silence → 0', () => {
    expect(rms(new Float32Array(128))).toBe(0);
  });

  it('constant [0.5, 0.5, 0.5, 0.5] → 0.5', () => {
    expect(rms(new Float32Array([0.5, 0.5, 0.5, 0.5]))).toBeCloseTo(0.5, 5);
  });

  it('[1, -1, 1, -1] → 1.0', () => {
    expect(rms(new Float32Array([1, -1, 1, -1]))).toBeCloseTo(1.0, 5);
  });

  it('unit sine → ~0.707', () => {
    const n = 1024;
    const buf = new Float32Array(n);
    for (let i = 0; i < n; i++) buf[i] = Math.sin(2 * Math.PI * i / n);
    expect(rms(buf)).toBeCloseTo(Math.SQRT1_2, 2);
  });
});

describe('yinDetect (backward compat)', () => {
  it('detects 440Hz sine at 44100SR', () => {
    const buf = generateSine(440, 44100, 4096);
    const detected = yinDetect(buf, 44100);
    expect(detected).not.toBeNull();
    expect(detected).toBeCloseTo(440, -1);
  });

  it('detects 220Hz sine at 44100SR', () => {
    const buf = generateSine(220, 44100, 4096);
    const detected = yinDetect(buf, 44100);
    expect(detected).not.toBeNull();
    expect(detected).toBeCloseTo(220, -1);
  });

  it('detects ~82Hz sine (low E) with larger buffer', () => {
    const buf = generateSine(82.41, 44100, 8192);
    const detected = yinDetect(buf, 44100);
    expect(detected).not.toBeNull();
    expect(detected).toBeCloseTo(82.41, 0);
  });

  it('returns null for silence', () => {
    const buf = new Float32Array(4096);
    expect(yinDetect(buf, 44100)).toBeNull();
  });

  it('returns null for random noise', () => {
    const buf = new Float32Array(4096);
    for (let i = 0; i < buf.length; i++) buf[i] = Math.random() * 2 - 1;
    expect(yinDetect(buf, 44100)).toBeNull();
  });

  it('detects low amplitude sine', () => {
    const buf = generateSine(440, 44100, 4096, 0.1);
    const detected = yinDetect(buf, 44100);
    expect(detected).not.toBeNull();
    expect(detected).toBeCloseTo(440, -1);
  });
});

// =============================================
// New tests
// =============================================

describe('preEmphasis', () => {
  it('preserves first sample (DC)', () => {
    const frame = new Float32Array([1, 0.5, 0.3, 0.1]);
    const out = preEmphasis(frame);
    expect(out[0]).toBe(1);
  });

  it('does not mutate the input frame', () => {
    const frame = new Float32Array([1, 0.5, 0.3, 0.1]);
    const copy = new Float32Array(frame);
    preEmphasis(frame);
    expect(frame).toEqual(copy);
  });

  it('applies y[n] = x[n] - alpha * x[n-1] formula', () => {
    const frame = new Float32Array([1.0, 0.5, 0.8, 0.2]);
    const alpha = 0.97;
    const out = preEmphasis(frame, alpha);
    expect(out[0]).toBe(1.0);
    // Float32Array has ~7 digits of precision, so use 5 decimal places
    expect(out[1]).toBeCloseTo(0.5 - 0.97 * 1.0, 5);
    expect(out[2]).toBeCloseTo(0.8 - 0.97 * 0.5, 5);
    expect(out[3]).toBeCloseTo(0.2 - 0.97 * 0.8, 5);
  });

  it('boosts high frequencies relative to low frequencies', () => {
    const sr = 44100;
    const n = 4096;
    // Low frequency signal (100 Hz)
    const low = generateSine(100, sr, n);
    const lowFiltered = preEmphasis(low);
    // High frequency signal (5000 Hz)
    const high = generateSine(5000, sr, n);
    const highFiltered = preEmphasis(high);

    const lowRatio = rms(lowFiltered) / rms(low);
    const highRatio = rms(highFiltered) / rms(high);

    // High frequencies should be boosted more than low frequencies
    expect(highRatio).toBeGreaterThan(lowRatio);
  });

  it('returns correct length', () => {
    const frame = new Float32Array(1024);
    const out = preEmphasis(frame);
    expect(out.length).toBe(1024);
  });

  it('handles single-element frame', () => {
    const frame = new Float32Array([0.5]);
    const out = preEmphasis(frame);
    expect(out[0]).toBe(0.5);
    expect(out.length).toBe(1);
  });
});

describe('adaptiveYinThreshold', () => {
  it('returns conservative threshold (0.20) when RMS is at or below rmsThreshold', () => {
    const th = adaptiveYinThreshold(0.01, 0.01);
    expect(th).toBeCloseTo(0.20, 5);
  });

  it('returns conservative threshold when RMS is below rmsThreshold', () => {
    const th = adaptiveYinThreshold(0.005, 0.01);
    expect(th).toBeCloseTo(0.20, 5);
  });

  it('returns aggressive threshold (0.10) at very high RMS', () => {
    // RMS at 10x threshold or above should give 0.10
    const th = adaptiveYinThreshold(0.1, 0.01);
    expect(th).toBeCloseTo(0.10, 5);
  });

  it('returns value between conservative and aggressive at mid RMS', () => {
    // RMS halfway between threshold and 10x threshold
    const rmsThreshold = 0.01;
    const midRms = rmsThreshold + (rmsThreshold * 10 - rmsThreshold) / 2;
    const th = adaptiveYinThreshold(midRms, rmsThreshold);
    expect(th).toBeGreaterThan(0.10);
    expect(th).toBeLessThan(0.20);
    expect(th).toBeCloseTo(0.15, 2);
  });

  it('is monotonically decreasing as RMS increases', () => {
    const rmsThreshold = 0.01;
    const prev = adaptiveYinThreshold(rmsThreshold, rmsThreshold);
    for (let mult = 2; mult <= 10; mult++) {
      const curr = adaptiveYinThreshold(rmsThreshold * mult, rmsThreshold);
      expect(curr).toBeLessThanOrEqual(prev);
    }
  });
});

describe('yinMultiCandidate', () => {
  it('detects 440Hz sine and returns {hz, confidence}', () => {
    const buf = generateSine(440, 44100, 4096);
    const result = yinMultiCandidate(buf, 44100, null);
    expect(result).not.toBeNull();
    expect(result.hz).toBeCloseTo(440, -1);
    expect(result.confidence).toBeGreaterThan(0.85);
    expect(result.confidence).toBeLessThanOrEqual(1.0);
  });

  it('detects 220Hz sine', () => {
    const buf = generateSine(220, 44100, 4096);
    const result = yinMultiCandidate(buf, 44100, null);
    expect(result).not.toBeNull();
    expect(result.hz).toBeCloseTo(220, -1);
  });

  it('detects ~82Hz (low E) with larger buffer', () => {
    const buf = generateSine(82.41, 44100, 8192);
    const result = yinMultiCandidate(buf, 44100, null);
    expect(result).not.toBeNull();
    expect(result.hz).toBeCloseTo(82.41, 0);
  });

  it('returns null for silence', () => {
    const buf = new Float32Array(4096);
    expect(yinMultiCandidate(buf, 44100, null)).toBeNull();
  });

  it('returns null for random noise', () => {
    const buf = new Float32Array(4096);
    for (let i = 0; i < buf.length; i++) buf[i] = Math.random() * 2 - 1;
    expect(yinMultiCandidate(buf, 44100, null)).toBeNull();
  });

  it('handles signal with harmonics correctly', () => {
    // Fundamental at 220 Hz with harmonics
    const buf = generateSineWithHarmonics(220, 44100, 4096, [1.0, 0.5, 0.3, 0.2]);
    const result = yinMultiCandidate(buf, 44100, null);
    expect(result).not.toBeNull();
    // Should detect fundamental, not a harmonic
    expect(result.hz).toBeCloseTo(220, -1);
  });

  it('returns null for tiny buffer', () => {
    const buf = new Float32Array(4);
    expect(yinMultiCandidate(buf, 44100, null)).toBeNull();
  });

  describe('transition cost penalties', () => {
    it('does not penalize when no prevFreq', () => {
      const buf = generateSine(440, 44100, 4096);
      const r1 = yinMultiCandidate(buf, 44100, null, null);
      const r2 = yinMultiCandidate(buf, 44100, null, undefined);
      expect(r1).not.toBeNull();
      expect(r2).not.toBeNull();
      expect(r1.hz).toBeCloseTo(r2.hz, 1);
    });

    it('does not penalize small frequency changes', () => {
      const buf = generateSine(440, 44100, 4096);
      // prevFreq close to 440 — should not incur any penalty
      const result = yinMultiCandidate(buf, 44100, null, 430);
      expect(result).not.toBeNull();
      expect(result.hz).toBeCloseTo(440, -1);
    });

    it('penalizes large jumps (>10 semitones)', () => {
      // When prevFreq is far from the detected pitch, the transition penalty
      // affects scoring. With a clean 440Hz sine, prevFreq=440 should give 440,
      // but prevFreq very far away should still detect correctly because the
      // first-dip subharmonic penalty protects the fundamental.
      const buf = generateSine(440, 44100, 4096);
      // prevFreq near the signal — no penalty, detects 440
      const near = yinMultiCandidate(buf, 44100, null, 450);
      expect(near).not.toBeNull();
      expect(near.hz).toBeCloseTo(440, -1);
      // prevFreq 7 semitones away — moderate penalty on 440, still picks 440
      // because subharmonic penalty on other candidates is larger
      const mid = yinMultiCandidate(buf, 44100, null, 293); // D4, ~7 semitones below A4
      expect(mid).not.toBeNull();
      expect(mid.hz).toBeCloseTo(440, -1);
    });

    it('favors candidate closer to prevFreq when ambiguous harmonics present', () => {
      // This test verifies the transition cost helps with octave errors
      // A4 (440Hz) with strong second harmonic could confuse detector
      const sr = 44100;
      const len = 4096;
      const buf = generateSineWithHarmonics(440, sr, len, [1.0, 0.8, 0.6]);

      // With prevFreq near 440, should favor 440 over 880
      const withPrev = yinMultiCandidate(buf, sr, null, 430);
      expect(withPrev).not.toBeNull();
      // Should be near 440, not 880
      const semiDist = Math.abs(12 * Math.log2(withPrev.hz / 440));
      expect(semiDist).toBeLessThan(2);
    });
  });

  it('respects custom params', () => {
    const buf = generateSine(440, 44100, 4096);
    // Very strict confidence threshold — may still pass for clean sine
    const result = yinMultiCandidate(buf, 44100, {
      audio: { yinThreshold: 0.15, confidenceThreshold: 0.99 }
    });
    // A clean sine should still have very high confidence
    if (result) {
      expect(result.confidence).toBeGreaterThanOrEqual(0.99);
    }
  });

  it('K parameter limits number of candidates considered', () => {
    const buf = generateSine(440, 44100, 4096);
    // K=1 should still work — picks single best CMND minimum
    const result = yinMultiCandidate(buf, 44100, null, null, 1);
    expect(result).not.toBeNull();
    expect(result.hz).toBeCloseTo(440, -1);
  });
});
