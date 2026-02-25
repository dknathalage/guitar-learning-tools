import { NOTES, NOTE_DISPLAY, INTERVAL_NAMES, CHORD_TYPES } from '$lib/constants/music.js';

export const STANDARD_SHAPES = [
  {id:'e',label:'E Shape',rootStr:[0,5],muted:[],
    voices:[{str:0,fretOffset:0},{str:1,fretOffset:2},{str:2,fretOffset:2},{str:3,fretOffset:1},{str:4,fretOffset:0},{str:5,fretOffset:0}]},
  {id:'a',label:'A Shape',rootStr:[1],muted:[0],
    voices:[{str:1,fretOffset:0},{str:2,fretOffset:2},{str:3,fretOffset:2},{str:4,fretOffset:2},{str:5,fretOffset:0}]},
  {id:'d',label:'D Shape',rootStr:[2],muted:[0,1],
    voices:[{str:2,fretOffset:0},{str:3,fretOffset:2},{str:4,fretOffset:3},{str:5,fretOffset:2}]},
  {id:'c',label:'C Shape',rootStr:[1],muted:[0],barreOffset:-3,
    voices:[{str:1,fretOffset:3},{str:2,fretOffset:2},{str:3,fretOffset:0},{str:4,fretOffset:1},{str:5,fretOffset:0}]},
  {id:'g',label:'G Shape',rootStr:[0,5],muted:[],barreOffset:-3,
    voices:[{str:0,fretOffset:3},{str:1,fretOffset:2},{str:2,fretOffset:0},{str:3,fretOffset:0},{str:4,fretOffset:0},{str:5,fretOffset:3}]}
];

export const SHAPE_COLORS = {e:'#4DA6FF',a:'#FFB347',d:'#B980F0',c:'#FF6B6B',g:'#4ECB71'};

