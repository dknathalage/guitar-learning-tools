<script>
  import { base } from '$app/paths';
  import { onDestroy } from 'svelte';
  import { saveExercise } from '$lib/progress.js';

  const RT_DIFF = {
    beginner:     { label: 'Beginner',     bpm: 80,  subdivision: 1, rests: false, tip: 'Quarter notes, 80 BPM' },
    intermediate: { label: 'Intermediate', bpm: 100, subdivision: 2, rests: false, tip: 'Eighth notes, 100 BPM' },
    advanced:     { label: 'Advanced',     bpm: 120, subdivision: 2, rests: true,  tip: 'Eighth notes + rests, 120 BPM' }
  };

  const LISTEN_BEATS = 4;
  const TAP_BEATS = 8;
  const GRADES = [
    { name: 'perfect', threshold: 30,  pts: 15, color: '#4ECB71' },
    { name: 'good',    threshold: 60,  pts: 10, color: '#38BDF8' },
    { name: 'ok',      threshold: 100, pts: 5,  color: '#F0A030' },
    { name: 'miss',    threshold: Infinity, pts: 0, color: '#FF6B6B' }
  ];

  // --- Audio ---
  let audioCtx = null;

  function playClick(accented = false) {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = accented ? 1200 : 800;
    gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.05);
  }

  // --- State ---
  let phase = $state('idle');
  let diff = $state('beginner');
  let score = $state(0);
  let rounds = $state(0);
  let bestScore = $state(0);
  let totalDeviation = $state(0);
  let totalTaps = $state(0);

  // Current round
  let pattern = $state([]);           // full pattern: listen + tap beats; 1=beat, 0=rest
  let beatResults = $state([]);       // 'perfect'|'good'|'ok'|'miss'|'' for tap beats
  let activeBeat = $state(-1);        // currently highlighted beat index (across all dots)
  let roundScore = $state(0);
  let roundDeviations = $state([]);
  let msgText = $state('Press Start to begin');
  let msgErr = $state(false);

  // Timing internals (not reactive)
  let beatTimes = [];                 // scheduled performance.now() timestamp per tap beat
  let beatInterval = 0;
  let schedulerRef = null;
  let beatIndex = 0;

  // --- Derived ---
  let avgDev = $derived(totalTaps > 0 ? Math.round(totalDeviation / totalTaps) + ' ms' : '\u2014');
  let maxScore = $derived(TAP_BEATS * 15);

  // --- Difficulty ---
  function setDiff(d) {
    if (phase !== 'idle') return;
    diff = d;
  }

  // --- Pattern generation ---
  function genPattern() {
    const cfg = RT_DIFF[diff];
    const beatsPerQuarter = cfg.subdivision;
    const listenCount = LISTEN_BEATS * beatsPerQuarter;
    const tapCount = TAP_BEATS * beatsPerQuarter;
    const listen = Array(listenCount).fill(1);
    let tap;
    if (cfg.rests) {
      // Generate pattern with some rests — ensure first beat is always active
      tap = [1];
      for (let i = 1; i < tapCount; i++) {
        tap.push(Math.random() < 0.3 ? 0 : 1);
      }
    } else {
      tap = Array(tapCount).fill(1);
    }
    return { listen, tap, full: [...listen, ...tap] };
  }

  // --- Beat scheduling ---
  function startRound() {
    const cfg = RT_DIFF[diff];
    beatInterval = 60000 / cfg.bpm / cfg.subdivision;
    const pat = genPattern();
    pattern = pat.full;
    const tapCount = pat.tap.length;
    beatResults = Array(tapCount).fill('');
    roundScore = 0;
    roundDeviations = [];
    activeBeat = -1;
    beatIndex = 0;
    beatTimes = [];
    phase = 'listen';
    msgText = 'Listen...';
    msgErr = false;

    const totalBeats = pat.full.length;
    const listenCount = pat.listen.length;
    const startTime = performance.now() + 300; // small delay before first beat

    // Schedule all beats
    for (let i = 0; i < totalBeats; i++) {
      const time = startTime + i * beatInterval;
      const idx = i;
      const isListen = i < listenCount;
      const isTapPhase = !isListen;
      const tapIdx = i - listenCount;

      if (isTapPhase) {
        beatTimes[tapIdx] = time;
      }

      const timerId = setTimeout(() => {
        activeBeat = idx;

        // Play click if it's an active beat (not a rest)
        if (pat.full[idx] === 1) {
          playClick(idx === 0 || (idx % (cfg.subdivision * 4) === 0));
        }

        // Transition from listen to tap phase
        if (idx === listenCount) {
          phase = 'tap';
          msgText = 'Tap!';
          msgErr = false;
        }

        // After last beat, wait a bit then show results
        if (idx === totalBeats - 1) {
          setTimeout(() => {
            finishRound(pat.tap);
          }, beatInterval + 200);
        }
      }, time - performance.now());

      // Store timer refs for cleanup
      if (!schedulerRef) schedulerRef = [];
      schedulerRef.push(timerId);
    }
  }

  function finishRound(tapPattern) {
    phase = 'result';
    activeBeat = -1;

    // Grade any un-tapped active beats as misses
    const results = [...beatResults];
    for (let i = 0; i < tapPattern.length; i++) {
      if (tapPattern[i] === 1 && results[i] === '') {
        results[i] = 'miss';
      }
      // Rests that weren't tapped are fine — leave as ''
    }
    beatResults = results;

    // Calculate score
    let sc = 0;
    let perfects = 0, goods = 0, oks = 0, misses = 0;
    for (let i = 0; i < results.length; i++) {
      if (tapPattern[i] === 0) continue; // skip rests
      const g = GRADES.find(g => g.name === results[i]);
      if (g) sc += g.pts;
      if (results[i] === 'perfect') perfects++;
      else if (results[i] === 'good') goods++;
      else if (results[i] === 'ok') oks++;
      else misses++;
    }

    roundScore = sc;
    score += sc;
    rounds++;
    if (sc > bestScore) bestScore = sc;

    // Save progress
    const activeBeats = tapPattern.filter(b => b === 1).length;
    const accuracy = activeBeats > 0 ? Math.round(sc / (activeBeats * 15) * 100) : 0;
    saveExercise('rhythm-tap', { bestScore: bestScore, bestAccuracy: accuracy });

    const parts = [];
    if (perfects) parts.push(`${perfects} perfect`);
    if (goods) parts.push(`${goods} good`);
    if (oks) parts.push(`${oks} ok`);
    if (misses) parts.push(`${misses} miss`);
    msgText = `Score: ${sc} / ${activeBeats * 15}  |  ${parts.join(', ')}`;
    msgErr = misses > activeBeats / 2;
  }

  // --- Tap handling ---
  function onTap() {
    if (phase !== 'tap') return;
    const now = performance.now();

    // Find nearest beat
    let minDelta = Infinity;
    let nearestIdx = -1;
    const cfg = RT_DIFF[diff];
    const listenCount = LISTEN_BEATS * cfg.subdivision;

    for (let i = 0; i < beatTimes.length; i++) {
      // Only consider active beats (not rests)
      if (pattern[listenCount + i] === 0) continue;
      // Only consider un-graded beats
      if (beatResults[i] !== '') continue;
      const d = Math.abs(now - beatTimes[i]);
      if (d < minDelta) {
        minDelta = d;
        nearestIdx = i;
      }
    }

    if (nearestIdx === -1) return;

    // Only grade if within a reasonable window (half the beat interval)
    if (minDelta > beatInterval * 0.6) return;

    const grade = GRADES.find(g => minDelta <= g.threshold);
    const results = [...beatResults];
    results[nearestIdx] = grade.name;
    beatResults = results;

    totalDeviation += minDelta;
    totalTaps++;
  }

  function handleKeydown(e) {
    if (e.code === 'Space') {
      e.preventDefault();
      if (phase === 'tap') {
        onTap();
      } else if (phase === 'idle') {
        onStart();
      } else if (phase === 'result') {
        onAgain();
      }
    }
  }

  // --- Flow ---
  function onStart() {
    startRound();
  }

  function onAgain() {
    clearScheduler();
    startRound();
  }

  function onStop() {
    clearScheduler();
    phase = 'idle';
    activeBeat = -1;
    pattern = [];
    beatResults = [];
    beatTimes = [];
    msgText = rounds > 0 ? `Session done. ${rounds} rounds, total score: ${score}` : 'Press Start to begin';
    msgErr = false;
  }

  function onReset() {
    onStop();
    score = 0;
    rounds = 0;
    bestScore = 0;
    totalDeviation = 0;
    totalTaps = 0;
    roundScore = 0;
    roundDeviations = [];
    msgText = 'Press Start to begin';
    msgErr = false;
  }

  function clearScheduler() {
    if (schedulerRef) {
      for (const id of schedulerRef) clearTimeout(id);
      schedulerRef = null;
    }
  }

  onDestroy(() => {
    clearScheduler();
    if (audioCtx) {
      audioCtx.close().catch(() => {});
      audioCtx = null;
    }
  });
