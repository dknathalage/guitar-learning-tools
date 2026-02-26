import { describe, it, expect } from 'vitest';
import { PitchKalman, weightCandidates, hzToSemi, semiToHz } from './kalman.js';

describe('hzToSemi / semiToHz', () => {
  it('A4 = 0 semitones', () => {
    expect(hzToSemi(440)).toBeCloseTo(0, 10);
  });
  it('A5 = 12 semitones', () => {
    expect(hzToSemi(880)).toBeCloseTo(12, 5);
  });
  it('round-trips', () => {
    expect(semiToHz(hzToSemi(329.63))).toBeCloseTo(329.63, 2);
  });
});

describe('PitchKalman', () => {
  it('starts uninitialized', () => {
    const kf = new PitchKalman();
    expect(kf.initialized).toBe(false);
    expect(kf.state).toEqual({ semi: 0, velocity: 0 });
  });

  it('first measurement initializes state', () => {
    const kf = new PitchKalman();
    const a4Semi = hzToSemi(440); // 0
    const result = kf.update(a4Semi, 0.95);
    expect(kf.initialized).toBe(true);
    expect(result.semi).toBeCloseTo(0, 5);
    expect(result.velocity).toBe(0);
    expect(result.gain).toBe(1);
  });

  describe('steady pitch convergence', () => {
    it('converges to A4 (semi=0) from repeated measurements', () => {
      const kf = new PitchKalman();
      const targetSemi = 0; // A4
      const confidence = 0.95;

      // Feed 50 frames of steady A4
      for (let i = 0; i < 50; i++) {
        kf.predict();
        kf.update(targetSemi, confidence);
      }

      expect(kf.state.semi).toBeCloseTo(targetSemi, 2);
      expect(Math.abs(kf.state.velocity)).toBeLessThan(0.01);
    });

    it('converges to E2 from repeated measurements', () => {
      const kf = new PitchKalman();
      const targetSemi = hzToSemi(82.41); // E2
      const confidence = 0.9;

      for (let i = 0; i < 50; i++) {
        kf.predict();
        kf.update(targetSemi, confidence);
      }

      expect(kf.state.semi).toBeCloseTo(targetSemi, 1);
    });
  });

  describe('slide tracking', () => {
    it('velocity term tracks a linear pitch ramp', () => {
      const kf = new PitchKalman();
      const startSemi = 0; // A4
      const semiPerFrame = 0.2; // slide up
      const numFrames = 40;

      for (let i = 0; i < numFrames; i++) {
        const measuredSemi = startSemi + i * semiPerFrame;
        kf.predict();
        kf.update(measuredSemi, 0.9);
      }

      // After 40 frames of constant velocity, the filter should track the velocity
      expect(kf.state.velocity).toBeGreaterThan(0.1);
      // State should be near the latest measurement
      const lastMeasured = startSemi + (numFrames - 1) * semiPerFrame;
      expect(kf.state.semi).toBeCloseTo(lastMeasured, 0);
    });
  });

  describe('vibrato passthrough', () => {
    it('output follows sinusoidal pitch variation', () => {
      const kf = new PitchKalman();
      const center = 0; // A4
      const amplitude = 0.5; // semitones — typical vibrato
      const period = 20; // frames per cycle
      const numFrames = 80;

      const outputs = [];
      for (let i = 0; i < numFrames; i++) {
        const measured = center + amplitude * Math.sin((2 * Math.PI * i) / period);
        kf.predict();
        const result = kf.update(measured, 0.95);
        outputs.push(result.semi);
      }

      // After settling, output should track the vibrato (not flatten it)
      // Check last full cycle has reasonable amplitude
      const lastCycle = outputs.slice(-period);
      const max = Math.max(...lastCycle);
      const min = Math.min(...lastCycle);
      const outputAmplitude = (max - min) / 2;

      // Should preserve at least 30% of vibrato amplitude
      expect(outputAmplitude).toBeGreaterThan(amplitude * 0.3);
      // But shouldn't amplify it
      expect(outputAmplitude).toBeLessThan(amplitude * 1.5);
    });
  });

  describe('reset on silence', () => {
    it('resets after N null frames', () => {
      const kf = new PitchKalman({ silenceFrames: 3 });

      // Initialize with a measurement
      kf.predict();
      kf.update(0, 0.9);
      expect(kf.initialized).toBe(true);

      // Feed null measurements
      kf.predict();
      kf.update(null, 0);
      expect(kf.initialized).toBe(true); // not yet

      kf.predict();
      kf.update(null, 0);
      expect(kf.initialized).toBe(true); // still not

      kf.predict();
      kf.update(null, 0);
      expect(kf.initialized).toBe(false); // now reset
    });

    it('does not reset if measurement resumes before threshold', () => {
      const kf = new PitchKalman({ silenceFrames: 5 });

      kf.predict();
      kf.update(0, 0.9);

      // 3 null frames
      for (let i = 0; i < 3; i++) {
        kf.predict();
        kf.update(null, 0);
      }

      // Resume measurement
      kf.predict();
      kf.update(1, 0.9);

      expect(kf.initialized).toBe(true);
    });
  });

  describe('reset on discontinuity', () => {
    it('resets when pitch jumps more than resetThreshold', () => {
      const kf = new PitchKalman({ resetThreshold: 12 });

      // Establish at A4 (semi=0)
      for (let i = 0; i < 10; i++) {
        kf.predict();
        kf.update(0, 0.95);
      }

      // Jump 24 semitones (2 octaves)
      kf.predict();
      const result = kf.update(24, 0.95);

      // Should have reset and initialized at new position
      expect(result.semi).toBeCloseTo(24, 5);
      expect(result.gain).toBe(1); // fresh initialization
    });

    it('does not reset for small jumps within threshold', () => {
      const kf = new PitchKalman({ resetThreshold: 12 });

      for (let i = 0; i < 10; i++) {
        kf.predict();
        kf.update(0, 0.95);
      }

      // Jump 5 semitones — within threshold
      kf.predict();
      const result = kf.update(5, 0.95);

      // Should NOT have reset — gain should be < 1 (normal Kalman update)
      expect(result.gain).toBeLessThan(1);
      expect(result.gain).toBeGreaterThan(0);
    });
  });

  describe('predict without initialization', () => {
    it('returns zero state when not initialized', () => {
      const kf = new PitchKalman();
      const pred = kf.predict();
      expect(pred.semi).toBe(0);
      expect(pred.velocity).toBe(0);
    });
  });

  describe('confidence affects Kalman gain', () => {
    it('high confidence → higher gain (trusts measurement more)', () => {
      const kf1 = new PitchKalman();
      const kf2 = new PitchKalman();

      // Initialize both
      kf1.update(0, 0.9);
      kf2.update(0, 0.9);

      // Predict then update with different confidences
      kf1.predict();
      kf2.predict();

      const r1 = kf1.update(2, 0.99); // high confidence
      const r2 = kf2.update(2, 0.1); // low confidence

      expect(r1.gain).toBeGreaterThan(r2.gain);
      // High confidence → state closer to measurement
      expect(Math.abs(r1.semi - 2)).toBeLessThan(Math.abs(r2.semi - 2));
    });
  });
});

