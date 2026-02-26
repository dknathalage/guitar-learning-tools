import { describe, it, expect } from 'vitest';
import { spectralFlux, OnsetDetector, IOITracker } from './onset.js';

describe('spectralFlux', () => {
  it('returns 0 for identical spectra', () => {
    const a = new Float32Array([1, 2, 3, 4]);
    const b = new Float32Array([1, 2, 3, 4]);
    expect(spectralFlux(a, b)).toBe(0);
  });

  it('returns positive flux for increasing magnitudes', () => {
    const prev = new Float32Array([1, 1, 1, 1]);
    const curr = new Float32Array([3, 3, 3, 3]);
    const flux = spectralFlux(curr, prev);
    expect(flux).toBeGreaterThan(0);
    // Each bin: log(1 + 1000*3) - log(1 + 1000*1) = log(3001) - log(1001)
    const expected = 4 * (Math.log(3001) - Math.log(1001));
    expect(flux).toBeCloseTo(expected, 10);
  });

  it('half-wave rectifies: decreasing bins contribute 0', () => {
    const prev = new Float32Array([5, 5, 5, 5]);
    const curr = new Float32Array([1, 1, 1, 1]);
    expect(spectralFlux(curr, prev)).toBe(0);
  });

  it('mixed increases and decreases: only increases contribute', () => {
    const prev = new Float32Array([1, 5, 1, 5]);
    const curr = new Float32Array([3, 2, 4, 1]);
    const flux = spectralFlux(curr, prev);
    // Only bins 0 (1->3) and 2 (1->4) increase; bins 1 (5->2) and 3 (5->1) decrease
    const expected = (Math.log(3001) - Math.log(1001)) + (Math.log(4001) - Math.log(1001));
    expect(flux).toBeCloseTo(expected, 10);
  });

  it('returns 0 when previous is null', () => {
    const curr = new Float32Array([1, 2, 3]);
    expect(spectralFlux(curr, null)).toBe(0);
  });

  it('returns 0 for mismatched lengths', () => {
    const curr = new Float32Array([1, 2, 3]);
    const prev = new Float32Array([1, 2]);
    expect(spectralFlux(curr, prev)).toBe(0);
  });

  it('log compression: 10x magnitude change does NOT produce 10x flux', () => {
    const prev = new Float32Array([1, 1, 1, 1]);
    const curr1x = new Float32Array([2, 2, 2, 2]);
    const curr10x = new Float32Array([11, 11, 11, 11]); // 10x the increase

    const flux1x = spectralFlux(curr1x, prev);
    const flux10x = spectralFlux(curr10x, prev);
    // Without compression, flux10x / flux1x would be exactly 10
    // With log compression, the ratio should be much less than 10
    expect(flux10x / flux1x).toBeLessThan(5);
    expect(flux10x).toBeGreaterThan(flux1x);
  });

  it('gamma=0 degenerates to near-linear behavior', () => {
    const prev = new Float32Array([1, 1, 1, 1]);
    const curr = new Float32Array([3, 3, 3, 3]);
    // gamma=0: log(1 + 0*x) - log(1 + 0*y) = log(1) - log(1) = 0
    const flux = spectralFlux(curr, prev, 0);
    expect(flux).toBe(0);
  });

  it('small gamma produces near-linear scaling', () => {
    const prev = new Float32Array([1, 1, 1, 1]);
    const curr1x = new Float32Array([2, 2, 2, 2]);
    const curr10x = new Float32Array([11, 11, 11, 11]);

    // With very small gamma, log(1 + gamma*x) ≈ gamma*x, so ratio ≈ linear
    const flux1x = spectralFlux(curr1x, prev, 0.001);
    const flux10x = spectralFlux(curr10x, prev, 0.001);
    // The ratio should be close to 10 (linear)
    expect(flux10x / flux1x).toBeGreaterThan(8);
  });
});

