// ═══════════════════════════════════════════════════
// Chord Speller — "What notes in Dm7?" / "What chord is C Eb G Bb?"
// Requires: shared.js, quiz-core.js
// ═══════════════════════════════════════════════════

const CS_DIFF = {
  beginner:    {label:'Beginner',    types:['maj','min'],                                           timer:0,  tip:'Major & Minor triads'},
  intermediate:{label:'Intermediate',types:['maj','min','7','maj7','m7'],                           timer:15, tip:'Triads + 7ths \u00b7 15s'},
  advanced:    {label:'Advanced',    types:['maj','min','7','maj7','m7','dim','aug','sus2','sus4'],  timer:8,  tip:'All chord types \u00b7 8s'}
};

QZ.diffCfg = () => CS_DIFF;

function csShuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function csSpell(root, ct) {
  const ri = NOTES.indexOf(root);
  return ct.iv.map(i => NOTES[(ri + i) % 12]).join(' ');
}

function csChordName(root, ct) {
  return root + (ct.sym || 'maj');
}

function csGenQ() {
  const d = CS_DIFF[qst.diff];
  const allowedTypes = CHORD_TYPES.filter(ct => d.types.includes(ct.id));
  const mode = Math.random() < 0.5 ? 'spell' : 'name';

  const rootIdx = Math.floor(Math.random() * 12);
  const root = NOTES[rootIdx];
  const ct = allowedTypes[Math.floor(Math.random() * allowedTypes.length)];
  const notes = csSpell(root, ct);
  const chordName = csChordName(root, ct);

  if (mode === 'spell') {
    const correct = notes;
    let pool = allowedTypes.filter(c => c.id !== ct.id);
    if (pool.length < 3) pool = CHORD_TYPES.filter(c => c.id !== ct.id);
    csShuffle(pool);
    const distractors = pool.slice(0, 3).map(c => csSpell(root, c));
    const unique = [correct];
    for (const d of distractors) { if (!unique.includes(d)) unique.push(d); }
    while (unique.length < 4) {
      const rr = NOTES[(rootIdx + Math.floor(Math.random() * 11) + 1) % 12];
      const rc = allowedTypes[Math.floor(Math.random() * allowedTypes.length)];
      const s = csSpell(rr, rc);
      if (!unique.includes(s)) unique.push(s);
    }
    const choices = csShuffle(unique.slice(0, 4));
    return {
      prompt: `<div class="qz-prompt-sub">Spell the chord</div>${chordName}`,
      choices,
      correctIdx: choices.indexOf(correct)
    };
  } else {
    const correct = chordName;
    let pool = allowedTypes.filter(c => c.id !== ct.id);
    if (pool.length < 3) pool = CHORD_TYPES.filter(c => c.id !== ct.id);
    csShuffle(pool);
    const distractors = pool.slice(0, 3).map(c => csChordName(root, c));
    const unique = [correct];
    for (const d of distractors) { if (!unique.includes(d)) unique.push(d); }
    while (unique.length < 4) {
      const rr = NOTES[(rootIdx + Math.floor(Math.random() * 11) + 1) % 12];
      const rc = allowedTypes[Math.floor(Math.random() * allowedTypes.length)];
      const n = csChordName(rr, rc);
      if (!unique.includes(n)) unique.push(n);
    }
    const choices = csShuffle(unique.slice(0, 4));
    return {
      prompt: `<div class="qz-prompt-sub">Name the chord</div>${notes}`,
      choices,
      correctIdx: choices.indexOf(correct)
    };
  }
}

QZ.next = csGenQ;
QZ.reset = () => {};

qzInit();
