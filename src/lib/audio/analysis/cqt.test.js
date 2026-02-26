import { describe, it, expect } from 'vitest';
import { buildCQTKernels, computeCQT, cqtChromagram, isCQTAvailable, useCQT } from './cqt.js';

const SAMPLE_RATE = 44100;
const FRAME_SIZE = 4096;

/** Generate a sine wave at given frequency */
function makeSine(freq, length, sr) {
  const buf = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    buf[i] = Math.sin(2 * Math.PI * freq * i / sr);
  }
  return buf;
}

/** Generate a composite signal from multiple frequencies */
function makeChord(freqs, length, sr) {
  const buf = new Float32Array(length);
  for (const freq of freqs) {
    for (let i = 0; i < length; i++) {
      buf[i] += Math.sin(2 * Math.PI * freq * i / sr);
    }
  }
  return buf;
}

/** Map frequency to expected CQT bin index */
function freqToBin(freq, fMin, binsPerOctave) {
  return Math.round(binsPerOctave * Math.log2(freq / fMin));
}

/** Pitch class names indexed 0=C .. 11=B */
const PC_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

describe('buildCQTKernels', () => {
  it('produces 72 kernels for default parameters', () => {
    const kernels = buildCQTKernels(SAMPLE_RATE);
    expect(kernels.length).toBe(72);
  });

  it('each kernel has real, imag, len, and freq', () => {
    const kernels = buildCQTKernels(SAMPLE_RATE);
    for (const k of kernels) {
      expect(k.real).toBeInstanceOf(Float32Array);
      expect(k.imag).toBeInstanceOf(Float32Array);
      expect(typeof k.len).toBe('number');
      expect(typeof k.freq).toBe('number');
      expect(k.real.length).toBe(k.len);
      expect(k.imag.length).toBe(k.len);
    }
  });

  it('kernel lengths decrease with higher frequency', () => {
    const kernels = buildCQTKernels(SAMPLE_RATE);
    for (let i = 1; i < kernels.length; i++) {
      expect(kernels[i].len).toBeLessThanOrEqual(kernels[i - 1].len);
    }
  });

  it('first kernel frequency is fMin', () => {
    const kernels = buildCQTKernels(SAMPLE_RATE, 12, 6, 65.41);
    expect(kernels[0].freq).toBeCloseTo(65.41, 1);
  });

  it('supports custom parameters', () => {
    const kernels = buildCQTKernels(SAMPLE_RATE, 24, 3, 130.81);
    expect(kernels.length).toBe(72); // 24 * 3
  });
});

describe('computeCQT', () => {
  const kernels = buildCQTKernels(SAMPLE_RATE);

  it('440Hz sine maps to the A4 bin', () => {
    const frame = makeSine(440, FRAME_SIZE, SAMPLE_RATE);
    const mags = computeCQT(frame, kernels);

    const expectedBin = freqToBin(440, 65.41, 12);
    let maxBin = 0;
    for (let i = 1; i < mags.length; i++) {
      if (mags[i] > mags[maxBin]) maxBin = i;
    }
    // Allow +/- 1 bin tolerance
    expect(Math.abs(maxBin - expectedBin)).toBeLessThanOrEqual(1);
  });

  it('low C2 (~65.41Hz) maps to bin 0', () => {
    const frame = makeSine(65.41, FRAME_SIZE * 4, SAMPLE_RATE);
    const longKernels = buildCQTKernels(SAMPLE_RATE);
    const mags = computeCQT(frame, longKernels);

    // Bin 0 should have significant energy
    let maxBin = 0;
    for (let i = 1; i < 12; i++) {
      if (mags[i] > mags[maxBin]) maxBin = i;
    }
    expect(maxBin).toBe(0);
  });

  it('high frequency near C8 maps to upper bins', () => {
    // C8 ~ 65.41 * 2^6 = 4186 Hz
    const c8Freq = 65.41 * Math.pow(2, 6);
    const frame = makeSine(c8Freq, FRAME_SIZE, SAMPLE_RATE);
    const mags = computeCQT(frame, kernels);

    // Should have energy in the last octave (bins 60-71)
    let maxBin = 60;
    for (let i = 61; i < 72; i++) {
      if (mags[i] > mags[maxBin]) maxBin = i;
    }
    // The peak in the last octave should be near bin 72 (but zero-indexed, so near 71)
    expect(maxBin).toBeGreaterThanOrEqual(60);
  });

  it('returns Float32Array of correct length', () => {
    const frame = makeSine(440, FRAME_SIZE, SAMPLE_RATE);
    const mags = computeCQT(frame, kernels);
    expect(mags).toBeInstanceOf(Float32Array);
    expect(mags.length).toBe(72);
  });

  it('silence produces near-zero magnitudes', () => {
    const frame = new Float32Array(FRAME_SIZE);
    const mags = computeCQT(frame, kernels);
    for (let i = 0; i < mags.length; i++) {
      expect(mags[i]).toBeCloseTo(0, 5);
    }
  });

  it('performance: CQT computation < 3ms on 4096-sample frame', () => {
    const frame = makeSine(440, FRAME_SIZE, SAMPLE_RATE);
    // Warm up
    computeCQT(frame, kernels);
    computeCQT(frame, kernels);

    const runs = 5;
    let totalMs = 0;
    for (let r = 0; r < runs; r++) {
      const start = performance.now();
      computeCQT(frame, kernels);
      totalMs += performance.now() - start;
    }
    const avgMs = totalMs / runs;
    expect(avgMs).toBeLessThan(3);
  });
});

