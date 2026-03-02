<script>
  import InteractiveFretboard from '$lib/components/svg/InteractiveFretboard.svelte';
  import { NOTES, CHORD_TYPES } from '$lib/constants/music.js';
  import { chordPositions, intervalsToNotes, noteFreq, randomKey, DEGREE_COLORS } from './theory-utils.js';
  import { record, nextPractice, nextQuiz } from '$lib/mastery/store.svelte.js';

  let { tonePlayer } = $props();

  // Filter to triads only (exactly 3 intervals in iv array)
  const TRIADS = CHORD_TYPES.filter(ct => ct.iv.length === 3);
  // Mastery section uses these 4 triad ids
  const TRIAD_IDS = ['maj', 'min', 'aug', 'dim'];
  const MASTERY_TRIADS = CHORD_TYPES.filter(ct => TRIAD_IDS.includes(ct.id));

  let tab = $state('explore');
  let rootIndex = $state(0);
  let triadIdx = $state(0);

  // Practice state
  let pracRoot = $state(0);
  let pracTypeId = $state('maj');
  let pracPhase = $state('listen'); // 'listen' | 'result'
  let pracAnswer = $state(null);
  let pracCorrect = $state(false);
  let pracStartTime = $state(0);

  // Quiz state
  let quizRoot = $state(0);
  let quizTypeId = $state('maj');
  let quizPhase = $state('identify'); // 'identify' | 'result'
  let quizCorrect = $state(false);
  let quizStreak = $state(0);
  let quizTotal = $state(0);
  let quizStartTime = $state(0);

  // Derived active chord for each mode
  let exploreTriad = $derived(TRIADS[triadIdx]);
  let pracTriad = $derived(MASTERY_TRIADS.find(c => c.id === pracTypeId) || MASTERY_TRIADS[0]);
  let quizTriad = $derived(MASTERY_TRIADS.find(c => c.id === quizTypeId) || MASTERY_TRIADS[0]);

  let activeTriad = $derived(
    tab === 'explore' ? exploreTriad : tab === 'practice' ? pracTriad : quizTriad
  );
  let activeRoot = $derived(
    tab === 'explore' ? rootIndex : tab === 'practice' ? pracRoot : quizRoot
  );

  let dots = $derived(chordPositions(activeRoot, activeTriad.iv));
  let toneNames = $derived(intervalsToNotes(activeRoot, activeTriad.iv));

  let formula = $derived(
    `${activeTriad.name}: ${activeTriad.fm.join(' - ')} = ${toneNames.join(' ')}`
  );

  function playArpeggio() {
    if (!tonePlayer) return;
    tonePlayer.init();
    const freqs = toneNames.map(n => noteFreq(n, 4));
    tonePlayer.playChord(freqs, true, 0.35);
  }

  // --- Practice functions ---
  function newPracticeRound() {
    const itemKey = nextPractice('triads');
    if (!itemKey) return;
    const [ri, typeId] = itemKey.split('_');
    pracRoot = parseInt(ri);
    pracTypeId = typeId;
    pracPhase = 'listen';
    pracAnswer = null;
    pracCorrect = false;
    pracStartTime = Date.now();
    // Auto-play arpeggio after a tick so derived values update
    setTimeout(() => playArpeggio(), 50);
  }

  function handlePracticeAnswer(typeId) {
    pracAnswer = typeId;
    const correct = typeId === pracTypeId;
    pracCorrect = correct;
    pracPhase = 'result';
    const responseTimeMs = Date.now() - pracStartTime;
    record('triads', `${pracRoot}_${pracTypeId}`, correct, responseTimeMs);
  }

  function practiceRetry() {
    pracPhase = 'listen';
    pracAnswer = null;
    pracCorrect = false;
    pracStartTime = Date.now();
    setTimeout(() => playArpeggio(), 50);
  }

  function startPractice() {
    newPracticeRound();
  }

  // --- Quiz functions ---
  function newQuizRound() {
    const itemKey = nextQuiz('triads');
    if (!itemKey) return;
    const [ri, typeId] = itemKey.split('_');
    quizRoot = parseInt(ri);
    quizTypeId = typeId;
    quizPhase = 'identify';
    quizCorrect = false;
    quizStartTime = Date.now();
  }

  function handleQuizAnswer(typeId) {
    quizTotal++;
    const correct = typeId === quizTypeId;
    quizCorrect = correct;
    if (correct) {
      quizStreak++;
      playArpeggio();
    } else {
      quizStreak = 0;
    }
    quizPhase = 'result';
    const responseTimeMs = Date.now() - quizStartTime;
    record('triads', `${quizRoot}_${quizTypeId}`, correct, responseTimeMs);
  }

  function startQuiz() {
    quizStreak = 0;
    quizTotal = 0;
    newQuizRound();
  }

  // Degree labels for the legend
  const DEGREE_LABELS = ['Root', '3rd', '5th'];
