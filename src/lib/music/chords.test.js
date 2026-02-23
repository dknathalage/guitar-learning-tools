import { describe, it, expect, beforeEach } from 'vitest';
import { CFG, STD_SHAPES, STD_COLORS, setTuning, adaptShape, getBf, resolve, renderDiagram, renderNeck } from './chords.js';

beforeEach(() => {
  setTuning('std');
});

describe('CFG initial state', () => {
  it('has 12 notes', () => {
    expect(CFG.notes).toHaveLength(12);
  });

  it('has standard tuning', () => {
    expect(CFG.tuning).toEqual([4, 9, 2, 7, 11, 4]);
  });

  it('has 5 CAGED shapes', () => {
    expect(CFG.shapes).toHaveLength(5);
    expect(CFG.shapes.map(s => s.id)).toEqual(['e', 'a', 'd', 'c', 'g']);
  });

  it('has 12 chord types', () => {
    expect(CFG.chordTypes).toHaveLength(12);
  });

  it('has 6 tuning presets', () => {
    expect(Object.keys(CFG.tunings)).toHaveLength(6);
  });
});

describe('STD_SHAPES', () => {
  it('has 5 shapes', () => {
    expect(STD_SHAPES).toHaveLength(5);
  });

  it('E shape has 6 voices', () => {
    const e = STD_SHAPES.find(s => s.id === 'e');
    expect(e.voices).toHaveLength(6);
  });

  it('A shape has 5 voices and mutes string 0', () => {
    const a = STD_SHAPES.find(s => s.id === 'a');
    expect(a.voices).toHaveLength(5);
    expect(a.muted).toEqual([0]);
  });

  it('D shape has 4 voices and mutes strings 0, 1', () => {
    const d = STD_SHAPES.find(s => s.id === 'd');
    expect(d.voices).toHaveLength(4);
    expect(d.muted).toEqual([0, 1]);
  });

  it('C and G shapes have barreOffset=-3', () => {
    const c = STD_SHAPES.find(s => s.id === 'c');
    const g = STD_SHAPES.find(s => s.id === 'g');
    expect(c.barreOffset).toBe(-3);
    expect(g.barreOffset).toBe(-3);
  });
});

describe('adaptShape', () => {
  it('E shape rootBase=4 (E)', () => {
    const e = CFG.shapes.find(s => s.id === 'e');
    const adapted = adaptShape(e);
    expect(adapted.rootBase).toBe(4);
  });

  it('A shape rootBase=9 (A)', () => {
    const a = CFG.shapes.find(s => s.id === 'a');
    const adapted = adaptShape(a);
    expect(adapted.rootBase).toBe(9);
  });

  it('E shape voice bases correspond to major triad intervals [R,5,R,3,5,R]', () => {
    const e = CFG.shapes.find(s => s.id === 'e');
    const adapted = adaptShape(e);
    const bases = adapted.voices.map(v => v.base);
    expect(bases).toEqual([0, 7, 0, 4, 7, 0]);
  });

  it('A shape voice bases are [R,5,R,3,5]', () => {
    const a = CFG.shapes.find(s => s.id === 'a');
    const adapted = adaptShape(a);
    const bases = adapted.voices.map(v => v.base);
    expect(bases).toEqual([0, 7, 0, 4, 7]);
  });

  it('does not mutate original shape', () => {
    const e = CFG.shapes.find(s => s.id === 'e');
    const origVoices = e.voices.map(v => ({ ...v }));
    adaptShape(e);
    expect(e.voices).toEqual(origVoices);
    expect(e).not.toHaveProperty('rootBase');
  });
});