export const CHORD_CONFIG = {
  notes: NOTES,
  noteDisplay: NOTE_DISPLAY,
  tuning: [4,9,2,7,11,4],
  stringNames: ['E','A','D','G','B','e'],
  intervalNames: INTERVAL_NAMES,
  shapeColors: {...SHAPE_COLORS},
  chordTypes: CHORD_TYPES,
  shapes: STANDARD_SHAPES.map(s => ({...s, voices: s.voices.map(v => ({...v}))})),
  tunings: {
    std: {
      id:'std', name:'Standard', label:'EADGBE',
      tuning:[4,9,2,7,11,4], stringNames:['E','A','D','G','B','e'],
      shapes: STANDARD_SHAPES, shapeColors: SHAPE_COLORS
    },
    halfDown: {
      id:'halfDown', name:'Half Step Down', label:'E\u266dA\u266dD\u266dG\u266dB\u266de\u266d',
      tuning:[3,8,1,6,10,3], stringNames:['E\u266d','A\u266d','D\u266d','G\u266d','B\u266d','e\u266d'],
      shapes: STANDARD_SHAPES, shapeColors: SHAPE_COLORS
    },
    dropD: {
      id:'dropD', name:'Drop D', label:'DADGBE',
      tuning:[2,9,2,7,11,4], stringNames:['D','A','D','G','B','e'],
      shapeColors: {e:'#4DA6FF',a:'#FFB347',d:'#B980F0',c:'#FF6B6B',g:'#4ECB71',p:'#E0E0E0'},
      shapes: [
        {id:'e',label:'E Shape',rootStr:[0,5],muted:[],
          voices:[{str:0,fretOffset:2},{str:1,fretOffset:2},{str:2,fretOffset:2},{str:3,fretOffset:1},{str:4,fretOffset:0},{str:5,fretOffset:0}]},
        {id:'a',label:'A Shape',rootStr:[1],muted:[0],
          voices:[{str:1,fretOffset:0},{str:2,fretOffset:2},{str:3,fretOffset:2},{str:4,fretOffset:2},{str:5,fretOffset:0}]},
        {id:'d',label:'D Shape',rootStr:[2],muted:[0,1],
          voices:[{str:2,fretOffset:0},{str:3,fretOffset:2},{str:4,fretOffset:3},{str:5,fretOffset:2}]},
        {id:'c',label:'C Shape',rootStr:[1],muted:[0],barreOffset:-3,
          voices:[{str:1,fretOffset:3},{str:2,fretOffset:2},{str:3,fretOffset:0},{str:4,fretOffset:1},{str:5,fretOffset:0}]},
        {id:'g',label:'G Shape',rootStr:[0,5],muted:[],barreOffset:-3,
          voices:[{str:0,fretOffset:5},{str:1,fretOffset:2},{str:2,fretOffset:0},{str:3,fretOffset:0},{str:4,fretOffset:0},{str:5,fretOffset:3}]},
        {id:'p',label:'Power',rootStr:[0],muted:[3,4,5],
          voices:[{str:0,fretOffset:0},{str:1,fretOffset:0},{str:2,fretOffset:0}]}
      ]
    },
    openG: {
      id:'openG', name:'Open G', label:'DGDGBD',
      tuning:[2,7,2,7,11,2], stringNames:['D','G','D','G','B','D'],
      shapeColors: {bar:'#4DA6FF',a:'#FFB347',d:'#B980F0',sl:'#4ECB71'},
      shapes: [
        {id:'bar',label:'Barre',rootStr:[0,2,5],muted:[],
          voices:[{str:0,fretOffset:0},{str:1,fretOffset:0},{str:2,fretOffset:0},{str:3,fretOffset:0},{str:4,fretOffset:0},{str:5,fretOffset:0}]},
        {id:'a',label:'A Form',rootStr:[1,3],muted:[0],
          voices:[{str:1,fretOffset:0},{str:2,fretOffset:2},{str:3,fretOffset:2},{str:4,fretOffset:2},{str:5,fretOffset:0}]},
        {id:'d',label:'D Form',rootStr:[2],muted:[0,1],
          voices:[{str:2,fretOffset:0},{str:3,fretOffset:2},{str:4,fretOffset:3},{str:5,fretOffset:2}]},
        {id:'sl',label:'Slide',rootStr:[0,2,5],muted:[],barreOffset:-2,
          voices:[{str:0,fretOffset:2},{str:1,fretOffset:2},{str:2,fretOffset:2},{str:3,fretOffset:0},{str:4,fretOffset:0},{str:5,fretOffset:2}]}
      ]
    },
    openD: {
      id:'openD', name:'Open D', label:'DADF#AD',
      tuning:[2,9,2,6,9,2], stringNames:['D','A','D','F#','A','D'],
      shapeColors: {bar:'#4DA6FF',a:'#FFB347',up:'#B980F0',sl:'#4ECB71'},
      shapes: [
        {id:'bar',label:'Barre',rootStr:[0,2,5],muted:[],
          voices:[{str:0,fretOffset:0},{str:1,fretOffset:0},{str:2,fretOffset:0},{str:3,fretOffset:0},{str:4,fretOffset:0},{str:5,fretOffset:0}]},
        {id:'a',label:'A Form',rootStr:[1,4],muted:[0],
          voices:[{str:1,fretOffset:0},{str:2,fretOffset:2},{str:3,fretOffset:2},{str:4,fretOffset:0},{str:5,fretOffset:0}]},
        {id:'up',label:'Upper',rootStr:[2,5],muted:[0,1],
          voices:[{str:2,fretOffset:0},{str:3,fretOffset:2},{str:4,fretOffset:3},{str:5,fretOffset:2}]},
        {id:'sl',label:'Slide',rootStr:[0,2,5],muted:[],barreOffset:-2,
          voices:[{str:0,fretOffset:2},{str:1,fretOffset:2},{str:2,fretOffset:2},{str:3,fretOffset:0},{str:4,fretOffset:0},{str:5,fretOffset:2}]}
      ]
    },
    dadgad: {
      id:'dadgad', name:'DADGAD', label:'DADGAD',
      tuning:[2,9,2,7,9,2], stringNames:['D','A','D','G','A','D'],
      shapeColors: {bar:'#4DA6FF',mod:'#FFB347',up:'#B980F0'},
      shapes: [
        {id:'bar',label:'Barre',rootStr:[0,2,5],muted:[],
          voices:[{str:0,fretOffset:0},{str:1,fretOffset:0},{str:2,fretOffset:0},{str:3,fretOffset:0},{str:4,fretOffset:0},{str:5,fretOffset:0}]},
        {id:'mod',label:'Modal',rootStr:[0,2,5],muted:[],barreOffset:-2,
          voices:[{str:0,fretOffset:2},{str:1,fretOffset:2},{str:2,fretOffset:2},{str:3,fretOffset:0},{str:4,fretOffset:0},{str:5,fretOffset:2}]},
        {id:'up',label:'Upper',rootStr:[2,5],muted:[0,1],
          voices:[{str:2,fretOffset:0},{str:3,fretOffset:2},{str:4,fretOffset:2},{str:5,fretOffset:2}]}
      ]
    }
  }
};

