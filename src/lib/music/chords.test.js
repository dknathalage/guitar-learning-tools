import { describe, it, expect, beforeEach } from 'vitest';
import { CHORD_CONFIG, STANDARD_SHAPES, SHAPE_COLORS, setTuning, adaptShapeToTuning, getBaseFret, resolve, renderDiagram, renderNeck } from './chords.js';

beforeEach(() => {
  setTuning('std');
});

describe('CHORD_CONFIG initial state', () => {
  it('has 12 notes', () => {
    expect(CHORD_CONFIG.notes).toHaveLength(12);
  });

  it('has standard tuning', () => {
    expect(CHORD_CONFIG.tuning).toEqual([4, 9, 2, 7, 11, 4]);
  });

  it('has 5 CAGED shapes', () => {
    expect(CHORD_CONFIG.shapes).toHaveLength(5);
    expect(CHORD_CONFIG.shapes.map(s => s.id)).toEqual(['e', 'a', 'd', 'c', 'g']);
  });

  it('has 12 chord types', () => {
    expect(CHORD_CONFIG.chordTypes).toHaveLength(12);
  });

  it('has 6 tuning presets', () => {
    expect(Object.keys(CHORD_CONFIG.tunings)).toHaveLength(6);
  });
});

describe('STANDARD_SHAPES', () => {
  it('has 5 shapes', () => {
    expect(STANDARD_SHAPES).toHaveLength(5);
  });

  it('E shape has 6 voices', () => {
    const e = STANDARD_SHAPES.find(s => s.id === 'e');
    expect(e.voices).toHaveLength(6);
  });

  it('A shape has 5 voices and mutes string 0', () => {
    const a = STANDARD_SHAPES.find(s => s.id === 'a');
    expect(a.voices).toHaveLength(5);
    expect(a.muted).toEqual([0]);
  });

  it('D shape has 4 voices and mutes strings 0, 1', () => {
    const d = STANDARD_SHAPES.find(s => s.id === 'd');
    expect(d.voices).toHaveLength(4);
    expect(d.muted).toEqual([0, 1]);
  });

  it('C and G shapes have barreOffset=-3', () => {
    const c = STANDARD_SHAPES.find(s => s.id === 'c');
    const g = STANDARD_SHAPES.find(s => s.id === 'g');
    expect(c.barreOffset).toBe(-3);
    expect(g.barreOffset).toBe(-3);
  });
});

describe('adaptShapeToTuning', () => {
  it('E shape rootBase=4 (E)', () => {
    const e = CHORD_CONFIG.shapes.find(s => s.id === 'e');
    const adapted = adaptShapeToTuning(e);
    expect(adapted.rootBase).toBe(4);
  });

  it('A shape rootBase=9 (A)', () => {
    const a = CHORD_CONFIG.shapes.find(s => s.id === 'a');
    const adapted = adaptShapeToTuning(a);
    expect(adapted.rootBase).toBe(9);
  });

  it('E shape voice bases correspond to major triad intervals [R,5,R,3,5,R]', () => {
    const e = CHORD_CONFIG.shapes.find(s => s.id === 'e');
    const adapted = adaptShapeToTuning(e);
    const bases = adapted.voices.map(v => v.base);
    expect(bases).toEqual([0, 7, 0, 4, 7, 0]);
  });

  it('A shape voice bases are [R,5,R,3,5]', () => {
    const a = CHORD_CONFIG.shapes.find(s => s.id === 'a');
    const adapted = adaptShapeToTuning(a);
    const bases = adapted.voices.map(v => v.base);
    expect(bases).toEqual([0, 7, 0, 4, 7]);
  });

  it('does not mutate original shape', () => {
    const e = CHORD_CONFIG.shapes.find(s => s.id === 'e');
    const origVoices = e.voices.map(v => ({ ...v }));
    adaptShapeToTuning(e);
    expect(e.voices).toEqual(origVoices);
    expect(e).not.toHaveProperty('rootBase');
  });
});

