<script>
  import { NOTES, INTERVALS, CHORD_TYPES, INTERVAL_NAMES } from '$lib/constants/music.js';
  import InteractiveFretboard from '$lib/components/svg/InteractiveFretboard.svelte';
  import { chordPositions, intervalsToNotes, noteFreq, DEGREE_COLORS } from '$lib/components/theory/theory-utils.js';
  import { record, nextPractice, nextQuiz } from '$lib/mastery/store.svelte.js';

  let { tonePlayer } = $props();

  let tab = $state('explore');

  // --- Explore state ---
  let rootIndex = $state(0);
  let selected = $state(new Set());

  let intervals = $derived.by(() => {
    const arr = [0, ...selected];
    return [...arr].sort((a, b) => a - b);
  });

  let resultNotes = $derived(intervalsToNotes(rootIndex, intervals));

  let matchedChord = $derived.by(() => {
    const iv = intervals;
    for (const ct of CHORD_TYPES) {
      const ctNorm = ct.iv.map(v => v % 12).sort((a, b) => a - b);
      const selNorm = iv.map(v => v % 12).sort((a, b) => a - b);
      if (ctNorm.length === selNorm.length && ctNorm.every((v, i) => v === selNorm[i])) {
        return ct;
      }
    }
    return null;
  });

  let chordLabel = $derived(
    matchedChord ? `${NOTES[rootIndex]}${matchedChord.sym} (${matchedChord.name})` : null
  );

  let exploreDots = $derived.by(() => {
    if (intervals.length <= 1) return [];
    return chordPositions(rootIndex, intervals).map(p => ({
      str: p.str, fret: p.fret, color: p.color, label: p.note
    }));
  });

  function toggleInterval(semi) {
    const next = new Set(selected);
    if (next.has(semi)) next.delete(semi);
    else next.add(semi);
    selected = next;
  }

  function clear() {
    selected = new Set();
  }

  function randomChord() {
    const ct = CHORD_TYPES[Math.floor(Math.random() * CHORD_TYPES.length)];
    rootIndex = Math.floor(Math.random() * 12);
    selected = new Set(ct.iv.filter(v => v !== 0).map(v => v % 12));
  }

  function playChord() {
    if (!tonePlayer) return;
    tonePlayer.init();
    const iv = intervals;
    const notes = intervalsToNotes(rootIndex, iv);
    for (let i = 0; i < notes.length; i++) {
      const octave = i === 0 ? 3 : (iv[i] >= 7 ? 4 : 3);
      tonePlayer.playNote(noteFreq(notes[i], octave), 1.0);
    }
  }

  function intervalLabel(semi) {
    return INTERVAL_NAMES[semi] || `${semi}`;
  }

  // --- Practice state ---
  let practiceItem = $state(null);
  let practiceChord = $state(null);
  let practiceSelected = $state(new Set());
  let practiceChecked = $state(false);
  let practiceCorrect = $state(false);
  let practiceStartTime = $state(0);
  let practiceHintUsed = $state(false);
  let practiceHintSemi = $state(null);
  let practiceHintTimer = $state(null);

  let practiceIntervals = $derived.by(() => {
    const arr = [0, ...practiceSelected];
    return [...arr].sort((a, b) => a - b);
  });

  let practiceResultNotes = $derived(practiceChord ? intervalsToNotes(0, practiceIntervals) : []);

  let practiceDots = $derived.by(() => {
    if (!practiceChord || practiceIntervals.length <= 1) return [];
    return chordPositions(0, practiceIntervals).map(p => ({
      str: p.str, fret: p.fret, color: p.color, label: p.note
    }));
  });

  function startPractice() {
    const item = nextPractice('builder');
    if (!item) return;
    practiceItem = item;
    practiceChord = CHORD_TYPES.find(ct => ct.id === item);
    practiceSelected = new Set();
    practiceChecked = false;
    practiceCorrect = false;
    practiceStartTime = Date.now();
    practiceHintUsed = false;
    practiceHintSemi = null;
  }

  function togglePracticeInterval(semi) {
    if (practiceChecked) return;
    const next = new Set(practiceSelected);
    if (next.has(semi)) next.delete(semi);
    else next.add(semi);
    practiceSelected = next;
  }

  function checkPractice() {
    if (!practiceChord) return;
    const target = practiceChord.iv.filter(v => v !== 0).map(v => v % 12).sort((a, b) => a - b);
    const got = [...practiceSelected].map(v => v % 12).sort((a, b) => a - b);
    practiceCorrect = target.length === got.length && target.every((v, i) => v === got[i]);
    practiceChecked = true;
    const elapsed = Date.now() - practiceStartTime;
    record('builder', practiceItem, practiceCorrect, elapsed);
  }

  function showHint() {
    if (!practiceChord || practiceChecked) return;
    practiceHintUsed = true;
    const target = practiceChord.iv.filter(v => v !== 0).map(v => v % 12);
    const missing = target.filter(v => !practiceSelected.has(v));
    if (missing.length > 0) {
      const pick = missing[Math.floor(Math.random() * missing.length)];
      practiceHintSemi = pick;
      if (practiceHintTimer) clearTimeout(practiceHintTimer);
      practiceHintTimer = setTimeout(() => { practiceHintSemi = null; }, 1200);
    }
  }

  // --- Quiz state ---
  let quizItem = $state(null);
  let quizChord = $state(null);
  let quizSelected = $state(new Set());
  let quizChecked = $state(false);
  let quizCorrect = $state(false);
  let quizStartTime = $state(0);
  let quizElapsed = $state(0);
  let quizTimer = $state(null);

  let quizIntervals = $derived.by(() => {
    const arr = [0, ...quizSelected];
    return [...arr].sort((a, b) => a - b);
  });

  let quizDots = $derived.by(() => {
    if (!quizChord || quizIntervals.length <= 1) return [];
    return chordPositions(0, quizIntervals).map(p => ({
      str: p.str, fret: p.fret, color: p.color, label: p.note
    }));
  });

  function startQuiz() {
    const item = nextQuiz('builder');
    if (!item) return;
    quizItem = item;
    quizChord = CHORD_TYPES.find(ct => ct.id === item);
    quizSelected = new Set();
    quizChecked = false;
    quizCorrect = false;
    quizStartTime = Date.now();
    quizElapsed = 0;
    if (quizTimer) clearInterval(quizTimer);
    quizTimer = setInterval(() => {
      quizElapsed = Math.floor((Date.now() - quizStartTime) / 1000);
    }, 200);
  }

  function toggleQuizInterval(semi) {
    if (quizChecked) return;
    const next = new Set(quizSelected);
    if (next.has(semi)) next.delete(semi);
    else next.add(semi);
    quizSelected = next;
  }

  function checkQuiz() {
    if (!quizChord) return;
    if (quizTimer) clearInterval(quizTimer);
    const target = quizChord.iv.filter(v => v !== 0).map(v => v % 12).sort((a, b) => a - b);
    const got = [...quizSelected].map(v => v % 12).sort((a, b) => a - b);
    quizCorrect = target.length === got.length && target.every((v, i) => v === got[i]);
    quizChecked = true;
    const elapsed = Date.now() - quizStartTime;
    record('builder', quizItem, quizCorrect, elapsed);
  }

  function switchTab(t) {
    if (quizTimer) clearInterval(quizTimer);
    tab = t;
    if (t === 'practice') startPractice();
    if (t === 'quiz') startQuiz();
  }