describe('getBf', () => {
  let eAdapted, aAdapted, cAdapted, gAdapted;

  beforeEach(() => {
    eAdapted = adaptShape(CFG.shapes.find(s => s.id === 'e'));
    aAdapted = adaptShape(CFG.shapes.find(s => s.id === 'a'));
    cAdapted = adaptShape(CFG.shapes.find(s => s.id === 'c'));
    gAdapted = adaptShape(CFG.shapes.find(s => s.id === 'g'));
  });

  it('E shape + E root → 0', () => {
    expect(getBf(eAdapted, 4)).toBe(0);
  });

  it('E shape + F root → 1', () => {
    expect(getBf(eAdapted, 5)).toBe(1);
  });

  it('E shape + C root → 8', () => {
    expect(getBf(eAdapted, 0)).toBe(8);
  });

  it('E shape + G root → 3', () => {
    expect(getBf(eAdapted, 7)).toBe(3);
  });

  it('A shape + A root → 0', () => {
    expect(getBf(aAdapted, 9)).toBe(0);
  });

  it('A shape + C root → 3', () => {
    expect(getBf(aAdapted, 0)).toBe(3);
  });

  it('C shape + C root → 0 (barreOffset wraps)', () => {
    expect(getBf(cAdapted, 0)).toBe(0);
  });

  it('G shape + G root → 0 (barreOffset wraps)', () => {
    expect(getBf(gAdapted, 7)).toBe(0);
  });
});

describe('resolve', () => {
  it('E shape E major: bf=0, 6 voices, notes are E/G#/B', () => {
    const e = adaptShape(CFG.shapes.find(s => s.id === 'e'));
    const r = resolve(e, 4, [0, 4, 7]); // E major
    expect(r.bf).toBe(0);
    expect(r.voices).toHaveLength(6);
    const notes = new Set(r.voices.map(v => v.note));
    expect(notes).toEqual(new Set(['E', 'G#', 'B']));
  });

  it('E shape E major: roots are marked isRoot=true', () => {
    const e = adaptShape(CFG.shapes.find(s => s.id === 'e'));
    const r = resolve(e, 4, [0, 4, 7]);
    const roots = r.voices.filter(v => v.isRoot);
    expect(roots.length).toBeGreaterThan(0);
    for (const root of roots) {
      expect(root.note).toBe('E');
      expect(root.semi).toBe(0);
    }
  });

  it('A shape C major: bf=3, string 0 muted, notes are C/E/G', () => {
    const a = adaptShape(CFG.shapes.find(s => s.id === 'a'));
    const r = resolve(a, 0, [0, 4, 7]); // C major
    expect(r.bf).toBe(3);
    expect(r.muted).toContain(0);
    const notes = new Set(r.voices.map(v => v.note));
    expect(notes).toEqual(new Set(['C', 'E', 'G']));
  });

  it('minor chord voices flat the 3rd', () => {
    const e = adaptShape(CFG.shapes.find(s => s.id === 'e'));
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
    const e = adaptShape(CFG.shapes.find(s => s.id === 'e'));
    const r = resolve(e, 4, [0, 4, 7, 10]); // E7
    const semis = new Set(r.voices.map(v => v.semi));
    expect(semis).toContain(0);  // root
    expect(semis).toContain(4);  // major 3rd
    expect(semis).toContain(7);  // perfect 5th
    expect(semis).toContain(10); // flat 7th
  });

  it('voice properties have str, fo, note, semi, interval, isRoot', () => {
    const e = adaptShape(CFG.shapes.find(s => s.id === 'e'));
    const r = resolve(e, 4, [0, 4, 7]);
    for (const v of r.voices) {
      expect(v).toHaveProperty('str');
      expect(v).toHaveProperty('fo');
      expect(v).toHaveProperty('note');
      expect(v).toHaveProperty('semi');
      expect(v).toHaveProperty('interval');
      expect(v).toHaveProperty('isRoot');
      expect(v.fo).toBeGreaterThanOrEqual(0);
    }
  });

  it('D shape has muted strings 0 and 1', () => {
    const d = adaptShape(CFG.shapes.find(s => s.id === 'd'));
    const r = resolve(d, 2, [0, 4, 7]); // D major
    expect(r.muted).toContain(0);
    expect(r.muted).toContain(1);
  });
});