</script>

<div class="triad-ex">
  <div class="tab-bar">
    <button class:active={tab === 'explore'} onclick={() => tab = 'explore'}>Explore</button>
    <button class:active={tab === 'practice'} onclick={() => { tab = 'practice'; startPractice(); }}>Practice</button>
    <button class:active={tab === 'quiz'} onclick={() => { tab = 'quiz'; startQuiz(); }}>Quiz</button>
  </div>

  {#if tab === 'explore'}
    <div class="controls">
      <label class="ctrl-label">
        Root
        <select bind:value={rootIndex}>
          {#each NOTES as n, i}
            <option value={i}>{n}</option>
          {/each}
        </select>
      </label>
      <label class="ctrl-label">
        Type
        <select bind:value={triadIdx}>
          {#each TRIADS as t, i}
            <option value={i}>{t.name}</option>
          {/each}
        </select>
      </label>
      <button class="play-btn" onclick={playArpeggio}>Play</button>
    </div>

    <div class="formula">{formula}</div>

    <div class="legend">
      {#each activeTriad.iv as _, i}
        <span class="legend-item">
          <span class="legend-dot" style="background:{DEGREE_COLORS[i]}"></span>
          {DEGREE_LABELS[i]} ({toneNames[i]})
        </span>
      {/each}
    </div>

    <InteractiveFretboard {dots} />

  {:else if tab === 'practice'}
    <!-- Practice mode -->
    <div class="quiz-header">
      <span class="quiz-prompt">
        {#if pracPhase === 'listen'}
          What triad type is <strong>{NOTES[pracRoot]}</strong>?
        {:else}
          {#if pracCorrect}
            Correct! {NOTES[pracRoot]} {pracTriad.name}
          {:else}
            Wrong — it was <strong>{NOTES[pracRoot]} {pracTriad.name}</strong>
          {/if}
        {/if}
      </span>
      <button class="play-btn small" onclick={playArpeggio}>Replay</button>
    </div>

    {#if pracPhase === 'result'}
      <div class="formula">{formula}</div>
    {/if}

    <div class="legend">
      {#each activeTriad.iv as _, i}
        <span class="legend-item">
          <span class="legend-dot" style="background:{DEGREE_COLORS[i]}"></span>
          {DEGREE_LABELS[i]} ({toneNames[i]})
        </span>
      {/each}
    </div>

    <InteractiveFretboard {dots} />

    {#if pracPhase === 'listen'}
      <div class="quiz-choices">
        {#each MASTERY_TRIADS as t}
          <button class="choice-btn" onclick={() => handlePracticeAnswer(t.id)}>
            {t.name}
          </button>
        {/each}
      </div>
    {:else}
      <div class="quiz-actions">
        {#if !pracCorrect}
          <button class="play-btn" onclick={practiceRetry}>Try Again</button>
        {/if}
        <button class="play-btn" onclick={newPracticeRound}>Next</button>
      </div>
    {/if}

  {:else}
    <!-- Quiz mode -->
    <div class="quiz-header">
      <span class="quiz-prompt">
        {#if quizPhase === 'identify'}
          What triad is <strong>{NOTES[quizRoot]}</strong> with these tones?
        {:else}
          {#if quizCorrect}
            Correct!
          {:else}
            Wrong — it was <strong>{NOTES[quizRoot]} {quizTriad.name}</strong>
          {/if}
        {/if}
      </span>
      <span class="quiz-score">{quizStreak}/{quizTotal}</span>
    </div>

    {#if quizPhase === 'result'}
      <div class="formula">{formula}</div>
    {/if}

    <div class="legend">
      {#each activeTriad.iv as _, i}
        <span class="legend-item">
          <span class="legend-dot" style="background:{DEGREE_COLORS[i]}"></span>
          {DEGREE_LABELS[i]} ({toneNames[i]})
        </span>
      {/each}
    </div>

    <InteractiveFretboard {dots} />

    {#if quizPhase === 'identify'}
      <div class="quiz-choices">
        {#each MASTERY_TRIADS as t}
          <button class="choice-btn" onclick={() => handleQuizAnswer(t.id)}>
            {t.name}
          </button>
        {/each}
      </div>
    {:else}
      <div class="quiz-actions">
        <button class="play-btn" onclick={playArpeggio}>Play Arpeggio</button>
        <button class="play-btn" onclick={newQuizRound}>Next</button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .triad-ex { display: flex; flex-direction: column; gap: 12px; }

  .tab-bar { display: flex; gap: 0; border-bottom: 2px solid #333; margin-bottom: 1rem; }
  .tab-bar button { padding: 0.5rem 1.2rem; background: none; border: none; color: #aaa; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; font-size: 0.95rem; }
  .tab-bar button.active { color: #fff; border-bottom-color: #4fc3f7; }
  .tab-bar button:hover:not(.active) { color: #ccc; }

  .controls { display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap; }
  .ctrl-label {
    display: flex; flex-direction: column; gap: 4px;
    font-size: 12px; color: var(--mt); font-family: 'JetBrains Mono', monospace;
  }
  .ctrl-label select {
    padding: 6px 8px; border: 1px solid var(--bd); border-radius: 6px;
    background: var(--sf); color: var(--tx); font: inherit; font-size: 14px;
  }

  .play-btn {
    padding: 8px 16px; border: 2px solid #58A6FF; border-radius: 8px;
    background: rgba(88,166,255,.1); color: #58A6FF; cursor: pointer;
    font: inherit; font-weight: 600; transition: background .15s;
  }
  .play-btn:hover { background: rgba(88,166,255,.2); }
  .play-btn.small { padding: 4px 10px; font-size: 13px; }

  .formula {
    font-family: 'JetBrains Mono', monospace; font-size: 15px; font-weight: 600;
    color: var(--tx); padding: 8px 12px; background: var(--sf);
    border: 1px solid var(--bd); border-radius: 8px; text-align: center;
  }

  .legend { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
  .legend-item { display: flex; align-items: center; gap: 5px; font-size: 13px; color: var(--mt); }
  .legend-dot { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }

  .quiz-header { display: flex; justify-content: space-between; align-items: center; }
  .quiz-prompt { font-size: 16px; color: var(--tx); }
  .quiz-score {
    font-family: 'JetBrains Mono', monospace; font-size: 14px;
    color: var(--mt); background: var(--sf); padding: 4px 10px;
    border-radius: 6px; border: 1px solid var(--bd);
  }

  .quiz-choices { display: flex; gap: 8px; flex-wrap: wrap; }
  .choice-btn {
    flex: 1; min-width: 100px; padding: 10px; border: 2px solid var(--bd);
    border-radius: 8px; background: var(--sf); color: var(--tx);
    cursor: pointer; font: inherit; font-weight: 600; transition: border-color .12s, background .12s;
  }
  .choice-btn:hover { border-color: #58A6FF; background: rgba(88,166,255,.08); }

  .quiz-actions { display: flex; gap: 10px; justify-content: center; }
</style>
