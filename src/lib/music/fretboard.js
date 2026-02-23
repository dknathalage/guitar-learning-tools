import { NOTES, TUNINGS } from '$lib/constants/music.js';

export const NT_NATURAL = ['C','D','E','F','G','A','B'];
export const NT_TUNING = TUNINGS.std.tuning;
export const NT_STR_NAMES = TUNINGS.std.stringNames;
export const BASE_MIDI = [40, 45, 50, 55, 59, 64];

export function noteAt(s, f) { return NOTES[(NT_TUNING[s] + f) % 12]; }

export function fretForNote(s, n, max) {
  const b = NT_TUNING[s], ni = NOTES.indexOf(n), r = [];
  for (let f = 0; f <= max; f++) if ((b + f) % 12 === ni) r.push(f);
  return r;
}

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function renderFB(target, detected, isCorrect) {
  const WIN = 5;
  let sf = Math.max(0, target.fret - 2);
  if (sf + WIN > 22) sf = Math.max(0, 22 - WIN);
  const FL = 42, FR = 380, TOP = 18, FH = 30;
  const FW = (FR - FL) / WIN, W = FR + 16, H = TOP + 6 * FH + 14;
  const isOpen = sf === 0;
  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
  s += `<rect x="${FL-4}" y="${TOP}" width="${FR-FL+8}" height="${6*FH}" rx="3" fill="#1a1a2e"/>`;
  for (let i = 0; i <= WIN; i++) {
    const x = FL + i * FW;
    s += i === 0 && isOpen
      ? `<rect x="${x-2}" y="${TOP}" width="4" height="${6*FH}" rx="2" fill="#ddd"/>`
      : `<line x1="${x}" y1="${TOP}" x2="${x}" y2="${TOP+6*FH}" stroke="#333" stroke-width="1.2"/>`;
  }
  for (let i = 0; i < 6; i++) {
    const ri = 5 - i, y = TOP + i * FH + FH / 2;
    s += `<line x1="${FL}" y1="${y}" x2="${FR}" y2="${y}" stroke="#444" stroke-width="${2.2-ri*.25}"/>`;
    s += `<text x="${FL-16}" y="${y}" text-anchor="middle" dominant-baseline="central" fill="#444" font-size="13" font-family="JetBrains Mono">${NT_STR_NAMES[ri]}</text>`;
  }
  for (let i = 0; i < WIN; i++) {
    const x = FL + i * FW + FW / 2;
    s += `<text x="${x}" y="${TOP+6*FH+11}" text-anchor="middle" fill="#444" font-size="11" font-family="JetBrains Mono">${sf+i+1}</text>`;
  }
  const inlays = [3,5,7,9,15,17,19,21];
  for (let i = 0; i < WIN; i++) {
    const fn = sf + i + 1, x = FL + i * FW + FW / 2;
    if (inlays.includes(fn)) s += `<circle cx="${x}" cy="${TOP-6}" r="2.5" fill="#333"/>`;
    if (fn === 12) {
      s += `<circle cx="${x-5}" cy="${TOP-6}" r="2.5" fill="#333"/>`;
      s += `<circle cx="${x+5}" cy="${TOP-6}" r="2.5" fill="#333"/>`;
    }
  }
  const tfr = target.fret - sf;
  if (tfr >= 0 && tfr <= WIN) {
    const cy = TOP + (5 - target.str) * FH + FH / 2;
    const cx = target.fret === 0 ? FL + 2 : FL + (tfr - 1) * FW + FW / 2;
    const col = isCorrect ? '#4ECB71' : '#58A6FF';
    s += `<circle cx="${cx}" cy="${cy}" r="16" fill="${col}" opacity=".15"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="12" fill="${col}"/>`;
    const fs = target.note.length > 1 ? 10 : 13;
    s += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="${fs}" font-weight="bold" font-family="JetBrains Mono">${target.note}</text>`;
  }
  s += `</svg>`;
  return s;
}

export function fbMiniBoard(str, fret) {
  const QZ_STR_NAMES = NT_STR_NAMES;
  const WIN = 5;
  let sf = Math.max(0, fret - 2);
  if (sf + WIN > 22) sf = Math.max(0, 22 - WIN);
  const FL = 42, FR = 340, TOP = 18, FH = 28;
  const FW = (FR - FL) / WIN, W = FR + 16, H = TOP + 6 * FH + 14;
  const isOpen = sf === 0;
  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
  s += `<rect x="${FL-4}" y="${TOP}" width="${FR-FL+8}" height="${6*FH}" rx="3" fill="#1a1a2e"/>`;
  for (let i = 0; i <= WIN; i++) {
    const x = FL + i * FW;
    s += i === 0 && isOpen
      ? `<rect x="${x-2}" y="${TOP}" width="4" height="${6*FH}" rx="2" fill="#ddd"/>`
      : `<line x1="${x}" y1="${TOP}" x2="${x}" y2="${TOP+6*FH}" stroke="#333" stroke-width="1.2"/>`;
  }
  for (let i = 0; i < 6; i++) {
    const ri = 5 - i, y = TOP + i * FH + FH / 2;
    s += `<line x1="${FL}" y1="${y}" x2="${FR}" y2="${y}" stroke="#444" stroke-width="${2.2-ri*.25}"/>`;
    s += `<text x="${FL-16}" y="${y}" text-anchor="middle" dominant-baseline="central" fill="#444" font-size="12" font-family="JetBrains Mono">${QZ_STR_NAMES[ri]}</text>`;
  }
  for (let i = 0; i < WIN; i++) {
    const x = FL + i * FW + FW / 2;
    s += `<text x="${x}" y="${TOP+6*FH+11}" text-anchor="middle" fill="#444" font-size="10" font-family="JetBrains Mono">${sf+i+1}</text>`;
  }
  const inlays = [3,5,7,9,15,17,19,21];
  for (let i = 0; i < WIN; i++) {
    const fn = sf + i + 1, x = FL + i * FW + FW / 2;
    if (inlays.includes(fn)) s += `<circle cx="${x}" cy="${TOP-5}" r="2" fill="#333"/>`;
    if (fn === 12) {
      s += `<circle cx="${x-4}" cy="${TOP-5}" r="2" fill="#333"/>`;
      s += `<circle cx="${x+4}" cy="${TOP-5}" r="2" fill="#333"/>`;
    }
  }
  const tfr = fret - sf;
  if (tfr >= 0 && tfr <= WIN) {
    const cy = TOP + (5 - str) * FH + FH / 2;
    const cx = fret === 0 ? FL + 2 : FL + (tfr - 1) * FW + FW / 2;
    s += `<circle cx="${cx}" cy="${cy}" r="12" fill="#C084FC" opacity=".15"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="9" fill="#C084FC"/>`;
    s += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="13" font-weight="bold" font-family="JetBrains Mono">?</text>`;
  }
  s += `</svg>`;
  return s;
}
