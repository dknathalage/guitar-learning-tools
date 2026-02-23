// ═══════════════════════════════════════════════════
// Interval Namer — "What interval is C to F#?" / "What's a P5 above D?"
// Requires: shared.js, quiz-core.js
// ═══════════════════════════════════════════════════

const IN_DIFF = {
  beginner:    {label:'Beginner',    naturalsOnly:true,  timer:0,  intervals:[3,4,5,7,12], tip:'5 common intervals \u00b7 Naturals'},
  intermediate:{label:'Intermediate',naturalsOnly:false, timer:12, intervals:'all', tip:'All 12 intervals \u00b7 12s'},
  advanced:    {label:'Advanced',    naturalsOnly:false, timer:6,  intervals:'all', tip:'All intervals \u00b7 6s'}
};

QZ.diffCfg = () => IN_DIFF;

function inShuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function inGenQ() {
  const d = IN_DIFF[qst.diff];
  const allowed = d.intervals === 'all'
    ? INTERVALS : INTERVALS.filter(iv => d.intervals.includes(iv.semi));
  const mode = Math.random() < 0.5 ? 'name' : 'find';

  let rootIdx;
  do { rootIdx = Math.floor(Math.random() * 12); }
  while (d.naturalsOnly && !QZ_NATURAL.includes(NOTES[rootIdx]));
  const root = NOTES[rootIdx];

  const intv = allowed[Math.floor(Math.random() * allowed.length)];
  const targetIdx = (rootIdx + intv.semi) % 12;
  const target = NOTES[targetIdx];

  if (d.naturalsOnly && !QZ_NATURAL.includes(target)) return inGenQ();

  if (mode === 'name') {
    const correct = intv.name;
    let pool = allowed.filter(iv => iv.semi !== intv.semi);
    pool.sort((a, b) => Math.abs(a.semi - intv.semi) - Math.abs(b.semi - intv.semi));
    if (pool.length < 3) pool = INTERVALS.filter(iv => iv.semi !== intv.semi);
    const choices = inShuffle([correct, ...pool.slice(0, 3).map(iv => iv.name)]);
    return {
      prompt: `<div class="qz-prompt-sub">Name the interval</div>${root} \u2192 ${target}`,
      choices,
      correctIdx: choices.indexOf(correct)
    };
  } else {
    const correct = target;
    let pool = NOTES.filter(n => n !== target);
    if (d.naturalsOnly) pool = pool.filter(n => QZ_NATURAL.includes(n));
    pool.sort((a, b) => {
      const da = Math.min(Math.abs(NOTES.indexOf(a) - targetIdx), 12 - Math.abs(NOTES.indexOf(a) - targetIdx));
      const db = Math.min(Math.abs(NOTES.indexOf(b) - targetIdx), 12 - Math.abs(NOTES.indexOf(b) - targetIdx));
      return da - db;
    });
    const choices = inShuffle([correct, ...pool.slice(0, 3)]);
    return {
      prompt: `<div class="qz-prompt-sub">Find the note</div>${intv.abbr} above ${root}`,
      choices,
      correctIdx: choices.indexOf(correct)
    };
  }
}

QZ.next = inGenQ;
QZ.reset = () => {};

qzInit();
