<script>
  import { NOTES, CHORD_TYPES } from '$lib/constants/music.js';
  import InteractiveFretboard from '$lib/components/svg/InteractiveFretboard.svelte';
  import ChordCard from '$lib/components/theory/ChordCard.svelte';
  import { chordPositions, intervalsToNotes, noteFreq, randomKey } from '$lib/components/theory/theory-utils.js';
  import { record, nextPractice, nextQuiz } from '$lib/mastery/store.svelte.js';

  let { tonePlayer } = $props();

  let tab = $state('explore');
  let keyIndex = $state(0);
  let activeChord = $state(null); // 'ii' | 'V' | 'I'
  let playing = $state(false);

  // Practice state
  let practiceKey = $state(null);
  let practiceGuess = $state(null);
  let practiceResult = $state(null); // 'correct' | 'wrong' | null
  let practiceStart = $state(0);

  // Quiz state
  let quizKey = $state(null);
  let quizGuess = $state(null);
  let quizResult = $state(null); // 'correct' | 'wrong' | null
  let quizScore = $state({ correct: 0, total: 0 });
  let quizStart = $state(0);
  let quizReplays = $state(0);

  const CHORD_DEFS = {
    ii:  { offset: 2,  quality: 'm7',   degree: 'ii' },
    V:   { offset: 7,  quality: '7',    degree: 'V' },
    I:   { offset: 0,  quality: 'maj7', degree: 'I' }
  };
  const PROG_ORDER = ['ii', 'V', 'I'];

  function getChordType(quality) {
    return CHORD_TYPES.find(c => c.id === quality);
  }

  function progression(ri) {
    return PROG_ORDER.map(deg => {
      const def = CHORD_DEFS[deg];
      const root = (ri + def.offset) % 12;
      const ct = getChordType(def.quality);
      return { deg, root, quality: def.quality, intervals: ct.iv, formula: ct.fm };
    });
  }

  let currentKey = $derived(
    tab === 'explore' ? keyIndex :
    tab === 'practice' ? (practiceKey ?? 0) :
    (quizKey ?? 0)
  );
  let chords = $derived(progression(currentKey));

  let activeChordData = $derived(
    activeChord ? chords.find(c => c.deg === activeChord) : null
  );

  let dots = $derived.by(() => {
    if (!activeChordData) return [];
    return chordPositions(activeChordData.root, activeChordData.intervals);
  });

  let toneLabels = $derived.by(() => {
    return chords.map(c => ({
      deg: c.deg,
      notes: intervalsToNotes(c.root, c.intervals)
    }));
  });

  function selectChord(deg) {
    activeChord = activeChord === deg ? null : deg;
  }

  function pickRandomKey() {
    let next;
    do { next = randomKey(); } while (next === keyIndex);
    keyIndex = next;
    activeChord = null;
  }

  async function playProgression() {
    if (!tonePlayer || playing) return;
    tonePlayer.init();
    playing = true;

    for (const chord of chords) {
      activeChord = chord.deg;
      const notes = intervalsToNotes(chord.root, chord.intervals);
      for (const note of notes) {
        const freq = noteFreq(note, 3);
        tonePlayer.playNote(freq, 0.35);
        await sleep(300);
      }
      await sleep(400);
    }
    playing = false;
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  // --- Practice functions ---
  function startPractice() {
    const item = nextPractice('iiVI');
    practiceKey = item != null ? parseInt(item) : randomKey();
    practiceGuess = null;
    practiceResult = null;
    activeChord = null;
    practiceStart = Date.now();
  }

  async function playPracticeProgression() {
    if (!tonePlayer || playing) return;
    tonePlayer.init();
    playing = true;
    const prChords = progression(practiceKey);
    for (const chord of prChords) {
      activeChord = chord.deg;
      const notes = intervalsToNotes(chord.root, chord.intervals);
      for (const note of notes) {
        const freq = noteFreq(note, 3);
        tonePlayer.playNote(freq, 0.35);
        await sleep(300);
      }
      await sleep(400);
    }
    playing = false;
  }

  function submitPracticeGuess(guessIdx) {
    if (practiceResult === 'correct') return;
    practiceGuess = guessIdx;
    const correct = guessIdx === practiceKey;
    if (correct) {
      practiceResult = 'correct';
      const elapsed = Date.now() - practiceStart;
      record('iiVI', `${practiceKey}`, true, elapsed);
    } else {
      practiceResult = 'wrong';
    }
  }

  function practiceRetry() {
    practiceGuess = null;
    practiceResult = null;
  }

  function practiceGiveUp() {
    practiceResult = 'correct'; // show answer
    const elapsed = Date.now() - practiceStart;
    record('iiVI', `${practiceKey}`, false, elapsed);
  }

  function practiceNext() {
    startPractice();
  }

  // --- Quiz functions ---
  function startQuiz() {
    const item = nextQuiz('iiVI');
    quizKey = item != null ? parseInt(item) : randomKey();
    quizGuess = null;
    quizResult = null;
    activeChord = null;
    quizStart = Date.now();
    quizReplays = 0;
  }

  async function playQuizProgression() {
    if (!tonePlayer || playing || quizReplays >= 1) return;
    quizReplays++;
    tonePlayer.init();
    playing = true;
    const qzChords = progression(quizKey);
    for (const chord of qzChords) {
      activeChord = chord.deg;
      const notes = intervalsToNotes(chord.root, chord.intervals);
      for (const note of notes) {
        const freq = noteFreq(note, 3);
        tonePlayer.playNote(freq, 0.35);
        await sleep(300);
      }
      await sleep(400);
    }
    playing = false;
  }

  function submitQuizGuess(guessIdx) {
    if (quizResult !== null) return;
    quizGuess = guessIdx;
    const correct = guessIdx === quizKey;
    quizResult = correct ? 'correct' : 'wrong';
    const elapsed = Date.now() - quizStart;
    record('iiVI', `${quizKey}`, correct, elapsed);
    quizScore = {
      correct: quizScore.correct + (correct ? 1 : 0),
      total: quizScore.total + 1
    };
  }

  function quizNext() {
    startQuiz();
  }

  function switchTab(t) {
    tab = t;
    activeChord = null;
    if (t === 'practice') {
      startPractice();
      // Auto-play after a brief delay
      setTimeout(() => playPracticeProgression(), 200);
    }
    if (t === 'quiz') {
      quizScore = { correct: 0, total: 0 };
      startQuiz();
      setTimeout(() => playQuizProgression(), 200);
    }
  }
</script>

<div class="iivi-wrap">
  <div class="tab-bar">
    <button class:active={tab === 'explore'} onclick={() => switchTab('explore')}>Explore</button>
    <button class:active={tab === 'practice'} onclick={() => switchTab('practice')}>Practice</button>
    <button class:active={tab === 'quiz'} onclick={() => switchTab('quiz')}>Quiz</button>
  </div>

  {#if tab === 'explore'}
    <div class="iivi-controls">
      <label class="iivi-label">
        Key
        <select class="iivi-select" bind:value={keyIndex}>
          {#each NOTES as n, i}
            <option value={i}>{n}</option>
          {/each}
        </select>
      </label>
      <button class="iivi-btn" onclick={pickRandomKey}>Random Key</button>
      <button class="iivi-btn iivi-btn-play" onclick={playProgression} disabled={playing}>
        {playing ? 'Playing...' : 'Play Progression'}
      </button>
    </div>

    <div class="iivi-title">ii-V-I in {NOTES[keyIndex]}</div>

    <div class="iivi-cards">
      {#each chords as chord}
        <div class="iivi-card-col">
          <ChordCard
            root={chord.root}
            quality={chord.quality}
            degree={chord.deg}
            active={activeChord === chord.deg}
            onclick={() => selectChord(chord.deg)}
          />
          <div class="iivi-tones">
            {#each toneLabels.find(t => t.deg === chord.deg)?.notes ?? [] as note, i}
              <span class="iivi-tone">{note}{i < (toneLabels.find(t => t.deg === chord.deg)?.notes.length ?? 0) - 1 ? ' ' : ''}</span>
            {/each}
          </div>
        </div>
        {#if chord.deg !== 'I'}
          <span class="iivi-arrow">&#8594;</span>
        {/if}
      {/each}
    </div>

    <InteractiveFretboard {dots} />

  {:else if tab === 'practice'}
    <div class="iivi-controls">
      <button class="iivi-btn iivi-btn-play" onclick={playPracticeProgression} disabled={playing}>
        {playing ? 'Playing...' : 'Replay'}
      </button>
    </div>

    <div class="iivi-quiz-prompt">
      {#if practiceResult === null}
        <span>Listen and identify the key of this ii-V-I</span>
      {:else if practiceResult === 'correct'}
        <span class="iivi-correct">Correct! ii-V-I in {NOTES[practiceKey]}</span>
      {:else}
        <span class="iivi-wrong">Wrong — try again!</span>
      {/if}
    </div>

    <div class="iivi-cards">
      {#each chords as chord}
        <div class="iivi-card-col">
          <ChordCard
            root={chord.root}
            quality={chord.quality}
            degree={chord.deg}
            active={activeChord === chord.deg}
            onclick={() => selectChord(chord.deg)}
          />
          {#if practiceResult === 'correct'}
            <div class="iivi-tones">
              {#each toneLabels.find(t => t.deg === chord.deg)?.notes ?? [] as note, i}
                <span class="iivi-tone">{note}{i < (toneLabels.find(t => t.deg === chord.deg)?.notes.length ?? 0) - 1 ? ' ' : ''}</span>
              {/each}
            </div>
          {/if}
        </div>
        {#if chord.deg !== 'I'}
          <span class="iivi-arrow">&#8594;</span>
        {/if}
      {/each}
    </div>

    {#if practiceResult === null}
      <div class="iivi-key-grid">
        {#each NOTES as n, i}
          <button
            class="iivi-key-btn"
            class:iivi-key-btn-selected={practiceGuess === i}
            onclick={() => submitPracticeGuess(i)}
          >{n}</button>
        {/each}
      </div>
    {:else if practiceResult === 'wrong'}
      <div class="iivi-actions">
        <button class="iivi-btn" onclick={practiceRetry}>Retry</button>
        <button class="iivi-btn" onclick={practiceGiveUp}>Show Answer</button>
      </div>
    {:else}
      <button class="iivi-btn" onclick={practiceNext}>Next</button>
    {/if}

    <InteractiveFretboard {dots} />

  {:else}
    <div class="iivi-controls">
      <span class="iivi-score">Score: {quizScore.correct} / {quizScore.total}</span>
      {#if quizReplays < 1 && quizResult === null}
        <button class="iivi-btn iivi-btn-play" onclick={playQuizProgression} disabled={playing}>
          {playing ? 'Playing...' : 'Replay (1)'}
        </button>
      {/if}
    </div>

    <div class="iivi-quiz-prompt">
      {#if quizResult === null}
        <span>What key is this ii-V-I in?</span>
      {:else if quizResult === 'correct'}
        <span class="iivi-correct">Correct! ii-V-I in {NOTES[quizKey]}</span>
      {:else}
        <span class="iivi-wrong">Wrong — it was {NOTES[quizKey]}</span>
      {/if}
    </div>

    <div class="iivi-cards">
      {#each chords as chord}
        <div class="iivi-card-col">
          <ChordCard
            root={chord.root}
            quality={chord.quality}
            degree={chord.deg}
            active={activeChord === chord.deg}
            onclick={() => selectChord(chord.deg)}
          />
          {#if quizResult !== null}
            <div class="iivi-tones">
              {#each toneLabels.find(t => t.deg === chord.deg)?.notes ?? [] as note, i}
                <span class="iivi-tone">{note}{i < (toneLabels.find(t => t.deg === chord.deg)?.notes.length ?? 0) - 1 ? ' ' : ''}</span>
              {/each}
            </div>
          {/if}
        </div>
        {#if chord.deg !== 'I'}
          <span class="iivi-arrow">&#8594;</span>
        {/if}
      {/each}
    </div>

    {#if quizResult === null}
      <div class="iivi-key-grid">
        {#each NOTES as n, i}
          <button
            class="iivi-key-btn"
            class:iivi-key-btn-selected={quizGuess === i}
            onclick={() => submitQuizGuess(i)}
            disabled={quizResult !== null}
          >{n}</button>
        {/each}
      </div>
    {:else}
      <button class="iivi-btn" onclick={quizNext}>Next</button>
    {/if}

    <InteractiveFretboard {dots} />
  {/if}
</div>

<style>
  .iivi-wrap{display:flex;flex-direction:column;gap:.75rem}
  .tab-bar{display:flex;gap:0;border-bottom:2px solid #333;margin-bottom:1rem}
  .tab-bar button{padding:0.5rem 1.2rem;background:none;border:none;color:#aaa;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;font-size:0.95rem}
  .tab-bar button.active{color:#fff;border-bottom-color:#4fc3f7}
  .tab-bar button:hover:not(.active){color:#ccc}
  .iivi-controls{display:flex;align-items:center;gap:1rem;flex-wrap:wrap}
  .iivi-label{display:flex;align-items:center;gap:.5rem;font-size:14px;color:var(--mt)}
  .iivi-select{padding:.3rem .5rem;background:var(--sf);border:1px solid var(--bd);border-radius:6px;color:var(--tx);font-size:14px;font-family:'JetBrains Mono',monospace}
  .iivi-btn{padding:.4rem .8rem;background:var(--sf);border:1px solid var(--bd);border-radius:6px;color:var(--tx);font-size:13px;cursor:pointer;transition:border-color .15s}
  .iivi-btn:hover{border-color:var(--mt)}
  .iivi-btn:disabled{opacity:.5;cursor:not-allowed}
  .iivi-btn-play{border-color:#58A6FF;color:#58A6FF}
  .iivi-btn-play:hover{background:rgba(88,166,255,.08)}
  .iivi-title{font-size:16px;font-weight:700;color:var(--tx);text-align:center}
  .iivi-cards{display:flex;align-items:flex-start;justify-content:center;gap:.75rem;flex-wrap:wrap}
  .iivi-card-col{display:flex;flex-direction:column;align-items:center;gap:.35rem}
  .iivi-arrow{font-size:20px;color:var(--mt);align-self:center;margin-top:8px}
  .iivi-tones{display:flex;gap:.3rem;font-size:12px;font-family:'JetBrains Mono',monospace;color:var(--mt)}
  .iivi-tone{color:var(--tx);font-weight:500}
  .iivi-quiz-prompt{text-align:center;font-size:16px;font-weight:600;color:var(--tx);padding:.5rem 0}
  .iivi-correct{color:#4ECB71}
  .iivi-wrong{color:#e74c3c}
  .iivi-score{font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:700;color:#4ECB71}
  .iivi-key-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem;max-width:320px;margin:0 auto}
  .iivi-key-btn{padding:.5rem;background:var(--sf);border:1px solid var(--bd);border-radius:6px;color:var(--tx);font-size:14px;font-weight:600;cursor:pointer;transition:border-color .15s,background .15s}
  .iivi-key-btn:hover{border-color:#58A6FF;background:rgba(88,166,255,.05)}
  .iivi-key-btn:disabled{opacity:.5;cursor:not-allowed}
  .iivi-key-btn-selected{border-color:#58A6FF;background:rgba(88,166,255,.1)}
  .iivi-actions{display:flex;gap:.5rem;justify-content:center}
</style>
