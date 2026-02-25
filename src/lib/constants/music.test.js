import { describe, it, expect } from 'vitest';
import { NOTES, A4, TUNINGS, INTERVALS, CHORD_TYPES, SCALES, MODES } from './music.js';

describe('NOTES', () => {
  it('has 12 chromatic notes', () => {
    expect(NOTES).toHaveLength(12);
  });

  it('starts with C', () => {
    expect(NOTES[0]).toBe('C');
  });

  it('has no duplicates', () => {
    expect(new Set(NOTES).size).toBe(12);
  });

  it('contains all expected notes', () => {
    expect(NOTES).toEqual(['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']);
  });
});

describe('A4', () => {
  it('equals 440', () => {
    expect(A4).toBe(440);
  });
});

describe('TUNINGS', () => {
  const ids = Object.keys(TUNINGS);

  it('has 6 presets', () => {
    expect(ids).toHaveLength(6);
  });

  it.each(ids)('%s has 6-element tuning array', (id) => {
    expect(TUNINGS[id].tuning).toHaveLength(6);
  });

  it.each(ids)('%s has 6-element stringNames array', (id) => {
    expect(TUNINGS[id].stringNames).toHaveLength(6);
  });

  it.each(ids)('%s tuning values are 0-11', (id) => {
    for (const v of TUNINGS[id].tuning) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(11);
    }
  });

  it('standard tuning is [4,9,2,7,11,4]', () => {
    expect(TUNINGS.std.tuning).toEqual([4,9,2,7,11,4]);
  });

  it('drop D only differs from standard on string 0', () => {
    const std = TUNINGS.std.tuning;
    const drop = TUNINGS.dropD.tuning;
    expect(drop[0]).not.toBe(std[0]);
    expect(drop.slice(1)).toEqual(std.slice(1));
  });
});

describe('INTERVALS', () => {
  it('has 12 entries', () => {
    expect(INTERVALS).toHaveLength(12);
  });

  it('semitones are 1-12 monotonically increasing', () => {
    for (let i = 0; i < INTERVALS.length; i++) {
      expect(INTERVALS[i].semi).toBe(i + 1);
    }
  });

  it('each entry has name and abbr', () => {
    for (const iv of INTERVALS) {
      expect(typeof iv.name).toBe('string');
      expect(typeof iv.abbr).toBe('string');
      expect(iv.name.length).toBeGreaterThan(0);
      expect(iv.abbr.length).toBeGreaterThan(0);
    }
  });
});

describe('CHORD_TYPES', () => {
  it('has 12 types', () => {
    expect(CHORD_TYPES).toHaveLength(12);
  });

  it('all start on root 0', () => {
    for (const ct of CHORD_TYPES) {
      expect(ct.iv[0]).toBe(0);
    }
  });

  it('iv.length === fm.length for all types', () => {
    for (const ct of CHORD_TYPES) {
      expect(ct.iv.length).toBe(ct.fm.length);
    }
  });

  it('major = [0,4,7]', () => {
    const maj = CHORD_TYPES.find(ct => ct.id === 'maj');
    expect(maj.iv).toEqual([0, 4, 7]);
  });

  it('minor = [0,3,7]', () => {
    const min = CHORD_TYPES.find(ct => ct.id === 'min');
    expect(min.iv).toEqual([0, 3, 7]);
  });
});

describe('SCALES', () => {
  it('has 4 scales', () => {
    expect(SCALES).toHaveLength(4);
  });

  it('major and natural minor have 7 notes', () => {
    expect(SCALES.find(s => s.id === 'major').iv).toHaveLength(7);
    expect(SCALES.find(s => s.id === 'natural_min').iv).toHaveLength(7);
  });

  it('pentatonics have 5 notes', () => {
    expect(SCALES.find(s => s.id === 'maj_pent').iv).toHaveLength(5);
    expect(SCALES.find(s => s.id === 'min_pent').iv).toHaveLength(5);
  });

  it('all start on 0', () => {
    for (const s of SCALES) {
      expect(s.iv[0]).toBe(0);
    }
  });
});

describe('MODES', () => {
  it('has 7 modes', () => {
    expect(MODES).toHaveLength(7);
  });

  it('degrees are 1-7', () => {
    const degrees = MODES.map(m => m.degree).sort((a, b) => a - b);
    expect(degrees).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('each mode has 7 intervals', () => {
    for (const m of MODES) {
      expect(m.iv).toHaveLength(7);
    }
  });

  it('ionian matches major scale', () => {
    const ionian = MODES.find(m => m.id === 'ionian');
    const major = SCALES.find(s => s.id === 'major');
    expect(ionian.iv).toEqual(major.iv);
  });

  it('aeolian matches natural minor scale', () => {
    const aeolian = MODES.find(m => m.id === 'aeolian');
    const minor = SCALES.find(s => s.id === 'natural_min');
    expect(aeolian.iv).toEqual(minor.iv);
  });
});
