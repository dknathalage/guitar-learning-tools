<script>
  import { NOTES, CHORD_TYPES } from '$lib/constants/music.js';
  import InteractiveFretboard from '$lib/components/svg/InteractiveFretboard.svelte';
  import { DEGREE_COLORS, chordPositions, intervalsToNotes, noteFreq, randomKey } from '$lib/components/theory/theory-utils.js';
  import { record, nextPractice, nextQuiz } from '$lib/mastery/store.svelte.js';

  let { tonePlayer } = $props();

  const SEVENTH_IDS = new Set(['maj7', '7', 'm7', 'm7b5', 'dim7']);
  const SEVENTH_CHORDS = CHORD_TYPES.filter(c => SEVENTH_IDS.has(c.id));

  let tab = $state('explore');
  let selectedRoot = $state(0);
  let selectedType = $state(SEVENTH_CHORDS[0].id);

  // Practice state
  let pracRoot = $state(0);
  let pracTypeId = $state('7');
  let pracPhase = $state('listen'); // 'listen' | 'result'
  let pracAnswer = $state(null);
  let pracCorrect = $state(false);
  let pracStartTime = $state(0);

  // Quiz state
  let quizRoot = $state(randomKey());
  let quizTypeId = $state(SEVENTH_CHORDS[0].id);
  let quizPhase = $state('identify'); // 'identify' | 'result'
  let quizAnswer = $state(null);
  let quizResult = $state(null); // 'correct' | 'wrong' | null
  let streak = $state(0);
  let quizTotal = $state(0);
  let quizStartTime = $state(0);

  // Derived active chord for each mode
  let exploreChord = $derived(SEVENTH_CHORDS.find(c => c.id === selectedType) || SEVENTH_CHORDS[0]);
  let pracChord = $derived(SEVENTH_CHORDS.find(c => c.id === pracTypeId) || SEVENTH_CHORDS[0]);
  let quizChord = $derived(SEVENTH_CHORDS.find(c => c.id === quizTypeId) || SEVENTH_CHORDS[0]);

  let activeChord = $derived(
    tab === 'explore' ? exploreChord : tab === 'practice' ? pracChord : quizChord
  );
  let activeRoot = $derived(
    tab === 'explore' ? selectedRoot : tab === 'practice' ? pracRoot : quizRoot
  );

  let dots = $derived(activeChord ? chordPositions(activeRoot, activeChord.iv) : []);
  let chordNotes = $derived(activeChord ? intervalsToNotes(activeRoot, activeChord.iv) : []);

  let chordLabel = $derived(
    activeChord ? NOTES[activeRoot] + activeChord.sym : ''
  );

  let formulaDisplay = $derived.by(() => {
    if (!activeChord) return '';
    const names = activeChord.fm.join(' - ');
    const notes = chordNotes.join(' ');
    return `${names} = ${notes}`;
  });

  function playArpeggio() {
    if (!tonePlayer || !activeChord) return;
    tonePlayer.init();
    const octave = 3;
    chordNotes.forEach((note, i) => {
      const freq = noteFreq(note, i === chordNotes.length - 1 && activeChord.iv[i] >= 10 ? octave + 1 : octave);
      setTimeout(() => tonePlayer.playNote(freq, 0.6), i * 300);
    });
  }

  function playChord() {
    if (!tonePlayer || !activeChord) return;
    tonePlayer.init();
    const octave = 3;
    chordNotes.forEach((note, i) => {
      const freq = noteFreq(note, i >= 2 && activeChord.iv[i] >= 7 ? octave + 1 : octave);
      tonePlayer.playNote(freq, 1.0);
    });
  }

  // --- Practice functions ---
  function newPracticeRound() {
    const itemKey = nextPractice('sevenths');
    if (!itemKey) return;
    const [ri, typeId] = itemKey.split('_');
    pracRoot = parseInt(ri);
    pracTypeId = typeId;
    pracPhase = 'listen';
    pracAnswer = null;
    pracCorrect = false;
    pracStartTime = Date.now();
    setTimeout(() => playArpeggio(), 50);
  }

  function handlePracticeAnswer(typeId) {
    pracAnswer = typeId;
    const correct = typeId === pracTypeId;
    pracCorrect = correct;
    pracPhase = 'result';
    const responseTimeMs = Date.now() - pracStartTime;
    record('sevenths', `${pracRoot}_${pracTypeId}`, correct, responseTimeMs);
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
    const itemKey = nextQuiz('sevenths');
    if (!itemKey) return;
    const [ri, typeId] = itemKey.split('_');
    quizRoot = parseInt(ri);
    quizTypeId = typeId;
    quizPhase = 'identify';
    quizAnswer = null;
    quizResult = null;
    quizStartTime = Date.now();
  }

  function handleQuizAnswer(typeId) {
    quizTotal++;
    quizAnswer = typeId;
    const correct = typeId === quizTypeId;
    quizResult = correct ? 'correct' : 'wrong';
    if (correct) {
      streak++;
      playArpeggio();
    } else {
      streak = 0;
    }
    quizPhase = 'result';
    const responseTimeMs = Date.now() - quizStartTime;
    record('sevenths', `${quizRoot}_${quizTypeId}`, correct, responseTimeMs);
  }

  function startQuiz() {
    streak = 0;
    quizTotal = 0;
    newQuizRound();
  }

  function switchTab(t) {
    tab = t;
    if (t === 'practice') startPractice();
    else if (t === 'quiz') startQuiz();
  }