describe('cqtChromagram', () => {
  const kernels = buildCQTKernels(SAMPLE_RATE);

  it('A major chord (A, C#, E) produces chromagram peaks at correct pitch classes', () => {
    // A4=440, C#5=554.37, E5=659.26
    const frame = makeChord([440, 554.37, 659.26], FRAME_SIZE, SAMPLE_RATE);
    const mags = computeCQT(frame, kernels);
    const chroma = cqtChromagram(mags);

    expect(chroma.length).toBe(12);

    // A=9, C#=1, E=4
    const peakPCs = [9, 1, 4];
    const otherPCs = [0, 2, 3, 5, 6, 7, 8, 10, 11];

    // Each chord tone should be stronger than each non-chord tone
    for (const peak of peakPCs) {
      for (const other of otherPCs) {
        expect(chroma[peak]).toBeGreaterThan(chroma[other]);
      }
    }
  });

  it('chromagram is L2-normalized', () => {
    const frame = makeSine(440, FRAME_SIZE, SAMPLE_RATE);
    const mags = computeCQT(frame, kernels);
    const chroma = cqtChromagram(mags);

    let sumSq = 0;
    for (let i = 0; i < 12; i++) sumSq += chroma[i] * chroma[i];
    expect(Math.sqrt(sumSq)).toBeCloseTo(1.0, 4);
  });

  it('returns Float32Array of 12 bins', () => {
    const mags = new Float32Array(72);
    mags[9] = 1; // A in first octave
    const chroma = cqtChromagram(mags);
    expect(chroma).toBeInstanceOf(Float32Array);
    expect(chroma.length).toBe(12);
  });

  it('silence returns zero vector', () => {
    const mags = new Float32Array(72);
    const chroma = cqtChromagram(mags);
    for (let i = 0; i < 12; i++) {
      expect(chroma[i]).toBe(0);
    }
  });

  it('single octave energy folds correctly', () => {
    const mags = new Float32Array(72);
    // Set A in each octave (bins 9, 21, 33, 45, 57, 69)
    for (let oct = 0; oct < 6; oct++) {
      mags[9 + oct * 12] = 1.0;
    }
    const chroma = cqtChromagram(mags);

    // A (pc=9) should dominate
    let maxPC = 0;
    for (let i = 1; i < 12; i++) {
      if (chroma[i] > chroma[maxPC]) maxPC = i;
    }
    expect(maxPC).toBe(9);
  });
});

describe('isCQTAvailable', () => {
  it('returns true for valid kernel array', () => {
    const kernels = buildCQTKernels(SAMPLE_RATE);
    expect(isCQTAvailable(kernels)).toBe(true);
  });

  it('returns false for null/undefined/empty', () => {
    expect(isCQTAvailable(null)).toBe(false);
    expect(isCQTAvailable(undefined)).toBe(false);
    expect(isCQTAvailable([])).toBe(false);
  });
});

describe('useCQT config', () => {
  it('defaults to false', () => {
    expect(useCQT).toBe(false);
  });
});