</script>

<svelte:head>
  <title>Rhythm Tap — Guitar Exercise</title>
  <meta name="description" content="Practice tapping in time with a metronome to build rhythmic accuracy.">
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<div class="nt-wrap">
  <header class="nt-hdr">
    <h1>Rhythm Tap</h1>
    <nav class="nt-nav">
      <a href="{base}/" class="pill" style="font-size:13px">Home</a>
    </nav>
  </header>

  <div class="nt-stats">
    <div class="nt-stat"><div class="nt-stat-val">{score}</div><div class="nt-stat-lbl">Score</div></div>
    <div class="nt-stat"><div class="nt-stat-val">{rounds}</div><div class="nt-stat-lbl">Rounds</div></div>
    <div class="nt-stat"><div class="nt-stat-val">{avgDev}</div><div class="nt-stat-lbl">Avg Dev</div></div>
    <div class="nt-stat"><div class="nt-stat-val">{bestScore}</div><div class="nt-stat-lbl">Best</div></div>
  </div>

  <div class="nt-main">
    <div class="nt-diff">
      {#each Object.entries(RT_DIFF) as [key, cfg]}
        <button class="pill{diff === key ? ' on' : ''}" title={cfg.tip} onclick={() => setDiff(key)} disabled={phase === 'listen' || phase === 'tap'}>{cfg.label}</button>
      {/each}
    </div>

    <div class="rt-bpm">{RT_DIFF[diff].bpm} BPM</div>

    {#if pattern.length > 0}
      {@const listenCount = LISTEN_BEATS * RT_DIFF[diff].subdivision}
      <div class="rt-dots">
        {#each pattern as beat, i}
          {@const isListen = i < listenCount}
          {@const tapIdx = i - listenCount}
          {@const grade = !isListen && beatResults[tapIdx] ? beatResults[tapIdx] : ''}
          {@const isRest = beat === 0}
          <div
            class="rt-dot{isListen ? ' listen' : ''}{activeBeat === i ? ' active' : ''}{grade ? ' ' + grade : ''}{isRest && !isListen ? ' rest' : ''}"
            class:first-tap={i === listenCount}
          >
            {#if isRest && !isListen}
              <span class="rt-rest-mark">&ndash;</span>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <div class="rt-dots-placeholder">Beat dots appear here</div>
    {/if}

    <div class="nt-msg{msgErr ? ' nt-err' : ''}">{msgText}</div>

    {#if phase === 'tap'}
      <button class="rt-tap-btn" onclick={onTap}>TAP</button>
    {:else if phase === 'idle'}
      <div class="rt-hint">Press <kbd>Space</kbd> or tap the button</div>
    {:else if phase === 'result'}
      <div class="rt-hint">Press <kbd>Space</kbd> to go again</div>
    {/if}
  </div>

  <div class="nt-controls">
    {#if phase === 'idle'}
      <button class="nt-btn nt-primary" onclick={onStart}>Start</button>
    {/if}
    {#if phase === 'result'}
      <button class="nt-btn nt-primary" onclick={onAgain}>Again</button>
    {/if}
    {#if phase === 'listen' || phase === 'tap' || phase === 'result'}
      <button class="nt-btn nt-danger" onclick={onStop}>Stop</button>
    {/if}
    {#if score > 0 || rounds > 0}
      <button class="nt-btn" onclick={onReset}>Reset</button>
    {/if}
  </div>
</div>

<style>
  .nt-wrap{display:flex;flex-direction:column;min-height:100vh;width:100%;padding:.5rem 1rem;gap:.5rem;background:var(--bg);color:var(--tx);font-family:'Outfit',sans-serif}
  .nt-hdr{display:flex;justify-content:space-between;align-items:center;flex-shrink:0;flex-wrap:wrap;gap:.5rem}
  .nt-hdr h1{font-size:18px;font-weight:900;letter-spacing:-1px}
  .nt-nav{display:flex;gap:.4rem}
  .nt-nav a{text-decoration:none}
  .nt-stats{display:flex;gap:1rem;background:var(--sf);border:1px solid var(--bd);border-radius:10px;padding:.4rem .8rem;flex-wrap:wrap;justify-content:center;flex-shrink:0}
  .nt-stat{text-align:center;font-family:'JetBrains Mono',monospace}
  .nt-stat-val{font-size:20px;font-weight:700;color:var(--ac)}
  .nt-stat-lbl{font-size:11px;color:var(--mt);text-transform:uppercase;letter-spacing:.5px}
  .nt-main{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.8rem;min-height:0}
  .nt-diff{display:flex;gap:.4rem;justify-content:center;margin-bottom:.2rem}
  .nt-msg{text-align:center;font-size:14px;color:var(--mt);min-height:20px}
  .nt-msg.nt-err{color:#FF6B6B}
  .nt-controls{display:flex;gap:.4rem;flex-wrap:wrap;justify-content:center;flex-shrink:0;padding-bottom:.5rem}
  .nt-btn{padding:.4rem .9rem;border-radius:20px;border:1.5px solid var(--bd);background:var(--sf);color:var(--mt);font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:600;cursor:pointer;transition:all .15s}
  .nt-btn:hover{border-color:#555;color:var(--tx)}
  .nt-btn.nt-primary{border-color:var(--ac);color:var(--ac);background:rgba(88,166,255,.1)}
  .nt-btn.nt-danger{border-color:#FF6B6B;color:#FF6B6B;background:rgba(255,107,107,.08)}

  /* Rhythm-specific */
  .rt-bpm{font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:700;color:var(--ac);text-align:center}
  .rt-dots{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:1rem 0}
  .rt-dots-placeholder{color:var(--mt);font-size:13px;margin:1rem 0}
  .rt-dot{width:32px;height:32px;border-radius:50%;background:#30363D;transition:all .15s;border:2px solid transparent;display:flex;align-items:center;justify-content:center;position:relative}
  .rt-dot.listen{border-color:#555}
  .rt-dot.active{transform:scale(1.25);border-color:var(--ac);box-shadow:0 0 10px rgba(88,166,255,.4)}
  .rt-dot.perfect{background:#4ECB71}
  .rt-dot.good{background:#38BDF8}
  .rt-dot.ok{background:#F0A030}
  .rt-dot.miss{background:#FF6B6B}
  .rt-dot.rest{background:#1C1F24;border-style:dashed;border-color:#444}
  .rt-dot.first-tap{margin-left:12px}
  .rt-rest-mark{color:#666;font-size:14px;font-weight:700;line-height:1}

  .rt-tap-btn{width:120px;height:120px;border-radius:50%;border:3px solid var(--ac);background:rgba(88,166,255,.1);color:var(--ac);font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:700;cursor:pointer;transition:all .1s;user-select:none;-webkit-user-select:none}
  .rt-tap-btn:active{transform:scale(.92);background:rgba(88,166,255,.25)}

  .rt-hint{color:var(--mt);font-size:13px;font-family:'JetBrains Mono',monospace}
  .rt-hint kbd{padding:2px 6px;border:1px solid var(--bd);border-radius:4px;background:var(--sf);font-size:12px}

  @media(max-width:600px){
    .nt-wrap{padding:.5rem;gap:.4rem}
    .nt-hdr h1{font-size:15px}
    .nt-stat-val{font-size:16px}
    .nt-btn{font-size:12px;padding:.3rem .6rem}
    .rt-bpm{font-size:18px}
    .rt-dot{width:26px;height:26px}
    .rt-tap-btn{width:100px;height:100px;font-size:14px}
  }
</style>
