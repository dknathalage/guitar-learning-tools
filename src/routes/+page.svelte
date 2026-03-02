<script>
  import { onDestroy } from 'svelte';
  import { base } from '$app/paths';
  import { TonePlayer } from '$lib/audio/TonePlayer.js';
  import { getSectionScore } from '$lib/mastery/store.svelte.js';
  import FretboardNotes from '$lib/components/theory/FretboardNotes.svelte';
  import IntervalExercise from '$lib/components/theory/IntervalExercise.svelte';
  import TriadExercise from '$lib/components/theory/TriadExercise.svelte';
  import ScaleExercise from '$lib/components/theory/ScaleExercise.svelte';
  import SeventhChords from '$lib/components/theory/SeventhChords.svelte';
  import ChordBuilder from '$lib/components/theory/ChordBuilder.svelte';
  import IIVITrainer from '$lib/components/theory/IIVITrainer.svelte';

  function ringColor(score) {
    if (score <= 0) return '#555';
    if (score < 50) return '#58a6ff';
    if (score < 90) return '#3fb950';
    return '#d4a017';
  }

  const EXERCISES = [
    { id: 'fretboard', label: 'Fretboard Notes', icon: 'F' },
    { id: 'intervals', label: 'Intervals', icon: 'I' },
    { id: 'triads', label: 'Triads', icon: 'T' },
    { id: 'scales', label: 'Scales', icon: 'S' },
    { id: 'sevenths', label: '7th Chords', icon: '7' },
    { id: 'builder', label: 'Chord Builder', icon: 'B' },
    { id: 'iiVI', label: 'ii-V-I Trainer', icon: 'P' },
  ];

  let active = $state('fretboard');
  let tonePlayer = new TonePlayer();

  onDestroy(() => {
    tonePlayer.stop();
  });
</script>

<svelte:head>
  <title>Theory Trainer</title>
</svelte:head>

