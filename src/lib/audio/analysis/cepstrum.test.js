import { describe, it, expect } from 'vitest';
import { cepstralPitch, ensemblePitch } from './cepstrum.js';

/**
 * Generate a harmonic-rich signal (fundamental + overtones) like a guitar string.
 * Cepstral analysis detects pitch from harmonic spacing in the spectrum,
 * so test signals need multiple harmonics.
 */
function makeHarmonic(freq, sampleRate, duration, numHarmonics = 6) {
  const n = Math.round(sampleRate * duration);
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    for (let h = 1; h <= numHarmonics; h++) {
      buf[i] += (1 / h) * Math.sin(2 * Math.PI * h * freq * i / sampleRate);
    }
  }
  return buf;
}

describe('cepstralPitch', () => {
  const SR = 48000;

  it('detects A4 (440 Hz)', () => {
    const frame = makeHarmonic(440, SR, 0.1);
    const result = cepstralPitch(frame, SR);
    expect(result).not.toBeNull();
    const semis = Math.abs(12 * Math.log2(result.hz / 440));
    expect(semis).toBeLessThan(1);
    expect(result.strength).toBeGreaterThan(0);
  });

  it('detects low E (82 Hz)', () => {
    const frame = makeHarmonic(82, SR, 0.15);
    const result = cepstralPitch(frame, SR);
    expect(result).not.toBeNull();
    const semis = Math.abs(12 * Math.log2(result.hz / 82));
    expect(semis).toBeLessThan(1.5);
  });

  it('detects high E (330 Hz)', () => {
    const frame = makeHarmonic(330, SR, 0.1);
    const result = cepstralPitch(frame, SR);
    expect(result).not.toBeNull();
    const semis = Math.abs(12 * Math.log2(result.hz / 330));
    expect(semis).toBeLessThan(1);
  });

  it('returns null for empty frame', () => {
    expect(cepstralPitch(new Float32Array(0), SR)).toBeNull();
  });

  it('returns null for null input', () => {
    expect(cepstralPitch(null, SR)).toBeNull();
  });
});

describe('ensemblePitch', () => {
  describe('agreement (within 1 semitone)', () => {
    it('boosts confidence when YIN and cepstrum agree', () => {
      const yin = { hz: 440, confidence: 0.8 };
      const cep = { hz: 442, strength: 0.6 };
      const result = ensemblePitch(yin, cep, null);
      expect(result.hz).toBe(440);
      expect(result.confidence).toBeCloseTo(0.96); // 0.8 * 1.2
    });

    it('caps boosted confidence at 1.0', () => {
      const yin = { hz: 440, confidence: 0.95 };
      const cep = { hz: 438, strength: 0.7 };
      const result = ensemblePitch(yin, cep, null);
      expect(result.confidence).toBe(1.0);
    });
  });

  describe('disagreement with Kalman', () => {
    it('picks YIN when closer to Kalman prediction', () => {
      const yin = { hz: 440, confidence: 0.8 };
      const cep = { hz: 220, strength: 0.6 }; // octave error
      // Kalman predicts A4 — MIDI 69
      const kalman = { semi: 69 };
      const result = ensemblePitch(yin, cep, kalman);
      expect(result.hz).toBe(440);
      expect(result.confidence).toBeCloseTo(0.56); // 0.8 * 0.7
    });

    it('picks cepstrum when closer to Kalman prediction', () => {
      const yin = { hz: 220, confidence: 0.8 }; // octave error
      const cep = { hz: 440, strength: 0.6 };
      // Kalman predicts A4 — MIDI 69
      const kalman = { semi: 69 };
      const result = ensemblePitch(yin, cep, kalman);
      expect(result.hz).toBe(440);
      expect(result.confidence).toBeCloseTo(0.42); // 0.6 * 0.7
    });
  });

  describe('disagreement without Kalman', () => {
    it('returns YIN with reduced confidence', () => {
      const yin = { hz: 440, confidence: 0.8 };
      const cep = { hz: 220, strength: 0.6 };
      const result = ensemblePitch(yin, cep, null);
      expect(result.hz).toBe(440);
      expect(result.confidence).toBeCloseTo(0.64); // 0.8 * 0.8
    });
  });

  describe('null handling', () => {
    it('returns YIN as-is when only YIN available', () => {
      const yin = { hz: 440, confidence: 0.8 };
      const result = ensemblePitch(yin, null, null);
      expect(result.hz).toBe(440);
      expect(result.confidence).toBe(0.8);
    });

    it('returns cepstrum with halved strength when only cepstrum available', () => {
      const cep = { hz: 440, strength: 0.6 };
      const result = ensemblePitch(null, cep, null);
      expect(result.hz).toBe(440);
      expect(result.confidence).toBeCloseTo(0.3); // 0.6 * 0.5
    });

    it('returns null when neither result available', () => {
      expect(ensemblePitch(null, null, null)).toBeNull();
    });

    it('returns null when both are null even with Kalman', () => {
      expect(ensemblePitch(null, null, { semi: 69 })).toBeNull();
    });
  });
});
