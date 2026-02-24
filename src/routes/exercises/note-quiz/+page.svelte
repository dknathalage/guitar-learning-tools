<script>
  import { onDestroy } from 'svelte';
  import { base } from '$app/paths';
  import { saveExercise } from '$lib/progress.js';
  import { NOTES } from '$lib/constants/music.js';
  import { NT_NATURAL, NT_STR_NAMES, renderFB } from '$lib/music/fretboard.js';
  import { LearningEngine } from '$lib/learning/engine.js';
  import { noteFindConfig } from '$lib/learning/configs/noteFind.js';
  import LearningDashboard from '$lib/components/LearningDashboard.svelte';

  let qStartTime = 0;

  // --- Reactive state ---
  let phase = $state('idle'); // 'idle' | 'active' | 'feedback'
  let score = $state(0);
  let streak = $state(0);
  let best = $state(0);
  let correct = $state(0);
  let attempts = $state(0);
  let timerLeft = $state(0);
  let timerRef = $state(null);

  let target = $state(null);
  let fbHtml = $state('');
  let fbSuccess = $state(false);
  let fbFlash = $state(false);

  let choices = $state([]);
  let selected = $state(null);
  let selectedCorrect = $state(false);

  let msgText = $state('Press Start to begin');
  let msgErr = $state(false);

  let engine = new LearningEngine(noteFindConfig, 'note-quiz');

  // --- Derived ---
  let accuracy = $derived(attempts > 0 ? Math.round(correct / attempts * 100) + '%' : '\u2014');
  let showStart = $derived(phase === 'idle');
  let showActive = $derived(phase !== 'idle');
  let showReset = $derived(score > 0 || attempts > 0);

  // --- Timer ---
  function startTimer() {
    clearTimer();
    const d = engine.getParams();
    if (!d.timer) { timerLeft = 0; return; }
    timerLeft = d.timer;
    timerRef = setInterval(() => {
      timerLeft--;
      if (timerLeft <= 0) { clearTimer(); onTimeout(); }
    }, 1000);
  }

  function clearTimer() {
    if (timerRef) { clearInterval(timerRef); timerRef = null; }
    timerLeft = 0;
  }

  // --- Choice generation ---
  function makeChoices(correctNote) {
    const params = engine.getParams();
    const pool = params.naturalsOnly ? NT_NATURAL : NOTES;
    const wrong = [];
    const used = new Set([correctNote]);
    while (wrong.length < 3) {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      if (!used.has(pick)) { used.add(pick); wrong.push(pick); }
    }
    const all = [correctNote, ...wrong];
    // Fisher-Yates shuffle
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all;
  }

  // --- Scoring ---
  function scoreCorrect() {
    correct++; attempts++; streak++;
    if (streak > best) best = streak;
    let pts = 10 + streak * 2;
    if (streak === 5) pts += 20;
    if (streak === 10) pts += 50;
    score += pts;
    clearTimer();
    return pts;
  }

  // --- Click handler ---
  function onChoice(note) {
    if (phase !== 'active') return;
    phase = 'feedback';
    selected = note;
    const ok = note === target.note;
    selectedCorrect = ok;
    const elapsed = performance.now() - qStartTime;

    if (ok) {
      const pts = scoreCorrect();
      engine.report(target, true, elapsed);
      fbHtml = renderFB(target, null, true);
      fbSuccess = true;
      fbFlash = true;
      msgText = `+${pts} points!`;
      msgErr = false;
      setTimeout(() => {
        fbSuccess = false;
        fbFlash = false;
        if (phase === 'feedback') nextChallenge();
      }, 600);
    } else {
      streak = 0; attempts++;
      const pen = Math.min(score, 5);
      score -= pen;
      engine.report(target, false, elapsed, { detected: note });
      msgText = `${target.note} was correct` + (pen > 0 ? ` · \u2212${pen}` : '');
      msgErr = true;
      setTimeout(() => {
        if (phase === 'feedback') nextChallenge();
      }, 1200);
    }
  }

  // --- Flow ---
  function nextChallenge() {
    phase = 'active';
    selected = null;
    selectedCorrect = false;
    fbSuccess = false;
    fbFlash = false;
    target = engine.next();
    qStartTime = performance.now();
    fbHtml = renderFB(target, null, false);
    choices = makeChoices(target.note);
    msgText = 'Pick the note';
    msgErr = false;
    startTimer();
  }

  function onStart() {
    phase = 'active';
    nextChallenge();
  }

  function onTimeout() {
    phase = 'feedback';
    streak = 0; attempts++;
    score = Math.max(0, score - 5);
    engine.report(target, false);
    selected = null;
    msgText = `Time\u2019s up! Was ${target.note}`;
    msgErr = true;
    setTimeout(() => { if (phase === 'feedback') nextChallenge(); }, 1200);
  }

  function onStop() {
    engine.save();
    if (score > 0) saveExercise('note-quiz', { bestScore: score, bestAccuracy: attempts > 0 ? Math.round(correct / attempts * 100) : 0 });
    phase = 'idle'; clearTimer();
    msgText = 'Stopped. Press Start to resume.';
    msgErr = false;
  }

  function onReset() {
    onStop();
    score = 0; streak = 0; best = 0; correct = 0; attempts = 0;
    engine.reset();
    engine = new LearningEngine(noteFindConfig, 'note-quiz');
    target = null;
    fbHtml = '';
    choices = [];
    selected = null;
    msgText = 'Press Start to begin';
    msgErr = false;
  }

  onDestroy(() => { engine.save(); clearTimer(); });