export function setTuning(id) {
  const t = CHORD_CONFIG.tunings[id];
  if (!t) return;
  CHORD_CONFIG.tuning = [...t.tuning];
  CHORD_CONFIG.stringNames = [...t.stringNames];
  CHORD_CONFIG.shapes = t.shapes.map(s => ({...s, voices: s.voices.map(v => ({...v}))}));
  CHORD_CONFIG.shapeColors = {...t.shapeColors};
}

export function adaptShapeToTuning(sh) {
  const rb = CHORD_CONFIG.tuning[sh.rootStr[0]], bo = sh.barreOffset || 0;
  return { ...sh, rootBase: rb, voices: sh.voices.map(v => ({ ...v, base: ((CHORD_CONFIG.tuning[v.str] + v.fretOffset + bo - rb) % 12 + 12) % 12 })) };
}

export function getBaseFret(sh, ri) {
  const f = ((ri - sh.rootBase) + 12) % 12;
  if (sh.barreOffset) { let r = f + sh.barreOffset; return r < 0 ? r + 12 : r; }
  return f;
}

export function resolve(sh, ri, iv) {
  const b = getBaseFret(sh, ri), intervalSet = new Set(iv.map(i => i % 12)), res = [], muted = [...sh.muted];
  const MAX_FO = 3;

  function calcFo(base, fretOffset, target) {
    const diff = ((target - base) + 12) % 12;
    let newFretOffset = fretOffset + (diff <= 6 ? diff : diff - 12);
    if (newFretOffset < 0) newFretOffset += 12;
    return (newFretOffset >= 0 && newFretOffset <= MAX_FO) ? newFretOffset : null;
  }

  const matched = [];
  for (const v of sh.voices) {
    let best = null, bestDistance = 99, bestNfo = null;
    for (const i of intervalSet) {
      const d = Math.min(Math.abs(i - v.base), 12 - Math.abs(i - v.base));
      if (d >= bestDistance || d > 3) continue;
      const newFretOffset = calcFo(v.base, v.fretOffset, i);
      if (newFretOffset === null) continue;
      bestDistance = d; best = i; bestNfo = newFretOffset;
    }
    if (best === null) { muted.push(v.str); continue; }
    matched.push({ v, best, bestDistance, newFretOffset: bestNfo });
  }

  const covered = new Set(matched.map(m => m.best));
  const bestFreq = new Map();
  for (const m of matched) bestFreq.set(m.best, (bestFreq.get(m.best) || 0) + 1);
  for (const mi of intervalSet) {
    if (covered.has(mi)) continue;
    let pick = null, pickDist = 99, pickNfo = null;
    for (const m of matched) {
      if (bestFreq.get(m.best) < 2) continue;
      const d = Math.min(Math.abs(mi - m.v.base), 12 - Math.abs(mi - m.v.base));
      if (d > 3 || d > pickDist) continue;
      if (d === pickDist && pick && m.v.str <= pick.v.str) continue;
      const newFretOffset = calcFo(m.v.base, m.v.fretOffset, mi);
      if (newFretOffset === null) continue;
      pickDist = d; pick = m; pickNfo = newFretOffset;
    }
    if (pick) {
      bestFreq.set(pick.best, bestFreq.get(pick.best) - 1);
      pick.best = mi; pick.bestDistance = pickDist; pick.newFretOffset = pickNfo;
      bestFreq.set(mi, (bestFreq.get(mi) || 0) + 1);
      covered.add(mi);
    }
  }

  for (const m of matched) {
    const absFret = b + m.newFretOffset;
    const note = CHORD_CONFIG.notes[(CHORD_CONFIG.tuning[m.v.str] + absFret) % 12];
    res.push({ str: m.v.str, fretOffset: m.newFretOffset, note, semi: m.best, interval: CHORD_CONFIG.intervalNames[m.best], isRoot: m.best === 0 });
  }

  return { baseFret: b, voices: res, muted: [...new Set(muted)], barreStrs: res.filter(r => r.fretOffset === 0).map(r => r.str), rootStrs: sh.rootStr };
}

