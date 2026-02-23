// ═══════════════════════════════════════════════════
// Quiz Core — Shared infrastructure for tap-based theory exercises
// Requires: shared.js (NOTES, TUNINGS, INTERVALS, CHORD_TYPES)
// ═══════════════════════════════════════════════════

const QZ_NATURAL = ['C','D','E','F','G','A','B'];
const QZ_TUNING = TUNINGS.std.tuning;
const QZ_STR_NAMES = TUNINGS.std.stringNames;

const qst = {
  phase:'idle', diff:'beginner',
  score:0, streak:0, best:0, correct:0, attempts:0,
  timerLeft:0, timerRef:null,
  correctIdx:-1, answered:false
};

// Exercise callbacks — set by exercise JS before calling qzInit()
const QZ = { diffCfg:null, next:null, reset:null, elIds:[] };

const $ = id => document.getElementById(id);
const qels = {};

function qzNoteAt(s, f) { return NOTES[(QZ_TUNING[s] + f) % 12]; }

function qzFretForNote(s, n, max) {
  const ni = NOTES.indexOf(n), r = [];
  for (let f = 0; f <= max; f++) if ((QZ_TUNING[s] + f) % 12 === ni) r.push(f);
  return r;
}

function qzInitEls() {
  ['qzScore','qzStreak','qzAcc','qzBest','qzDiff',
   'qzTimer','qzPrompt','qzChoices','qzMsg','qzExtra',
   'qzStart','qzSkip','qzStop','qzReset'
  ].concat(QZ.elIds).forEach(id => { const e = $(id); if (e) qels[id] = e; });
}

// ═══ Difficulty ═══
function qzRenderDiff() {
  const cfg = QZ.diffCfg();
  if (!cfg[qst.diff]) qst.diff = 'beginner';
  qels.qzDiff.innerHTML = Object.keys(cfg).map(k =>
    `<div class="pill${qst.diff===k?' on':''}" title="${cfg[k].tip}" onclick="qzSetDiff('${k}')">${cfg[k].label}</div>`
  ).join('');
}
function qzSetDiff(d) { if (qst.phase !== 'idle') return; qst.diff = d; qzRenderDiff(); }

// ═══ Stats ═══
function qzUpdateStats() {
  qels.qzScore.textContent = qst.score;
  qels.qzStreak.textContent = qst.streak;
  qels.qzBest.textContent = qst.best;
  qels.qzAcc.textContent = qst.attempts > 0 ? Math.round(qst.correct / qst.attempts * 100) + '%' : '\u2014';
}

function qzShowPhase() {
  const r = qst.phase !== 'idle';
  qels.qzStart.style.display = r ? 'none' : '';
  qels.qzSkip.style.display = r ? '' : 'none';
  qels.qzStop.style.display = r ? '' : 'none';
  qels.qzReset.style.display = qst.score > 0 || qst.attempts > 0 ? '' : 'none';
}

// ═══ Timer ═══
function qzStartTimer() {
  qzClearTimer();
  const d = QZ.diffCfg()[qst.diff];
  if (!d.timer) { qels.qzTimer.textContent = ''; return; }
  qst.timerLeft = d.timer;
  qels.qzTimer.textContent = qst.timerLeft;
  qst.timerRef = setInterval(() => {
    qst.timerLeft--;
    qels.qzTimer.textContent = qst.timerLeft > 0 ? qst.timerLeft : '';
    if (qst.timerLeft <= 0) { qzClearTimer(); qzOnTimeout(); }
  }, 1000);
}

function qzClearTimer() {
  if (qst.timerRef) { clearInterval(qst.timerRef); qst.timerRef = null; }
  qels.qzTimer.textContent = '';
}

// ═══ Choices ═══
function qzRenderChoices(choices) {
  qst.answered = false;
  qels.qzChoices.innerHTML = choices.map((c, i) =>
    `<button class="qz-choice" data-idx="${i}">${c}</button>`
  ).join('');
  qels.qzChoices.querySelectorAll('.qz-choice').forEach(btn => {
    btn.addEventListener('click', () => qzOnTap(parseInt(btn.dataset.idx)));
  });
}