describe('setTuning', () => {
  it('dropD changes tuning[0] to 2', () => {
    setTuning('dropD');
    expect(CFG.tuning[0]).toBe(2);
  });

  it('dropD changes stringNames[0] to D', () => {
    setTuning('dropD');
    expect(CFG.stringNames[0]).toBe('D');
  });

  it('dropD has 6 shapes (adds Power)', () => {
    setTuning('dropD');
    expect(CFG.shapes).toHaveLength(6);
    expect(CFG.shapes.map(s => s.id)).toContain('p');
  });

  it('invalid id is a no-op', () => {
    const before = [...CFG.tuning];
    setTuning('nonexistent');
    expect(CFG.tuning).toEqual(before);
  });

  it('switching back to standard restores state', () => {
    setTuning('dropD');
    expect(CFG.tuning[0]).toBe(2);
    setTuning('std');
    expect(CFG.tuning).toEqual([4, 9, 2, 7, 11, 4]);
    expect(CFG.shapes).toHaveLength(5);
  });

  it('does not mutate preset objects', () => {
    const stdTuningBefore = [...CFG.tunings.std.tuning];
    setTuning('dropD');
    CFG.tuning[0] = 99; // mutate the live config
    expect(CFG.tunings.std.tuning).toEqual(stdTuningBefore);
    expect(CFG.tunings.dropD.tuning).toEqual([2, 9, 2, 7, 11, 4]);
  });
});

describe('renderDiagram', () => {
  it('returns valid SVG', () => {
    const e = adaptShape(CFG.shapes.find(s => s.id === 'e'));
    const r = resolve(e, 4, [0, 4, 7]);
    const svg = renderDiagram(r, '#4DA6FF');
    expect(svg).toMatch(/^<svg/);
    expect(svg).toMatch(/<\/svg>$/);
  });

  it('contains note names', () => {
    const e = adaptShape(CFG.shapes.find(s => s.id === 'e'));
    const r = resolve(e, 4, [0, 4, 7]);
    const svg = renderDiagram(r, '#4DA6FF');
    expect(svg).toContain('>E<');
    expect(svg).toContain('>B<');
  });

  it('contains the color', () => {
    const e = adaptShape(CFG.shapes.find(s => s.id === 'e'));
    const r = resolve(e, 4, [0, 4, 7]);
    const svg = renderDiagram(r, '#FF6B6B');
    expect(svg).toContain('#FF6B6B');
  });

  it('muted strings show x', () => {
    const a = adaptShape(CFG.shapes.find(s => s.id === 'a'));
    const r = resolve(a, 0, [0, 4, 7]); // C major
    const svg = renderDiagram(r, '#FFB347');
    expect(svg).toContain('\u00d7'); // × character
  });
});

describe('renderNeck', () => {
  it('returns valid SVG', () => {
    const ct = CFG.chordTypes.find(c => c.id === 'maj');
    const svg = renderNeck(0, ct, null);
    expect(svg).toMatch(/^<svg/);
    expect(svg).toMatch(/<\/svg>$/);
  });

  it('shows all 5 shapes without curShape filter', () => {
    const ct = CFG.chordTypes.find(c => c.id === 'maj');
    const svg = renderNeck(0, ct, null);
    expect(svg).toContain('E Shape');
    expect(svg).toContain('A Shape');
    expect(svg).toContain('D Shape');
    expect(svg).toContain('C Shape');
    expect(svg).toContain('G Shape');
  });

  it('shows single shape with curShape filter', () => {
    const ct = CFG.chordTypes.find(c => c.id === 'maj');
    const svg = renderNeck(0, ct, 'e');
    expect(svg).toContain('E Shape');
    expect(svg).not.toContain('A Shape');
    expect(svg).not.toContain('D Shape');
  });
});

describe('STD_COLORS', () => {
  it('has 5 CAGED colors', () => {
    expect(Object.keys(STD_COLORS)).toHaveLength(5);
    expect(STD_COLORS).toHaveProperty('e');
    expect(STD_COLORS).toHaveProperty('a');
    expect(STD_COLORS).toHaveProperty('d');
    expect(STD_COLORS).toHaveProperty('c');
    expect(STD_COLORS).toHaveProperty('g');
  });
});