export function renderDiagram(r, color) {
  const FRET_L = 42, FRET_R = 210, TOP = 28, FH = 34, NF = 4, SP = (FRET_R - FRET_L) / 5;
  const W = FRET_R + 16, H = TOP + NF * FH + 20;
  const DR = 11;
  const { baseFret: bfret, voices, muted, barreStrs, rootStrs } = r;
  const strMap = {};
  voices.forEach(v => { strMap[v.str] = v; });
  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
  s += `<rect x="${FRET_L - 4}" y="${TOP}" width="${FRET_R - FRET_L + 8}" height="${NF * FH}" rx="3" fill="#1a1a2e"/>`;
  for (let i = 0; i < 6; i++) {
    const cx = FRET_L + i * SP;
    if (muted.includes(i)) {
      s += `<text x="${cx}" y="${TOP - 12}" text-anchor="middle" dominant-baseline="central" fill="#444" font-size="14" font-weight="bold" font-family="JetBrains Mono">\u00d7</text>`;
    } else {
      const v = voices.find(v => v.str === i);
      if (v) s += `<text x="${cx}" y="${TOP - 12}" text-anchor="middle" dominant-baseline="central" fill="${color}" font-size="14" font-weight="bold" font-family="JetBrains Mono">${v.interval}</text>`;
    }
  }
  for (let i = 0; i <= NF; i++) {
    const y = TOP + i * FH;
    s += i === 0
      ? `<rect x="${FRET_L - 2}" y="${y - 2}" width="${FRET_R - FRET_L + 4}" height="4" rx="2" fill="#ddd"/>`
      : `<line x1="${FRET_L}" y1="${y}" x2="${FRET_R}" y2="${y}" stroke="#333" stroke-width="1.2"/>`;
  }
  for (let i = 0; i < 6; i++) {
    const x = FRET_L + i * SP;
    s += `<line x1="${x}" y1="${TOP}" x2="${x}" y2="${TOP + NF * FH}" stroke="#444" stroke-width="${2.2 - i * .25}"/>`;
    s += `<text x="${x}" y="${TOP + NF * FH + 12}" text-anchor="middle" dominant-baseline="central" fill="#444" font-size="16" font-family="JetBrains Mono">${CHORD_CONFIG.stringNames[i]}</text>`;
  }
  const isOpen = bfret === 0;
  for (let i = 0; i < NF; i++)
    s += `<text x="${FRET_L - 16}" y="${TOP + i * FH + FH / 2}" text-anchor="middle" dominant-baseline="central" fill="#444" font-size="16" font-family="JetBrains Mono">${(isOpen ? 1 : bfret) + i}</text>`;
  if (barreStrs.length >= 2 && !isOpen) {
    const mn = Math.min(...barreStrs), mx = Math.max(...barreStrs);
    const x1 = FRET_L + mn * SP, x2 = FRET_L + mx * SP, by = TOP + FH / 2;
    s += `<rect x="${x1 - 4}" y="${by - 5}" width="${x2 - x1 + 8}" height="10" rx="5" fill="${color}" opacity="0.75"/>`;
  }
  voices.forEach(v => {
    if (isOpen && v.fretOffset === 0) return;
    const adjFo = isOpen ? v.fretOffset - 1 : v.fretOffset;
    const x = FRET_L + v.str * SP, y = TOP + adjFo * FH + FH / 2;
    const isR = v.isRoot && rootStrs.includes(v.str);
    const fs = v.note.length > 1 ? 11 : 16;
    if (isR) {
      s += `<circle cx="${x}" cy="${y}" r="${DR + 1}" fill="${color}"/>`;
    } else {
      s += `<circle cx="${x}" cy="${y}" r="${DR}" fill="${color}"/>`;
    }
    s += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="${fs}" font-weight="bold" font-family="JetBrains Mono">${v.note}</text>`;
  });
  s += `</svg>`;
  return s;
}

let _cachedShapesRef = null;
let _cachedAdapted = null;
function getAdaptedShapes() {
  if (_cachedShapesRef !== CHORD_CONFIG.shapes) {
    _cachedShapesRef = CHORD_CONFIG.shapes;
    _cachedAdapted = CHORD_CONFIG.shapes.map(adaptShapeToTuning);
  }
  return _cachedAdapted;
}

export function renderNeck(ri, ct, curShape) {
  const NF = 15;
  const adapted = getAdaptedShapes();
  const shapes = adapted.map(sh => ({ id: sh.id, label: sh.label, color: CHORD_CONFIG.shapeColors[sh.id], bf: getBaseFret(sh, ri) })).sort((a, b) => a.bf - b.bf);
  const W = 700, H = 155, NL = 35, NR = 680, NT = 25, NH = 85, FW = (NR - NL) / (NF + 1), SY = i => NT + 10 + (5 - i) * (NH - 20) / 5;
  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
  s += `<rect x="${NL}" y="${NT}" width="${NR - NL}" height="${NH}" rx="4" fill="#1a1a2e"/>`;
  s += `<rect x="${NL}" y="${NT}" width="4" height="${NH}" rx="2" fill="#ddd"/>`;
  for (let i = 1; i <= NF; i++) s += `<line x1="${NL + i * FW}" y1="${NT}" x2="${NL + i * FW}" y2="${NT + NH}" stroke="#333" stroke-width="1.2"/>`;
  for (let i = 0; i < 6; i++) { const sy = SY(i); s += `<line x1="${NL}" y1="${sy}" x2="${NR}" y2="${sy}" stroke="#444" stroke-width="${.6 + i * .12}"/><text x="${NL - 12}" y="${sy + 3}" text-anchor="middle" fill="#444" font-size="9" font-family="JetBrains Mono">${CHORD_CONFIG.stringNames[i]}</text>`; }
  for (let i = 1; i <= NF; i++) s += `<text x="${NL + (i - .5) * FW}" y="${NT + NH + 16}" text-anchor="middle" fill="#444" font-size="9" font-family="JetBrains Mono">${i}</text>`;
  [3, 5, 7, 9, 15].forEach(f => { if (f <= NF) s += `<circle cx="${NL + (f - .5) * FW}" cy="${NT + NH + 26}" r="2" fill="#333"/>`; });
  if (NF >= 12) s += `<circle cx="${NL + 11.5 * FW - 4}" cy="${NT + NH + 26}" r="2" fill="#333"/><circle cx="${NL + 11.5 * FW + 4}" cy="${NT + NH + 26}" r="2" fill="#333"/>`;
  const filteredShapes = curShape ? shapes.filter(sh => sh.id === curShape) : shapes;
  const filteredAdapted = curShape ? adapted.filter(sh => sh.id === curShape) : adapted;
  filteredShapes.forEach(sh => {
    let x = NL + (sh.bf - 1) * FW, zw = 3.5 * FW;
    const xEnd = Math.min(x + zw, NR); x = Math.max(x, NL); zw = xEnd - x;
    s += `<rect x="${x}" y="${NT}" width="${zw}" height="${NH}" fill="${sh.color}" opacity=".18" rx="3"/>`;
    s += `<rect x="${x}" y="${NT}" width="${zw}" height="3" fill="${sh.color}" opacity=".8" rx="1"/>`;
    s += `<text x="${x + zw / 2}" y="${NT - 4}" text-anchor="middle" fill="${sh.color}" font-size="9" font-weight="bold" font-family="Outfit">${sh.label}</text>`;
    s += `<text x="${x + zw / 2}" y="${NT + NH / 2 + 3}" text-anchor="middle" fill="${sh.color}" font-size="9" font-weight="bold" font-family="JetBrains Mono" opacity=".5">${sh.bf === 0 ? 'open' : 'fr' + sh.bf}</text>`;
  });
  filteredAdapted.forEach(shDef => {
    const col = CHORD_CONFIG.shapeColors[shDef.id];
    const r = resolve(shDef, ri, ct.iv);
    const barreVoices = r.voices.filter(v => v.fretOffset === 0);
    if (barreVoices.length >= 2) {
      const barreStrs = barreVoices.map(v => v.str);
      const minStr = Math.min(...barreStrs), maxStr = Math.max(...barreStrs);
      const bx = NL + (r.baseFret - .5) * FW;
      const by1 = SY(maxStr), by2 = SY(minStr);
      if (r.baseFret >= 1 && r.baseFret <= NF) s += `<rect x="${bx - 2.5}" y="${Math.min(by1, by2) - 3.5}" width="5" height="${Math.abs(by2 - by1) + 7}" rx="2.5" fill="${col}" opacity=".6"/>`;
    }
    r.voices.forEach(v => {
      const af = r.baseFret + v.fretOffset;
      if (af < 0 || af > NF) return;
      const cx = af === 0 ? NL + 2 : NL + (af - .5) * FW, cy = SY(v.str);
      const nfs = v.note.length > 1 ? 7 : 9;
      if (v.isRoot) {
        s += `<circle cx="${cx}" cy="${cy}" r="6.5" fill="${col}"/>`;
      } else {
        s += `<circle cx="${cx}" cy="${cy}" r="6" fill="${col}"/>`;
      }
      s += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="${nfs}" font-weight="bold" font-family="JetBrains Mono">${v.note}</text>`;
    });
  });
  s += `</svg>`;
  return s;
}
