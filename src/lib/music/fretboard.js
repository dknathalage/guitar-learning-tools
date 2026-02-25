import { NOTES, TUNINGS, A4, BASE_MIDI } from '$lib/constants/music.js';

export { BASE_MIDI };
export const NATURAL_NOTES = ['C','D','E','F','G','A','B'];
export const STANDARD_TUNING = TUNINGS.std.tuning;
export const STRING_NAMES = TUNINGS.std.stringNames;

export function noteAt(s, f) { return NOTES[(STANDARD_TUNING[s] + f) % 12]; }

export function fretForNote(s, n, max) {
  const b = STANDARD_TUNING[s], ni = NOTES.indexOf(n), r = [];
  for (let f = 0; f <= max; f++) if ((b + f) % 12 === ni) r.push(f);
  return r;
}

export const LANDMARKS = [0, 3, 5, 7, 9, 12];

export function nearestLandmark(fret) {
  let best = 0, bestD = fret;
  for (const lm of LANDMARKS) {
    const d = Math.abs(fret - lm);
    if (d < bestD) { bestD = d; best = lm; }
  }
  return best;
}

// Zone boundaries — each fret maps to its nearest landmark:
// zone_0: 0-1, zone_3: 2-4, zone_5: 5-6, zone_7: 7-8, zone_9: 9-10, zone_12: 11-12
export function landmarkZone(fret) {
  if (fret <= 1) return 'zone_0';
  if (fret <= 4) return 'zone_3';
  if (fret <= 6) return 'zone_5';
  if (fret <= 8) return 'zone_7';
  if (fret <= 10) return 'zone_9';
  return 'zone_12';
}

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---- Fretboard layout config — change these to resize everything ----
export const FRETBOARD_LAYOUT = {
  VISIBLE_FRETS: 7,
  FRET_WIDTH:    58,
  STRING_HEIGHT: 36,
  DOT_RADIUS:    16,
};

// Derived viewBox dimensions (use for placeholder SVGs etc.)
export function getFretboardDimensions() {
  const { VISIBLE_FRETS, FRET_WIDTH, STRING_HEIGHT, DOT_RADIUS } = FRETBOARD_LAYOUT;
  const margin = DOT_RADIUS * 2.5;
  const W = Math.ceil(margin + VISIBLE_FRETS * FRET_WIDTH + margin * 0.5);
  const H = Math.ceil(DOT_RADIUS * 1.8 + 6 * STRING_HEIGHT + DOT_RADIUS * 1.5);
  return { W, H };
}

// Shared fretboard renderer — draws board structure, calls dotsFn for note markers
export function drawBoard(startFret, dotsFn) {
  const { VISIBLE_FRETS, FRET_WIDTH, STRING_HEIGHT, DOT_RADIUS } = FRETBOARD_LAYOUT;
  const margin = DOT_RADIUS * 2.5;
  const fretLeft = margin, fretRight = fretLeft + VISIBLE_FRETS * FRET_WIDTH;
  const topMargin = DOT_RADIUS * 1.8;
  const W = Math.ceil(fretRight + margin * 0.5);
  const H = Math.ceil(topMargin + 6 * STRING_HEIGHT + DOT_RADIUS * 1.5);
  const isOpen = startFret === 0;
  const nutWidth = Math.max(4, DOT_RADIUS * 0.35);

  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
  s += `<rect x="${fretLeft - nutWidth}" y="${topMargin}" width="${fretRight - fretLeft + 2 * nutWidth}" height="${6 * STRING_HEIGHT}" rx="${nutWidth}" fill="#1a1a2e"/>`;

  for (let i = 0; i <= VISIBLE_FRETS; i++) {
    const x = fretLeft + i * FRET_WIDTH;
    s += i === 0 && isOpen
      ? `<rect x="${x - nutWidth/2}" y="${topMargin}" width="${nutWidth}" height="${6 * STRING_HEIGHT}" rx="${nutWidth/2}" fill="#ddd"/>`
      : `<line x1="${x}" y1="${topMargin}" x2="${x}" y2="${topMargin + 6 * STRING_HEIGHT}" stroke="#333" stroke-width="${Math.max(1, FRET_WIDTH * 0.035)}"/>`;
  }

  for (let i = 0; i < 6; i++) {
    const reverseIdx = 5 - i, y = topMargin + i * STRING_HEIGHT + STRING_HEIGHT / 2;
    s += `<line x1="${fretLeft}" y1="${y}" x2="${fretRight}" y2="${y}" stroke="#444" stroke-width="${STRING_HEIGHT * 0.075 - reverseIdx * STRING_HEIGHT * 0.009}"/>`;
    s += `<text x="${margin * 0.4}" y="${y}" text-anchor="middle" dominant-baseline="central" fill="#444" font-size="${DOT_RADIUS}" font-family="JetBrains Mono">${STRING_NAMES[reverseIdx]}</text>`;
  }

  for (let i = 0; i < VISIBLE_FRETS; i++) {
    const x = fretLeft + i * FRET_WIDTH + FRET_WIDTH / 2;
    s += `<text x="${x}" y="${topMargin + 6 * STRING_HEIGHT + DOT_RADIUS * 1.1}" text-anchor="middle" fill="#444" font-size="${DOT_RADIUS * 0.85}" font-family="JetBrains Mono">${startFret + i + 1}</text>`;
  }

  const inlays = [3, 5, 7, 9, 15, 17, 19, 21];
  const inlayRadius = Math.max(2, DOT_RADIUS * 0.2);
  for (let i = 0; i < VISIBLE_FRETS; i++) {
    const fretNum = startFret + i + 1, x = fretLeft + i * FRET_WIDTH + FRET_WIDTH / 2;
    if (inlays.includes(fretNum)) s += `<circle cx="${x}" cy="${topMargin - inlayRadius * 2.5}" r="${inlayRadius}" fill="#333"/>`;
    if (fretNum === 12) {
      s += `<circle cx="${x - inlayRadius * 2}" cy="${topMargin - inlayRadius * 2.5}" r="${inlayRadius}" fill="#333"/>`;
      s += `<circle cx="${x + inlayRadius * 2}" cy="${topMargin - inlayRadius * 2.5}" r="${inlayRadius}" fill="#333"/>`;
    }
  }

  s += dotsFn({ fretLeft, topMargin, STRING_HEIGHT, FRET_WIDTH, DOT_RADIUS, startFret, VISIBLE_FRETS });
  s += `</svg>`;
  return s;
}