</script>

<svelte:head>
  <title>Note Quiz — Guitar Fretboard Note Quiz</title>
  <meta name="description" content="Test your fretboard knowledge by identifying notes from highlighted positions. No guitar needed!">
</svelte:head>

<div class="ex-layout">
<div class="nt-wrap">
  <header class="nt-hdr">
    <h1>Note Quiz</h1>
    <nav class="nt-nav">
      <a href="{base}/" class="pill" style="font-size:13px">Home</a>
      <a href="{base}/exercises/note-find" class="pill" style="font-size:13px">Note Find</a>
      <a href="{base}/exercises/string-traversal" class="pill" style="font-size:13px">Traversal</a>
    </nav>
  </header>

  <div class="nt-stats">
    <div class="nt-stat"><div class="nt-stat-val">{score}</div><div class="nt-stat-lbl">Score</div></div>
    <div class="nt-stat"><div class="nt-stat-val">{streak}</div><div class="nt-stat-lbl">Streak</div></div>
    <div class="nt-stat"><div class="nt-stat-val">{accuracy}</div><div class="nt-stat-lbl">Accuracy</div></div>
    <div class="nt-stat"><div class="nt-stat-val">{best}</div><div class="nt-stat-lbl">Best</div></div>
  </div>

  <div class="nt-main">
    <div class="nt-timer">{timerLeft > 0 ? timerLeft : ''}</div>

    <div class="nt-challenge">
      <div class="nt-challenge-lbl">{target ? `What note is at String ${NT_STR_NAMES[target.str]}, Fret ${target.fret}?` : 'Identify the note'}</div>
    </div>

    <div class="nt-fb-wrap" class:nt-success={fbSuccess} class:nt-flash={fbFlash}>
      <div>{@html fbHtml}</div>
    </div>

    {#if phase === 'active' || phase === 'feedback'}
      <div class="nq-choices">
        {#each choices as note}
          <button
            class="nq-choice"
            class:nq-correct={phase === 'feedback' && note === target.note}
            class:nq-wrong={phase === 'feedback' && note === selected && !selectedCorrect}
            disabled={phase === 'feedback'}
            onclick={() => onChoice(note)}
          >{note}</button>
        {/each}
      </div>
    {/if}

    <div class="nt-msg" class:nt-err={msgErr}>{msgText}</div>
  </div>

  <div class="nt-controls">
    {#if showStart}
      <button class="nt-btn nt-primary" onclick={onStart}>Start</button>
    {/if}
    {#if showActive}
      <button class="nt-btn nt-danger" onclick={onStop}>Stop</button>
    {/if}
    {#if showReset}
      <button class="nt-btn" onclick={onReset}>Reset</button>
    {/if}
  </div>
</div>
<LearningDashboard {engine} />
</div>

<style>
  .nt-wrap{display:flex;flex-direction:column;min-height:100vh;flex:1;min-width:0;padding:.5rem 1rem;gap:.5rem;background:var(--bg);color:var(--tx);font-family:'Outfit',sans-serif}
  .nt-hdr{display:flex;justify-content:space-between;align-items:center;flex-shrink:0;flex-wrap:wrap;gap:.5rem}
  .nt-hdr h1{font-size:18px;font-weight:900;letter-spacing:-1px}
  .nt-nav{display:flex;gap:.4rem}
  .nt-nav a{text-decoration:none}
  .nt-stats{display:flex;gap:1rem;background:var(--sf);border:1px solid var(--bd);border-radius:10px;padding:.4rem .8rem;flex-wrap:wrap;justify-content:center;flex-shrink:0}
  .nt-stat{text-align:center;font-family:'JetBrains Mono',monospace}
  .nt-stat-val{font-size:20px;font-weight:700;color:var(--ac)}
  .nt-stat-lbl{font-size:11px;color:var(--mt);text-transform:uppercase;letter-spacing:.5px}
  .nt-main{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.8rem;min-height:0}
  .nt-challenge{text-align:center}
  .nt-challenge-lbl{font-size:14px;color:var(--mt);text-transform:uppercase;letter-spacing:1px;margin-bottom:.2rem}
  .nt-fb-wrap{background:var(--sf);border:2px solid var(--bd);border-radius:10px;padding:.5rem;width:100%;max-width:700px;transition:border-color .3s,box-shadow .3s}
  .nt-fb-wrap.nt-success{border-color:#4ECB71;box-shadow:0 0 20px rgba(78,203,113,.25)}
  .nt-timer{font-family:'JetBrains Mono',monospace;font-size:24px;font-weight:700;color:#FF6B6B;text-align:center;min-height:30px}
  .nt-msg{text-align:center;font-size:14px;color:var(--mt);min-height:20px}
  .nt-msg.nt-err{color:#FF6B6B}
  .nt-controls{display:flex;gap:.4rem;flex-wrap:wrap;justify-content:center;flex-shrink:0;padding-bottom:.5rem}
  .nt-btn{padding:.4rem .9rem;border-radius:20px;border:1.5px solid var(--bd);background:var(--sf);color:var(--mt);font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:600;cursor:pointer;transition:all .15s}
  .nt-btn:hover{border-color:#555;color:var(--tx)}
  .nt-btn.nt-primary{border-color:var(--ac);color:var(--ac);background:rgba(88,166,255,.1)}
  .nt-btn.nt-danger{border-color:#FF6B6B;color:#FF6B6B;background:rgba(255,107,107,.08)}
  @keyframes nt-glow{0%{box-shadow:0 0 20px rgba(78,203,113,.4)}100%{box-shadow:none}}
  .nt-flash{animation:nt-glow .8s ease-out}

  /* Note quiz choice buttons */
  .nq-choices{display:grid;grid-template-columns:repeat(2,1fr);gap:.5rem;width:100%;max-width:320px}
  .nq-choice{padding:.6rem 1rem;border-radius:20px;border:1.5px solid var(--bd);background:var(--sf);color:var(--tx);font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:700;cursor:pointer;transition:all .15s;text-align:center}
  .nq-choice:hover:not(:disabled){border-color:var(--ac);color:var(--ac);background:rgba(88,166,255,.08)}
  .nq-choice:disabled{cursor:default}
  .nq-choice.nq-correct{border-color:#4ECB71;color:#fff;background:#4ECB71}
  .nq-choice.nq-wrong{border-color:#FF6B6B;color:#fff;background:#FF6B6B}

  @media(max-width:600px){
    .nt-wrap{padding:.5rem;gap:.4rem}
    .nt-hdr h1{font-size:15px}
    .nt-stat-val{font-size:16px}
    .nt-btn{font-size:12px;padding:.3rem .6rem}
    .nq-choice{font-size:15px;padding:.5rem .7rem}
    .nq-choices{max-width:280px;gap:.4rem}
  }
</style>
