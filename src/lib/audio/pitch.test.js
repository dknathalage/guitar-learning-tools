import { describe, it, expect } from 'vitest';
import { semiToFreq, freqToNote, rms, yinDetect } from './pitch.js';

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

describe('yinDetect', () => {
  function generateSine(freq, sr, len) {
    const buf = new Float32Array(len);
    for (let i = 0; i < len; i++) buf[i] = Math.sin(2 * Math.PI * freq * i / sr);
    return buf;
  }

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
    const buf = generateSine(440, 44100, 4096);
    for (let i = 0; i < buf.length; i++) buf[i] *= 0.1;
    const detected = yinDetect(buf, 44100);
    expect(detected).not.toBeNull();
    expect(detected).toBeCloseTo(440, -1);
  });
});
