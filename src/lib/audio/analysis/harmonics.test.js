import { describe, it, expect } from 'vitest';
import { harmonicCorrect } from './harmonics.js';

function generateSine(freq, sampleRate, length) {
  const buf = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    buf[i] = Math.sin(2 * Math.PI * freq * i / sampleRate);
  }
  return buf;
}

function generateWithHarmonic(fundamental, harmonicFreq, harmonicAmp, sampleRate, length) {
  const buf = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    buf[i] = Math.sin(2 * Math.PI * fundamental * i / sampleRate)
           + harmonicAmp * Math.sin(2 * Math.PI * harmonicFreq * i / sampleRate);
  }
  return buf;
}

describe('harmonicCorrect', () => {
  const SR = 44100;
  const LEN = 4096;

  // --- Existing tests (updated for removed 160Hz gate) ---

  it('pure sine at 220Hz stays at 220Hz', () => {
    const buf = generateSine(220, SR, LEN);
    const result = harmonicCorrect(220, buf, SR);
    expect(result).toBe(220);
  });

  it('sine at 220Hz with strong 2nd harmonic at 440Hz stays at 220Hz', () => {
    const buf = generateWithHarmonic(220, 440, 0.8, SR, LEN);
    const result = harmonicCorrect(220, buf, SR);
    expect(result).toBe(220);
  });

  it('wound string octave-up error: YIN detects 220Hz but fundamental is 110Hz', () => {
    const buf = generateWithHarmonic(110, 220, 0.3, SR, LEN);
    const result = harmonicCorrect(220, buf, SR);
    expect(result).toBe(110);
  });

  it('high frequency pure sine (440Hz) stays at 440Hz', () => {
    const buf = generateSine(440, SR, LEN);
    const result = harmonicCorrect(440, buf, SR);
    expect(result).toBe(440);
  });

  it('returns original hz when tau exceeds halfLen (short buffer)', () => {
    const shortBuf = generateSine(200, SR, 256);
    const result = harmonicCorrect(200, shortBuf, SR);
    expect(result).toBe(200);
  });

  // --- New: 160Hz gate removed, low-frequency correction now works ---

  it('correction works below 160Hz (gate removed)', () => {
    // Buffer with 55Hz fundamental, YIN incorrectly detects 110Hz
    const buf = generateWithHarmonic(55, 110, 0.3, SR, LEN);
    const result = harmonicCorrect(110, buf, SR);
    expect(result).toBe(55);
  });

  // --- New: 3rd harmonic correction ---

  it('3rd harmonic lock: YIN detects 246Hz but fundamental is 82Hz', () => {
    // Buffer has strong 82Hz fundamental, YIN mistakenly locks on 3rd harmonic (246Hz)
    const buf = generateWithHarmonic(82, 246, 0.2, SR, LEN);
    const result = harmonicCorrect(246, buf, SR);
    expect(result).toBe(82);
  });

  it('3rd harmonic: does not correct when original CMND is already excellent', () => {
    // Pure 300Hz sine — original CMND is near-zero (confident detection),
    // so no correction should trigger even though sub-harmonic taus may also be low
    const buf = generateSine(300, SR, LEN);
    const result = harmonicCorrect(300, buf, SR);
    expect(result).toBe(300);
  });

  // --- New: super-octave correction ---

  it('super-octave correction: YIN detects 60Hz but 120Hz is the true pitch', () => {
    // Buffer has 120Hz fundamental + harmonics + inharmonic content
    // At 60Hz: sub-octave (30Hz) and 3rd (20Hz) are below FREQ_MIN, only super-octave is valid
    // The 60Hz tau has mediocre CMND, super-octave (120Hz) tau has better CMND
    const buf = new Float32Array(LEN);
    for (let i = 0; i < LEN; i++) {
      buf[i] = Math.sin(2 * Math.PI * 120 * i / SR)
             + 0.4 * Math.sin(2 * Math.PI * 240 * i / SR)
             + 0.3 * Math.sin(2 * Math.PI * 90 * i / SR);
    }
    const result = harmonicCorrect(60, buf, SR);
    expect(result).toBe(120);
  });

  it('super-octave: does not correct when original is already the fundamental', () => {
    // Buffer is actually 110Hz — super-octave (220Hz) should NOT win
    const buf = generateSine(110, SR, LEN);
    const result = harmonicCorrect(110, buf, SR);
    expect(result).toBe(110);
  });

  // --- Edge cases ---

  it('freq/3 below FREQ_MIN (50Hz) is skipped', () => {
    // 120Hz / 3 = 40Hz < 50Hz, so 3rd harmonic candidate is out of range
    const buf = generateSine(120, SR, LEN);
    const result = harmonicCorrect(120, buf, SR);
    expect(result).toBe(120);
  });

  it('freq*2 above FREQ_MAX (1400Hz) is skipped', () => {
    // 800Hz * 2 = 1600Hz > 1400Hz, so super-octave candidate is out of range
    const buf = generateSine(800, SR, LEN);
    const result = harmonicCorrect(800, buf, SR);
    expect(result).toBe(800);
  });

  it('sub-octave below FREQ_MIN is skipped', () => {
    // 80Hz / 2 = 40Hz < 50Hz, sub-octave candidate out of range
    const buf = generateSine(80, SR, LEN);
    const result = harmonicCorrect(80, buf, SR);
    expect(result).toBe(80);
  });

  it('returns original when hz is below FREQ_MIN', () => {
    const buf = generateSine(30, SR, LEN);
    const result = harmonicCorrect(30, buf, SR);
    expect(result).toBe(30);
  });

  it('returns original when hz is above FREQ_MAX', () => {
    const buf = generateSine(1500, SR, LEN);
    const result = harmonicCorrect(1500, buf, SR);
    expect(result).toBe(1500);
  });
});