function qzOnTap(idx) {
  if (qst.answered || qst.phase !== 'active') return;
  qst.answered = true;
  qzClearTimer();
  const btns = qels.qzChoices.querySelectorAll('.qz-choice');
  if (idx === qst.correctIdx) {
    btns[idx].classList.add('qz-correct');
    qst.correct++; qst.attempts++; qst.streak++;
    if (qst.streak > qst.best) qst.best = qst.streak;
    let pts = 10 + qst.streak * 2;
    if (qst.streak === 5) pts += 20;
    if (qst.streak === 10) pts += 50;
    qst.score += pts;
    qzUpdateStats();
    qels.qzMsg.textContent = `+${pts} points!`;
    qels.qzMsg.className = 'nt-msg';
    setTimeout(() => { if (qst.phase === 'active') qzNextQ(); }, 800);
  } else {
    btns[idx].classList.add('qz-wrong');
    btns[qst.correctIdx].classList.add('qz-correct');
    qst.streak = 0; qst.attempts++;
    const pen = Math.min(qst.score, 5);
    qst.score -= pen;
    qzUpdateStats();
    qels.qzMsg.textContent = pen > 0 ? '\u2212' + pen + ' points' : 'Wrong!';
    qels.qzMsg.className = 'nt-msg nt-err';
    setTimeout(() => { if (qst.phase === 'active') qzNextQ(); }, 1200);
  }
}

function qzOnTimeout() {
  if (qst.answered || qst.phase !== 'active') return;
  qst.answered = true;
  const btns = qels.qzChoices.querySelectorAll('.qz-choice');
  btns[qst.correctIdx].classList.add('qz-correct');
  qst.streak = 0; qst.attempts++;
  const pen = Math.min(qst.score, 5);
  qst.score -= pen;
  qzUpdateStats();
  qels.qzMsg.textContent = `Time\u2019s up!` + (pen > 0 ? ` \u2212${pen}` : '');
  qels.qzMsg.className = 'nt-msg nt-err';
  setTimeout(() => { if (qst.phase === 'active') qzNextQ(); }, 1500);
}

function qzOnSkip() {
  if (qst.answered || qst.phase !== 'active') return;
  qst.answered = true;
  qzClearTimer();
  const btns = qels.qzChoices.querySelectorAll('.qz-choice');
  btns[qst.correctIdx].classList.add('qz-correct');
  qst.streak = 0; qst.attempts++;
  const pen = Math.min(qst.score, 5);
  qst.score -= pen;
  qzUpdateStats();
  qels.qzMsg.textContent = 'Skipped.' + (pen > 0 ? ` \u2212${pen}` : '');
  qels.qzMsg.className = 'nt-msg nt-err';
  setTimeout(() => { if (qst.phase === 'active') qzNextQ(); }, 1200);
}

// ═══ Flow ═══
function qzNextQ() {
  qst.phase = 'active';
  const q = QZ.next();
  qst.correctIdx = q.correctIdx;
  qels.qzPrompt.innerHTML = q.prompt;
  if (qels.qzExtra) qels.qzExtra.innerHTML = q.extra || '';
  qzRenderChoices(q.choices);
  qels.qzMsg.textContent = '';
  qels.qzMsg.className = 'nt-msg';
  qzStartTimer();
}

function qzStart() {
  qst.phase = 'active';
  qzShowPhase();
  qzNextQ();
}

function qzStop() {
  qst.phase = 'idle';
  qzClearTimer();
  qzShowPhase();
  qels.qzChoices.innerHTML = '';
  qels.qzPrompt.innerHTML = '';
  if (qels.qzExtra) qels.qzExtra.innerHTML = '';
  qels.qzMsg.textContent = 'Stopped. Press Start to resume.';
  qels.qzMsg.className = 'nt-msg';
}

function qzReset() {
  qzStop();
  qst.score = 0; qst.streak = 0; qst.best = 0; qst.correct = 0; qst.attempts = 0;
  qzUpdateStats();
  if (QZ.reset) QZ.reset();
  qels.qzMsg.textContent = 'Press Start to begin';
  qels.qzMsg.className = 'nt-msg';
  qzShowPhase();
}

function qzInit() {
  qzInitEls();
  qzRenderDiff();
  qzUpdateStats();
  qzShowPhase();
  if (QZ.reset) QZ.reset();
  qels.qzStart.addEventListener('click', qzStart);
  qels.qzSkip.addEventListener('click', qzOnSkip);
  qels.qzStop.addEventListener('click', qzStop);
  qels.qzReset.addEventListener('click', qzReset);
}

window.qzSetDiff = qzSetDiff;