<div class="theory-page">
  <!-- Sidebar (desktop) / pill row (mobile) -->
  <nav class="sidebar" aria-label="Exercise navigation">
    <div class="sidebar-title">Theory Trainer</div>
    {#each EXERCISES as ex (ex.id)}
      {@const score = getSectionScore(ex.id)}
      {@const circ = Math.PI * 16}
      <button
        class="sidebar-item"
        class:active={active === ex.id}
        onclick={() => { active = ex.id; }}
      >
        <span class="sidebar-icon">{ex.icon}</span>
        <span class="sidebar-label">{ex.label}</span>
        <svg class="progress-ring" width="22" height="22" viewBox="0 0 22 22">
          <circle cx="11" cy="11" r="8" fill="none" stroke="var(--bd)" stroke-width="2.5" />
          {#if score > 0}
            <circle cx="11" cy="11" r="8" fill="none"
              stroke={ringColor(score)} stroke-width="2.5"
              stroke-dasharray={circ}
              stroke-dashoffset={circ * (1 - score / 100)}
              stroke-linecap="round"
              transform="rotate(-90 11 11)" />
          {/if}
        </svg>
      </button>
    {/each}

    <div class="sidebar-divider"></div>
    <div class="sidebar-section-label">Tools</div>
    <a href="{base}/tuner" class="sidebar-link">
      <span class="sidebar-icon">&#x266A;</span>
      <span class="sidebar-label">Tuner</span>
    </a>
    <a href="{base}/caged" class="sidebar-link">
      <span class="sidebar-icon">C</span>
      <span class="sidebar-label">CAGED Visualizer</span>
    </a>
  </nav>

  <!-- Main content area -->
  <main class="content">
    {#if active === 'fretboard'}
      <FretboardNotes {tonePlayer} />
    {:else if active === 'intervals'}
      <IntervalExercise {tonePlayer} />
    {:else if active === 'triads'}
      <TriadExercise {tonePlayer} />
    {:else if active === 'scales'}
      <ScaleExercise {tonePlayer} />
    {:else if active === 'sevenths'}
      <SeventhChords {tonePlayer} />
    {:else if active === 'builder'}
      <ChordBuilder {tonePlayer} />
    {:else if active === 'iiVI'}
      <IIVITrainer {tonePlayer} />
    {/if}
  </main>
</div>

<style>
  .theory-page {
    display: flex;
    height: 100vh;
    width: 100%;
    overflow: hidden;
  }

  /* Sidebar */
  .sidebar {
    width: 220px;
    flex-shrink: 0;
    background: var(--sf);
    border-right: 1px solid var(--bd);
    display: flex;
    flex-direction: column;
    padding: .75rem .5rem;
    gap: .25rem;
    overflow-y: auto;
  }

  .sidebar-title {
    font-family: 'Outfit', sans-serif;
    font-size: .85rem;
    font-weight: 800;
    color: var(--tx);
    letter-spacing: -.5px;
    padding: .2rem .5rem .5rem;
    border-bottom: 1px solid var(--bd);
    margin-bottom: .35rem;
  }

  .sidebar-item {
    display: flex;
    align-items: center;
    gap: .5rem;
    padding: .45rem .55rem;
    border-radius: 8px;
    border: none;
    background: none;
    color: var(--mt);
    font-family: 'JetBrains Mono', monospace;
    font-size: .78rem;
    font-weight: 600;
    cursor: pointer;
    transition: all .15s;
    text-align: left;
    white-space: nowrap;
  }
  .sidebar-item:hover {
    background: var(--sf2);
    color: var(--tx);
  }
  .sidebar-item.active {
    background: rgba(88, 166, 255, .1);
    color: var(--ac);
  }

  .sidebar-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 6px;
    background: var(--sf2);
    font-size: .7rem;
    font-weight: 700;
    flex-shrink: 0;
  }
  .sidebar-item.active .sidebar-icon {
    background: rgba(88, 166, 255, .18);
    color: var(--ac);
  }

  .progress-ring {
    margin-left: auto;
    flex-shrink: 0;
  }

  .sidebar-divider {
    height: 1px;
    background: var(--bd);
    margin: .5rem .25rem;
  }

  .sidebar-section-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: .6rem;
    font-weight: 700;
    color: var(--mt);
    text-transform: uppercase;
    letter-spacing: 1px;
    padding: .1rem .5rem .3rem;
  }

  .sidebar-link {
    display: flex;
    align-items: center;
    gap: .5rem;
    padding: .45rem .55rem;
    border-radius: 8px;
    color: var(--mt);
    font-family: 'JetBrains Mono', monospace;
    font-size: .78rem;
    font-weight: 600;
    text-decoration: none;
    transition: all .15s;
    white-space: nowrap;
  }
  .sidebar-link:hover {
    background: var(--sf2);
    color: var(--tx);
  }

  /* Main content */
  .content {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }

  /* Mobile: sidebar becomes horizontal pill row */
  @media (max-width: 768px) {
    .theory-page {
      flex-direction: column;
      height: 100vh;
    }

    .sidebar {
      width: 100%;
      flex-direction: row;
      border-right: none;
      border-bottom: 1px solid var(--bd);
      padding: .5rem;
      gap: .4rem;
      overflow-x: auto;
      overflow-y: hidden;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      flex-shrink: 0;
      align-items: center;
    }
    .sidebar::-webkit-scrollbar {
      display: none;
    }

    .sidebar-title {
      display: none;
    }

    .sidebar-divider {
      width: 1px;
      height: 20px;
      margin: 0 .25rem;
      flex-shrink: 0;
    }

    .sidebar-section-label {
      display: none;
    }

    .sidebar-item {
      flex-shrink: 0;
      padding: .35rem .6rem;
      border-radius: 16px;
      font-size: .72rem;
      border: 1px solid var(--bd);
    }
    .sidebar-item.active {
      border-color: var(--ac);
    }

    .sidebar-link {
      flex-shrink: 0;
      padding: .35rem .6rem;
      border-radius: 16px;
      font-size: .72rem;
      border: 1px solid var(--bd);
    }
    .sidebar-link:hover {
      border-color: var(--ac);
      color: var(--ac);
    }

    .sidebar-icon {
      display: none;
    }

    .progress-ring {
      display: none;
    }

    .content {
      flex: 1;
      min-height: 0;
    }
  }
</style>