</script>

<div class="sc-wrap">
  <div class="tab-bar">
    <button class:active={tab === 'explore'} onclick={() => switchTab('explore')}>Explore</button>
    <button class:active={tab === 'practice'} onclick={() => switchTab('practice')}>Practice</button>
    <button class:active={tab === 'quiz'} onclick={() => switchTab('quiz')}>Quiz</button>
  </div>

  {#if tab === 'explore'}
    <div class="sc-controls">
      <label class="sc-label">
        Root
        <select class="sc-select" bind:value={selectedRoot}>
          {#each NOTES as n, i}
            <option value={i}>{n}</option>
          {/each}
        </select>
      </label>
      <label class="sc-label">
        Type
        <select class="sc-select" bind:value={selectedType}>
          {#each SEVENTH_CHORDS as ct}
            <option value={ct.id}>{ct.name}</option>
          {/each}
        </select>
      </label>
      <button class="sc-btn" onclick={playArpeggio}>Arpeggio</button>
      <button class="sc-btn" onclick={playChord}>Chord</button>
    </div>

    <div class="sc-formula">
      <span class="sc-chord-name">{chordLabel}</span>
      <span class="sc-chord-formula">{formulaDisplay}</span>
    </div>

    <InteractiveFretboard {dots} />

    {#if activeChord}
      <div class="sc-legend">
        {#each activeChord.fm as deg, i}
          <span class="sc-legend-item">
            <span class="sc-legend-dot" style="background:{DEGREE_COLORS[i]}"></span>
            {deg} ({chordNotes[i]})
          </span>
        {/each}
      </div>
    {/if}

  {:else if tab === 'practice'}
    <!-- Practice mode -->
    <div class="sc-controls">
      <span class="sc-quiz-label">What type of 7th chord is <strong>{NOTES[pracRoot]}?</strong></span>
      <button class="sc-btn" onclick={playArpeggio}>Replay</button>
    </div>

    {#if pracPhase === 'result'}
      <div class="sc-formula">
        <span class="sc-chord-name">{chordLabel}</span>
        <span class="sc-chord-formula">{formulaDisplay}</span>
      </div>
    {/if}

    <InteractiveFretboard {dots} />

    {#if pracPhase === 'listen'}
      <div class="sc-quiz-options">
        {#each SEVENTH_CHORDS as ct}
          <button class="sc-option" onclick={() => handlePracticeAnswer(ct.id)}>
            {ct.name}
          </button>
        {/each}
      </div>
    {:else}
      {#if pracCorrect}
        <div class="sc-feedback sc-feedback-correct">Correct! {chordLabel}: {formulaDisplay}</div>
      {:else}
        <div class="sc-feedback sc-feedback-wrong">
          It was <strong>{pracChord.name}</strong> ({chordLabel}: {formulaDisplay})
        </div>
      {/if}
      <div class="sc-quiz-actions">
        {#if !pracCorrect}
          <button class="sc-btn" onclick={practiceRetry}>Try Again</button>
        {/if}
        <button class="sc-btn" onclick={playArpeggio}>Listen</button>
        <button class="sc-btn sc-btn-next" onclick={newPracticeRound}>Next</button>
      </div>
    {/if}

  {:else}
    <!-- Quiz mode -->
    <div class="sc-controls">
      <span class="sc-quiz-label">What type of 7th chord is <strong>{NOTES[quizRoot]}?</strong></span>
      <span class="sc-streak">Streak: {streak} | {quizTotal}</span>
    </div>

    {#if quizPhase === 'result'}
      <div class="sc-formula">
        <span class="sc-chord-name">{chordLabel}</span>
        <span class="sc-chord-formula">{formulaDisplay}</span>
      </div>
    {/if}

    <InteractiveFretboard {dots} />

    <div class="sc-quiz-options">
      {#each SEVENTH_CHORDS as ct}
        {@const isSelected = quizAnswer === ct.id}
        {@const isCorrect = quizResult && ct.id === quizTypeId}
        <button
          class="sc-option"
          class:sc-option-correct={isCorrect && quizResult}
          class:sc-option-wrong={isSelected && quizResult === 'wrong'}
          disabled={quizResult !== null}
          onclick={() => handleQuizAnswer(ct.id)}
        >
          {ct.name}
        </button>
      {/each}
    </div>

    {#if quizResult === 'correct'}
      <div class="sc-feedback sc-feedback-correct">Correct! {chordLabel}: {formulaDisplay}</div>
    {:else if quizResult === 'wrong'}
      <div class="sc-feedback sc-feedback-wrong">
        It was <strong>{activeChord?.name}</strong> ({chordLabel}: {formulaDisplay})
      </div>
    {/if}

    {#if quizResult}
      <div class="sc-quiz-actions">
        <button class="sc-btn" onclick={playArpeggio}>Listen</button>
        <button class="sc-btn sc-btn-next" onclick={newQuizRound}>Next</button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .sc-wrap{display:flex;flex-direction:column;gap:.75rem}
  .tab-bar { display: flex; gap: 0; border-bottom: 2px solid #333; margin-bottom: 1rem; }
  .tab-bar button { padding: 0.5rem 1.2rem; background: none; border: none; color: #aaa; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; font-size: 0.95rem; }
  .tab-bar button.active { color: #fff; border-bottom-color: #4fc3f7; }
  .tab-bar button:hover:not(.active) { color: #ccc; }
  .sc-controls{display:flex;align-items:center;gap:1rem;flex-wrap:wrap}
  .sc-label{display:flex;align-items:center;gap:.5rem;font-size:14px;color:var(--mt)}
  .sc-select{padding:.3rem .5rem;background:var(--sf);border:1px solid var(--bd);border-radius:6px;color:var(--tx);font-size:14px;font-family:'JetBrains Mono',monospace}
  .sc-btn{padding:.4rem .8rem;background:var(--sf);border:1px solid var(--bd);border-radius:6px;color:var(--tx);font-size:13px;cursor:pointer;transition:border-color .15s}
  .sc-btn:hover{border-color:var(--mt)}
  .sc-btn-next{background:rgba(88,166,255,.1);border-color:#58A6FF;color:#58A6FF}
  .sc-formula{display:flex;align-items:baseline;gap:.75rem;padding:.5rem .75rem;background:var(--sf);border:1px solid var(--bd);border-radius:8px}
  .sc-chord-name{font-size:18px;font-weight:700;color:#58A6FF;font-family:'JetBrains Mono',monospace}
  .sc-chord-formula{font-size:14px;color:var(--mt);font-family:'JetBrains Mono',monospace}
  .sc-legend{display:flex;gap:1rem;flex-wrap:wrap;font-size:13px;color:var(--mt)}
  .sc-legend-item{display:flex;align-items:center;gap:.3rem}
  .sc-legend-dot{width:10px;height:10px;border-radius:50%;display:inline-block}
  .sc-quiz-label{font-size:15px;color:var(--tx)}
  .sc-quiz-label strong{color:#58A6FF;font-size:18px}
  .sc-streak{font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;color:#f1c40f;margin-left:auto}
  .sc-quiz-options{display:flex;gap:.5rem;flex-wrap:wrap}
  .sc-option{padding:.5rem 1rem;background:var(--sf);border:2px solid var(--bd);border-radius:8px;color:var(--tx);font-size:14px;font-weight:600;cursor:pointer;transition:border-color .15s,background .15s}
  .sc-option:hover:not(:disabled){border-color:var(--mt)}
  .sc-option:disabled{cursor:default;opacity:.7}
  .sc-option-correct{border-color:#4ECB71;background:rgba(78,203,113,.1);color:#4ECB71}
  .sc-option-wrong{border-color:#e74c3c;background:rgba(231,76,60,.1);color:#e74c3c}
  .sc-feedback{padding:.5rem .75rem;border-radius:8px;font-size:14px;font-weight:600}
  .sc-feedback-correct{background:rgba(78,203,113,.1);border:1px solid rgba(78,203,113,.3);color:#4ECB71}
  .sc-feedback-wrong{background:rgba(231,76,60,.1);border:1px solid rgba(231,76,60,.3);color:#e74c3c}
  .sc-quiz-actions{display:flex;gap:.5rem}
</style>
