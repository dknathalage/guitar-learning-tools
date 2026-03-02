<script>
  import { NOTES } from '$lib/constants/music.js';
  import { SCALES, MODES, HARMONIZED_MAJOR, CHORD_TYPES } from '$lib/constants/music.js';
  import InteractiveFretboard from '$lib/components/svg/InteractiveFretboard.svelte';
  import ChordCard from './ChordCard.svelte';
  import { scalePositions, intervalsToNotes, DEGREE_COLORS, noteFreq, chordPositions } from './theory-utils.js';
  import { record, nextPractice, nextQuiz } from '$lib/mastery/store.svelte.js';

  let { tonePlayer } = $props();

  let tab = $state('explore');

  // --- Explore state ---
  let rootIndex = $state(0);
  let scaleId = $state('major');
  let activeTriadIdx = $state(-1);
  let playing = $state(false);

  const SCALE_OPTIONS = [
    ...SCALES.map(s => ({ id: s.id, name: s.name, iv: s.iv, source: 'scale' })),
    ...MODES.filter(m => ['dorian', 'mixolydian'].includes(m.id))
      .map(m => ({ id: m.id, name: m.name, iv: m.iv, source: 'mode' }))
  ];

  function findScale(id) {
    return SCALE_OPTIONS.find(s => s.id === id) ?? SCALE_OPTIONS[0];
  }

  let currentScale = $derived(findScale(scaleId));
  let scaleNotes = $derived(intervalsToNotes(rootIndex, currentScale.iv));
  let dots = $derived.by(() => {
    if (tab === 'explore' && activeTriadIdx >= 0 && scaleId === 'major') {
      const quality = HARMONIZED_MAJOR[activeTriadIdx];
      const chordType = CHORD_TYPES.find(c => c.id === quality);
      if (chordType) {
        const triadRoot = (rootIndex + currentScale.iv[activeTriadIdx]) % 12;
        return chordPositions(triadRoot, chordType.iv);
      }
    }
    if (tab === 'explore' || tab === 'practice') {
      return scalePositions(rootIndex, currentScale.iv);
    }
    // Quiz: show pattern but no labels
    return scalePositions(quizRi, quizScale.iv).map(d => ({ ...d, label: undefined }));
  });

  let formulaDisplay = $derived(
    NOTES[rootIndex] + ' ' + currentScale.name + ': ' + scaleNotes.join(' ')
  );

  let harmonizedTriads = $derived.by(() => {
    if (scaleId !== 'major') return [];
    const degrees = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii\u00b0'];
    return HARMONIZED_MAJOR.map((quality, i) => ({
      root: (rootIndex + currentScale.iv[i]) % 12,
      quality,
      degree: degrees[i]
    }));
  });

  async function playScale() {
    if (!tonePlayer || playing) return;
    playing = true;
    try {
      const notes = tab === 'quiz' ? intervalsToNotes(quizRi, quizScale.iv) : scaleNotes;
      for (let i = 0; i < notes.length; i++) {
        const freq = noteFreq(notes[i], 4);
        if (freq > 0) {
          tonePlayer.play(freq, 0.4);
          await new Promise(r => setTimeout(r, 450));
        }
      }
      const rootFreq = noteFreq(notes[0], 5);
      if (rootFreq > 0) {
        tonePlayer.play(rootFreq, 0.4);
        await new Promise(r => setTimeout(r, 450));
      }
    } finally {
      playing = false;
    }
  }

  function selectTriad(idx) {
    activeTriadIdx = activeTriadIdx === idx ? -1 : idx;
  }

  // --- Practice state ---
  let practiceItem = $state(null);
  let practiceRi = $state(0);
  let practiceScaleId = $state('major');
  let practiceScale = $derived(findScale(practiceScaleId));
  let practiceNotes = $derived(intervalsToNotes(practiceRi, practiceScale.iv));
  let practiceStep = $state(0);
  let practiceWrong = $state(null);
  let practiceWrongTimer = $state(null);
  let practiceComplete = $state(false);
  let practiceErrors = $state(0);
  let practiceStartTime = $state(0);
  let practiceFoundDots = $state([]);

  let practiceDots = $derived.by(() => {
    if (tab !== 'practice') return [];
    // Show found dots + wrong flash + remaining scale positions dimmed
    const all = scalePositions(practiceRi, practiceScale.iv);
    const result = [...practiceFoundDots];
    if (practiceWrong) {
      result.push({ str: practiceWrong.str, fret: practiceWrong.fret, color: '#e74c3c', label: 'X' });
    }
    return result;
  });

  function startPractice() {
    const item = nextPractice('scales');
    if (!item) return;
    practiceItem = item;
    const parts = item.split('_');
    practiceRi = parseInt(parts[0], 10);
    practiceScaleId = parts[1];
    practiceStep = 0;
    practiceWrong = null;
    practiceComplete = false;
    practiceErrors = 0;
    practiceStartTime = Date.now();
    practiceFoundDots = [];
  }

  function handlePracticeClick({ str, fret, note }) {
    if (practiceComplete || !practiceItem) return;

    const expectedNote = practiceNotes[practiceStep];
    if (note === expectedNote) {
      const degreeIdx = practiceStep;
      practiceFoundDots = [...practiceFoundDots, {
        str, fret, note,
        color: DEGREE_COLORS[degreeIdx % DEGREE_COLORS.length],
        label: note
      }];
      practiceStep++;
      if (tonePlayer) {
        tonePlayer.init();
        tonePlayer.play(noteFreq(note, 4), 0.3);
      }
      if (practiceStep >= practiceNotes.length) {
        practiceComplete = true;
        const elapsed = Date.now() - practiceStartTime;
        const correct = practiceErrors === 0;
        record('scales', practiceItem, correct, elapsed);
      }
    } else {
      practiceErrors++;
      if (practiceWrongTimer) clearTimeout(practiceWrongTimer);
      practiceWrong = { str, fret };
      practiceWrongTimer = setTimeout(() => { practiceWrong = null; }, 400);
    }
  }

  // --- Quiz state ---
  let quizItem = $state(null);
  let quizRi = $state(0);
  let quizScaleId = $state('major');
  let quizScale = $derived(findScale(quizScaleId));
  let quizPhase = $state('identify');
  let quizCorrect = $state(false);
  let quizStartTime = $state(0);
  let quizElapsed = $state(0);
  let quizTimer = $state(null);
  let quizOptions = $state([]);

  function generateQuizOptions(correctId) {
    const others = SCALE_OPTIONS.filter(s => s.id !== correctId);
    const shuffled = others.sort(() => Math.random() - 0.5).slice(0, 3);
    const options = [...shuffled, SCALE_OPTIONS.find(s => s.id === correctId)];
    return options.sort(() => Math.random() - 0.5);
  }

  function startQuiz() {
    const item = nextQuiz('scales');
    if (!item) return;
    quizItem = item;
    const parts = item.split('_');
    quizRi = parseInt(parts[0], 10);
    quizScaleId = parts[1];
    quizPhase = 'identify';
    quizCorrect = false;
    quizStartTime = Date.now();
    quizElapsed = 0;
    quizOptions = generateQuizOptions(quizScaleId);
    if (quizTimer) clearInterval(quizTimer);
    quizTimer = setInterval(() => {
      quizElapsed = Math.floor((Date.now() - quizStartTime) / 1000);
    }, 200);
  }

  function handleQuizAnswer(chosenId) {
    if (quizPhase !== 'identify') return;
    if (quizTimer) clearInterval(quizTimer);
    const elapsed = Date.now() - quizStartTime;
    quizCorrect = chosenId === quizScaleId;
    quizPhase = 'result';
    record('scales', quizItem, quizCorrect, elapsed);
  }

  function switchTab(t) {
    if (quizTimer) clearInterval(quizTimer);
    tab = t;
    activeTriadIdx = -1;
    if (t === 'practice') startPractice();
    if (t === 'quiz') startQuiz();
  }
