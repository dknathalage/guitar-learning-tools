/**
 * Cepstral pitch detection and ensemble pitch logic.
 * Pure functions — no side effects.
 */

import { fft, hannWindow } from './chromagram.js';

const FREQ_MIN = 50;
const FREQ_MAX = 1400;
const A4 = 440;
const EPSILON = 1e-10;

/**
 * Compute cepstral pitch from an audio frame.
 * Uses IFFT of log power spectrum to find fundamental via quefrency peak.
 * Works best with harmonic-rich signals (e.g. guitar strings).
 *
 * @param {Float32Array} frame - Audio samples (any length, will be zero-padded to power of 2)
 * @param {number} sampleRate - Sample rate in Hz
 * @returns {{ hz: number, strength: number } | null}
 */
export function cepstralPitch(frame, sampleRate) {
  if (!frame || frame.length === 0) return null;

  // Zero-pad to next power of 2
  const n = nextPow2(frame.length);
  const real = new Float32Array(n);
  const imag = new Float32Array(n);

  // Copy frame into real part and apply Hann window
  for (let i = 0; i < frame.length; i++) real[i] = frame[i];
  hannWindow(real.subarray(0, frame.length));

  // Forward FFT
  fft(real, imag);

  // Log power spectrum: log(|FFT|^2 + epsilon)
  for (let i = 0; i < n; i++) {
    const power = real[i] * real[i] + imag[i] * imag[i];
    real[i] = Math.log(power + EPSILON);
    imag[i] = 0;
  }

  // IFFT via conjugate trick: IFFT(X) = conj(FFT(conj(X))) / N
  // Input is real (imag=0), so conj before FFT is no-op
  fft(real, imag);
  // Conjugate and divide by N to complete IFFT
  for (let i = 0; i < n; i++) {
    real[i] /= n;
    imag[i] = -imag[i] / n;
  }

  // Real cepstrum: use the real part (log power spectrum is symmetric/real)
  // Search for peak in quefrency range [sr/FREQ_MAX, sr/FREQ_MIN]
  const minQ = Math.max(2, Math.floor(sampleRate / FREQ_MAX));
  const maxQ = Math.min(n - 2, Math.ceil(sampleRate / FREQ_MIN));

  let peakIdx = -1;
  let peakVal = -Infinity;
  for (let q = minQ; q <= maxQ; q++) {
    if (real[q] > peakVal) {
      peakVal = real[q];
      peakIdx = q;
    }
  }

  if (peakIdx <= 0 || peakVal <= 0) return null;

  // Parabolic interpolation for sub-sample accuracy
  const alpha = real[peakIdx - 1];
  const beta = real[peakIdx];
  const gamma = real[peakIdx + 1];
  const denom = alpha - 2 * beta + gamma;
  let refinedQ = peakIdx;
  if (denom !== 0) {
    refinedQ = peakIdx + 0.5 * (alpha - gamma) / denom;
  }

  return {
    hz: sampleRate / refinedQ,
    strength: peakVal
  };
}

/**
 * Ensemble pitch: combine YIN, cepstrum, and Kalman predictions.
 *
 * @param {{ hz: number, confidence: number } | null} yinResult
 * @param {{ hz: number, strength: number } | null} cepstrumResult
 * @param {{ semi: number } | null} kalmanPrediction
 * @returns {{ hz: number, confidence: number } | null}
 */
export function ensemblePitch(yinResult, cepstrumResult, kalmanPrediction) {
  const hasYin = yinResult != null;
  const hasCep = cepstrumResult != null;

  // Neither
  if (!hasYin && !hasCep) return null;

  // Only cepstrum
  if (!hasYin && hasCep) {
    return { hz: cepstrumResult.hz, confidence: cepstrumResult.strength * 0.5 };
  }

  // Only YIN
  if (hasYin && !hasCep) {
    return { hz: yinResult.hz, confidence: yinResult.confidence };
  }

  // Both YIN and cepstrum
  const semiDist = Math.abs(12 * Math.log2(yinResult.hz / cepstrumResult.hz));

  if (semiDist <= 1) {
    // Agree — boost confidence
    return {
      hz: yinResult.hz,
      confidence: Math.min(1, yinResult.confidence * 1.2)
    };
  }

  // Disagree
  if (kalmanPrediction != null) {
    // Convert Kalman semitone prediction to Hz
    const kalmanHz = A4 * Math.pow(2, (kalmanPrediction.semi - 69) / 12);

    const yinDist = Math.abs(12 * Math.log2(yinResult.hz / kalmanHz));
    const cepDist = Math.abs(12 * Math.log2(cepstrumResult.hz / kalmanHz));

    if (yinDist <= cepDist) {
      return { hz: yinResult.hz, confidence: yinResult.confidence * 0.7 };
    } else {
      return { hz: cepstrumResult.hz, confidence: (cepstrumResult.strength || 0.5) * 0.7 };
    }
  }

  // Disagree, no Kalman
  return { hz: yinResult.hz, confidence: yinResult.confidence * 0.8 };
}

/** Next power of 2 >= n */
function nextPow2(n) {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}
