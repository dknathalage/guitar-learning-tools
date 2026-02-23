// ═══════════════════════════════════════════════════
// Fretboard Quiz — "What note at fret X, string Y?" / "Where is note G on string D?"
// Requires: shared.js, quiz-core.js
// ═══════════════════════════════════════════════════

const FB_DIFF = {
  beginner:    {label:'Beginner',    maxFret:5,  naturalsOnly:true,  timer:0,  tip:'Frets 0\u20135 \u00b7 Naturals only'},
  intermediate:{label:'Intermediate',maxFret:12, naturalsOnly:false, timer:15, tip:'Frets 0\u201312 \u00b7 All notes \u00b7 15s'},
  advanced:    {label:'Advanced',    maxFret:19, naturalsOnly:false, timer:8,  tip:'Full neck \u00b7 All notes \u00b7 8s'}
};

QZ.diffCfg = () => FB_DIFF;

function fbMiniBoard(str, fret) {
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

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

let lastStr = -1, lastFret = -1;

function fbGenQ() {
  const d = FB_DIFF[qst.diff];
  const mode = Math.random() < 0.5 ? 'note' : 'fret';

  let str, fret, note;
  do {
    str = Math.floor(Math.random() * 6);
    fret = Math.floor(Math.random() * (d.maxFret + 1));
    note = qzNoteAt(str, fret);
  } while (
    (d.naturalsOnly && !QZ_NATURAL.includes(note)) ||
    (str === lastStr && fret === lastFret)
  );
  lastStr = str; lastFret = fret;

  if (mode === 'note') {
    const strName = QZ_STR_NAMES[str];
    const correct = note;
    const ci = NOTES.indexOf(correct);
    let pool = NOTES.filter(n => n !== correct);
    if (d.naturalsOnly) pool = pool.filter(n => QZ_NATURAL.includes(n));
    pool.sort((a, b) => {
      const da = Math.min(Math.abs(NOTES.indexOf(a) - ci), 12 - Math.abs(NOTES.indexOf(a) - ci));
      const db = Math.min(Math.abs(NOTES.indexOf(b) - ci), 12 - Math.abs(NOTES.indexOf(b) - ci));
      return da - db;
    });
    const choices = shuffle([correct, ...pool.slice(0, 3)]);
    return {
      prompt: `<div class="qz-prompt-sub">What note?</div>String ${strName}, Fret ${fret}`,
      choices,
      correctIdx: choices.indexOf(correct),
      extra: fbMiniBoard(str, fret)
    };
  } else {
    const strName = QZ_STR_NAMES[str];
    const correct = `Fret ${fret}`;
    const frets = qzFretForNote(str, note, d.maxFret);
    let pool = [];
    for (let f = Math.max(0, fret - 4); f <= Math.min(d.maxFret, fret + 4); f++) {
      if (!frets.includes(f)) pool.push(f);
    }
    while (pool.length < 3) {
      const rf = Math.floor(Math.random() * (d.maxFret + 1));
      if (!frets.includes(rf) && !pool.includes(rf)) pool.push(rf);
    }
    pool.sort((a, b) => Math.abs(a - fret) - Math.abs(b - fret));
    const choices = shuffle([correct, ...pool.slice(0, 3).map(f => `Fret ${f}`)]);
    return {
      prompt: `<div class="qz-prompt-sub">Where is this note?</div>${note} on string ${strName}`,
      choices,
      correctIdx: choices.indexOf(correct),
      extra: ''
    };
  }
}

QZ.next = fbGenQ;
QZ.reset = () => { lastStr = -1; lastFret = -1; };

qzInit();