// Compute start-fret for a sliding window centered on a target fret
export function computeStartFret(targetFret) {
  let sf = Math.max(0, targetFret - Math.floor(FRETBOARD_LAYOUT.VISIBLE_FRETS / 2));
  if (sf + FRETBOARD_LAYOUT.VISIBLE_FRETS > 22) sf = Math.max(0, 22 - FRETBOARD_LAYOUT.VISIBLE_FRETS);
  return sf;
}

export function renderNoteFretboard(target, detected, isCorrect) {
  return drawBoard(computeStartFret(target.fret), ({ fretLeft, topMargin, STRING_HEIGHT, FRET_WIDTH, DOT_RADIUS, startFret, VISIBLE_FRETS }) => {
    const tfr = target.fret - startFret;
    if (tfr < 0 || tfr > VISIBLE_FRETS) return '';
    const cy = topMargin + (5 - target.str) * STRING_HEIGHT + STRING_HEIGHT / 2;
    const cx = target.fret === 0 ? fretLeft + DOT_RADIUS * 0.2 : fretLeft + (tfr - 1) * FRET_WIDTH + FRET_WIDTH / 2;
    const col = isCorrect ? '#4ECB71' : '#58A6FF';
    const fs = target.note.length > 1 ? DOT_RADIUS * 0.8 : DOT_RADIUS;
    let d = '';
    d += `<circle cx="${cx}" cy="${cy}" r="${DOT_RADIUS * 1.3}" fill="${col}" opacity=".15"/>`;
    d += `<circle cx="${cx}" cy="${cy}" r="${DOT_RADIUS}" fill="${col}"/>`;
    d += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="${fs}" font-weight="bold" font-family="JetBrains Mono">${target.note}</text>`;
    return d;
  });
}

export function renderMiniFretboard(str, fret) {
  return drawBoard(computeStartFret(fret), ({ fretLeft, topMargin, STRING_HEIGHT, FRET_WIDTH, DOT_RADIUS, startFret, VISIBLE_FRETS }) => {
    const tfr = fret - startFret;
    if (tfr < 0 || tfr > VISIBLE_FRETS) return '';
    const cy = topMargin + (5 - str) * STRING_HEIGHT + STRING_HEIGHT / 2;
    const cx = fret === 0 ? fretLeft + DOT_RADIUS * 0.2 : fretLeft + (tfr - 1) * FRET_WIDTH + FRET_WIDTH / 2;
    let d = '';
    d += `<circle cx="${cx}" cy="${cy}" r="${DOT_RADIUS * 1.1}" fill="#C084FC" opacity=".15"/>`;
    d += `<circle cx="${cx}" cy="${cy}" r="${DOT_RADIUS * 0.8}" fill="#C084FC"/>`;
    d += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="${DOT_RADIUS}" font-weight="bold" font-family="JetBrains Mono">?</text>`;
    return d;
  });
}

export function scaleSequence(rootIndex, intervals, startFret, maxFret) {
  const end = Math.min(startFret + 4, maxFret);
  const seq = [];
  for (let s = 0; s < 6; s++) {
    for (let f = startFret; f <= end; f++) {
      const noteIdx = (STANDARD_TUNING[s] + f) % 12;
      const interval = ((noteIdx - rootIndex) % 12 + 12) % 12;
      if (intervals.includes(interval)) {
        seq.push({ note: NOTES[noteIdx], str: s, fret: f, midi: BASE_MIDI[s] + f });
      }
    }
  }
  seq.sort((a, b) => a.midi - b.midi);
  return seq;
}