describe('getBaseFret', () => {
  let eAdapted, aAdapted, cAdapted, gAdapted;

  beforeEach(() => {
    eAdapted = adaptShapeToTuning(CHORD_CONFIG.shapes.find(s => s.id === 'e'));
    aAdapted = adaptShapeToTuning(CHORD_CONFIG.shapes.find(s => s.id === 'a'));
    cAdapted = adaptShapeToTuning(CHORD_CONFIG.shapes.find(s => s.id === 'c'));
    gAdapted = adaptShapeToTuning(CHORD_CONFIG.shapes.find(s => s.id === 'g'));
  });

  it('E shape + E root → 0', () => {
    expect(getBaseFret(eAdapted, 4)).toBe(0);
  });

  it('E shape + F root → 1', () => {
    expect(getBaseFret(eAdapted, 5)).toBe(1);
  });

  it('E shape + C root → 8', () => {
    expect(getBaseFret(eAdapted, 0)).toBe(8);
  });

  it('E shape + G root → 3', () => {
    expect(getBaseFret(eAdapted, 7)).toBe(3);
  });

  it('A shape + A root → 0', () => {
    expect(getBaseFret(aAdapted, 9)).toBe(0);
  });

  it('A shape + C root → 3', () => {
    expect(getBaseFret(aAdapted, 0)).toBe(3);
  });

  it('C shape + C root → 0 (barreOffset wraps)', () => {
    expect(getBaseFret(cAdapted, 0)).toBe(0);
  });

  it('G shape + G root → 0 (barreOffset wraps)', () => {
    expect(getBaseFret(gAdapted, 7)).toBe(0);
  });
});

describe('resolve', () => {
  it('E shape E major: bf=0, 6 voices, notes are E/G#/B', () => {
    const e = adaptShapeToTuning(CHORD_CONFIG.shapes.find(s => s.id === 'e'));
    const r = resolve(e, 4, [0, 4, 7]); // E major
    expect(r.baseFret).toBe(0);
    expect(r.voices).toHaveLength(6);
    const notes = new Set(r.voices.map(v => v.note));
    expect(notes).toEqual(new Set(['E', 'G#', 'B']));
  });

  it('E shape E major: roots are marked isRoot=true', () => {
    const e = adaptShapeToTuning(CHORD_CONFIG.shapes.find(s => s.id === 'e'));
    const r = resolve(e, 4, [0, 4, 7]);
    const roots = r.voices.filter(v => v.isRoot);
    expect(roots.length).toBeGreaterThan(0);
    for (const root of roots) {
      expect(root.note).toBe('E');
      expect(root.semi).toBe(0);
    }
  });

  it('A shape C major: bf=3, string 0 muted, notes are C/E/G', () => {
    const a = adaptShapeToTuning(CHORD_CONFIG.shapes.find(s => s.id === 'a'));
    const r = resolve(a, 0, [0, 4, 7]); // C major
    expect(r.baseFret).toBe(3);
    expect(r.muted).toContain(0);
    const notes = new Set(r.voices.map(v => v.note));
    expect(notes).toEqual(new Set(['C', 'E', 'G']));
  });

  it('minor chord voices flat the 3rd', () => {
    const e = adaptShapeToTuning(CHORD_CONFIG.shapes.find(s => s.id === 'e'));
    const rMaj = resolve(e, 4, [0, 4, 7]); // E major
    const rMin = resolve(e, 4, [0, 3, 7]); // E minor
    // In major, str 3 has semi=4 (major 3rd = G#)
    // In minor, str 3 has semi=3 (minor 3rd = G)
    const majStr3 = rMaj.voices.find(v => v.str === 3);
    const minStr3 = rMin.voices.find(v => v.str === 3);
    expect(majStr3.semi).toBe(4);
    expect(majStr3.note).toBe('G#');
    expect(minStr3.semi).toBe(3);
    expect(minStr3.note).toBe('G');
  });

  it('7th chord tries all 4 intervals', () => {
    const e = adaptShapeToTuning(CHORD_CONFIG.shapes.find(s => s.id === 'e'));
    const r = resolve(e, 4, [0, 4, 7, 10]); // E7
    const semis = new Set(r.voices.map(v => v.semi));
    expect(semis).toContain(0);  // root
    expect(semis).toContain(4);  // major 3rd
    expect(semis).toContain(7);  // perfect 5th
    expect(semis).toContain(10); // flat 7th
  });

  it('voice properties have str, fretOffset, note, semi, interval, isRoot', () => {
    const e = adaptShapeToTuning(CHORD_CONFIG.shapes.find(s => s.id === 'e'));
    const r = resolve(e, 4, [0, 4, 7]);
    for (const v of r.voices) {
      expect(v).toHaveProperty('str');
      expect(v).toHaveProperty('fretOffset');
      expect(v).toHaveProperty('note');
      expect(v).toHaveProperty('semi');
      expect(v).toHaveProperty('interval');
      expect(v).toHaveProperty('isRoot');
      expect(v.fretOffset).toBeGreaterThanOrEqual(0);
    }
  });

  it('D shape has muted strings 0 and 1', () => {
    const d = adaptShapeToTuning(CHORD_CONFIG.shapes.find(s => s.id === 'd'));
    const r = resolve(d, 2, [0, 4, 7]); // D major
    expect(r.muted).toContain(0);
    expect(r.muted).toContain(1);
  });
});

