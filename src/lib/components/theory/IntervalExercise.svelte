<script>
  import { NOTES, INTERVALS } from '$lib/constants/music.js';
  import InteractiveFretboard from '$lib/components/svg/InteractiveFretboard.svelte';
  import { allPositions, noteFreq } from './theory-utils.js';
  import { record, nextPractice, nextQuiz } from '$lib/mastery/store.svelte.js';

  let { tonePlayer } = $props();

  let tab = $state('explore');

  // Explore state
  let rootIndex = $state(0);
  let intervalIdx = $state(0);

  // Practice state
  let practiceRootIndex = $state(0);
  let practiceSemi = $state(0);
  let practiceFeedback = $state(null); // null | 'correct' | 'wrong'
  let practiceShowAnswer = $state(false);
  let practiceWrongCount = $state(0);
  let practiceHintShown = $state(false);
  let practiceStart = $state(0);

  // Quiz state
  let quizRootIndex = $state(0);
  let quizSemi = $state(0);
  let quizFeedback = $state(null);
  let quizShowAnswer = $state(false);
  let quizScore = $state(0);
  let quizTotal = $state(0);
  let quizStart = $state(0);
  let quizElapsed = $state(0);
  let quizTimer = $state(null);

  // Explore derivations
  let selectedInterval = $derived(INTERVALS[intervalIdx]);
  let rootNote = $derived(NOTES[rootIndex]);
  let intervalNote = $derived(NOTES[(rootIndex + selectedInterval.semi) % 12]);

  let exploreDots = $derived.by(() => {
    const rootPositions = allPositions(rootNote).map(p => ({
      ...p, color: '#e74c3c', label: rootNote
    }));
    const intPositions = allPositions(intervalNote).map(p => ({
      ...p, color: '#3498db', label: intervalNote
    }));
    return [...rootPositions, ...intPositions];
  });

  const UNISON = { semi: 0, name: 'Unison', abbr: 'P1' };

  function findInterval(semi) {
    if (semi === 0) return UNISON;
    return INTERVALS.find(iv => iv.semi === semi) || UNISON;
  }

  // Practice derivations
  let practiceRootNote = $derived(NOTES[practiceRootIndex]);
  let practiceInterval = $derived(findInterval(practiceSemi));
  let practiceTargetNote = $derived(NOTES[(practiceRootIndex + practiceSemi) % 12]);

  let practiceDots = $derived.by(() => {
    const rootPositions = allPositions(practiceRootNote).map(p => ({
      ...p, color: '#e74c3c', label: practiceRootNote
    }));
    if (practiceShowAnswer && practiceTargetNote) {
      const targetPositions = allPositions(practiceTargetNote).map(p => ({
        ...p, color: practiceFeedback === 'correct' ? '#4ECB71' : '#e67e22', label: practiceTargetNote
      }));
      return [...rootPositions, ...targetPositions];
    }
    // After 2 wrong attempts, briefly highlight correct positions as hint
    if (practiceHintShown) {
      const hintPositions = allPositions(practiceTargetNote).map(p => ({
        ...p, color: 'rgba(78,203,113,0.4)', label: practiceTargetNote
      }));
      return [...rootPositions, ...hintPositions];
    }
    return rootPositions;
  });

  // Quiz derivations
  let quizRootNote = $derived(NOTES[quizRootIndex]);
  let quizInterval = $derived(findInterval(quizSemi));
  let quizTargetNote = $derived(NOTES[(quizRootIndex + quizSemi) % 12]);

  let quizDots = $derived.by(() => {
    const rootPositions = allPositions(quizRootNote).map(p => ({
      ...p, color: '#e74c3c', label: quizRootNote
    }));
    if (quizShowAnswer && quizTargetNote) {
      const targetPositions = allPositions(quizTargetNote).map(p => ({
        ...p, color: quizFeedback === 'correct' ? '#4ECB71' : '#e67e22', label: quizTargetNote
      }));
      return [...rootPositions, ...targetPositions];
    }
    return rootPositions;
  });

  function parseItemKey(key) {
    const [ri, semi] = key.split('_').map(Number);
    return { ri, semi };
  }

  function pickPractice() {
    const key = nextPractice('intervals');
    const { ri, semi } = parseItemKey(key);
    practiceRootIndex = ri;
    practiceSemi = semi;
    practiceFeedback = null;
    practiceShowAnswer = false;
    practiceWrongCount = 0;
    practiceHintShown = false;
    practiceStart = Date.now();
  }

  function pickQuiz() {
    const key = nextQuiz('intervals');
    const { ri, semi } = parseItemKey(key);
    quizRootIndex = ri;
    quizSemi = semi;
    quizFeedback = null;
    quizShowAnswer = false;
    quizStart = Date.now();
    quizElapsed = 0;
    if (quizTimer) clearInterval(quizTimer);
    quizTimer = setInterval(() => {
      quizElapsed = Date.now() - quizStart;
    }, 100);
  }

  function handleExplorePlay() {
    if (!tonePlayer) return;
    tonePlayer.init();
    const rootFreq = noteFreq(rootNote, 4);
    const intFreq = noteFreq(intervalNote, intervalNote === rootNote ? 5 : (NOTES.indexOf(intervalNote) < NOTES.indexOf(rootNote) ? 5 : 4));
    tonePlayer.playInterval(rootFreq, intFreq);
  }

  function playIntervalSound(rNote, tNote) {
    if (!tonePlayer) return;
    tonePlayer.init();
    const rootFreq = noteFreq(rNote, 4);
    const targetIdx = NOTES.indexOf(tNote);
    const rootIdx = NOTES.indexOf(rNote);
    const intFreq = noteFreq(tNote, targetIdx <= rootIdx ? 5 : 4);
    tonePlayer.playInterval(rootFreq, intFreq);
  }

  function handlePracticeClick({ note }) {
    if (practiceFeedback) return;
    if (!practiceInterval) return;

    const itemKey = `${practiceRootIndex}_${practiceSemi}`;
    const rt = Date.now() - practiceStart;

    if (note === practiceTargetNote) {
      practiceFeedback = 'correct';
      practiceShowAnswer = true;
      record('intervals', itemKey, true, rt);
      playIntervalSound(practiceRootNote, practiceTargetNote);
    } else {
      practiceWrongCount++;
      record('intervals', itemKey, false, rt);
      if (practiceWrongCount >= 2 && !practiceHintShown) {
        // Show hint briefly
        practiceHintShown = true;
        setTimeout(() => { practiceHintShown = false; }, 1500);
      }
    }
  }

  function handleQuizClick({ note }) {
    if (quizFeedback || !quizInterval) return;

    const itemKey = `${quizRootIndex}_${quizSemi}`;
    const rt = Date.now() - quizStart;
    quizTotal++;

    if (note === quizTargetNote) {
      quizFeedback = 'correct';
      quizScore++;
      quizShowAnswer = true;
      record('intervals', itemKey, true, rt);
      playIntervalSound(quizRootNote, quizTargetNote);
      if (quizTimer) { clearInterval(quizTimer); quizTimer = null; }
    } else {
      quizFeedback = 'wrong';
      quizShowAnswer = true;
      record('intervals', itemKey, false, rt);
      if (quizTimer) { clearInterval(quizTimer); quizTimer = null; }
    }
  }

  function switchTab(t) {
    if (quizTimer) { clearInterval(quizTimer); quizTimer = null; }
    tab = t;
    if (t === 'practice') pickPractice();
    if (t === 'quiz') {
      quizScore = 0;
      quizTotal = 0;
      pickQuiz();
    }
  }

  function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const tenths = Math.floor((ms % 1000) / 100);
    return `${s}.${tenths}s`;
  }
