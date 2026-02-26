import { describe, it, expect } from 'vitest';
import { buildGuitarWeights, applyGuitarWeights } from './guitar-weights.js';
import { buildChordTemplates, matchChord } from './templates.js';

describe('buildGuitarWeights', () => {
  const templates = buildChordTemplates();
  const weights = buildGuitarWeights(templates);

  it('returns a weight for every template', () => {
    expect(weights.size).toBe(templates.length);
  });

  it('all weights are in the 0.5–1.2 range', () => {
    for (const [, w] of weights) {
      expect(w).toBeGreaterThanOrEqual(0.5);
      expect(w).toBeLessThanOrEqual(1.2);
    }
  });

  it('open chords E, Am, G, C, D major get boosted (>= 1.0)', () => {
    // E major: root=4 (E), typeId='maj'
    // A minor: root=9 (A), typeId='min'
    // G major: root=7 (G), typeId='maj'
    // C major: root=0 (C), typeId='maj'
    // D major: root=2 (D), typeId='maj'
    const openChords = [
      { root: 4, typeId: 'maj' },
      { root: 9, typeId: 'min' },
      { root: 7, typeId: 'maj' },
      { root: 0, typeId: 'maj' },
      { root: 2, typeId: 'maj' },
    ];

    for (const oc of openChords) {
      const idx = templates.findIndex(t => t.root === oc.root && t.typeId === oc.typeId);
      expect(idx).toBeGreaterThanOrEqual(0);
      const w = weights.get(idx);
      expect(w).toBeGreaterThanOrEqual(1.0);
    }
  });

  it('dim7 and aug in uncommon keys get penalized (<= 0.7)', () => {
    // Non-open roots: C#=1, D#=3, F=5, F#=6, G#=8, A#=10, B=11
    const uncommonRoots = [1, 3, 5, 6, 8, 10, 11];
    const rareTypes = ['dim7', 'aug'];

    for (const typeId of rareTypes) {
      for (const root of uncommonRoots) {
        const idx = templates.findIndex(t => t.root === root && t.typeId === typeId);
        if (idx >= 0) {
          const w = weights.get(idx);
          expect(w).toBeLessThanOrEqual(0.7);
        }
      }
    }
  });

  it('dim7/aug in open keys get moderate penalty (0.5–0.7)', () => {
    const openRoots = [0, 2, 4, 7, 9]; // C, D, E, G, A
    const rareTypes = ['dim7', 'aug'];

    for (const typeId of rareTypes) {
      for (const root of openRoots) {
        const idx = templates.findIndex(t => t.root === root && t.typeId === typeId);
        if (idx >= 0) {
          const w = weights.get(idx);
          expect(w).toBeGreaterThanOrEqual(0.5);
          expect(w).toBeLessThanOrEqual(0.7);
        }
      }
    }
  });
});

describe('applyGuitarWeights', () => {
  const templates = buildChordTemplates();
  const weights = buildGuitarWeights(templates);

  it('adjusts scores and re-sorts results', () => {
    // Create fake matches
    const matches = [
      { root: 0, rootName: 'C', typeId: 'maj', chordName: 'C', score: 0.9 },
      { root: 1, rootName: 'C#', typeId: 'dim7', chordName: 'C#\u00b07', score: 0.88 },
    ];

    const result = applyGuitarWeights(matches, weights, templates);

    // C major should be boosted, C# dim7 should be penalized
    const cMaj = result.find(r => r.chordName === 'C');
    const csDim7 = result.find(r => r.chordName === 'C#\u00b07');

    // C major (open root, easy type) should be higher
    expect(cMaj.score).toBeGreaterThan(csDim7.score);

    // Results should be sorted descending
    for (let i = 1; i < result.length; i++) {
      expect(result[i].score).toBeLessThanOrEqual(result[i - 1].score);
    }
  });

  it('returns same number of results', () => {
    const matches = [
      { root: 0, rootName: 'C', typeId: 'maj', chordName: 'C', score: 0.9 },
      { root: 9, rootName: 'A', typeId: 'min', chordName: 'Am', score: 0.85 },
    ];

    const result = applyGuitarWeights(matches, weights, templates);
    expect(result.length).toBe(matches.length);
  });
});