describe('weightCandidates', () => {
  it('returns null for empty array', () => {
    expect(weightCandidates([], { semi: 0 })).toBeNull();
  });

  it('returns null for null input', () => {
    expect(weightCandidates(null, { semi: 0 })).toBeNull();
  });

  it('picks the only candidate', () => {
    const result = weightCandidates(
      [{ hz: 440, confidence: 0.9 }],
      { semi: 0 },
    );
    expect(result.hz).toBe(440);
  });

  it('prefers candidate closest to prediction when confidences are similar', () => {
    const prediction = { semi: 0 }; // predicting A4

    const result = weightCandidates(
      [
        { hz: 440, confidence: 0.85 },    // A4, semi ≈ 0 — matches prediction
        { hz: 880, confidence: 0.87 },    // A5, semi ≈ 12 — far from prediction
      ],
      prediction,
    );

    // Should prefer A4 despite slightly lower confidence because it matches prediction
    expect(result.hz).toBe(440);
  });

  it('prefers much higher confidence even when further from prediction', () => {
    const prediction = { semi: 0 }; // predicting A4

    const result = weightCandidates(
      [
        { hz: 440, confidence: 0.3 },     // A4 — matches prediction, low confidence
        { hz: 466.16, confidence: 0.95 },  // A#4, semi ≈ 1 — close, high confidence
      ],
      prediction,
    );

    // A#4 has much higher confidence and is only 1 semi away — should win
    expect(result.hz).toBeCloseTo(466.16, 1);
  });

  it('skips candidates with hz <= 0', () => {
    const result = weightCandidates(
      [
        { hz: 0, confidence: 0.99 },
        { hz: 440, confidence: 0.5 },
      ],
      { semi: 0 },
    );
    expect(result.hz).toBe(440);
  });
});