</script>

<div class="ie-wrap">
  <div class="tab-bar">
    <button class:active={tab === 'explore'} onclick={() => switchTab('explore')}>Explore</button>
    <button class:active={tab === 'practice'} onclick={() => switchTab('practice')}>Practice</button>
    <button class:active={tab === 'quiz'} onclick={() => switchTab('quiz')}>Quiz</button>
  </div>

  {#if tab === 'explore'}
    <!-- Explore mode (unchanged) -->
    <div class="ie-controls">
      <label class="ie-label">
        Root
        <select class="ie-select" bind:value={rootIndex}>
          {#each NOTES as n, i}
            <option value={i}>{n}</option>
          {/each}
        </select>
      </label>

      <label class="ie-label">
        Interval
        <select class="ie-select" bind:value={intervalIdx}>
          {#each INTERVALS as iv, i}
            <option value={i}>{iv.abbr} — {iv.name}</option>
          {/each}
        </select>
      </label>

      <button class="ie-play" onclick={handleExplorePlay}>Play</button>
    </div>

    <div class="ie-info">
      <span class="ie-chip ie-chip-root">{rootNote}</span>
      <span class="ie-arrow">+{selectedInterval.semi} semitones</span>
      <span class="ie-chip ie-chip-int">{intervalNote}</span>
      <span class="ie-interval-name">{selectedInterval.name} ({selectedInterval.abbr})</span>
    </div>

    <InteractiveFretboard dots={exploreDots} />

  {:else if tab === 'practice'}
    <!-- Practice mode -->
    {#if practiceInterval}
      <div class="ie-quiz-prompt">
        Find the <strong>{practiceInterval.name} ({practiceInterval.abbr})</strong> above <span class="ie-chip ie-chip-root">{practiceRootNote}</span>
      </div>

      <InteractiveFretboard dots={practiceDots} onclick={handlePracticeClick} />

      {#if practiceFeedback}
        <div class="ie-feedback ie-correct">
          Correct! {practiceRootNote} + {practiceInterval.abbr} = {practiceTargetNote}
        </div>
        <button class="ie-next" onclick={pickPractice}>Next</button>
      {:else if practiceWrongCount > 0}
        <div class="ie-feedback ie-wrong">
          {practiceWrongCount} wrong — {practiceWrongCount >= 2 ? 'hint shown!' : 'try again'}
        </div>
      {/if}
    {/if}

  {:else}
    <!-- Quiz mode -->
    <div class="ie-quiz-header">
      <span class="ie-score">{quizScore}/{quizTotal}</span>
      <span class="ie-timer">{formatTime(quizElapsed)}</span>
    </div>

    {#if quizInterval}
      <div class="ie-quiz-prompt">
        Find the <strong>{quizInterval.name} ({quizInterval.abbr})</strong> above <span class="ie-chip ie-chip-root">{quizRootNote}</span>
      </div>

      <InteractiveFretboard dots={quizDots} onclick={handleQuizClick} />

      {#if quizFeedback}
        <div class="ie-feedback" class:ie-correct={quizFeedback === 'correct'} class:ie-wrong={quizFeedback === 'wrong'}>
          {#if quizFeedback === 'correct'}
            Correct! {quizRootNote} + {quizInterval.abbr} = {quizTargetNote}
          {:else}
            Wrong — the answer is {quizTargetNote}
          {/if}
        </div>
        <button class="ie-next" onclick={pickQuiz}>Next</button>
      {/if}
    {/if}
  {/if}
</div>

<style>
  .ie-wrap{display:flex;flex-direction:column;gap:16px}
  .tab-bar{display:flex;gap:0;border-bottom:2px solid #333;margin-bottom:1rem}
  .tab-bar button{padding:.5rem 1.2rem;background:none;border:none;color:#aaa;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;font-size:.95rem}
  .tab-bar button.active{color:#fff;border-bottom-color:#4fc3f7}
  .tab-bar button:hover:not(.active){color:#ccc}
  .ie-controls{display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap}
  .ie-label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--mt);font-weight:600}
  .ie-select{padding:6px 10px;border:1px solid var(--bd);border-radius:6px;background:var(--sf);color:var(--tx);font-size:14px;font-family:'JetBrains Mono',monospace}
  .ie-play{padding:6px 20px;border:none;border-radius:6px;background:#58A6FF;color:#fff;font-size:14px;font-weight:600;cursor:pointer;transition:background .15s;font-family:inherit}
  .ie-play:hover{background:#4090e0}
  .ie-info{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:14px}
  .ie-chip{padding:4px 10px;border-radius:6px;font-weight:700;font-size:14px;font-family:'JetBrains Mono',monospace}
  .ie-chip-root{background:rgba(231,76,60,.15);color:#e74c3c}
  .ie-chip-int{background:rgba(52,152,219,.15);color:#3498db}
  .ie-arrow{color:var(--mt);font-family:'JetBrains Mono',monospace;font-size:13px}
  .ie-interval-name{color:var(--mt);font-size:13px}
  .ie-quiz-header{display:flex;justify-content:flex-end;gap:1rem;align-items:center}
  .ie-score{font-size:16px;font-weight:700;color:var(--tx);font-family:'JetBrains Mono',monospace}
  .ie-timer{font-size:14px;color:var(--mt);font-family:'JetBrains Mono',monospace}
  .ie-quiz-prompt{font-size:16px;color:var(--tx);line-height:1.6}
  .ie-quiz-prompt strong{color:#58A6FF}
  .ie-feedback{padding:10px 14px;border-radius:8px;font-size:14px;font-weight:600;font-family:'JetBrains Mono',monospace}
  .ie-correct{background:rgba(78,203,113,.12);color:#4ECB71}
  .ie-wrong{background:rgba(231,76,60,.12);color:#e74c3c}
  .ie-next{align-self:flex-start;padding:8px 24px;border:none;border-radius:6px;background:#58A6FF;color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:background .15s}
  .ie-next:hover{background:#4090e0}
</style>
