import { describe, it, expect } from 'vitest';
import { noteAt, fretForNote, shuffle, scaleSequence, renderNoteFretboard, renderMiniFretboard, STANDARD_TUNING, STRING_NAMES, BASE_MIDI, NATURAL_NOTES } from './fretboard.js';

describe('noteAt', () => {
  it('open string 0 (low E) = E', () => {
    expect(noteAt(0, 0)).toBe('E');
  });

  it('open string 1 = A', () => {
    expect(noteAt(1, 0)).toBe('A');
  });

  it('open string 2 = D', () => {
    expect(noteAt(2, 0)).toBe('D');
  });

  it('open string 3 = G', () => {
    expect(noteAt(3, 0)).toBe('G');
  });

  it('open string 4 = B', () => {
    expect(noteAt(4, 0)).toBe('B');
  });

  it('open string 5 (high E) = E', () => {
    expect(noteAt(5, 0)).toBe('E');
  });

  it('5th fret low E = A', () => {
    expect(noteAt(0, 5)).toBe('A');
  });

  it('12th fret is same as open (octave)', () => {
    for (let s = 0; s < 6; s++) {
      expect(noteAt(s, 12)).toBe(noteAt(s, 0));
    }
  });

  it('fret 24 wraps correctly (double octave)', () => {
    for (let s = 0; s < 6; s++) {
      expect(noteAt(s, 24)).toBe(noteAt(s, 0));
    }
  });
});

describe('fretForNote', () => {
  it('E on low E (max 24) → [0, 12, 24]', () => {
    expect(fretForNote(0, 'E', 24)).toEqual([0, 12, 24]);
  });

  it('A on low E (max 12) → [5]', () => {
    expect(fretForNote(0, 'A', 12)).toEqual([5]);
  });

  it('out of range returns []', () => {
    // F# on low E would be fret 2; max=1 excludes it
    expect(fretForNote(0, 'F#', 1)).toEqual([]);
  });

  it('max=0 only checks open string', () => {
    expect(fretForNote(0, 'E', 0)).toEqual([0]);
    expect(fretForNote(0, 'A', 0)).toEqual([]);
  });
});

describe('shuffle', () => {
  it('preserves length', () => {
    const arr = [1, 2, 3, 4, 5];
    shuffle(arr);
    expect(arr).toHaveLength(5);
  });

  it('preserves elements (same set)', () => {
    const arr = [1, 2, 3, 4, 5];
    const sorted = [...arr];
    shuffle(arr);
    expect(arr.sort((a, b) => a - b)).toEqual(sorted);
  });

  it('returns same reference (in-place)', () => {
    const arr = [1, 2, 3];
    const ref = shuffle(arr);
    expect(ref).toBe(arr);
  });

  it('works with empty array', () => {
    const arr = [];
    expect(shuffle(arr)).toEqual([]);
  });

  it('works with single element', () => {
    const arr = [42];
    expect(shuffle(arr)).toEqual([42]);
  });
});

describe('scaleSequence', () => {
  // C major: ri=0, iv=[0,2,4,5,7,9,11]
  const cMajorIv = [0, 2, 4, 5, 7, 9, 11];
  const cMajorNotes = new Set(['C', 'D', 'E', 'F', 'G', 'A', 'B']);

  it('C major frets 0-4: all notes are in C major scale', () => {
    const seq = scaleSequence(0, cMajorIv, 0, 4);
    for (const entry of seq) {
      expect(cMajorNotes.has(entry.note)).toBe(true);
    }
  });

  it('results are sorted by MIDI', () => {
    const seq = scaleSequence(0, cMajorIv, 0, 4);
    for (let i = 1; i < seq.length; i++) {
      expect(seq[i].midi).toBeGreaterThanOrEqual(seq[i - 1].midi);
    }
  });

  it('fret range is respected', () => {
    const seq = scaleSequence(0, cMajorIv, 3, 7);
    for (const entry of seq) {
      expect(entry.fret).toBeGreaterThanOrEqual(3);
      expect(entry.fret).toBeLessThanOrEqual(7);
    }
  });

  it('each entry has note, str, fret, midi', () => {
    const seq = scaleSequence(0, cMajorIv, 0, 4);
    expect(seq.length).toBeGreaterThan(0);
    for (const entry of seq) {
      expect(entry).toHaveProperty('note');
      expect(entry).toHaveProperty('str');
      expect(entry).toHaveProperty('fret');
      expect(entry).toHaveProperty('midi');
    }
  });

  it('maxFret clamps the window', () => {
    const seq = scaleSequence(0, cMajorIv, 0, 2);
    for (const entry of seq) {
      expect(entry.fret).toBeLessThanOrEqual(2);
    }
  });

  it('A minor pentatonic produces correct notes', () => {
    const iv = [0, 3, 5, 7, 10]; // A minor pentatonic
    const ri = 9; // A
    const expected = new Set(['A', 'C', 'D', 'E', 'G']);
    const seq = scaleSequence(ri, iv, 5, 9);
    for (const entry of seq) {
      expect(expected.has(entry.note)).toBe(true);
    }
  });
});

describe('renderNoteFretboard', () => {
  const target = { str: 0, fret: 5, note: 'A' };

  it('returns valid SVG', () => {
    const svg = renderNoteFretboard(target, null, false);
    expect(svg).toMatch(/^<svg/);
    expect(svg).toMatch(/<\/svg>$/);
  });

  it('contains the target note', () => {
    const svg = renderNoteFretboard(target, null, false);
    expect(svg).toContain('>A<');
  });

  it('uses blue (#58A6FF) when not correct', () => {
    const svg = renderNoteFretboard(target, null, false);
    expect(svg).toContain('#58A6FF');
  });

  it('uses green (#4ECB71) when correct', () => {
    const svg = renderNoteFretboard(target, null, true);
    expect(svg).toContain('#4ECB71');
  });
});

describe('renderMiniFretboard', () => {
  it('returns valid SVG', () => {
    const svg = renderMiniFretboard(0, 5);
    expect(svg).toMatch(/^<svg/);
    expect(svg).toMatch(/<\/svg>$/);
  });

  it('shows "?" in purple (#C084FC)', () => {
    const svg = renderMiniFretboard(0, 5);
    expect(svg).toContain('#C084FC');
    expect(svg).toContain('>?<');
  });
});

describe('exported constants', () => {
  it('STANDARD_TUNING matches standard tuning', () => {
    expect(STANDARD_TUNING).toEqual([4, 9, 2, 7, 11, 4]);
  });

  it('STRING_NAMES has 6 names', () => {
    expect(STRING_NAMES).toHaveLength(6);
  });

  it('BASE_MIDI has correct MIDI values for standard tuning', () => {
    expect(BASE_MIDI).toEqual([40, 45, 50, 55, 59, 64]);
  });

  it('NATURAL_NOTES has 7 natural notes', () => {
    expect(NATURAL_NOTES).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
  });
});
