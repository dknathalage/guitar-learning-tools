/**
 * Constant-Q Transform and CQT-based chromagram.
 * Pure functions — no side effects.
 */

/**
 * Precompute CQT kernels for each frequency bin.
 * @param {number} sampleRate - Audio sample rate in Hz
 * @param {number} [binsPerOctave=12] - Frequency bins per octave
 * @param {number} [numOctaves=6] - Number of octaves to cover
 * @param {number} [fMin=65.41] - Minimum frequency (C2)
 * @returns {Array<{real: Float32Array, imag: Float32Array, len: number, freq: number}>}
 */
export function buildCQTKernels(sampleRate, binsPerOctave = 12, numOctaves = 6, fMin = 65.41) {
  const totalBins = binsPerOctave * numOctaves;
  const Q = 1 / (Math.pow(2, 1 / binsPerOctave) - 1);
  const kernels = new Array(totalBins);

  for (let k = 0; k < totalBins; k++) {
    const freq = fMin * Math.pow(2, k / binsPerOctave);
    const Nk = Math.ceil(sampleRate / freq * Q);
    const real = new Float32Array(Nk);
    const imag = new Float32Array(Nk);
    const twoPiQOverN = 2 * Math.PI * Q / Nk;

    for (let n = 0; n < Nk; n++) {
      // Hann window
      const w = 0.5 * (1 - Math.cos(2 * Math.PI * n / (Nk - 1)));
      const phase = twoPiQOverN * n;
      real[n] = w * Math.cos(phase) / Nk;
      imag[n] = -w * Math.sin(phase) / Nk;
    }

    kernels[k] = { real, imag, len: Nk, freq };
  }

  return kernels;
}

/**
 * Compute CQT magnitudes by dot product of frame with each kernel.
 * @param {Float32Array} frame - Audio frame
 * @param {Array<{real: Float32Array, imag: Float32Array, len: number}>} kernels
 * @returns {Float32Array} Magnitude for each CQT bin
 */
export function computeCQT(frame, kernels) {
  const numBins = kernels.length;
  const magnitudes = new Float32Array(numBins);
  const frameLen = frame.length;

  for (let k = 0; k < numBins; k++) {
    const { real, imag, len } = kernels[k];
    let dotReal = 0;
    let dotImag = 0;
    const N = Math.min(len, frameLen);

    for (let n = 0; n < N; n++) {
      const s = frame[n];
      dotReal += s * real[n];
      dotImag += s * imag[n];
    }

    magnitudes[k] = Math.sqrt(dotReal * dotReal + dotImag * dotImag);
  }

  return magnitudes;
}

/**
 * Fold CQT bins into 12 pitch classes, L2-normalized.
 * @param {Float32Array} cqtBins - CQT magnitudes (binsPerOctave * numOctaves)
 * @param {number} [binsPerOctave=12] - Bins per octave
 * @returns {Float32Array} 12-bin chromagram, L2-normalized
 */
export function cqtChromagram(cqtBins, binsPerOctave = 12) {
  const chroma = new Float32Array(12);
  const numBins = cqtBins.length;
  const numOctaves = Math.floor(numBins / binsPerOctave);

  for (let oct = 0; oct < numOctaves; oct++) {
    for (let pc = 0; pc < 12; pc++) {
      const idx = pc + oct * binsPerOctave;
      if (idx < numBins) {
        chroma[pc] += cqtBins[idx] * cqtBins[idx];
      }
    }
  }

  // L2 normalize
  let norm = 0;
  for (let i = 0; i < 12; i++) norm += chroma[i] * chroma[i];
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < 12; i++) chroma[i] /= norm;
  }

  return chroma;
}

/** Opt-in flag — CQT replaces FFT chromagram when enabled */
export const useCQT = false;

/**
 * Check if CQT kernels are built and valid.
 * @param {Array|null|undefined} kernels
 * @returns {boolean}
 */
export function isCQTAvailable(kernels) {
  return Array.isArray(kernels) && kernels.length > 0;
}
