import { NOTES, CHORD_TYPES, SCALES, MODES } from '$lib/constants/music.js';

const TRIAD_IDS = ['maj', 'min', 'aug', 'dim'];
const SEVENTH_IDS = ['7', 'maj7', 'm7', 'dim7', 'm7b5'];
const SCALE_ENTRIES = [
  ...SCALES.map(s => s.id),
  ...MODES.filter(m => m.id === 'dorian' || m.id === 'mixolydian').map(m => m.id)
];

function cross(roots, ids, fmt) {
  return roots.flatMap((_, ri) => ids.map(id => fmt(ri, id)));
}

export const SECTIONS = {
  fretboard: {
    items: NOTES.slice(),
    targetMs: 3000
  },
  intervals: {
    items: cross(NOTES, Array.from({ length: 12 }, (_, i) => i), (ri, semi) => `${ri}_${semi}`),
    targetMs: 5000
  },
  triads: {
    items: cross(NOTES, TRIAD_IDS, (ri, id) => `${ri}_${id}`),
    targetMs: 5000
  },
  scales: {
    items: cross(NOTES, SCALE_ENTRIES, (ri, id) => `${ri}_${id}`),
    targetMs: 8000
  },
  sevenths: {
    items: cross(NOTES, SEVENTH_IDS, (ri, id) => `${ri}_${id}`),
    targetMs: 5000
  },
  builder: {
    items: CHORD_TYPES.map(ct => ct.id),
    targetMs: 10000
  },
  iiVI: {
    items: Array.from({ length: 12 }, (_, i) => `${i}`),
    targetMs: 8000
  }
};
