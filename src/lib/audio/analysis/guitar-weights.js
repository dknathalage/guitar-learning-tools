/**
 * Guitar-specific chord weighting — playability priors for template matching.
 * Boosts common open/barre chords and penalizes rare voicings.
 */

// Note indices: C=0, C#=1, D=2, D#=3, E=4, F=5, F#=6, G=7, G#=8, A=9, A#=10, B=11
// Guitar-friendly keys (common open chord roots)
const OPEN_ROOTS = new Set([0, 2, 4, 7, 9]); // C, D, E, G, A

// Chord types that are common and easy on guitar
const EASY_TYPES = new Set(['maj', 'min', '7', 'm7', '5']);

// Chord types that are rare / difficult voicings
const RARE_TYPES = new Set(['dim7', 'aug']);

/**
 * Build a weight for each template based on guitar playability.
 * @param {Array} templates - From buildChordTemplates()
 * @returns {Map<number, number>} Map from template index to weight (0.5–1.2)
 */
export function buildGuitarWeights(templates) {
  const weights = new Map();

  for (let i = 0; i < templates.length; i++) {
    const t = templates[i];
    let w = 0.85; // default neutral weight

    if (EASY_TYPES.has(t.typeId) && OPEN_ROOTS.has(t.root)) {
      // Common open/barre-friendly chords in guitar-friendly keys
      w = 1.15;
    } else if (EASY_TYPES.has(t.typeId)) {
      // Easy type but less common key
      w = 1.0;
    } else if (RARE_TYPES.has(t.typeId) && !OPEN_ROOTS.has(t.root)) {
      // Rare voicing in uncommon key — strongest penalty
      w = 0.5;
    } else if (RARE_TYPES.has(t.typeId)) {
      // Rare voicing but in a common key
      w = 0.65;
    }

    weights.set(i, w);
  }

  return weights;
}

/**
 * Multiply each match score by its guitar weight.
 * @param {Array<{ root: number, rootName: string, typeId: string, chordName: string, score: number }>} matches
 * @param {Map<number, number>} weights - From buildGuitarWeights()
 * @param {Array} templates - The same templates array used for matching
 * @returns {Array} matches with adjusted scores, re-sorted
 */
export function applyGuitarWeights(matches, weights, templates) {
  const templateIndex = new Map();
  for (let i = 0; i < templates.length; i++) {
    const t = templates[i];
    templateIndex.set(`${t.root}:${t.typeId}`, i);
  }

  const weighted = matches.map(m => {
    const key = `${m.root}:${m.typeId}`;
    const idx = templateIndex.get(key);
    const w = idx != null ? (weights.get(idx) ?? 1.0) : 1.0;
    return { ...m, score: Math.round(m.score * w * 1000) / 1000 };
  });

  weighted.sort((a, b) => b.score - a.score);
  return weighted;
}