describe('setTuning', () => {
  it('dropD changes tuning[0] to 2', () => {
    setTuning('dropD');
    expect(CHORD_CONFIG.tuning[0]).toBe(2);
  });

  it('dropD changes stringNames[0] to D', () => {
    setTuning('dropD');
    expect(CHORD_CONFIG.stringNames[0]).toBe('D');
  });

  it('dropD has 6 shapes (adds Power)', () => {
    setTuning('dropD');
    expect(CHORD_CONFIG.shapes).toHaveLength(6);
    expect(CHORD_CONFIG.shapes.map(s => s.id)).toContain('p');
  });

  it('invalid id is a no-op', () => {
    const before = [...CHORD_CONFIG.tuning];
    setTuning('nonexistent');
    expect(CHORD_CONFIG.tuning).toEqual(before);
  });

  it('switching back to standard restores state', () => {
    setTuning('dropD');
    expect(CHORD_CONFIG.tuning[0]).toBe(2);
    setTuning('std');
    expect(CHORD_CONFIG.tuning).toEqual([4, 9, 2, 7, 11, 4]);
    expect(CHORD_CONFIG.shapes).toHaveLength(5);
  });

  it('does not mutate preset objects', () => {
    const stdTuningBefore = [...CHORD_CONFIG.tunings.std.tuning];
    setTuning('dropD');
    CHORD_CONFIG.tuning[0] = 99; // mutate the live config
    expect(CHORD_CONFIG.tunings.std.tuning).toEqual(stdTuningBefore);
    expect(CHORD_CONFIG.tunings.dropD.tuning).toEqual([2, 9, 2, 7, 11, 4]);
  });
});

describe('renderDiagram', () => {
  it('returns valid SVG', () => {
    const e = adaptShapeToTuning(CHORD_CONFIG.shapes.find(s => s.id === 'e'));
    const r = resolve(e, 4, [0, 4, 7]);
    const svg = renderDiagram(r, '#4DA6FF');
    expect(svg).toMatch(/^<svg/);
    expect(svg).toMatch(/<\/svg>$/);
  });

  it('contains note names', () => {
    const e = adaptShapeToTuning(CHORD_CONFIG.shapes.find(s => s.id === 'e'));
    const r = resolve(e, 4, [0, 4, 7]);
    const svg = renderDiagram(r, '#4DA6FF');
    expect(svg).toContain('>E<');
    expect(svg).toContain('>B<');
  });

  it('contains the color', () => {
    const e = adaptShapeToTuning(CHORD_CONFIG.shapes.find(s => s.id === 'e'));
    const r = resolve(e, 4, [0, 4, 7]);
    const svg = renderDiagram(r, '#FF6B6B');
    expect(svg).toContain('#FF6B6B');
  });

  it('muted strings show x', () => {
    const a = adaptShapeToTuning(CHORD_CONFIG.shapes.find(s => s.id === 'a'));
    const r = resolve(a, 0, [0, 4, 7]); // C major
    const svg = renderDiagram(r, '#FFB347');
    expect(svg).toContain('\u00d7'); // × character
  });
});

describe('renderNeck', () => {
  it('returns valid SVG', () => {
    const ct = CHORD_CONFIG.chordTypes.find(c => c.id === 'maj');
    const svg = renderNeck(0, ct, null);
    expect(svg).toMatch(/^<svg/);
    expect(svg).toMatch(/<\/svg>$/);
  });

  it('shows all 5 shapes without curShape filter', () => {
    const ct = CHORD_CONFIG.chordTypes.find(c => c.id === 'maj');
    const svg = renderNeck(0, ct, null);
    expect(svg).toContain('E Shape');
    expect(svg).toContain('A Shape');
    expect(svg).toContain('D Shape');
    expect(svg).toContain('C Shape');
    expect(svg).toContain('G Shape');
  });

  it('shows single shape with curShape filter', () => {
    const ct = CHORD_CONFIG.chordTypes.find(c => c.id === 'maj');
    const svg = renderNeck(0, ct, 'e');
    expect(svg).toContain('E Shape');
    expect(svg).not.toContain('A Shape');
    expect(svg).not.toContain('D Shape');
  });
});

describe('SHAPE_COLORS', () => {
  it('has 5 CAGED colors', () => {
    expect(Object.keys(SHAPE_COLORS)).toHaveLength(5);
    expect(SHAPE_COLORS).toHaveProperty('e');
    expect(SHAPE_COLORS).toHaveProperty('a');
    expect(SHAPE_COLORS).toHaveProperty('d');
    expect(SHAPE_COLORS).toHaveProperty('c');
    expect(SHAPE_COLORS).toHaveProperty('g');
  });
});