</script>

<div class="scale-exercise">
  <div class="tab-bar">
    <button class:active={tab === 'explore'} onclick={() => switchTab('explore')}>Explore</button>
    <button class:active={tab === 'practice'} onclick={() => switchTab('practice')}>Practice</button>
    <button class:active={tab === 'quiz'} onclick={() => switchTab('quiz')}>Quiz</button>
  </div>

  {#if tab === 'explore'}
    <div class="controls">
      <label class="control-group">
        <span class="control-label">Root</span>
        <select bind:value={rootIndex}>
          {#each NOTES as note, i}
            <option value={i}>{note}</option>
          {/each}
        </select>
      </label>

      <label class="control-group">
        <span class="control-label">Scale</span>
        <select bind:value={scaleId}>
          {#each SCALE_OPTIONS as opt}
            <option value={opt.id}>{opt.name}</option>
          {/each}
        </select>
      </label>

      <button class="play-btn" onclick={playScale} disabled={playing || !tonePlayer}>
        {playing ? 'Playing...' : 'Play Scale'}
      </button>
    </div>

    <div class="formula">{formulaDisplay}</div>

    <div class="degree-legend">
      {#each scaleNotes as note, i}
        <span class="degree-chip" style="background:{DEGREE_COLORS[i % DEGREE_COLORS.length]}">
          {note}
        </span>
      {/each}
    </div>

    <InteractiveFretboard {dots} />

    {#if harmonizedTriads.length > 0}
      <div class="harmonized">
        <h3 class="harmonized-title">Harmonized Triads</h3>
        <div class="triad-row">
          {#each harmonizedTriads as triad, i}
            <ChordCard
              root={triad.root}
              quality={triad.quality}
              degree={triad.degree}
              active={activeTriadIdx === i}
              onclick={() => selectTriad(i)}
            />
          {/each}
        </div>
      </div>
    {/if}

  {:else if tab === 'practice'}
    {#if practiceItem}
      <div class="practice-header">
        <span class="practice-prompt">
          Play the <strong>{NOTES[practiceRi]} {practiceScale.name}</strong> scale — click degrees in order
        </span>
        <span class="practice-step">{practiceStep} / {practiceNotes.length}</span>
      </div>

      <div class="degree-legend">
        {#each practiceNotes as note, i}
          <span class="degree-chip" style="background:{i < practiceStep ? DEGREE_COLORS[i % DEGREE_COLORS.length] : '#555'}">
            {i < practiceStep ? note : '?'}
          </span>
        {/each}
      </div>

      <InteractiveFretboard dots={practiceDots} onclick={handlePracticeClick} />

      {#if practiceComplete}
        <div class="result-banner" class:correct={practiceErrors === 0} class:wrong={practiceErrors > 0}>
          {practiceErrors === 0 ? 'Perfect!' : `Complete with ${practiceErrors} error${practiceErrors > 1 ? 's' : ''}`}
        </div>
      {/if}

      <div class="action-row">
        <button class="play-btn" onclick={startPractice}>
          {practiceComplete ? 'Next' : 'Skip'}
        </button>
      </div>
    {:else}
      <p class="empty-hint">No items available for practice</p>
    {/if}

  {:else}
    <!-- Quiz -->
    {#if quizItem}
      <div class="quiz-header">
        <span class="quiz-prompt">
          {#if quizPhase === 'identify'}
            Identify this scale in <strong>{NOTES[quizRi]}</strong>
          {:else if quizCorrect}
            Correct! — {NOTES[quizRi]} {quizScale.name}
          {:else}
            Wrong — it was <strong>{NOTES[quizRi]} {quizScale.name}</strong>
          {/if}
        </span>
        <span class="quiz-timer">{quizElapsed}s</span>
      </div>

      <InteractiveFretboard dots={
        quizPhase === 'result'
          ? scalePositions(quizRi, quizScale.iv)
          : scalePositions(quizRi, quizScale.iv).map(d => ({ ...d, label: undefined }))
      } />

      {#if quizPhase === 'identify'}
        <div class="quiz-choices">
          {#each quizOptions as opt}
            <button class="choice-btn" onclick={() => handleQuizAnswer(opt.id)}>
              {opt.name}
            </button>
          {/each}
        </div>
      {:else}
        <div class="action-row">
          <button class="play-btn" onclick={playScale}>Play Scale</button>
          <button class="play-btn" onclick={startQuiz}>Next</button>
        </div>
      {/if}
    {:else}
      <p class="empty-hint">No items available for quiz</p>
    {/if}
  {/if}
</div>

<style>
  .scale-exercise {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .tab-bar { display: flex; gap: 0; border-bottom: 2px solid #333; margin-bottom: 1rem; }
  .tab-bar button { padding: 0.5rem 1.2rem; background: none; border: none; color: #aaa; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; font-size: 0.95rem; }
  .tab-bar button.active { color: #fff; border-bottom-color: #4fc3f7; }
  .tab-bar button:hover:not(.active) { color: #ccc; }
  .controls {
    display: flex;
    align-items: flex-end;
    gap: 12px;
    flex-wrap: wrap;
  }
  .control-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .control-label {
    font-size: 12px;
    color: var(--mt);
    font-family: 'JetBrains Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  select {
    background: var(--sf);
    color: var(--tx);
    border: 1px solid var(--bd);
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 14px;
    font-family: inherit;
    cursor: pointer;
  }
  select:focus {
    outline: none;
    border-color: #58A6FF;
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
  .play-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .formula {
    font-family: 'JetBrains Mono', monospace;
    font-size: 15px;
    color: var(--tx);
    padding: 8px 12px;
    background: var(--sf);
    border-radius: 6px;
    border: 1px solid var(--bd);
  }
  .degree-legend {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .degree-chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    height: 24px;
    padding: 0 6px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 700;
    color: #fff;
    font-family: 'JetBrains Mono', monospace;
  }
  .harmonized {
    margin-top: 8px;
  }
  .harmonized-title {
    font-size: 14px;
    color: var(--mt);
    margin: 0 0 10px;
    font-weight: 600;
  }
  .triad-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .practice-header, .quiz-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }
  .practice-prompt, .quiz-prompt {
    font-size: 15px;
    color: var(--tx);
  }
  .practice-prompt strong, .quiz-prompt strong {
    color: #58A6FF;
  }
  .practice-step {
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    color: #4ECB71;
    font-weight: 700;
  }
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
  .quiz-choices {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .choice-btn {
    flex: 1;
    min-width: 120px;
    padding: 10px;
    border: 2px solid var(--bd);
    border-radius: 8px;
    background: var(--sf);
    color: var(--tx);
    cursor: pointer;
    font: inherit;
    font-weight: 600;
    transition: border-color .12s, background .12s;
  }
  .choice-btn:hover { border-color: #58A6FF; background: rgba(88,166,255,.08); }
  .empty-hint {
    text-align: center;
    color: var(--mt);
    font-size: 14px;
    padding: 2rem 0;
  }
</style>
