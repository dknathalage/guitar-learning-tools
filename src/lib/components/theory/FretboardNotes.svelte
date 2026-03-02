<script>
  import { NOTES } from '$lib/constants/music.js';
  import InteractiveFretboard from '$lib/components/svg/InteractiveFretboard.svelte';
  import { allPositions, noteFreq } from '$lib/components/theory/theory-utils.js';
  import { record, nextPractice, nextQuiz } from '$lib/mastery/store.svelte.js';

  let { tonePlayer } = $props();

  let tab = $state('explore');
  let selectedNote = $state('C');

  // Practice state
  let practiceNote = $state(null);
  let practiceFound = $state(new Set());
  let practiceWrong = $state(null);
  let practiceWrongTimer = $state(null);
  let practiceStart = $state(0);

  // Quiz state
  let quizNote = $state(null);
  let quizFound = $state(new Set());
  let quizWrong = $state(null);
  let quizWrongTimer = $state(null);
  let quizStart = $state(0);
  let quizElapsed = $state(0);
  let quizTimer = $state(null);
  let quizScore = $state(0);
  let quizTotal = $state(0);

  function pickPractice() {
    const key = nextPractice('fretboard');
    practiceNote = key;
    practiceFound = new Set();
    practiceWrong = null;
    practiceStart = Date.now();
  }

  function pickQuiz() {
    const key = nextQuiz('fretboard');
    quizNote = key;
    quizFound = new Set();
    quizWrong = null;
    quizStart = Date.now();
    quizElapsed = 0;
    if (quizTimer) clearInterval(quizTimer);
    quizTimer = setInterval(() => {
      quizElapsed = Date.now() - quizStart;
    }, 100);
  }

  let targetNote = $derived(
    tab === 'explore' ? selectedNote :
    tab === 'practice' ? practiceNote :
    quizNote
  );

  let positions = $derived(targetNote ? allPositions(targetNote) : []);
  let totalCount = $derived(positions.length);

  let currentFound = $derived(tab === 'practice' ? practiceFound : quizFound);
  let foundCount = $derived(currentFound.size);
  let currentWrong = $derived(tab === 'practice' ? practiceWrong : quizWrong);

  let dots = $derived.by(() => {
    if (tab === 'explore') {
      return positions.map(p => ({
        str: p.str,
        fret: p.fret,
        color: '#58A6FF',
        label: targetNote
      }));
    }
    // Practice/Quiz: show found positions green, wrong flash red
    const result = [];
    for (const p of positions) {
      const key = `${p.str},${p.fret}`;
      if (currentFound.has(key)) {
        result.push({ str: p.str, fret: p.fret, color: '#4ECB71', label: targetNote });
      }
    }
    if (currentWrong) {
      result.push({ str: currentWrong.str, fret: currentWrong.fret, color: '#e74c3c', label: 'X' });
    }
    return result;
  });

  function handleClick({ str, fret, note }) {
    if (tab === 'explore') return;
    if (!targetNote) return;

    const posKey = `${str},${fret}`;
    const correct = note === targetNote;

    if (tab === 'practice') {
      const rt = Date.now() - practiceStart;
      if (correct) {
        if (!practiceFound.has(posKey)) {
          practiceFound = new Set([...practiceFound, posKey]);
          record('fretboard', targetNote, true, rt);
          if (tonePlayer) {
            tonePlayer.init();
            const octave = Math.floor((40 + str * 5 + fret) / 12) + 1;
            tonePlayer.playNote(noteFreq(note, octave), 0.5);
          }
        }
      } else {
        record('fretboard', targetNote, false, rt);
        if (practiceWrongTimer) clearTimeout(practiceWrongTimer);
        practiceWrong = { str, fret };
        practiceWrongTimer = setTimeout(() => { practiceWrong = null; }, 400);
      }
    } else if (tab === 'quiz') {
      const rt = Date.now() - quizStart;
      if (correct) {
        if (!quizFound.has(posKey)) {
          quizFound = new Set([...quizFound, posKey]);
          quizScore++;
          quizTotal++;
          record('fretboard', targetNote, true, rt);
          if (tonePlayer) {
            tonePlayer.init();
            const octave = Math.floor((40 + str * 5 + fret) / 12) + 1;
            tonePlayer.playNote(noteFreq(note, octave), 0.5);
          }
        }
      } else {
        quizTotal++;
        record('fretboard', targetNote, false, rt);
        if (quizWrongTimer) clearTimeout(quizWrongTimer);
        quizWrong = { str, fret };
        quizWrongTimer = setTimeout(() => { quizWrong = null; }, 400);
      }
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

  // Stop quiz timer when all found
  $effect(() => {
    if (tab === 'quiz' && foundCount === totalCount && totalCount > 0 && quizTimer) {
      clearInterval(quizTimer);
      quizTimer = null;
    }
  });
</script>

<div class="fn-wrap">
  <div class="tab-bar">
    <button class:active={tab === 'explore'} onclick={() => switchTab('explore')}>Explore</button>
    <button class:active={tab === 'practice'} onclick={() => switchTab('practice')}>Practice</button>
    <button class:active={tab === 'quiz'} onclick={() => switchTab('quiz')}>Quiz</button>
  </div>

  <div class="fn-controls">
    {#if tab === 'explore'}
      <label class="fn-label">
        Note
        <select class="fn-select" bind:value={selectedNote}>
          {#each NOTES as n}
            <option value={n}>{n}</option>
          {/each}
        </select>
      </label>
      <span class="fn-info">{totalCount} positions on the fretboard</span>
    {:else if tab === 'practice'}
      {#if practiceNote}
        <span class="fn-target">Find all positions of: <strong>{practiceNote}</strong></span>
        <span class="fn-score">{foundCount} / {totalCount}</span>
        <button class="fn-btn" onclick={pickPractice}>Next</button>
      {/if}
    {:else}
      {#if quizNote}
        <span class="fn-target">Find all <strong>{quizNote}</strong> notes</span>
        <span class="fn-score">{quizScore}/{quizTotal}</span>
        <span class="fn-timer">{formatTime(quizElapsed)}</span>
        <button class="fn-btn" onclick={pickQuiz}>Next</button>
      {/if}
    {/if}
  </div>

  <InteractiveFretboard {dots} onclick={handleClick} />

  {#if tab !== 'explore' && foundCount === totalCount && totalCount > 0}
    <div class="fn-complete">All {totalCount} positions found!</div>
  {/if}
</div>

<style>
  .fn-wrap{display:flex;flex-direction:column;gap:.75rem}
  .tab-bar{display:flex;gap:0;border-bottom:2px solid #333;margin-bottom:1rem}
  .tab-bar button{padding:.5rem 1.2rem;background:none;border:none;color:#aaa;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;font-size:.95rem}
  .tab-bar button.active{color:#fff;border-bottom-color:#4fc3f7}
  .tab-bar button:hover:not(.active){color:#ccc}
  .fn-controls{display:flex;align-items:center;gap:1rem;flex-wrap:wrap}
  .fn-label{display:flex;align-items:center;gap:.5rem;font-size:14px;color:var(--mt)}
  .fn-select{padding:.3rem .5rem;background:var(--sf);border:1px solid var(--bd);border-radius:6px;color:var(--tx);font-size:14px;font-family:'JetBrains Mono',monospace}
  .fn-info{font-size:13px;color:var(--mt)}
  .fn-target{font-size:15px;color:var(--tx)}
  .fn-target strong{color:#58A6FF;font-size:18px}
  .fn-score{font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:700;color:#4ECB71}
  .fn-timer{font-family:'JetBrains Mono',monospace;font-size:14px;color:var(--mt)}
  .fn-btn{padding:.4rem .8rem;background:var(--sf);border:1px solid var(--bd);border-radius:6px;color:var(--tx);font-size:13px;cursor:pointer;transition:border-color .15s}
  .fn-btn:hover{border-color:var(--mt)}
  .fn-complete{text-align:center;padding:.6rem;background:rgba(78,203,113,.1);border:1px solid rgba(78,203,113,.3);border-radius:8px;color:#4ECB71;font-weight:600;font-size:14px}
</style>