describe('OnsetDetector', () => {
  it('returns null during warmup (< medianWindow frames)', () => {
    const det = new OnsetDetector({ medianWindow: 5 });
    for (let i = 0; i < 4; i++) {
      expect(det.detect(1.0, i * 100)).toBeNull();
    }
  });

  it('detects peaks above adaptive threshold', () => {
    const det = new OnsetDetector({ medianWindow: 5, thresholdMultiplier: 1.5, minOnsetInterval: 0 });
    // Fill with low flux values
    for (let i = 0; i < 4; i++) {
      det.detect(1.0, i * 100);
    }
    // 5th value: still 1.0, median=1.0, threshold=1.5, 1.0 < 1.5 => no onset
    expect(det.detect(1.0, 400)).toBeNull();
    // Now spike to 10.0 => median is still ~1.0, threshold=1.5, 10 > 1.5 => onset
    const result = det.detect(10.0, 500);
    expect(result).not.toBeNull();
    expect(result.strength).toBe(10.0);
    expect(result.timeMs).toBe(500);
  });

  it('respects minOnsetInterval', () => {
    const det = new OnsetDetector({ medianWindow: 3, thresholdMultiplier: 1.0, minOnsetInterval: 200 });
    // Fill window with low values (times spaced so first spike clears minInterval from t=0)
    det.detect(1.0, 0);
    det.detect(1.0, 100);
    det.detect(1.0, 200);
    // Spike detected (300 - 0 = 300 >= 200 from initial _lastOnsetTime=0)
    const r1 = det.detect(5.0, 300);
    expect(r1).not.toBeNull();
    // Another spike too soon (< 200ms after r1 at 300)
    det.detect(1.0, 350); // push a low value to keep median low
    det.detect(1.0, 400);
    const r2 = det.detect(5.0, 450);
    expect(r2).toBeNull(); // 450 - 300 = 150 < 200
    // After enough time passes
    det.detect(1.0, 480);
    det.detect(1.0, 490);
    const r3 = det.detect(5.0, 550);
    expect(r3).not.toBeNull(); // 550 - 300 = 250 >= 200
  });

  it('reset clears state', () => {
    const det = new OnsetDetector({ medianWindow: 3 });
    det.detect(1.0, 0);
    det.detect(1.0, 100);
    det.detect(1.0, 200);
    det.reset();
    // Should be back in warmup
    expect(det.detect(10.0, 300)).toBeNull();
  });
});

describe('IOITracker', () => {
  it('records onsets and computes IOIs correctly', () => {
    const tracker = new IOITracker();
    tracker.addOnset(100);
    tracker.addOnset(350);
    tracker.addOnset(600);
    expect(tracker.getIOIs()).toEqual([250, 250]);
  });

  it('returns empty IOIs for single onset', () => {
    const tracker = new IOITracker();
    tracker.addOnset(100);
    expect(tracker.getIOIs()).toEqual([]);
  });

  describe('estimateTempo', () => {
    it('500ms IOI returns 120 BPM', () => {
      const tracker = new IOITracker();
      tracker.addOnset(0);
      tracker.addOnset(500);
      tracker.addOnset(1000);
      expect(tracker.estimateTempo()).toBe(120);
    });

    it('needs >= 2 IOIs (3 onsets)', () => {
      const tracker = new IOITracker();
      tracker.addOnset(0);
      tracker.addOnset(500);
      // Only 1 IOI
      expect(tracker.estimateTempo()).toBeNull();
    });

    it('returns null with no onsets', () => {
      const tracker = new IOITracker();
      expect(tracker.estimateTempo()).toBeNull();
    });
  });

  describe('matchPattern', () => {
    it('perfect match returns score 1.0', () => {
      const tracker = new IOITracker();
      tracker.addOnset(1000);
      tracker.addOnset(1500);
      tracker.addOnset(2000);
      const result = tracker.matchPattern([0, 500, 1000]);
      expect(result).not.toBeNull();
      expect(result.score).toBe(1.0);
      expect(result.avgErrorMs).toBe(0);
    });

    it('offset match shows errors reflecting offset', () => {
      const tracker = new IOITracker();
      tracker.addOnset(1000);
      tracker.addOnset(1550); // 50ms late
      tracker.addOnset(2050); // 50ms late
      const result = tracker.matchPattern([0, 500, 1000]);
      expect(result).not.toBeNull();
      // errors: [0, 50, 50]
      expect(result.errors).toEqual([0, 50, 50]);
      expect(result.score).toBe(1.0); // all within 75ms tolerance
    });

    it('returns null for insufficient onsets', () => {
      const tracker = new IOITracker();
      tracker.addOnset(1000);
      const result = tracker.matchPattern([0, 500, 1000]);
      expect(result).toBeNull();
    });

    it('scores partial matches correctly', () => {
      const tracker = new IOITracker();
      tracker.addOnset(1000);
      tracker.addOnset(1600); // 100ms late
      tracker.addOnset(2200); // 200ms late
      const result = tracker.matchPattern([0, 500, 1000], 75);
      expect(result).not.toBeNull();
      // errors: [0, 100, 200]; only first within 75ms
      expect(result.score).toBeCloseTo(0.33, 1);
    });
  });

  it('buffer respects maxOnsets limit', () => {
    const tracker = new IOITracker(4);
    for (let i = 0; i < 10; i++) {
      tracker.addOnset(i * 100);
    }
    expect(tracker.onsetCount).toBe(4);
    // IOIs should be from the last 4 onsets: 600, 700, 800, 900
    expect(tracker.getIOIs()).toEqual([100, 100, 100]);
  });

  it('reset clears all onsets', () => {
    const tracker = new IOITracker();
    tracker.addOnset(100);
    tracker.addOnset(200);
    tracker.reset();
    expect(tracker.onsetCount).toBe(0);
    expect(tracker.getIOIs()).toEqual([]);
  });
});