</script>

<div class="cb-wrap">
  <div class="tab-bar">
    <button class:active={tab === 'explore'} onclick={() => switchTab('explore')}>Explore</button>
    <button class:active={tab === 'practice'} onclick={() => switchTab('practice')}>Practice</button>
    <button class:active={tab === 'quiz'} onclick={() => switchTab('quiz')}>Quiz</button>
  </div>

  {#if tab === 'explore'}
    <div class="cb-controls">
      <label class="cb-label">
        Root
        <select class="cb-select" bind:value={rootIndex}>
          {#each NOTES as n, i}
            <option value={i}>{n}</option>
          {/each}
        </select>
      </label>

      <button class="cb-btn" onclick={playChord} disabled={intervals.length <= 1}>Play</button>
      <button class="cb-btn" onclick={randomChord}>Random</button>
      <button class="cb-btn" onclick={clear}>Clear</button>
    </div>

    <div class="cb-intervals">
      {#each INTERVALS as iv}
        {@const isOn = selected.has(iv.semi)}
        <button
          class="cb-iv"
          class:cb-iv-on={isOn}
          onclick={() => toggleInterval(iv.semi)}
          title={iv.name}
        >
          <span class="cb-iv-abbr">{iv.abbr}</span>
          <span class="cb-iv-name">{iv.name}</span>
        </button>
      {/each}
    </div>

    {#if intervals.length > 1}
      <div class="cb-result">
        <div class="cb-notes">
          <span class="cb-notes-label">Notes:</span>
          {#each resultNotes as note, i}
            <span class="cb-note" style="color:{DEGREE_COLORS[i % DEGREE_COLORS.length]}">{note}</span>
            {#if i < resultNotes.length - 1}
              <span class="cb-sep">&middot;</span>
            {/if}
          {/each}
        </div>
        <div class="cb-formula">
          <span class="cb-notes-label">Formula:</span>
          {#each intervals as semi, i}
            <span class="cb-degree" style="color:{DEGREE_COLORS[i % DEGREE_COLORS.length]}">{intervalLabel(semi)}</span>
          {/each}
        </div>
      </div>

      {#if chordLabel}
        <div class="cb-match">You built: {chordLabel}</div>
      {/if}

      <InteractiveFretboard dots={exploreDots} />
    {:else}
      <p class="cb-hint">Select intervals above to build a chord</p>
    {/if}

  {:else if tab === 'practice'}
    {#if practiceChord}
      <div class="practice-header">
        <span class="practice-prompt">
          Build: <strong>{practiceChord.name} ({practiceChord.fm.join(' ')})</strong>
        </span>
        <button class="hint-btn" onclick={showHint} disabled={practiceChecked}>Hint</button>
      </div>

      <div class="cb-intervals">
        {#each INTERVALS as iv}
          {@const isOn = practiceSelected.has(iv.semi)}
          {@const isHint = practiceHintSemi === iv.semi}
          <button
            class="cb-iv"
            class:cb-iv-on={isOn}
            class:cb-iv-hint={isHint}
            onclick={() => togglePracticeInterval(iv.semi)}
            title={iv.name}
            disabled={practiceChecked}
          >
            <span class="cb-iv-abbr">{iv.abbr}</span>
            <span class="cb-iv-name">{iv.name}</span>
          </button>
        {/each}
      </div>

      {#if practiceIntervals.length > 1}
        <InteractiveFretboard dots={practiceDots} />
      {/if}

      {#if practiceChecked}
        <div class="result-banner" class:correct={practiceCorrect} class:wrong={!practiceCorrect}>
          {#if practiceCorrect}
            Correct! — {practiceChord.name}: {practiceChord.fm.join(' ')}
          {:else}
            Wrong — expected: {practiceChord.fm.join(' ')}
          {/if}
        </div>
      {/if}

      <div class="action-row">
        {#if !practiceChecked}
          <button class="play-btn" onclick={checkPractice}>Check</button>
        {:else}
          <button class="play-btn" onclick={startPractice}>Next</button>
        {/if}
      </div>
    {:else}
      <p class="cb-hint">No items available for practice</p>
    {/if}

  {:else}
    <!-- Quiz -->
    {#if quizChord}
      <div class="quiz-header">
        <span class="quiz-prompt">
          {#if !quizChecked}
            Build: <strong>{quizChord.name}</strong>
          {:else if quizCorrect}
            Correct! — {quizChord.name}: {quizChord.fm.join(' ')}
          {:else}
            Wrong — expected: {quizChord.fm.join(' ')}
          {/if}
        </span>
        <span class="quiz-timer">{quizElapsed}s</span>
      </div>

      <div class="cb-intervals">
        {#each INTERVALS as iv}
          {@const isOn = quizSelected.has(iv.semi)}
          <button
            class="cb-iv"
            class:cb-iv-on={isOn}
            onclick={() => toggleQuizInterval(iv.semi)}
            title={iv.name}
            disabled={quizChecked}
          >
            <span class="cb-iv-abbr">{iv.abbr}</span>
            <span class="cb-iv-name">{iv.name}</span>
          </button>
        {/each}
      </div>

      {#if quizIntervals.length > 1}
        <InteractiveFretboard dots={quizDots} />
      {/if}

      {#if quizChecked}
        <div class="result-banner" class:correct={quizCorrect} class:wrong={!quizCorrect}>
          {quizCorrect ? 'Correct!' : `Wrong — expected: ${quizChord.fm.join(' ')}`}
        </div>
      {/if}

      <div class="action-row">
        {#if !quizChecked}
          <button class="play-btn" onclick={checkQuiz}>Check</button>
        {:else}
          <button class="play-btn" onclick={startQuiz}>Next</button>
        {/if}
      </div>
    {:else}
      <p class="cb-hint">No items available for quiz</p>
    {/if}
  {/if}
</div>

<style>
  .cb-wrap{display:flex;flex-direction:column;gap:.75rem}
  .tab-bar { display: flex; gap: 0; border-bottom: 2px solid #333; margin-bottom: 1rem; }
  .tab-bar button { padding: 0.5rem 1.2rem; background: none; border: none; color: #aaa; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; font-size: 0.95rem; }
  .tab-bar button.active { color: #fff; border-bottom-color: #4fc3f7; }
  .tab-bar button:hover:not(.active) { color: #ccc; }
  .cb-controls{display:flex;align-items:center;gap:.75rem;flex-wrap:wrap}
  .cb-label{display:flex;align-items:center;gap:.5rem;font-size:14px;color:var(--mt)}
  .cb-select{padding:.3rem .5rem;background:var(--sf);border:1px solid var(--bd);border-radius:6px;color:var(--tx);font-size:14px;font-family:'JetBrains Mono',monospace}
  .cb-btn{padding:.4rem .8rem;background:var(--sf);border:1px solid var(--bd);border-radius:6px;color:var(--tx);font-size:13px;cursor:pointer;transition:border-color .15s}
  .cb-btn:hover{border-color:var(--mt)}
  .cb-btn:disabled{opacity:.4;cursor:default}
  .cb-intervals{display:flex;flex-wrap:wrap;gap:.4rem}
  .cb-iv{display:flex;flex-direction:column;align-items:center;padding:.4rem .5rem;min-width:56px;background:var(--sf);border:2px solid var(--bd);border-radius:8px;cursor:pointer;transition:border-color .12s,background .12s}
  .cb-iv:hover:not(:disabled){border-color:var(--mt)}
  .cb-iv:disabled{opacity:.5;cursor:default}
  .cb-iv-on{border-color:#58A6FF;background:rgba(88,166,255,.12)}
  .cb-iv-hint{border-color:#f1c40f;background:rgba(241,196,15,.15);animation:hint-pulse .6s ease-in-out 2}
  .cb-iv-abbr{font-size:14px;font-weight:700;font-family:'JetBrains Mono',monospace;color:var(--tx);line-height:1.2}
  .cb-iv-on .cb-iv-abbr{color:#58A6FF}
  .cb-iv-hint .cb-iv-abbr{color:#f1c40f}
  .cb-iv-name{font-size:10px;color:var(--mt);line-height:1.2;margin-top:1px}
  .cb-result{display:flex;flex-direction:column;gap:.35rem;padding:.6rem .8rem;background:var(--sf);border:1px solid var(--bd);border-radius:8px}
  .cb-notes,.cb-formula{display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;font-size:14px}
  .cb-notes-label{color:var(--mt);font-size:12px;min-width:56px}
  .cb-note{font-weight:700;font-family:'JetBrains Mono',monospace}
  .cb-sep{color:var(--mt);font-size:10px}
  .cb-degree{font-weight:600;font-family:'JetBrains Mono',monospace;font-size:13px}
  .cb-match{text-align:center;padding:.6rem;background:rgba(78,203,113,.1);border:1px solid rgba(78,203,113,.3);border-radius:8px;color:#4ECB71;font-weight:700;font-size:16px}
  .cb-hint{text-align:center;color:var(--mt);font-size:14px;padding:2rem 0}
  .practice-header, .quiz-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }
  .practice-prompt, .quiz-prompt { font-size: 15px; color: var(--tx); }
  .practice-prompt strong, .quiz-prompt strong { color: #58A6FF; }
  .hint-btn {
    padding: 6px 14px;
    border: 2px solid #f1c40f;
    border-radius: 8px;
    background: rgba(241,196,15,.1);
    color: #f1c40f;
    cursor: pointer;
    font: inherit;
    font-weight: 600;
    font-size: 13px;
    transition: background .15s;
  }
  .hint-btn:hover:not(:disabled) { background: rgba(241,196,15,.2); }
  .hint-btn:disabled { opacity: .4; cursor: default; }
  .quiz-timer {
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    color: var(--mt);
    background: var(--sf);
    padding: 4px 10px;
    border-radius: 6px;
    border: 1px solid var(--bd);
  }
  .result-banner {
    text-align: center;
    padding: .6rem;
    border-radius: 8px;
    font-weight: 700;
    font-size: 15px;
  }
  .result-banner.correct {
    background: rgba(78,203,113,.1);
    border: 1px solid rgba(78,203,113,.3);
    color: #4ECB71;
  }
  .result-banner.wrong {
    background: rgba(231,76,60,.1);
    border: 1px solid rgba(231,76,60,.3);
    color: #e74c3c;
  }
  .action-row {
    display: flex;
    gap: 10px;
    justify-content: center;
  }
  .play-btn {
    padding: 8px 16px;
    border: 2px solid #58A6FF;
    border-radius: 8px;
    background: rgba(88,166,255,.1);
    color: #58A6FF;
    cursor: pointer;
    font: inherit;
    font-weight: 600;
    transition: background .15s;
  }
  .play-btn:hover { background: rgba(88,166,255,.2); }
  @keyframes hint-pulse {
    0%, 100% { border-color: #f1c40f; }
    50% { border-color: #f39c12; background: rgba(241,196,15,.25); }
  }
</style>
