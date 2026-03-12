<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { progress } from '$lib/stores/progress.svelte';
  import Fretboard from '$lib/components/guide/Fretboard.svelte';
  import ChordBox from '$lib/components/guide/ChordBox.svelte';
  import Block from '$lib/components/guide/Block.svelte';
  import CheckItem from '$lib/components/guide/CheckItem.svelte';

  let scrollPct = $state(0);
  let currentPhase = $state(0);

  const PHASES = [
    { n: 1, name: 'Notes on Fretboard' },
    { n: 2, name: 'How Chords Are Built' },
    { n: 3, name: 'CAGED System' },
    { n: 4, name: 'Minor Pentatonic Box 1' },
    { n: 5, name: 'All 5 Pent Boxes' },
    { n: 6, name: 'Scales Meet Chords' },
    { n: 7, name: 'Natural Minor' },
    { n: 8, name: 'Harmonic Minor' },
    { n: 9, name: 'Techniques for Speed' },
    { n: 10, name: 'Phrasing & Musicality' },
    { n: 11, name: 'All Together' },
  ];

  function scrollToPhase(n: number) {
    const el = document.getElementById(`phase-${n}`);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }

  onMount(() => {
    function onScroll() {
      const el = document.documentElement;
      const total = el.scrollHeight - el.clientHeight;
      scrollPct = total > 0 ? (el.scrollTop / total) * 100 : 0;

      // find current phase
      for (let i = PHASES.length; i >= 1; i--) {
        const el2 = document.getElementById(`phase-${i}`);
        if (el2 && el2.getBoundingClientRect().top <= 120) {
          currentPhase = i;
          break;
        }
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  });

  // ——— Note data helpers ———
  const ROOT = '#DC2626';
  const THIRD = '#2563EB';
  const FIFTH = '#16A34A';
  const OTHER = '#1A1A2E';
  const ORANGE = '#D97706';
  const GOLD = '#F59E0B';
  const GRAY = '#9CA3AF';

  // Full note map for all 6 strings, frets 0-12
  const CHROMATIC = ['E','F','F#','G','G#','A','A#','B','C','C#','D','D#'];
  const OPEN_NOTES = [4, 11, 7, 2, 9, 4]; // E B G D A E (indices in CHROMATIC, str 1-6)

  function noteAtFret(stringIdx: number, fret: number): string {
    const open = OPEN_NOTES[stringIdx - 1];
    return CHROMATIC[(open + fret) % 12];
  }
</script>

<svelte:head>
  <title>Guitar → Anime Solo | Visual Guide</title>
  <meta name="description" content="A visual guitar learning guide from chords to anime solos. 11 phases, inline SVG diagrams." />
</svelte:head>

<!-- Root wrapper with dark mode -->
<div class="guide-root" class:dark={progress.dark}>

<!-- Progress bar -->
<div class="progress-bar" style="width:{scrollPct}%"></div>

<!-- Nav -->
<nav class="top-nav">
  <div class="nav-links">
    <a href="{base}/" class="nav-brand">🎸 Guide</a>
    <a href="{base}/caged">CAGED</a>
    <a href="{base}/tuner">Tuner</a>
  </div>
  <button class="dark-toggle" onclick={() => progress.toggleDark()} aria-label="Toggle dark mode">
    {progress.dark ? '☀️' : '🌙'}
  </button>
</nav>

<!-- ═══════════════════════════════════════════════════
     HERO
════════════════════════════════════════════════════ -->
<section class="hero">
  <div class="hero-inner">
    <h1 class="hero-title">Guitar <span class="arrow">→</span> Anime Solo</h1>
    <p class="hero-sub">A Visual Guide</p>
    <div class="hero-tags">
      <span class="tag">11 phases</span>
      <span class="tag">learn by seeing</span>
      <span class="tag">6–12 months at 30 min/day</span>
    </div>
    <p class="hero-desc">Start knowing chords. End playing anime openings.<br/>~70% diagrams. Zero fluff.</p>
  </div>
</section>

<!-- ═══════════════════════════════════════════════════
     TABLE OF CONTENTS — SVG ROADMAP
════════════════════════════════════════════════════ -->
<section class="section">
  <h2 class="section-title">Your Roadmap</h2>
  <div class="diagram-wrap">
    <svg viewBox="0 0 300 520" width="100%" style="display:block;max-width:360px;margin:0 auto" role="img" aria-label="Roadmap of 11 phases">
      <!-- Connection lines -->
      {#each Array(10) as _, i}
        <line x1="150" y1={40 + i*46 + 22} x2="150" y2={40 + (i+1)*46 - 8} stroke="#9CA3AF" stroke-width="2" stroke-dasharray="4,3"/>
      {/each}
      <!-- Phase nodes -->
      {#each PHASES as ph}
        {@const y = 40 + (ph.n - 1) * 46}
        {@const color = ph.n <= 4 ? '#16A34A' : ph.n <= 7 ? '#D97706' : '#DC2626'}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <g onclick={() => scrollToPhase(ph.n)} style="cursor:pointer">
          <circle cx="150" cy={y} r="20" fill={color} opacity="0.9"/>
          <text x="150" y={y + 5} text-anchor="middle" font-size="12" font-weight="700" fill="white">{ph.n}</text>
          <text x="178" y={y + 4} text-anchor="start" font-size="10" fill="currentColor" opacity="0.8">{ph.name}</text>
        </g>
      {/each}
    </svg>
    <p style="text-align:center;font-size:0.78rem;opacity:0.5;margin-top:4px">Tap a phase to jump there</p>
  </div>
</section>

<!-- ═══════════════════════════════════════════════════
     LEGEND
════════════════════════════════════════════════════ -->
<section class="section">
  <h2 class="section-title">How to Use This Guide</h2>
  <p style="font-size:0.9rem;line-height:1.6;margin-bottom:12px">Scroll section by section. Complete the CHECK items before moving on. Dark mode toggle is top-right.</p>
  <div class="legend-grid">
    {#each [
      {color:'#2563EB', bg:'#EFF6FF', label:'CONCEPT'},
      {color:'#7C3AED', bg:'#F5F3FF', label:'DIAGRAM'},
      {color:'#16A34A', bg:'#F0FDF4', label:'DO THIS'},
      {color:'#D97706', bg:'#FFFBEB', label:'TIP'},
      {color:'#DC2626', bg:'#FEF2F2', label:'AVOID'},
      {color:'#0D9488', bg:'#F0FDFA', label:'CHECK'},
    ] as item}
      <div class="legend-item" style="border-left:3px solid {item.color};background:{item.bg};padding:6px 10px;border-radius:0 4px 4px 0">
        <span style="font-size:0.7rem;font-weight:800;color:{item.color}">{item.label}</span>
      </div>
    {/each}
  </div>
  <div class="fret-legend">
    <h3 style="font-size:0.8rem;font-weight:700;margin:12px 0 8px;opacity:0.7">FRETBOARD SYMBOLS</h3>
    <div class="symbol-row">
      <svg width="80" height="20" style="vertical-align:middle"><circle cx="10" cy="10" r="9" fill="#DC2626"/><text x="10" y="14" text-anchor="middle" font-size="7" fill="white" font-weight="700">R</text><text x="30" y="14" font-size="9" fill="currentColor">= Root</text></svg>
      <svg width="80" height="20"><circle cx="10" cy="10" r="9" fill="#2563EB"/><text x="10" y="14" text-anchor="middle" font-size="7" fill="white" font-weight="700">3</text><text x="30" y="14" font-size="9" fill="currentColor">= 3rd</text></svg>
      <svg width="80" height="20"><circle cx="10" cy="10" r="9" fill="#16A34A"/><text x="10" y="14" text-anchor="middle" font-size="7" fill="white" font-weight="700">5</text><text x="30" y="14" font-size="9" fill="currentColor">= 5th</text></svg>
      <svg width="90" height="20"><circle cx="10" cy="10" r="9" fill="#F59E0B"/><text x="10" y="14" text-anchor="middle" font-size="7" fill="white" font-weight="700">△</text><text x="30" y="14" font-size="9" fill="currentColor">= Raised 7th</text></svg>
      <svg width="80" height="20"><circle cx="10" cy="10" r="8" fill="none" stroke="#9CA3AF" stroke-width="2"/><text x="30" y="14" font-size="9" fill="currentColor">= Passing</text></svg>
      <svg width="60" height="20"><text x="10" y="14" font-size="13" fill="currentColor">×</text><text x="24" y="14" font-size="9" fill="currentColor">= Muted</text></svg>
    </div>
  </div>
</section>

<!-- ═══════════════════════════════════════════════════
     PHASE 1: Notes on the Fretboard
════════════════════════════════════════════════════ -->
<section class="section phase" id="phase-1">
  <div class="phase-header" style="--accent:#16A34A">
    <span class="phase-num">Phase 1</span>
    <h2 class="phase-title">Notes on the Fretboard</h2>
  </div>

  <Block type="concept">
    <p>The guitar fretboard is a grid: 6 strings × 12+ frets. Each fret = one semitone (half step). After 12 frets, the notes repeat an octave higher.</p>
  </Block>

  <Block type="diagram" title="STRINGS 5 & 6 — LEARN THESE FIRST">
    <!-- Full fretboard frets 0-12, strings 5&6 labeled, 1-4 grayed -->
    <svg viewBox="0 0 520 100" width="100%" style="display:block" role="img" aria-label="Full fretboard strings 5 and 6">
      {#if true}
      {@const STR_Y = [16, 28, 40, 52, 64, 76]}
      {@const FRET_X = Array.from({length:13}, (_, i) => 36 + i * 37)}
      <!-- String lines -->
      {#each STR_Y as y, i}
        <line x1="36" y1={y} x2="512" y2={y} stroke="currentColor" stroke-width={i>=3?1+(i-3)*0.3:0.8} opacity={i>=4?0.7:0.2}/>
      {/each}
      <!-- Nut -->
      <line x1="36" y1="10" x2="36" y2="82" stroke="currentColor" stroke-width="4" stroke-linecap="round" opacity="0.6"/>
      <!-- Fret lines -->
      {#each Array(13) as _, fi}
        <line x1={FRET_X[fi]} y1="10" x2={FRET_X[fi]} y2="82" stroke="currentColor" stroke-width="0.8" opacity="0.2"/>
      {/each}
      <!-- String names -->
      <text x="20" y="20" text-anchor="middle" font-size="8" fill="currentColor" opacity="0.3">e</text>
      <text x="20" y="32" text-anchor="middle" font-size="8" fill="currentColor" opacity="0.3">B</text>
      <text x="20" y="44" text-anchor="middle" font-size="8" fill="currentColor" opacity="0.3">G</text>
      <text x="20" y="56" text-anchor="middle" font-size="8" fill="currentColor" opacity="0.3">D</text>
      <text x="20" y="68" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.85">A</text>
      <text x="20" y="80" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.85">E</text>
      <!-- "Learn later" label for strings 1-4 -->
      <text x="274" y="46" text-anchor="middle" font-size="8" fill="currentColor" opacity="0.3" font-style="italic">← learn later →</text>
      <!-- Notes on string 6 (E) and 5 (A) -->
      {#each Array(13) as _, fi}
        {@const n6 = noteAtFret(6, fi)}
        {@const n5 = noteAtFret(5, fi)}
        {@const x = fi === 0 ? 36 - 10 : FRET_X[fi] - 18.5}
        <!-- String 6 (E) -->
        <rect x={x+2} y={STR_Y[5]-7} width={fi===0?16:15} height={13} rx="3"
          fill={n6==='A'?ROOT:n6.includes('#')?GRAY:OTHER} opacity={n6==='A'?0.9:n6.includes('#')?0.35:0.75}/>
        <text x={x+9.5} y={STR_Y[5]+4} text-anchor="middle" font-size={n6.includes('#')?6.5:7.5} fill="white" font-weight="600">{n6}</text>
        <!-- String 5 (A) -->
        <rect x={x+2} y={STR_Y[4]-7} width={fi===0?16:15} height={13} rx="3"
          fill={n5==='A'?ROOT:n5.includes('#')?GRAY:OTHER} opacity={n5==='A'?0.9:n5.includes('#')?0.35:0.75}/>
        <text x={x+9.5} y={STR_Y[4]+4} text-anchor="middle" font-size={n5.includes('#')?6.5:7.5} fill="white" font-weight="600">{n5}</text>
      {/each}
      <!-- Landmark fret dots -->
      {#each [3,5,7,9,12] as lf}
        {@const x = FRET_X[lf] - 18.5}
        <text x={x+9.5} y="96" text-anchor="middle" font-size="7" fill="#3D348B" font-weight="700">{lf}</text>
      {/each}
      {/if}
    </svg>
    <p class="diagram-caption">Strings 5 & 6 labeled. <span style="color:{ROOT}">■</span> = A (your anchor note). Gray = sharps/flats. Numbers = landmark frets.</p>
  </Block>

  <Block type="diagram" title="HALF STEPS: B→C AND E→F">
    <svg viewBox="0 0 420 60" width="100%" style="display:block" role="img" aria-label="Chromatic pattern showing half steps">
      {#if true}
      {@const notes = ['E','F','F#','G','G#','A','A#','B','C','C#','D','D#','E']}
      {@const xs = notes.map((_, i) => 20 + i * 30)}
      {#each notes as n, i}
        {@const isHalf = (n === 'F' && notes[i-1] === 'E') || (n === 'C' && notes[i-1] === 'B') || (i === 12)}
        {@const col = isHalf ? '#DC2626' : n.includes('#') ? GRAY : OTHER}
        <circle cx={xs[i]} cy={28} r={10} fill={col} opacity="0.85"/>
        <text x={xs[i]} y={32} text-anchor="middle" font-size={n.includes('#')?6:8} fill="white" font-weight="700">{n}</text>
        {#if i < notes.length - 1}
          {@const isH = (notes[i+1]==='F'&&n==='E') || (notes[i+1]==='C'&&n==='B')}
          {#if isH}
            <!-- Half step bracket -->
            <path d="M{xs[i]+10} 20 L{xs[i]+10} 14 L{xs[i+1]-10} 14 L{xs[i+1]-10} 20" fill="none" stroke="#DC2626" stroke-width="1.5"/>
            <text x={(xs[i]+xs[i+1])/2} y={11} text-anchor="middle" font-size="7" fill="#DC2626" font-weight="700">½</text>
          {:else}
            <!-- Whole step: small arrow -->
            <text x={(xs[i]+xs[i+1])/2} y={32} text-anchor="middle" font-size="9" fill="currentColor" opacity="0.3">–</text>
          {/if}
        {/if}
      {/each}
      <text x="210" y="54" text-anchor="middle" font-size="8" fill="currentColor" opacity="0.6">B→C and E→F are half steps — no fret between them!</text>
      {/if}
    </svg>
  </Block>

  <Block type="diagram" title="OCTAVE SHAPES — SAME NOTE, DIFFERENT POSITION">
    <svg viewBox="0 0 300 80" width="100%" style="display:block" role="img" aria-label="Octave shapes for note A">
      <!-- String lines -->
      {#each [16,28,40,52,64,76] as y, i}
        <line x1="30" y1={y} x2="290" y2={y} stroke="currentColor" stroke-width={i>=3?1+(i-3)*0.3:0.8} opacity="0.4"/>
      {/each}
      <!-- Nut -->
      <line x1="30" y1="10" x2="30" y2="82" stroke="currentColor" stroke-width="3" opacity="0.5"/>
      <!-- Fret lines -->
      {#each Array(8) as _, fi}
        <line x1={30+fi*36} y1="10" x2={30+fi*36} y2="82" stroke="currentColor" stroke-width="0.8" opacity="0.2"/>
      {/each}
      <!-- A at fret 0 string 5 -->
      <circle cx="30" cy="64" r="10" fill={ROOT} opacity="0.9"/>
      <text x="30" y="68" text-anchor="middle" font-size="7" fill="white" font-weight="700">A</text>
      <!-- A at fret 5 string 6 -->
      <circle cx={30+5*36-18} cy="76" r="10" fill={ROOT} opacity="0.9"/>
      <text x={30+5*36-18} y="80" text-anchor="middle" font-size="7" fill="white" font-weight="700">A</text>
      <!-- A at fret 7 string 4 -->
      <circle cx={30+7*36-18} cy="52" r="10" fill={ROOT} opacity="0.9"/>
      <text x={30+7*36-18} y="56" text-anchor="middle" font-size="7" fill="white" font-weight="700">A</text>
      <!-- A at fret 12 string 5 -->
      <circle cx={30+12*36-18} cy="64" r="10" fill={ROOT} opacity="0.9"/>
      <text x={30+12*36-18} y="68" text-anchor="middle" font-size="7" fill="white" font-weight="700">A8</text>
      <!-- Arrows connecting octaves -->
      <defs><marker id="arr1" markerWidth="5" markerHeight="4" refX="5" refY="2" orient="auto"><polygon points="0 0,5 2,0 4" fill={ORANGE}/></marker></defs>
      <line x1="30" y1="60" x2={30+5*36-28} y2="76" stroke={ORANGE} stroke-width="1.5" stroke-dasharray="4,2" marker-end="url(#arr1)" opacity="0.8"/>
      <line x1={30+5*36-8} y1="72" x2={30+7*36-28} y2="56" stroke={ORANGE} stroke-width="1.5" stroke-dasharray="4,2" marker-end="url(#arr1)" opacity="0.8"/>
      <text x="150" y="10" text-anchor="middle" font-size="8" fill="currentColor" opacity="0.6">All these are A — connected by octave shapes</text>
    </svg>
  </Block>

  <Block type="dothis">
    <p>Practice saying string 5 note names out loud while fretting each note. Find every A on strings 5 & 6. Memorize landmark frets 3, 5, 7, 9, 12 as your anchors.</p>
  </Block>

  <Block type="check">
    <CheckItem id="p1-c1" label="Can name any note on string 6 (E)" />
    <CheckItem id="p1-c2" label="Can name any note on string 5 (A)" />
    <CheckItem id="p1-c3" label="Know all landmark frets (3, 5, 7, 9, 12)" />
    <CheckItem id="p1-c4" label="Found all A notes on strings 5 & 6" />
  </Block>
</section>

<!-- ═══════════════════════════════════════════════════
     PHASE 2: How Chords Are Built
════════════════════════════════════════════════════ -->
<section class="section phase" id="phase-2">
  <div class="phase-header" style="--accent:#16A34A">
    <span class="phase-num">Phase 2</span>
    <h2 class="phase-title">How Chords Are Built</h2>
  </div>

  <Block type="concept">
    <p>Every chord is built from a Root note plus intervals. Major = Root + Major 3rd (4 frets up) + Perfect 5th (7 frets up). Swap the Major 3rd for a Minor 3rd (3 frets up) to get a minor chord.</p>
  </Block>

  <Block type="diagram" title="INTERVAL RULER — MAJOR TRIAD">
    <svg viewBox="0 0 320 60" width="100%" style="display:block" role="img" aria-label="Major triad interval ruler">
      <!-- Single string frets 0-8 -->
      <line x1="20" y1="30" x2="300" y2="30" stroke="currentColor" stroke-width="1.5" opacity="0.5"/>
      {#each Array(9) as _, fi}
        <line x1={20+fi*35} y1="20" x2={20+fi*35} y2="40" stroke="currentColor" stroke-width="1" opacity="0.3"/>
      {/each}
      <!-- Root at fret 0 -->
      <circle cx="20" cy="30" r="11" fill={ROOT}/>
      <text x="20" y="34" text-anchor="middle" font-size="8" fill="white" font-weight="700">R</text>
      <!-- Major 3rd at fret 4 -->
      <circle cx={20+4*35} cy="30" r="11" fill={THIRD}/>
      <text x={20+4*35} y="34" text-anchor="middle" font-size="7" fill="white" font-weight="700">M3</text>
      <!-- Perfect 5th at fret 7 -->
      <circle cx={20+7*35} cy="30" r="11" fill={FIFTH}/>
      <text x={20+7*35} y="34" text-anchor="middle" font-size="7" fill="white" font-weight="700">P5</text>
      <!-- Brackets -->
      <path d="M20 14 L20 8 L{20+4*35} 8 L{20+4*35} 14" fill="none" stroke={THIRD} stroke-width="1.5"/>
      <text x={20+2*35} y="6" text-anchor="middle" font-size="8" fill={THIRD} font-weight="700">+4 frets</text>
      <path d="M{20+4*35} 14 L{20+4*35} 8 L{20+7*35} 8 L{20+7*35} 14" fill="none" stroke={FIFTH} stroke-width="1.5"/>
      <text x={20+5.5*35} y="6" text-anchor="middle" font-size="8" fill={FIFTH} font-weight="700">+3 frets</text>
      <!-- Fret numbers -->
      {#each [0,1,2,3,4,5,6,7,8] as fi}
        <text x={20+fi*35} y="54" text-anchor="middle" font-size="8" fill="currentColor" opacity="0.4">{fi}</text>
      {/each}
    </svg>
  </Block>

  <div class="chord-row">
    <div class="chord-wrap">
      <Block type="diagram" title="C MAJOR — R/3/5">
        <ChordBox
          name="C"
          frets_data={[0, 1, 0, 2, 3, null]}
          startFret={1}
          roots={[2, 5]}
          thirds={[1, 4]}
          fifths={[3]}
          labels={['E','C',null,'E','C','×']}
        />
      </Block>
    </div>
    <div class="chord-wrap">
      <Block type="diagram" title="Am — R/b3/5">
        <ChordBox
          name="Am"
          frets_data={[0, 1, 2, 2, 0, null]}
          startFret={1}
          roots={[1, 4]}
          thirds={[2, 5]}
          fifths={[3]}
          labels={['E','C','A','E','A','×']}
        />
      </Block>
    </div>
  </div>

  <Block type="diagram" title="MAJOR vs MINOR — ONLY THE 3rd CHANGES">
    <svg viewBox="0 0 300 90" width="100%" style="display:block" role="img" aria-label="Major vs minor chord comparison">
      <!-- Left: C major row -->
      <text x="70" y="14" text-anchor="middle" font-size="10" font-weight="700" fill="currentColor">C MAJOR</text>
      {#each [{n:'C',c:ROOT,x:20},{n:'E',c:THIRD,x:50},{n:'G',c:FIFTH,x:80},{n:'C',c:ROOT,x:110}] as dot}
        <circle cx={dot.x} cy="32" r="13" fill={dot.c} opacity="0.9"/>
        <text x={dot.x} y="36" text-anchor="middle" font-size="9" fill="white" font-weight="700">{dot.n}</text>
      {/each}
      <!-- Highlight E with "M3" label -->
      <text x="50" y="55" text-anchor="middle" font-size="8" fill={THIRD} font-weight="700">M3↑</text>

      <!-- Arrow -->
      <text x="150" y="40" text-anchor="middle" font-size="18" fill="currentColor" opacity="0.5">⟷</text>
      <text x="150" y="56" text-anchor="middle" font-size="8" fill={THIRD} font-weight="700">3rd changes</text>

      <!-- Right: Cm row -->
      <text x="230" y="14" text-anchor="middle" font-size="10" font-weight="700" fill="currentColor">C MINOR</text>
      {#each [{n:'C',c:ROOT,x:180},{n:'Eb',c:THIRD,x:210},{n:'G',c:FIFTH,x:240},{n:'C',c:ROOT,x:270}] as dot}
        <circle cx={dot.x} cy="32" r="13" fill={dot.c} opacity="0.9"/>
        <text x={dot.x} y="36" text-anchor="middle" font-size={dot.n.length>1?7.5:9} fill="white" font-weight="700">{dot.n}</text>
      {/each}
      <text x="210" y="55" text-anchor="middle" font-size="8" fill={THIRD} font-weight="700">m3↑</text>

      <text x="150" y="80" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.6">Lower the 3rd by 1 fret → major becomes minor</text>
    </svg>
  </Block>

  <Block type="dothis">
    <p>Play C and Cm back to back slowly — listen to the emotional change. Name each note as you play it. Find the 3rd in every chord you already know.</p>
  </Block>

  <Block type="check">
    <CheckItem id="p2-c1" label="Can identify Root/3rd/5th in C chord" />
    <CheckItem id="p2-c2" label="Can identify Root/b3/5th in Am chord" />
    <CheckItem id="p2-c3" label="Understand why lowering the 3rd makes it minor" />
    <CheckItem id="p2-c4" label="Can find the 3rd in any open chord" />
  </Block>
</section>

<!-- ═══════════════════════════════════════════════════
     PHASE 3: CAGED System
════════════════════════════════════════════════════ -->
<section class="section phase" id="phase-3">
  <div class="phase-header" style="--accent:#16A34A">
    <span class="phase-num">Phase 3</span>
    <h2 class="phase-title">CAGED System</h2>
  </div>

  <Block type="concept">
    <p>Every major chord on the neck is one of 5 shapes: C, A, G, E, D. These shapes repeat and chain together to cover the whole neck. Move an open shape up the neck using a barre = same chord, new position.</p>
  </Block>

  <Block type="diagram" title="ALL 5 OPEN SHAPES — ROOTS IN RED">
    <div class="chord-row-5">
      {#each [
        { name:'C', frets:[0,1,0,2,3,null], roots:[2,5], thirds:[1,4], fifths:[3], labels:['E','C','G','E','C','×'] },
        { name:'A', frets:[0,2,2,2,0,null], roots:[2,5], thirds:[4], fifths:[1,3], labels:['E','A','E','C#','A','×'] },
        { name:'G', frets:[3,0,0,0,2,3], roots:[1,6], thirds:[2], fifths:[3,4,5], labels:['G','B','G','D','B','G'] },
        { name:'E', frets:[0,0,1,2,2,0], roots:[1,3,6], thirds:[5], fifths:[2,4], labels:['E','B','G#','E','B','E'] },
        { name:'D', frets:[2,3,2,0,null,null], roots:[1,4], thirds:[3], fifths:[2], labels:['D','A','F#','D','×','×'] },
      ] as shape}
        <div class="chord-mini">
          <ChordBox
            name={shape.name}
            frets_data={shape.frets}
            startFret={1}
            roots={shape.roots}
            thirds={shape.thirds}
            fifths={shape.fifths}
            labels={shape.labels}
          />
        </div>
      {/each}
    </div>
  </Block>

  <Block type="diagram" title="E-SHAPE BARRE = E SHAPE MOVED UP THE NECK">
    <svg viewBox="0 0 320 100" width="100%" style="display:block" role="img" aria-label="E shape barre chord diagram">
      <!-- E open shape (left) -->
      <text x="60" y="12" text-anchor="middle" font-size="10" font-weight="700" fill="currentColor">Open E</text>
      <!-- 6 strings, 4 frets -->
      {#each [20,32,44,56,68,80] as sy, si}
        <line x1="20" y1={sy} x2="110" y2={sy} stroke="currentColor" stroke-width={si>=3?1+(si-3)*0.3:0.8} opacity="0.5"/>
      {/each}
      <line x1="20" y1="14" x2="20" y2="86" stroke="currentColor" stroke-width="4" opacity="0.6"/>
      {#each [20,40,65,90,110] as fx}
        <line x1={fx} y1="14" x2={fx} y2="86" stroke="currentColor" stroke-width="0.8" opacity="0.2"/>
      {/each}
      <!-- E shape notes -->
      {#each [{s:4,f:22,c:ROOT},{s:5,f:37,c:FIFTH},{s:5,f:58,c:THIRD},{s:6,f:20,c:ROOT}] as n}
        <circle cx={n.f} cy={n.s===4?56:n.s===5?68:80} r="9" fill={n.c} opacity="0.9"/>
      {/each}
      <circle cx={20} cy={20} r="7" fill="none" stroke={ROOT} stroke-width="2"/>
      <circle cx={20} cy={32} r="7" fill="none" stroke={FIFTH} stroke-width="2"/>

      <!-- Arrow -->
      <text x="145" y="50" text-anchor="middle" font-size="22" fill={ORANGE} opacity="0.8">→</text>
      <text x="145" y="68" text-anchor="middle" font-size="8" fill={ORANGE}>slide up</text>
      <text x="145" y="80" text-anchor="middle" font-size="8" fill={ORANGE}>1 fret = F</text>

      <!-- F barre (right) -->
      <text x="240" y="12" text-anchor="middle" font-size="10" font-weight="700" fill="currentColor">F Barre (fret 1)</text>
      {#each [20,32,44,56,68,80] as sy, si}
        <line x1="180" y1={sy} x2="290" y2={sy} stroke="currentColor" stroke-width={si>=3?1+(si-3)*0.3:0.8} opacity="0.5"/>
      {/each}
      <line x1="180" y1="14" x2="180" y2="86" stroke="currentColor" stroke-width="1" opacity="0.3"/>
      {#each [180,200,225,250,270,290] as fx}
        <line x1={fx} y1="14" x2={fx} y2="86" stroke="currentColor" stroke-width="0.8" opacity="0.2"/>
      {/each}
      <!-- Barre bar -->
      <line x1="180" y1="20" x2="180" y2="80" stroke={OTHER} stroke-width="16" stroke-linecap="round" opacity="0.8"/>
      <text x="180" y="52" text-anchor="middle" font-size="7" fill="white" font-weight="700">B</text>
      <!-- Other fingers -->
      <circle cx="218" cy="56" r="9" fill={FIFTH} opacity="0.9"/><text x="218" y="60" text-anchor="middle" font-size="7" fill="white">C</text>
      <circle cx="218" cy="68" r="9" fill={THIRD} opacity="0.9"/><text x="218" y="72" text-anchor="middle" font-size="7" fill="white">A</text>
      <circle cx="197" cy="80" r="9" fill={ROOT} opacity="0.9"/><text x="197" y="84" text-anchor="middle" font-size="7" fill="white">F</text>
      <text x="240" y="96" text-anchor="middle" font-size="8" fill="currentColor" opacity="0.6">Fret 1 = F · Fret 3 = G · Fret 5 = A</text>
    </svg>
  </Block>

  <Block type="tip">
    <p>E-shape at fret 5 = A major. A-shape at fret 5 = D major. They share notes — this is how shapes connect. The CAGED order always repeats: C→A→G→E→D→C→...</p>
  </Block>

  <Block type="dothis">
    <p>Play all 5 open shapes. Move the E-shape to frets 2, 3, 5, 7, 10. Connect E-shape at fret 5 to A-shape at fret 5.</p>
  </Block>

  <Block type="check">
    <CheckItem id="p3-c1" label="Know all 5 CAGED shapes from memory" />
    <CheckItem id="p3-c2" label="Can play E-shape barre at any fret" />
    <CheckItem id="p3-c3" label="Can play A-shape barre at any fret" />
    <CheckItem id="p3-c4" label="Can connect adjacent shapes (E→A, A→G, etc.)" />
  </Block>
</section>

<!-- ═══════════════════════════════════════════════════
     PHASE 4: Minor Pentatonic Box 1
════════════════════════════════════════════════════ -->
<section class="section phase" id="phase-4">
  <div class="phase-header" style="--accent:#16A34A">
    <span class="phase-num">Phase 4</span>
    <h2 class="phase-title">Minor Pentatonic Box 1</h2>
  </div>

  <Block type="concept">
    <p>The minor pentatonic scale has 5 notes: Root, b3, 4, 5, b7. Box 1 is your home base — start here. All 5 boxes cover the entire neck; master this one first.</p>
  </Block>

  <Block type="diagram" title="Am PENTATONIC BOX 1 — FRET 5">
    <!-- Am pent box 1: notes per string -->
    <!-- String 6: fret 5 (A=R), fret 8 (C=b3) -->
    <!-- String 5: fret 5 (D=4), fret 7 (E=5) - wait, Am pent: A C D E G -->
    <!-- Am pentatonic: A(R) C(b3) D(4) E(5) G(b7) -->
    <!-- Box 1 at fret 5: -->
    <!-- str6: 5(A=R), 8(C=b3) -->
    <!-- str5: 5(D=4), 7(E=5) -->
    <!-- str4: 5(G=b7), 7(A=R) -->
    <!-- str3: 5(C=b3), 7(D=4) -->
    <!-- str2: 5(E=5), 8(G=b7) - actually fret 6=C#? Let me recalculate -->
    <!-- String 2 (B): B+5=E(5), B+8=G(b7) -->
    <!-- String 1 (e): e+5=A(R), e+8=C(b3) -->
    <svg viewBox="0 0 200 160" width="100%" style="display:block;max-width:280px;margin:0 auto" role="img" aria-label="Am pentatonic box 1">
      {#if true}
      {@const SS = 22}
      {@const FS = 36}
      {@const PL = 30}
      {@const PT = 20}
      <!-- String lines -->
      {#each Array(6) as _, si}
        <line x1={PL} y1={PT+si*SS} x2={PL+4*FS} y2={PT+si*SS} stroke="currentColor" stroke-width={si>=3?1+(si-3)*0.3:0.8} opacity="0.5"/>
      {/each}
      <!-- Fret lines -->
      {#each Array(5) as _, fi}
        <line x1={PL+fi*FS} y1={PT-6} x2={PL+fi*FS} y2={PT+5*SS+6} stroke="currentColor" stroke-width={fi===0?2.5:0.8} opacity={fi===0?0.6:0.2}/>
      {/each}
      <!-- String names -->
      {#each ['e','B','G','D','A','E'] as sn, si}
        <text x={PL-8} y={PT+si*SS+4} text-anchor="middle" font-size="9" fill="currentColor" opacity="0.6" font-family="monospace">{sn}</text>
      {/each}
      <!-- Fret numbers -->
      {#each [5,6,7,8,9] as fn, fi}
        <text x={PL+fi*FS+FS/2} y={PT+5*SS+18} text-anchor="middle" font-size="9" fill="currentColor" opacity="0.4" font-family="monospace">{fn}</text>
      {/each}
      <!-- Notes: [str, fretOffset(0-4), color, label, finger] -->
      <!-- str6: fret5(+0)=A(R), fret8(+3)=C(b3) -->
      <!-- str5: fret5(+0)=D(4), fret7(+2)=E(5) -->
      <!-- str4: fret5(+0)=G(b7), fret7(+2)=A(R) -->
      <!-- str3: fret5(+0)=C(b3), fret7(+2)=D(4) -->
      <!-- str2: fret5(+0)=E(5), fret8(+3)=G(b7) - B+5=E (half+4=no: B(11)+5=4=E yes) -->
      <!-- str1: fret5(+0)=A(R), fret8(+3)=C(b3) -->
      {#each [
        {si:0,fo:0,c:ROOT,l:'R',f:1},{si:0,fo:3,c:OTHER,l:'b3',f:4},
        {si:1,fo:0,c:FIFTH,l:'5',f:1},{si:1,fo:3,c:OTHER,l:'b7',f:4},
        {si:2,fo:0,c:OTHER,l:'b3',f:1},{si:2,fo:2,c:OTHER,l:'4',f:3},
        {si:3,fo:0,c:OTHER,l:'b7',f:1},{si:3,fo:2,c:ROOT,l:'R',f:3},
        {si:4,fo:0,c:OTHER,l:'4',f:1},{si:4,fo:2,c:FIFTH,l:'5',f:3},
        {si:5,fo:0,c:ROOT,l:'R',f:1},{si:5,fo:3,c:OTHER,l:'b3',f:4},
      ] as n}
        {@const cx = PL + n.fo * FS + FS/2}
        {@const cy = PT + n.si * SS}
        <circle cx={cx} cy={cy} r="11" fill={n.c} opacity="0.9"/>
        <text x={cx} y={cy+4} text-anchor="middle" font-size="7.5" fill="white" font-weight="700">{n.l}</text>
      {/each}
      {/if}
    </svg>
    <p class="diagram-caption">Finger 1 = fret 5, Finger 3 = fret 7, Finger 4 = fret 8. Red = Root (A).</p>
  </Block>

  <Block type="diagram" title="TECHNIQUES">
    <svg viewBox="0 0 300 80" width="100%" style="display:block" role="img" aria-label="Guitar techniques: hammer-on, pull-off, slide, bend">
      <!-- Hammer-on -->
      <text x="35" y="12" text-anchor="middle" font-size="9" font-weight="700" fill="currentColor" opacity="0.7">Hammer-on</text>
      <circle cx="15" cy="40" r="9" fill={OTHER} opacity="0.8"/>
      <circle cx="55" cy="40" r="9" fill={OTHER} opacity="0.8"/>
      <path d="M24 32 Q35 18 46 32" fill="none" stroke={ORANGE} stroke-width="2" stroke-dasharray="3,2"/>
      <text x="35" y="22" text-anchor="middle" font-size="8" fill={ORANGE}>H</text>
      <text x="35" y="60" text-anchor="middle" font-size="7" fill="currentColor" opacity="0.6">pick 1st only</text>

      <!-- Pull-off -->
      <text x="110" y="12" text-anchor="middle" font-size="9" font-weight="700" fill="currentColor" opacity="0.7">Pull-off</text>
      <circle cx="90" cy="40" r="9" fill={OTHER} opacity="0.8"/>
      <circle cx="130" cy="40" r="9" fill={OTHER} opacity="0.8"/>
      <path d="M99 48 Q110 62 121 48" fill="none" stroke={ORANGE} stroke-width="2" stroke-dasharray="3,2"/>
      <text x="110" y="66" text-anchor="middle" font-size="8" fill={ORANGE}>P</text>
      <text x="110" y="76" text-anchor="middle" font-size="7" fill="currentColor" opacity="0.6">pick 1st only</text>

      <!-- Slide -->
      <text x="185" y="12" text-anchor="middle" font-size="9" font-weight="700" fill="currentColor" opacity="0.7">Slide</text>
      <circle cx="160" cy="46" r="9" fill={OTHER} opacity="0.8"/>
      <circle cx="205" cy="30" r="9" fill={OTHER} opacity="0.8"/>
      <line x1="169" y1="40" x2="196" y2="36" stroke={ORANGE} stroke-width="2"/>
      <text x="183" y="56" text-anchor="middle" font-size="7" fill="currentColor" opacity="0.6">keep pressure</text>

      <!-- Bend -->
      <text x="258" y="12" text-anchor="middle" font-size="9" font-weight="700" fill="currentColor" opacity="0.7">Bend</text>
      <circle cx="258" cy="55" r="9" fill={OTHER} opacity="0.8"/>
      <path d="M258 46 L258 28" stroke={ORANGE} stroke-width="2"/>
      <polygon points="254,30 258,20 262,30" fill={ORANGE}/>
      <text x="268" y="28" font-size="8" fill={ORANGE}>↑1</text>
      <text x="258" y="74" text-anchor="middle" font-size="7" fill="currentColor" opacity="0.6">push string up</text>
    </svg>
  </Block>

  <Block type="dothis">
    <p>Play Box 1 up and down slowly with a metronome. Loop just the root notes to internalize where "home" is. Add one hammer-on per pass through the scale.</p>
  </Block>

  <Block type="check">
    <CheckItem id="p4-c1" label="Box 1 from memory, up and down" />
    <CheckItem id="p4-c2" label="Can play Box 1 smoothly at 60 BPM" />
    <CheckItem id="p4-c3" label="Know where all root notes (A) are in Box 1" />
    <CheckItem id="p4-c4" label="Can execute a clean hammer-on" />
  </Block>
</section>

<!-- ═══════════════════════════════════════════════════
     PHASE 5: All 5 Pentatonic Boxes
════════════════════════════════════════════════════ -->
<section class="section phase" id="phase-5">
  <div class="phase-header" style="--accent:#D97706">
    <span class="phase-num">Phase 5</span>
    <h2 class="phase-title">All 5 Pentatonic Boxes</h2>
  </div>

  <Block type="concept">
    <p>The 5 pentatonic boxes are the same notes arranged in 5 positions across the neck. Each box overlaps with the next — they're not isolated. The CAGED shapes map directly to box positions.</p>
  </Block>

  <Block type="diagram" title="ALL 5 BOXES — FULL NECK PANORAMIC">
    <!-- Am pentatonic boxes 1-5 on full neck frets 0-15 -->
    <!-- Box 1: frets 5-8, Box 2: frets 7-10, Box 3: frets 9-12, Box 4: frets 12-15, Box 5: frets 3-5 -->
    <svg viewBox="0 0 500 140" width="100%" style="display:block" role="img" aria-label="All 5 pentatonic boxes on full neck">
      {#if true}
      {@const SS = 16}
      {@const FS = 30}
      {@const PL = 28}
      {@const PT = 18}
      {@const BOX_COLORS = ['#DC2626','#2563EB','#16A34A','#D97706','#7C3AED']}
      <!-- String lines -->
      {#each Array(6) as _, si}
        <line x1={PL} y1={PT+si*SS} x2={PL+16*FS} y2={PT+si*SS} stroke="currentColor" stroke-width={si>=3?1+(si-3)*0.3:0.8} opacity="0.4"/>
      {/each}
      <!-- Nut -->
      <line x1={PL} y1={PT-4} x2={PL} y2={PT+5*SS+4} stroke="currentColor" stroke-width="3" opacity="0.5"/>
      <!-- Fret lines -->
      {#each Array(17) as _, fi}
        <line x1={PL+fi*FS} y1={PT-4} x2={PL+fi*FS} y2={PT+5*SS+4} stroke="currentColor" stroke-width="0.8" opacity="0.15"/>
      {/each}
      <!-- String names -->
      {#each ['e','B','G','D','A','E'] as sn, si}
        <text x={PL-8} y={PT+si*SS+4} text-anchor="middle" font-size="8" fill="currentColor" opacity="0.6" font-family="monospace">{sn}</text>
      {/each}
      <!-- Am pentatonic positions: A C D E G -->
      <!-- Open string positions: E(1),A(0),D(2),G(2),B(0),e(0) - need to find all pentatonic notes -->
      <!-- Box colors by box number -->
      <!-- Box 1 (red): fret 5-8 region -->
      <!-- Box 2 (blue): fret 7-10 region -->
      <!-- Box 3 (green): fret 9-12 region -->
      <!-- Box 4 (orange): fret 12-15 region -->
      <!-- Box 5 (purple): fret 2-5 region -->
      <!-- Note: for Am pent: A(0)=A C D E G — CHROMATIC indices: A=9,C=0,D=2,E=4,G=7 -->
      {@const PENT_NOTES = new Set([0,2,4,7,9])}
      {#each Array(6) as _, si}
        {@const openIdx = OPEN_NOTES[si]}
        {#each Array(16) as _, fi}
          {@const noteIdx = (openIdx + fi) % 12}
          {#if PENT_NOTES.has(noteIdx)}
            {@const isRoot = noteIdx === 9}
            <!-- Determine box number by fret range (approximate) -->
            {@const boxNum = fi <= 2 ? 5 : fi <= 5 ? 1 : fi <= 8 ? 2 : fi <= 11 ? 3 : 4}
            {@const col = isRoot ? '#DC2626' : BOX_COLORS[boxNum - 1]}
            {@const cx = PL + fi * FS + FS/2}
            {@const cy = PT + si * SS}
            <circle cx={cx} cy={cy} r={isRoot?7.5:6} fill={col} opacity={isRoot?1:0.8}/>
            {#if isRoot}
              <text x={cx} y={cy+3} text-anchor="middle" font-size="6" fill="white" font-weight="700">R</text>
            {/if}
          {/if}
        {/each}
      {/each}
      <!-- Fret numbers -->
      {#each [0,3,5,7,9,12,15] as fn}
        <text x={PL+fn*FS} y={PT+5*SS+16} text-anchor="middle" font-size="7.5" fill="currentColor" opacity="0.5">{fn}</text>
      {/each}
      <!-- Box labels -->
      {#each [{n:1,x:PL+5.5*FS},{n:2,x:PL+8.5*FS},{n:3,x:PL+10.5*FS},{n:4,x:PL+13.5*FS},{n:5,x:PL+3.5*FS}] as bl}
        <text x={bl.x} y={PT+5*SS+28} text-anchor="middle" font-size="8" fill={BOX_COLORS[bl.n-1]} font-weight="700">Box {bl.n}</text>
      {/each}
      {/if}
    </svg>
    <p class="diagram-caption">Red circles = Root (A). Colors = box regions. All notes are Am pentatonic.</p>
  </Block>

  <Block type="diagram" title="BOX 1 → BOX 2 TRANSITION ZONE">
    <svg viewBox="0 0 240 100" width="100%" style="display:block" role="img" aria-label="Box 1 to Box 2 transition">
      {#if true}
      {@const SS = 16}
      {@const FS = 32}
      {@const PL = 20}
      {@const PT = 16}
      <!-- String lines -->
      {#each Array(6) as _, si}
        <line x1={PL} y1={PT+si*SS} x2={PL+6*FS} y2={PT+si*SS} stroke="currentColor" stroke-width="0.8" opacity="0.4"/>
      {/each}
      {#each Array(7) as _, fi}
        <line x1={PL+fi*FS} y1={PT-4} x2={PL+fi*FS} y2={PT+5*SS+4} stroke="currentColor" stroke-width="0.8" opacity="0.15"/>
      {/each}
      <!-- Box 1 notes (frets 5-8) -->
      {#each [
        {si:0,fi:0,c:'#DC2626'},{si:0,fi:3,c:'#2563EB'},
        {si:1,fi:0,c:'#2563EB'},{si:1,fi:3,c:'#2563EB'},
        {si:2,fi:0,c:'#2563EB'},{si:2,fi:2,c:'#2563EB'},
        {si:3,fi:0,c:'#DC2626'},{si:3,fi:2,c:'#2563EB'},
        {si:4,fi:0,c:'#2563EB'},{si:4,fi:2,c:'#2563EB'},
        {si:5,fi:0,c:'#DC2626'},{si:5,fi:3,c:'#2563EB'},
      ] as n}
        <circle cx={PL+n.fi*FS+FS/2} cy={PT+n.si*SS} r={n.c==='#DC2626'?8:7} fill={n.c} opacity="0.85"/>
      {/each}
      <!-- Shared / transition notes at fret 7 -->
      {#each [{si:2,fi:2},{si:3,fi:2},{si:4,fi:2}] as n}
        <circle cx={PL+n.fi*FS+FS/2} cy={PT+n.si*SS} r="9" fill="none" stroke={ORANGE} stroke-width="2.5" opacity="0.9"/>
      {/each}
      <!-- Box 2 notes (frets 7-10) -->
      {#each [
        {si:0,fi:4,c:'#2563EB'},{si:1,fi:5,c:'#DC2626'},
        {si:2,fi:4,c:'#2563EB'},{si:3,fi:4,c:'#2563EB'},
        {si:4,fi:4,c:'#2563EB'},{si:5,fi:4,c:'#2563EB'},
      ] as n}
        <circle cx={PL+n.fi*FS+FS/2} cy={PT+n.si*SS} r="7" fill={n.c} opacity="0.6"/>
      {/each}
      <!-- Fret numbers -->
      {#each [5,6,7,8,9,10] as fn, i}
        <text x={PL+i*FS+FS/2} y={PT+5*SS+14} text-anchor="middle" font-size="8" fill="currentColor" opacity="0.5">{fn}</text>
      {/each}
      <!-- Labels -->
      <text x={PL+2*FS} y={PT+5*SS+26} text-anchor="middle" font-size="8" fill="#DC2626" font-weight="700">← Box 1</text>
      <text x={PL+5*FS} y={PT+5*SS+26} text-anchor="middle" font-size="8" fill="#2563EB" font-weight="700">Box 2 →</text>
      <text x={PL+3*FS+FS/2} y="8" text-anchor="middle" font-size="8" fill={ORANGE} font-weight="700">⊙ shared notes = transition zone</text>
      {/if}
    </svg>
  </Block>

  <Block type="tip">
    <p>The boxes are training wheels — eventually you'll see the whole neck as one connected scale. Each box corresponds to a CAGED shape: Box 1 = E-shape, Box 2 = D-shape, Box 3 = C-shape, Box 4 = A-shape, Box 5 = G-shape.</p>
  </Block>

  <Block type="dothis">
    <p>Learn Box 2. Practice sliding from Box 1 into Box 2 using the shared notes at fret 7. Identify which CAGED shape each box corresponds to.</p>
  </Block>

  <Block type="check">
    <CheckItem id="p5-c1" label="Know all 5 box positions on the neck" />
    <CheckItem id="p5-c2" label="Can transition Box 1 → Box 2 smoothly" />
    <CheckItem id="p5-c3" label="Can transition Box 2 → Box 3" />
    <CheckItem id="p5-c4" label="Can play across the full neck (frets 0–15)" />
  </Block>
</section>

<!-- ═══════════════════════════════════════════════════
     PHASE 6: Scales Meet Chords
════════════════════════════════════════════════════ -->
<section class="section phase" id="phase-6">
  <div class="phase-header" style="--accent:#D97706">
    <span class="phase-num">Phase 6</span>
    <h2 class="phase-title">Scales Meet Chords</h2>
  </div>

  <Block type="concept">
    <p>Not all notes are equal. Chord tones (Root, b3, 5th) sound resolved; passing tones (4th, b7th) create tension. Where you END a lick determines the emotion — this is phrasing.</p>
  </Block>

  <Block type="diagram" title="CHORD TONES vs PASSING TONES IN BOX 1">
    <svg viewBox="0 0 200 160" width="100%" style="display:block;max-width:260px;margin:0 auto" role="img" aria-label="Chord tones and passing tones in Am pentatonic box 1">
      {#if true}
      {@const SS = 22}
      {@const FS = 36}
      {@const PL = 28}
      {@const PT = 20}
      {#each Array(6) as _, si}
        <line x1={PL} y1={PT+si*SS} x2={PL+4*FS} y2={PT+si*SS} stroke="currentColor" stroke-width={si>=3?1+(si-3)*0.3:0.8} opacity="0.4"/>
      {/each}
      {#each Array(5) as _, fi}
        <line x1={PL+fi*FS} y1={PT-4} x2={PL+fi*FS} y2={PT+5*SS+4} stroke="currentColor" stroke-width={fi===0?2.5:0.8} opacity={fi===0?0.5:0.15}/>
      {/each}
      {#each ['e','B','G','D','A','E'] as sn, si}
        <text x={PL-8} y={PT+si*SS+4} text-anchor="middle" font-size="9" fill="currentColor" opacity="0.6">{sn}</text>
      {/each}
      {#each [5,6,7,8,9] as fn, fi}
        <text x={PL+fi*FS+FS/2} y={PT+5*SS+18} text-anchor="middle" font-size="8" fill="currentColor" opacity="0.4">{fn}</text>
      {/each}
      <!-- Notes: chord tones solid, passing tones as outlines -->
      <!-- Am chord tones: A(R), C(b3), E(5) — passing: D(4), G(b7) -->
      {#each [
        {si:0,fo:0,isChord:true,l:'R'},{si:0,fo:3,isChord:false,l:'b3'},
        {si:1,fo:0,isChord:true,l:'5'},{si:1,fo:3,isChord:false,l:'b7'},
        {si:2,fo:0,isChord:false,l:'b3'},{si:2,fo:2,isChord:false,l:'4'},
        {si:3,fo:0,isChord:false,l:'b7'},{si:3,fo:2,isChord:true,l:'R'},
        {si:4,fo:0,isChord:false,l:'4'},{si:4,fo:2,isChord:true,l:'5'},
        {si:5,fo:0,isChord:true,l:'R'},{si:5,fo:3,isChord:false,l:'b3'},
      ] as n}
        {@const cx = PL + n.fo * FS + FS/2}
        {@const cy = PT + n.si * SS}
        {#if n.isChord}
          <circle cx={cx} cy={cy} r="11" fill={n.l==='R'?ROOT:n.l==='5'?FIFTH:THIRD} opacity="0.9"/>
          <text x={cx} y={cy+4} text-anchor="middle" font-size="7.5" fill="white" font-weight="700">{n.l}</text>
        {:else}
          <circle cx={cx} cy={cy} r="11" fill="none" stroke={GRAY} stroke-width="2" opacity="0.7"/>
          <text x={cx} y={cy+4} text-anchor="middle" font-size="7.5" fill="currentColor" opacity="0.5" font-weight="600">{n.l}</text>
        {/if}
      {/each}
      {/if}
    </svg>
    <p class="diagram-caption">Solid = chord tones (target these). Outline = passing tones (use for movement).</p>
  </Block>

  <Block type="diagram" title="WHERE YOU LAND = THE EMOTION">
    <svg viewBox="0 0 300 80" width="100%" style="display:block" role="img" aria-label="Lick resolution comparison">
      <!-- Lick ending on root -->
      <rect x="5" y="5" width="135" height="70" rx="6" fill={FIFTH} opacity="0.1" stroke={FIFTH} stroke-width="1"/>
      <text x="72" y="20" text-anchor="middle" font-size="9" font-weight="700" fill={FIFTH}>End on Root → HOME</text>
      {#each [{x:15,l:'G'},{x:35,l:'E'},{x:55,l:'D'},{x:75,l:'C'},{x:95,l:'A'}] as n}
        <circle cx={n.x} cy="45" r="10" fill={n.l==='A'?ROOT:GRAY} opacity="0.85"/>
        <text x={n.x} y="49" text-anchor="middle" font-size="8" fill="white" font-weight="700">{n.l}</text>
      {/each}
      <text x="72" y="68" text-anchor="middle" font-size="8" fill={FIFTH}>resolved · restful · home</text>

      <!-- Lick ending on b7 -->
      <rect x="160" y="5" width="135" height="70" rx="6" fill="#D97706" opacity="0.08" stroke="#D97706" stroke-width="1"/>
      <text x="227" y="20" text-anchor="middle" font-size="9" font-weight="700" fill="#D97706">End on b7 → TENSION</text>
      {#each [{x:170,l:'A'},{x:190,l:'C'},{x:210,l:'D'},{x:230,l:'E'},{x:250,l:'G'}] as n}
        <circle cx={n.x} cy="45" r="10" fill={n.l==='G'?ORANGE:GRAY} opacity="0.85"/>
        <text x={n.x} y="49" text-anchor="middle" font-size="8" fill="white" font-weight="700">{n.l}</text>
      {/each}
      <text x="227" y="68" text-anchor="middle" font-size="8" fill="#D97706">unresolved · wants to continue</text>
    </svg>
  </Block>

  <Block type="dothis">
    <p>Play a lick and intentionally end on each chord tone (Root, b3, 5th). Record yourself and listen back — really hear the emotional difference. Try "question" (end on b7) and "answer" (end on root).</p>
  </Block>

  <Block type="check">
    <CheckItem id="p6-c1" label="Can identify chord tones vs passing tones in Box 1" />
    <CheckItem id="p6-c2" label="Can intentionally end a lick on the root" />
    <CheckItem id="p6-c3" label="Can create tension by ending on b7" />
    <CheckItem id="p6-c4" label="Can hear the emotional difference between resolutions" />
  </Block>
</section>

<!-- ═══════════════════════════════════════════════════
     PHASE 7: Natural Minor Scale
════════════════════════════════════════════════════ -->
<section class="section phase" id="phase-7">
  <div class="phase-header" style="--accent:#D97706">
    <span class="phase-num">Phase 7</span>
    <h2 class="phase-title">Natural Minor Scale</h2>
  </div>

  <Block type="concept">
    <p>Am Natural Minor = Am Pentatonic + 2 extra notes: B (2nd) and F (b6th). These additions give you more color and smoother voice leading. Add them as passing tones at first.</p>
  </Block>

  <Block type="diagram" title="PENTATONIC vs NATURAL MINOR — 2 NEW NOTES">
    <!-- Side by side or overlay comparison -->
    <svg viewBox="0 0 300 160" width="100%" style="display:block" role="img" aria-label="Pentatonic vs natural minor comparison">
      {#if true}
      {@const SS = 20}
      {@const FS = 34}
      {@const PL = 26}
      {@const PT = 18}
      <!-- Left: Am Pent Box 1 -->
      <text x={PL + 2*FS} y="12" text-anchor="middle" font-size="9" font-weight="700" fill="currentColor" opacity="0.7">Am Pentatonic</text>
      {#each Array(6) as _, si}
        <line x1={PL} y1={PT+si*SS} x2={PL+4*FS} y2={PT+si*SS} stroke="currentColor" stroke-width={si>=3?1+(si-3)*0.3:0.8} opacity="0.35"/>
      {/each}
      {#each Array(5) as _, fi}
        <line x1={PL+fi*FS} y1={PT-4} x2={PL+fi*FS} y2={PT+5*SS+4} stroke="currentColor" stroke-width={fi===0?2:0.8} opacity={fi===0?0.4:0.12}/>
      {/each}
      <!-- Pent notes (A C D E G) -->
      {#each [
        {si:0,fo:0,l:'R',c:ROOT},{si:0,fo:3,l:'b3',c:OTHER},
        {si:1,fo:0,l:'5',c:FIFTH},{si:1,fo:3,l:'b7',c:OTHER},
        {si:2,fo:0,l:'b3',c:OTHER},{si:2,fo:2,l:'4',c:OTHER},
        {si:3,fo:0,l:'b7',c:OTHER},{si:3,fo:2,l:'R',c:ROOT},
        {si:4,fo:0,l:'4',c:OTHER},{si:4,fo:2,l:'5',c:FIFTH},
        {si:5,fo:0,l:'R',c:ROOT},{si:5,fo:3,l:'b3',c:OTHER},
      ] as n}
        {@const cx = PL + n.fo * FS + FS/2}
        {@const cy = PT + n.si * SS}
        <circle cx={cx} cy={cy} r="10" fill={n.c} opacity="0.85"/>
        <text x={cx} y={cy+3} text-anchor="middle" font-size="7" fill="white" font-weight="700">{n.l}</text>
      {/each}
      {#each [5,6,7,8] as fn, fi}
        <text x={PL+fi*FS+FS/2} y={PT+5*SS+16} text-anchor="middle" font-size="7.5" fill="currentColor" opacity="0.4">{fn}</text>
      {/each}

      <!-- Right: Natural minor adds B (2nd) and F (b6) -->
      {@const PL2 = 160}
      <text x={PL2 + 2*FS} y="12" text-anchor="middle" font-size="9" font-weight="700" fill="currentColor" opacity="0.7">Natural Minor</text>
      {#each Array(6) as _, si}
        <line x1={PL2} y1={PT+si*SS} x2={PL2+4*FS} y2={PT+si*SS} stroke="currentColor" stroke-width={si>=3?1+(si-3)*0.3:0.8} opacity="0.35"/>
      {/each}
      {#each Array(5) as _, fi}
        <line x1={PL2+fi*FS} y1={PT-4} x2={PL2+fi*FS} y2={PT+5*SS+4} stroke="currentColor" stroke-width={fi===0?2:0.8} opacity={fi===0?0.4:0.12}/>
      {/each}
      <!-- All natural minor notes (A B C D E F G) -->
      <!-- Same pent notes, plus B at fret7 str2, F at fret6 str2 area... -->
      <!-- Natural minor in position 5: -->
      <!-- str6: fret5(A=R), fret7(B=2), fret8(C=b3) -->
      <!-- str5: fret5(D=4), fret7(E=5) -->
      <!-- str4: fret5(G=b7), fret7(A=R) -->
      <!-- str3: fret5(C=b3), fret6(D=4) - actually fret5=C, fret7=D, fret8=Eb? -->
      <!-- Wait, let me recalculate. Natural minor = R 2 b3 4 5 b6 b7 -->
      <!-- Am natural minor: A B C D E F G -->
      <!-- In position (frets 5-8): -->
      <!-- str6(E): f5=A(R), f7=B(2), f8=C(b3) -->
      <!-- str5(A): f5=D(4), f7=E(5) -->
      <!-- str4(D): f5=G(b7), f7=A(R) -->
      <!-- str3(G): f5=C(b3), f7=D(4) -->
      <!-- str2(B): f5=E(5), f6=F(b6), f8=G(b7) - F at fret6! -->
      <!-- str1(e): f5=A(R), f7=B(2), f8=C(b3) -->
      {#each [
        {si:0,fo:0,l:'R',c:ROOT,new:false},{si:0,fo:2,l:'2',c:ORANGE,new:true},{si:0,fo:3,l:'b3',c:OTHER,new:false},
        {si:1,fo:0,l:'5',c:FIFTH,new:false},{si:1,fo:3,l:'b7',c:OTHER,new:false},
        {si:2,fo:0,l:'b3',c:OTHER,new:false},{si:2,fo:2,l:'4',c:OTHER,new:false},
        {si:3,fo:0,l:'b7',c:OTHER,new:false},{si:3,fo:2,l:'R',c:ROOT,new:false},
        {si:4,fo:0,l:'4',c:OTHER,new:false},{si:4,fo:2,l:'5',c:FIFTH,new:false},
        {si:5,fo:0,l:'R',c:ROOT,new:false},{si:5,fo:1,l:'b6',c:ORANGE,new:true},{si:5,fo:3,l:'b7',c:OTHER,new:false},
      ] as n}
        {@const cx = PL2 + n.fo * FS + FS/2}
        {@const cy = PT + n.si * SS}
        {#if n.new}
          <circle cx={cx} cy={cy} r="11" fill={ORANGE} opacity="0.95"/>
          <text x={cx} y={cy+4} text-anchor="middle" font-size="6.5" fill="white" font-weight="800">{n.l} ★</text>
        {:else}
          <circle cx={cx} cy={cy} r="10" fill={n.c} opacity="0.75"/>
          <text x={cx} y={cy+3} text-anchor="middle" font-size="7" fill="white" font-weight="700">{n.l}</text>
        {/if}
      {/each}
      {#each [5,6,7,8] as fn, fi}
        <text x={PL2+fi*FS+FS/2} y={PT+5*SS+16} text-anchor="middle" font-size="7.5" fill="currentColor" opacity="0.4">{fn}</text>
      {/each}
      <text x="150" y={PT+5*SS+30} text-anchor="middle" font-size="8" fill={ORANGE} font-weight="700">★ = new notes: 2nd (B) and b6th (F)</text>
      {/if}
    </svg>
  </Block>

  <Block type="diagram" title="NOTE PALETTE — Am NATURAL MINOR">
    <svg viewBox="0 0 300 40" width="100%" style="display:block" role="img" aria-label="Note palette for Am natural minor">
      {#each [
        {n:'A',l:'R',c:ROOT},{n:'B',l:'2',c:ORANGE,new:true},{n:'C',l:'b3',c:OTHER},
        {n:'D',l:'4',c:OTHER},{n:'E',l:'5',c:FIFTH},{n:'F',l:'b6',c:ORANGE,new:true},{n:'G',l:'b7',c:OTHER}
      ] as note, i}
        <rect x={4+i*42} y="4" width="38" height="32" rx="4" fill={note.c} opacity={note.new?1:0.75}/>
        <text x={4+i*42+19} y="17" text-anchor="middle" font-size="11" fill="white" font-weight="800">{note.n}</text>
        <text x={4+i*42+19} y="30" text-anchor="middle" font-size="7.5" fill="white" opacity="0.85">{note.l}</text>
      {/each}
    </svg>
    <p class="diagram-caption">Orange = notes added vs pentatonic. These two new notes give you 7 colors to paint with.</p>
  </Block>

  <Block type="dothis">
    <p>Play pentatonic Box 1, then add the two new notes (B at fret 7 on string 6, F at fret 6 on string 2). Use B and F as passing tones at first — slide through them, don't stop on them.</p>
  </Block>

  <Block type="check">
    <CheckItem id="p7-c1" label="Know positions of 2nd (B) and b6th (F) in position" />
    <CheckItem id="p7-c2" label="Can play full natural minor in position at 70 BPM" />
    <CheckItem id="p7-c3" label="Can add natural minor notes to pentatonic phrasing" />
    <CheckItem id="p7-c4" label="Sounds musical, not like a scale exercise" />
  </Block>
</section>

<!-- ═══════════════════════════════════════════════════
     PHASE 8: Harmonic Minor Scale — THE ANIME SOUND
════════════════════════════════════════════════════ -->
<section class="section phase" id="phase-8">
  <div class="phase-header" style="--accent:#D97706">
    <span class="phase-num">Phase 8</span>
    <h2 class="phase-title">Harmonic Minor — The Anime Sound</h2>
  </div>

  <Block type="concept">
    <p>Harmonic Minor = Natural Minor with one change: raise the 7th by one fret. G becomes G#. This creates an "augmented 2nd" interval (3 frets from F to G#) that sounds exotic, dramatic, flamenco — and very anime.</p>
  </Block>

  <!-- THE KEY DIAGRAM - most visually striking -->
  <Block type="diagram" title="THE KEY CHANGE — G → G# (ONE FRET)">
    <svg viewBox="0 0 300 120" width="100%" style="display:block" role="img" aria-label="Natural minor vs harmonic minor comparison - the key difference">
      <!-- Background glow for G# -->
      <defs>
        <radialGradient id="goldGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#F59E0B" stop-opacity="0.6"/>
          <stop offset="100%" stop-color="#F59E0B" stop-opacity="0"/>
        </radialGradient>
      </defs>

      <!-- Left: Natural minor palette -->
      <text x="75" y="14" text-anchor="middle" font-size="10" font-weight="700" fill="currentColor" opacity="0.8">Natural Minor</text>
      {#each [
        {n:'A',l:'R',c:ROOT},{n:'B',l:'2',c:OTHER},{n:'C',l:'b3',c:OTHER},
        {n:'D',l:'4',c:OTHER},{n:'E',l:'5',c:FIFTH},{n:'F',l:'b6',c:OTHER},{n:'G',l:'b7',c:OTHER}
      ] as note, i}
        <rect x={4+i*20} y="22" width="18" height="28" rx="3" fill={note.c} opacity="0.8"/>
        <text x={4+i*20+9} y="33" text-anchor="middle" font-size="8" fill="white" font-weight="800">{note.n}</text>
        <text x={4+i*20+9} y="44" text-anchor="middle" font-size="6.5" fill="white" opacity="0.85">{note.l}</text>
      {/each}

      <!-- Big arrow -->
      <text x="150" y="44" text-anchor="middle" font-size="16" fill={GOLD} opacity="0.9">↓</text>
      <text x="150" y="60" text-anchor="middle" font-size="8" fill={GOLD} font-weight="700">raise G</text>
      <text x="150" y="72" text-anchor="middle" font-size="8" fill={GOLD} font-weight="700">one fret</text>

      <!-- Right: Harmonic minor palette -->
      <text x="225" y="14" text-anchor="middle" font-size="10" font-weight="700" fill="currentColor" opacity="0.8">Harmonic Minor</text>
      {#each [
        {n:'A',l:'R',c:ROOT},{n:'B',l:'2',c:OTHER},{n:'C',l:'b3',c:OTHER},
        {n:'D',l:'4',c:OTHER},{n:'E',l:'5',c:FIFTH},{n:'F',l:'b6',c:OTHER},{n:'G#',l:'△7',c:GOLD,special:true}
      ] as note, i}
        {@const isSpecial = note.special}
        {#if isSpecial}
          <!-- Gold glow effect -->
          <ellipse cx={154+i*20+9} cy="36" rx="18" ry="22" fill="url(#goldGlow)"/>
          <rect x={154+i*20} y="22" width="22" height="32" rx="4" fill={GOLD} stroke="#F59E0B" stroke-width="2"/>
          <text x={154+i*20+11} y="33" text-anchor="middle" font-size="8" fill="white" font-weight="900">{note.n}</text>
          <text x={154+i*20+11} y="44" text-anchor="middle" font-size="6.5" fill="white" font-weight="800">{note.l}</text>
          <!-- Star -->
          <text x={154+i*20+11} y="18" text-anchor="middle" font-size="10">⭐</text>
        {:else}
          <rect x={154+i*20} y="22" width="18" height="28" rx="3" fill={note.c} opacity="0.8"/>
          <text x={154+i*20+9} y="33" text-anchor="middle" font-size="8" fill="white" font-weight="800">{note.n}</text>
          <text x={154+i*20+9} y="44" text-anchor="middle" font-size="6.5" fill="white" opacity="0.85">{note.l}</text>
        {/if}
      {/each}

      <!-- Augmented 2nd bracket -->
      <path d="M{154+5*20} 56 L{154+5*20} 62 L{154+6*20+11} 62 L{154+6*20+11} 56" fill="none" stroke={GOLD} stroke-width="2"/>
      <text x={154+5.5*20+5} y="74" text-anchor="middle" font-size="8" fill={GOLD} font-weight="700">aug 2nd = exotic!</text>

      <text x="150" y="98" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.65">F → G# spans 3 frets (1½ whole steps) — the "anime interval"</text>
    </svg>
  </Block>

  <Block type="diagram" title="THE ANIME LICK — F → G# → A">
    <svg viewBox="0 0 280 90" width="100%" style="display:block" role="img" aria-label="The anime resolution lick F to G# to A">
      {#if true}
      {@const SS = 20}
      {@const FS = 40}
      {@const PL = 30}
      {@const PT = 20}
      <!-- Single string context (string 2, B) -->
      <line x1={PL} y1={PT+SS} x2={PL+5*FS} y2={PT+SS} stroke="currentColor" stroke-width="1" opacity="0.5"/>
      <!-- Fret lines -->
      {#each Array(6) as _, fi}
        <line x1={PL+fi*FS} y1={PT+SS-10} x2={PL+fi*FS} y2={PT+SS+10} stroke="currentColor" stroke-width="0.8" opacity="0.2"/>
      {/each}
      <!-- Fret numbers -->
      {#each [5,6,7,8,9,10] as fn, fi}
        <text x={PL+fi*FS} y={PT+SS+22} text-anchor="middle" font-size="8" fill="currentColor" opacity="0.5">{fn}</text>
      {/each}
      <!-- F at fret 6 (B+6=F) -->
      {@const fF = PL+1*FS-FS/2}
      {@const fGsharp = PL+3*FS-FS/2}
      {@const fA = PL+4*FS-FS/2}
      <circle cx={fF} cy={PT+SS} r="14" fill={OTHER} opacity="0.85"/>
      <text x={fF} y={PT+SS+5} text-anchor="middle" font-size="10" fill="white" font-weight="700">F</text>
      <!-- G# at fret 8 (B+8=G#) -->
      <ellipse cx={fGsharp} cy={PT+SS} rx="18" ry="18" fill={GOLD} opacity="0.3"/>
      <circle cx={fGsharp} cy={PT+SS} r="14" fill={GOLD} stroke="#F59E0B" stroke-width="2"/>
      <text x={fGsharp} y={PT+SS+5} text-anchor="middle" font-size="9" fill="white" font-weight="800">G#</text>
      <!-- A at fret 5 (B+5 = wait... fret 9 = B+9=A) -->
      <circle cx={fA} cy={PT+SS} r="14" fill={ROOT} opacity="0.9"/>
      <text x={fA} y={PT+SS+5} text-anchor="middle" font-size="10" fill="white" font-weight="700">A</text>
      <!-- Arrows between notes -->
      <path d="M{fF+14} {PT+SS-4} Q{(fF+fGsharp)/2} {PT+SS-28} {fGsharp-14} {PT+SS-4}" fill="none" stroke={ORANGE} stroke-width="2" marker-end="url(#arr1)"/>
      <path d="M{fGsharp+14} {PT+SS-4} Q{(fGsharp+fA)/2} {PT+SS-28} {fA-14} {PT+SS-4}" fill="none" stroke={ROOT} stroke-width="2.5" marker-end="url(#arr1)"/>
      <text x={(fF+fGsharp)/2} y={PT+SS-32} text-anchor="middle" font-size="8" fill={ORANGE}>+3 frets</text>
      <text x={(fGsharp+fA)/2} y={PT+SS-32} text-anchor="middle" font-size="8" fill={ROOT} font-weight="700">RESOLVE!</text>
      <!-- Label -->
      <text x="140" y="82" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">String 2 (B): frets 6 → 8 → 9</text>
      <text x="140" y="92" text-anchor="middle" font-size="9" fill={GOLD} font-weight="700">"THE sound" — loop this over Am</text>
      {/if}
    </svg>
  </Block>

  <Block type="diagram" title="AUGMENTED 2ND — THE EXOTIC GAP">
    <svg viewBox="0 0 260 50" width="100%" style="display:block" role="img" aria-label="Augmented second interval diagram">
      {#if true}
      {@const notes = ['F','·','G#','A']}
      {@const xs = [20, 60, 100, 140]}
      {#each notes as n, i}
        {#if n !== '·'}
          <circle cx={xs[i]} cy="25" r="12" fill={i===1?GOLD:i===2?ROOT:OTHER} opacity="0.9"/>
          <text x={xs[i]} y="29" text-anchor="middle" font-size={n.length>1?8:10} fill="white" font-weight="800">{n}</text>
        {/if}
      {/each}
      <!-- Gap bracket F to G# -->
      <path d="M32 15 L32 8 L88 8 L88 15" fill="none" stroke={GOLD} stroke-width="2"/>
      <text x="60" y="6" text-anchor="middle" font-size="8" fill={GOLD} font-weight="700">3 frets = aug 2nd</text>
      <!-- Normal step A -->
      <path d="M112 15 L112 8 L128 8 L128 15" fill="none" stroke={ROOT} stroke-width="1.5"/>
      <text x="120" y="6" text-anchor="middle" font-size="7.5" fill={ROOT}>2fr</text>
      <text x="180" y="25" text-anchor="start" font-size="8.5" fill="currentColor" opacity="0.75">← F to G# spans 3 frets (1½ steps)</text>
      <text x="180" y="38" text-anchor="start" font-size="8" fill={GOLD} font-weight="600">This gap = the exotic, tense sound</text>
      {/if}
    </svg>
  </Block>

  <Block type="dothis">
    <p>Play Am natural minor. Now change ONLY the G to G# — move one fret higher on fret 8. Play the F→G#→A resolution lick slowly. Loop it over an Am chord and feel the tension resolve.</p>
  </Block>

  <Block type="check">
    <CheckItem id="p8-c1" label="Know where G# is in the shape (one fret above G)" />
    <CheckItem id="p8-c2" label="Can play full harmonic minor in position" />
    <CheckItem id="p8-c3" label="Can play the F→G#→A resolution lick cleanly" />
    <CheckItem id="p8-c4" label="Can hear the anime/flamenco character" />
  </Block>
</section>

<!-- ═══════════════════════════════════════════════════
     PHASE 9: Techniques for Speed
════════════════════════════════════════════════════ -->
<section class="section phase" id="phase-9">
  <div class="phase-header" style="--accent:#DC2626">
    <span class="phase-num">Phase 9</span>
    <h2 class="phase-title">Techniques for Speed</h2>
  </div>

  <Block type="concept">
    <p>Speed comes from clean slow practice. The techniques here (alternate picking, legato, economy picking) let you play faster with less effort. Practice at 60% of max speed first — cleanliness compounds.</p>
  </Block>

  <Block type="diagram" title="PICKING TECHNIQUES">
    <svg viewBox="0 0 300 110" width="100%" style="display:block" role="img" aria-label="Picking techniques diagram">
      <!-- Alternate picking -->
      <text x="75" y="12" text-anchor="middle" font-size="9" font-weight="700" fill="currentColor" opacity="0.8">Alternate Picking</text>
      {#each [{x:15},{x:35},{x:55},{x:75},{x:95},{x:115}] as n, i}
        <!-- Staff line -->
        <line x1="5" y1="55" x2="125" y2="55" stroke="currentColor" stroke-width="0.5" opacity="0.3"/>
        <line x1={n.x} y1="40" x2={n.x} y2="55" stroke="currentColor" stroke-width="1.5" opacity="0.6"/>
        <ellipse cx={n.x} cy="58" rx="6" ry="4" fill="currentColor" opacity="0.7"/>
        <text x={n.x} y="26" text-anchor="middle" font-size="13" fill={i%2===0?ROOT:THIRD}>{i%2===0?'↓':'↑'}</text>
        <text x={n.x} y="72" text-anchor="middle" font-size="7" fill="currentColor" opacity="0.5">{i+1}</text>
      {/each}
      <text x="65" y="88" text-anchor="middle" font-size="8" fill="currentColor" opacity="0.6">Strict down-up alternation. Always.</text>

      <!-- Economy picking -->
      <text x="220" y="12" text-anchor="middle" font-size="9" font-weight="700" fill="currentColor" opacity="0.8">Economy Picking</text>
      <text x="220" y="88" text-anchor="middle" font-size="8" fill="currentColor" opacity="0.6">String change → same direction</text>
      <!-- Two strings, 3 notes each -->
      <line x1="155" y1="45" x2="285" y2="45" stroke="currentColor" stroke-width="0.5" opacity="0.3"/>
      <line x1="155" y1="60" x2="285" y2="60" stroke="currentColor" stroke-width="0.5" opacity="0.3"/>
      {#each [{x:165,sy:48,d:'↓'},{x:185,sy:48,d:'↑'},{x:205,sy:48,d:'↓'},{x:230,sy:63,d:'↓'},{x:250,sy:63,d:'↑'},{x:270,sy:63,d:'↓'}] as n, i}
        <line x1={n.x} y1={n.sy} x2={n.x} y2={n.sy+12} stroke="currentColor" stroke-width="1.5" opacity="0.6"/>
        <ellipse cx={n.x} cy={n.sy+15} rx="6" ry="4" fill="currentColor" opacity="0.7"/>
        <text x={n.x} y={n.sy-8} text-anchor="middle" font-size="12" fill={n.d==='↓'?ROOT:THIRD}>{n.d}</text>
      {/each}
      <!-- Arrow showing economy at string change -->
      <path d="M205 44 Q215 30 230 58" fill="none" stroke={ORANGE} stroke-width="1.5" stroke-dasharray="3,2" marker-end="url(#arr1)"/>
      <text x="218" y="26" text-anchor="middle" font-size="7.5" fill={ORANGE} font-weight="700">↓ continues</text>
    </svg>
  </Block>

  <Block type="diagram" title="LEGATO — SMOOTH WITHOUT PICKING EVERY NOTE">
    <svg viewBox="0 0 200 70" width="100%" style="display:block" role="img" aria-label="Legato technique diagram">
      <line x1="10" y1="38" x2="190" y2="38" stroke="currentColor" stroke-width="0.5" opacity="0.3"/>
      {#each [{x:20,l:'5',pick:true},{x:55,l:'H',pick:false},{x:90,l:'P',pick:false},{x:125,l:'7',pick:false}] as n, i}
        <line x1={n.x} y1="24" x2={n.x} y2="38" stroke="currentColor" stroke-width="1.5" opacity="0.6"/>
        <ellipse cx={n.x} cy="41" rx="7" ry="5" fill="currentColor" opacity="0.7"/>
        {#if n.pick}
          <text x={n.x} y="16" text-anchor="middle" font-size="13" fill={ROOT}>↓</text>
        {/if}
        <text x={n.x} y="58" text-anchor="middle" font-size="8" fill={n.pick?ROOT:GRAY} font-weight={n.pick?'700':'400'} opacity={n.pick?1:0.7}>{n.pick?'pick':n.l}</text>
      {/each}
      <!-- Slur arcs -->
      <path d="M27 20 Q37 8 48 20" fill="none" stroke={ORANGE} stroke-width="2"/>
      <path d="M62 24 Q75 12 83 24" fill="none" stroke={ORANGE} stroke-width="2"/>
      <text x="37" y="7" text-anchor="middle" font-size="7.5" fill={ORANGE}>H</text>
      <text x="73" y="11" text-anchor="middle" font-size="7.5" fill={ORANGE}>P</text>
      <text x="155" y="40" text-anchor="start" font-size="8.5" fill="currentColor" opacity="0.75">1 pick stroke → 4 notes</text>
      <text x="155" y="54" text-anchor="start" font-size="8" fill="currentColor" opacity="0.6">H=hammer P=pull-off</text>
    </svg>
  </Block>

  <Block type="diagram" title="BPM SPEED LADDER">
    <svg viewBox="0 0 240 200" width="100%" style="display:block;max-width:260px;margin:0 auto" role="img" aria-label="BPM speed ladder from 60 to 160 BPM">
      {#if true}
      {@const BPMS = [60, 80, 100, 120, 140, 160]}
      {#each BPMS as bpm, i}
        {@const y = 24 + i * 28}
        {@const unlocked = progress.isChecked(`p9-bpm-${bpm}`)}
        <rect x="10" y={y-14} width="200" height="24" rx="5"
          fill={unlocked?'#16A34A':'#1A1A2E'}
          opacity={unlocked?0.9:0.08}
          stroke={unlocked?'#16A34A':'#9CA3AF'}
          stroke-width="1.5"/>
        <text x="30" y={y+4} font-size="12" font-weight="700" fill={unlocked?'white':'currentColor'} opacity={unlocked?1:0.6}>{bpm} BPM</text>
        <text x="110" y={y+4} font-size="9" fill={unlocked?'white':'currentColor'} opacity={unlocked?0.9:0.5}>
          {bpm <= 80 ? 'slow & clean' : bpm <= 100 ? 'building' : bpm <= 120 ? 'getting fast' : bpm <= 140 ? 'fast' : '🔥 shredding'}
        </text>
        <!-- Checkbox -->
        <rect x="190" y={y-8} width="16" height="16" rx="3"
          fill={unlocked?'#16A34A':'none'}
          stroke={unlocked?'#16A34A':'#9CA3AF'}
          stroke-width="1.5"/>
        {#if unlocked}
          <text x="198" y={y+4} text-anchor="middle" font-size="10" fill="white" font-weight="700">✓</text>
        {/if}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <rect x="10" y={y-14} width="200" height="24" rx="5" fill="transparent" style="cursor:pointer" onclick={() => progress.toggle(`p9-bpm-${bpm}`)}/>
      {/each}
      <text x="110" y="194" text-anchor="middle" font-size="8" fill="currentColor" opacity="0.5">Tap to mark a level complete</text>
      {/if}
    </svg>
  </Block>

  <Block type="avoid">
    <p>Never practice at max speed. Muscle memory learns whatever you repeat — including mistakes. Add speed only when the current tempo sounds and feels clean. One step at a time.</p>
  </Block>

  <Block type="dothis">
    <p>Practice the spider exercise (1-2-3-4 across all strings) at 60 BPM. Increase by 10 BPM only when perfectly clean. Always use a metronome.</p>
  </Block>

  <Block type="check">
    <CheckItem id="p9-c1" label="Alternate picking clean at 100 BPM" />
    <CheckItem id="p9-c2" label="Legato runs clean at 80 BPM" />
    <CheckItem id="p9-c3" label="Spider exercise clean at 100 BPM" />
    <CheckItem id="p9-c4" label="Economy picking on string changes" />
  </Block>
</section>

<!-- ═══════════════════════════════════════════════════
     PHASE 10: Phrasing & Musicality
════════════════════════════════════════════════════ -->
<section class="section phase" id="phase-10">
  <div class="phase-header" style="--accent:#DC2626">
    <span class="phase-num">Phase 10</span>
    <h2 class="phase-title">Phrasing & Musicality</h2>
  </div>

  <Block type="concept">
    <p>Speed and scale knowledge are tools. Musicality is how you use them. Vibrato, bends, space, and dynamics transform scales into melodies. The most expressive solos often use the fewest notes.</p>
  </Block>

  <Block type="diagram" title="ANATOMY OF A MUSICAL PHRASE">
    <svg viewBox="0 0 300 110" width="100%" style="display:block" role="img" aria-label="Annotated musical phrase with techniques">
      <!-- Tab-style staff (4 lines = 4 bars) -->
      {#each [0,1] as lineIdx}
        <line x1="10" y1={45+lineIdx*8} x2="290" y2={45+lineIdx*8} stroke="currentColor" stroke-width="0.5" opacity="0.3"/>
      {/each}
      <!-- Bar lines -->
      {#each [10,80,150,220,290] as bx}
        <line x1={bx} y1="38" x2={bx} y2="60" stroke="currentColor" stroke-width="1" opacity="0.4"/>
      {/each}

      <!-- Notes in 4 bars -->
      <!-- Bar 1: 3 notes up -->
      {#each [{x:25},{x:42},{x:58}] as n}
        <line x1={n.x} y1="38" x2={n.x} y2="49" stroke="currentColor" stroke-width="1.5" opacity="0.7"/>
        <ellipse cx={n.x} cy="52" rx="6" ry="4" fill="currentColor" opacity="0.8"/>
      {/each}
      <!-- Bar 2: long note with vibrato -->
      <line x1="100" y1="30" x2="100" y2="49" stroke="currentColor" stroke-width="1.5" opacity="0.7"/>
      <ellipse cx="100" cy="52" rx="6" ry="4" fill="currentColor" opacity="0.8"/>
      <!-- Vibrato waves -->
      <path d="M106 50 Q112 44 118 50 Q124 56 130 50 Q136 44 142 50" fill="none" stroke={GOLD} stroke-width="2"/>
      <text x="124" y="38" text-anchor="middle" font-size="7" fill={GOLD} font-weight="700">vibrato ~~~</text>

      <!-- Bar 3: bend -->
      <line x1="165" y1="28" x2="165" y2="49" stroke="currentColor" stroke-width="1.5" opacity="0.7"/>
      <ellipse cx="165" cy="52" rx="6" ry="4" fill="currentColor" opacity="0.8"/>
      <path d="M165 38 L165 22" stroke={ORANGE} stroke-width="1.5"/>
      <polygon points="161,24 165,14 169,24" fill={ORANGE}/>
      <text x="180" y="18" font-size="7.5" fill={ORANGE} font-weight="700">↑1 bend</text>
      <!-- Rest -->
      <text x="200" y="52" text-anchor="middle" font-size="10" fill={GRAY} opacity="0.8">𝄽</text>
      <text x="200" y="65" text-anchor="middle" font-size="7" fill={GRAY}>rest</text>

      <!-- Bar 4: quiet notes -->
      {#each [{x:238},{x:255},{x:272}] as n}
        <line x1={n.x} y1="38" x2={n.x} y2="49" stroke="currentColor" stroke-width="1" opacity="0.4"/>
        <ellipse cx={n.x} cy="52" rx="5" ry="3.5" fill="currentColor" opacity="0.4"/>
      {/each}
      <text x="255" y="68" text-anchor="middle" font-size="7" fill={GRAY}>p (soft)</text>

      <!-- Dynamics labels -->
      <text x="55" y="78" text-anchor="middle" font-size="7" fill="currentColor" opacity="0.6">f (loud)</text>
      <text x="30" y="95" text-anchor="middle" font-size="8" fill="currentColor" opacity="0.7">BAR 1</text>
      <text x="115" y="95" text-anchor="middle" font-size="8" fill="currentColor" opacity="0.7">BAR 2</text>
      <text x="185" y="95" text-anchor="middle" font-size="8" fill="currentColor" opacity="0.7">BAR 3</text>
      <text x="255" y="95" text-anchor="middle" font-size="8" fill="currentColor" opacity="0.7">BAR 4</text>
      <text x="150" y="108" text-anchor="middle" font-size="7.5" fill="currentColor" opacity="0.5">Loud run → sustained vibrato → bend + REST → soft response</text>
    </svg>
  </Block>

  <Block type="diagram" title="VIBRATO — SUBTLE vs EXPRESSIVE">
    <svg viewBox="0 0 260 60" width="100%" style="display:block" role="img" aria-label="Vibrato types comparison">
      <!-- Narrow vibrato -->
      <text x="55" y="12" text-anchor="middle" font-size="9" font-weight="600" fill="currentColor" opacity="0.7">Subtle Vibrato</text>
      <circle cx="20" cy="35" r="12" fill={OTHER} opacity="0.85"/>
      <text x="20" y="39" text-anchor="middle" font-size="8" fill="white" font-weight="700">A</text>
      <path d="M32 35 Q38 30 44 35 Q50 40 56 35 Q62 30 68 35 Q74 40 80 35 Q86 30 92 35" fill="none" stroke={THIRD} stroke-width="2"/>
      <text x="62" y="55" text-anchor="middle" font-size="7.5" fill={THIRD}>narrow wave · subtle color</text>

      <!-- Wide vibrato -->
      <text x="190" y="12" text-anchor="middle" font-size="9" font-weight="600" fill="currentColor" opacity="0.7">Expressive Vibrato</text>
      <circle cx="130" cy="35" r="12" fill={OTHER} opacity="0.85"/>
      <text x="130" y="39" text-anchor="middle" font-size="8" fill="white" font-weight="700">A</text>
      <path d="M142 35 Q150 22 158 35 Q166 48 174 35 Q182 22 190 35 Q198 48 206 35 Q214 22 222 35 Q230 48 238 35" fill="none" stroke={ROOT} stroke-width="2.5"/>
      <text x="190" y="55" text-anchor="middle" font-size="7.5" fill={ROOT}>wide wave · emotional · sing</text>
    </svg>
  </Block>

  <Block type="tip">
    <p>Silence is a note. Leave space after a phrase — let it breathe. The listener's ear fills in the gaps. Try playing one good note with vibrato, then saying nothing for 2 beats. Record it.</p>
  </Block>

  <Block type="dothis">
    <p>Play a 2-bar phrase. Add vibrato to the final note. Leave 1 full bar of silence. Record yourself and listen — does it sound like singing? Repeat daily for a week.</p>
  </Block>

  <Block type="check">
    <CheckItem id="p10-c1" label="Can execute controlled, in-tune vibrato" />
    <CheckItem id="p10-c2" label="Can bend in tune (match target pitch)" />
    <CheckItem id="p10-c3" label="Intentionally uses space and silence in phrasing" />
    <CheckItem id="p10-c4" label="Phrases sound like singing, not scale exercises" />
  </Block>
</section>

<!-- ═══════════════════════════════════════════════════
     PHASE 11: Putting It All Together
════════════════════════════════════════════════════ -->
<section class="section phase" id="phase-11">
  <div class="phase-header" style="--accent:#DC2626">
    <span class="phase-num">Phase 11</span>
    <h2 class="phase-title">Putting It All Together</h2>
  </div>

  <Block type="concept">
    <p>A great solo has structure: it builds, peaks, and resolves. You now have all 3 scales (pentatonic, natural minor, harmonic minor) and the techniques to use them. The blueprint is below.</p>
  </Block>

  <Block type="diagram" title="SOLO STRUCTURE BLUEPRINT">
    <svg viewBox="0 0 260 230" width="100%" style="display:block;max-width:300px;margin:0 auto" role="img" aria-label="Solo structure flowchart">
      <defs>
        <marker id="arr-down" markerWidth="6" markerHeight="5" refX="3" refY="5" orient="auto">
          <polygon points="0 0, 6 0, 3 5" fill="#9CA3AF"/>
        </marker>
      </defs>
      <!-- Phase boxes -->
      {#each [
        {y:10,h:46,bg:'#16A34A',label:'INTRO',sub:'Pentatonic • melodic',sub2:'slow bends • establish key'},
        {y:80,h:46,bg:'#2563EB',label:'BUILD',sub:'Natural minor • longer runs',sub2:'speed increases'},
        {y:150,h:46,bg:'#DC2626',label:'CLIMAX',sub:'Harmonic minor • fastest',sub2:'F→G#→A • most intense'},
        {y:196,h:46,bg:'#16A34A',label:'RESOLVE',sub:'Pentatonic • land on root',sub2:'slow down • fade'},
      ] as box}
        <rect x="20" y={box.y} width="220" height={box.h} rx="8" fill={box.bg} opacity="0.15" stroke={box.bg} stroke-width="2"/>
        <text x="130" y={box.y+18} text-anchor="middle" font-size="12" font-weight="800" fill={box.bg}>{box.label}</text>
        <text x="130" y={box.y+32} text-anchor="middle" font-size="8.5" fill="currentColor" opacity="0.8">{box.sub}</text>
        <text x="130" y={box.y+44} text-anchor="middle" font-size="8" fill="currentColor" opacity="0.6">{box.sub2}</text>
      {/each}
      <!-- Connector arrows -->
      {#each [56,126,196] as y}
        <line x1="130" y1={y} x2="130" y2={y+24} stroke="#9CA3AF" stroke-width="2" marker-end="url(#arr-down)"/>
      {/each}
    </svg>
  </Block>

  <Block type="diagram" title="THREE SCALES LAYERED — ONE FRETBOARD">
    <svg viewBox="0 0 200 160" width="100%" style="display:block;max-width:260px;margin:0 auto" role="img" aria-label="Three scales layered on one fretboard">
      {#if true}
      {@const SS = 22}
      {@const FS = 36}
      {@const PL = 28}
      {@const PT = 18}
      {#each Array(6) as _, si}
        <line x1={PL} y1={PT+si*SS} x2={PL+4*FS} y2={PT+si*SS} stroke="currentColor" stroke-width={si>=3?1+(si-3)*0.3:0.8} opacity="0.4"/>
      {/each}
      {#each Array(5) as _, fi}
        <line x1={PL+fi*FS} y1={PT-4} x2={PL+fi*FS} y2={PT+5*SS+4} stroke="currentColor" stroke-width={fi===0?2:0.8} opacity={fi===0?0.4:0.12}/>
      {/each}
      {#each [5,6,7,8] as fn, fi}
        <text x={PL+fi*FS+FS/2} y={PT+5*SS+16} text-anchor="middle" font-size="8" fill="currentColor" opacity="0.4">{fn}</text>
      {/each}
      <!-- Layer 1: Pentatonic (base, faded) -->
      {#each [
        {si:0,fo:0,l:'R'},{si:0,fo:3,l:'b3'},
        {si:1,fo:0,l:'5'},{si:1,fo:3,l:'b7'},
        {si:2,fo:0,l:'b3'},{si:2,fo:2,l:'4'},
        {si:3,fo:0,l:'b7'},{si:3,fo:2,l:'R'},
        {si:4,fo:0,l:'4'},{si:4,fo:2,l:'5'},
        {si:5,fo:0,l:'R'},{si:5,fo:3,l:'b3'},
      ] as n}
        {@const cx = PL + n.fo * FS + FS/2}
        {@const cy = PT + n.si * SS}
        <circle cx={cx} cy={cy} r="11" fill={n.l==='R'?ROOT:OTHER} opacity="0.35"/>
        <text x={cx} y={cy+4} text-anchor="middle" font-size="7" fill="currentColor" opacity="0.5">{n.l}</text>
      {/each}
      <!-- Layer 2: Natural minor additions (orange) -->
      {#each [
        {si:0,fo:2,l:'2'},{si:5,fo:1,l:'b6'},
      ] as n}
        {@const cx = PL + n.fo * FS + FS/2}
        {@const cy = PT + n.si * SS}
        <circle cx={cx} cy={cy} r="10" fill={ORANGE} opacity="0.85"/>
        <text x={cx} y={cy+4} text-anchor="middle" font-size="7" fill="white" font-weight="700">{n.l}</text>
      {/each}
      <!-- Layer 3: Harmonic minor (gold G#) -->
      <!-- G# appears at fret8 str2 (B+8=G#) and fret8 str6(E+8=C... wait) -->
      <!-- Actually G# in box 1 position: str2(B) fret8 = G#, str5(A) fret4 = ... -->
      <!-- B string: fret 8 = G# -->
      {@const cx3 = PL + 3 * FS + FS/2}
      {@const cy3 = PT + 1 * SS}
      <ellipse cx={cx3} cy={cy3} rx="16" ry="16" fill={GOLD} opacity="0.25"/>
      <circle cx={cx3} cy={cy3} r="11" fill={GOLD} stroke="#F59E0B" stroke-width="2"/>
      <text x={cx3} y={cy3+4} text-anchor="middle" font-size="7.5" fill="white" font-weight="800">△7</text>

      <!-- Legend -->
      <text x="10" y={PT+5*SS+30} font-size="7.5" fill={OTHER} opacity="0.5">■ Pentatonic</text>
      <text x="80" y={PT+5*SS+30} font-size="7.5" fill={ORANGE}>■ +Natural</text>
      <text x="148" y={PT+5*SS+30} font-size="7.5" fill={GOLD}>■ +Harmonic</text>
      {/if}
    </svg>
  </Block>

  <Block type="dothis">
    <p>Improvise over an Am backing track using the solo structure as a blueprint. Record it. Listen for where you resolved. Repeat every day — notice how each session improves.</p>
  </Block>

  <Block type="check">
    <CheckItem id="p11-c1" label="Can structure an improvised solo (intro→build→climax→resolve)" />
    <CheckItem id="p11-c2" label="Uses all 3 scales intentionally in one solo" />
    <CheckItem id="p11-c3" label="Phrasing sounds musical, not like scale exercises" />
    <CheckItem id="p11-c4" label="Ready to transcribe an anime opening guitar solo" />
  </Block>
</section>

<!-- ═══════════════════════════════════════════════════
     WHAT'S NEXT
════════════════════════════════════════════════════ -->
<section class="section" id="whats-next">
  <h2 class="section-title">What's Next</h2>

  <Block type="diagram" title="AFTER THIS GUIDE">
    <svg viewBox="0 0 260 180" width="100%" style="display:block;max-width:300px;margin:0 auto" role="img" aria-label="What comes after this guide">
      <defs>
        <marker id="arr-next" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
          <polygon points="0 0,6 2,0 4" fill="#3D348B"/>
        </marker>
      </defs>
      <!-- This guide box -->
      <rect x="60" y="5" width="140" height="36" rx="6" fill="#3D348B" opacity="0.9"/>
      <text x="130" y="22" text-anchor="middle" font-size="10" font-weight="700" fill="white">This Guide ✓</text>
      <text x="130" y="34" text-anchor="middle" font-size="7.5" fill="white" opacity="0.85">Pent + Nat Minor + Harm Minor</text>

      <!-- Arrows to next steps -->
      <line x1="80" y1="41" x2="50" y2="65" stroke="#3D348B" stroke-width="1.5" marker-end="url(#arr-next)"/>
      <line x1="130" y1="41" x2="130" y2="65" stroke="#3D348B" stroke-width="1.5" marker-end="url(#arr-next)"/>
      <line x1="180" y1="41" x2="210" y2="65" stroke="#3D348B" stroke-width="1.5" marker-end="url(#arr-next)"/>

      <!-- Modes -->
      <rect x="5" y="68" width="88" height="30" rx="5" fill="#2563EB" opacity="0.2" stroke="#2563EB" stroke-width="1.5"/>
      <text x="49" y="82" text-anchor="middle" font-size="9" font-weight="700" fill="#2563EB">Modes</text>
      <text x="49" y="93" text-anchor="middle" font-size="7.5" fill="currentColor" opacity="0.7">Dorian · Phrygian</text>

      <!-- Sweep picking -->
      <rect x="85" y="68" width="90" height="30" rx="5" fill="#16A34A" opacity="0.2" stroke="#16A34A" stroke-width="1.5"/>
      <text x="130" y="82" text-anchor="middle" font-size="9" font-weight="700" fill="#16A34A">Sweep Picking</text>
      <text x="130" y="93" text-anchor="middle" font-size="7.5" fill="currentColor" opacity="0.7">arpeggios</text>

      <!-- Tapping -->
      <rect x="167" y="68" width="88" height="30" rx="5" fill="#D97706" opacity="0.2" stroke="#D97706" stroke-width="1.5"/>
      <text x="211" y="82" text-anchor="middle" font-size="9" font-weight="700" fill="#D97706">Tapping</text>
      <text x="211" y="93" text-anchor="middle" font-size="7.5" fill="currentColor" opacity="0.7">2-hand legato</text>

      <!-- Transcription -->
      <line x1="130" y1="98" x2="130" y2="120" stroke="#3D348B" stroke-width="1.5" marker-end="url(#arr-next)"/>
      <rect x="55" y="123" width="150" height="30" rx="6" fill="#3D348B" opacity="0.15" stroke="#3D348B" stroke-width="1.5"/>
      <text x="130" y="137" text-anchor="middle" font-size="9" font-weight="700" fill="#3D348B">Transcription</text>
      <text x="130" y="148" text-anchor="middle" font-size="7.5" fill="currentColor" opacity="0.7">Copy anime solos note-for-note</text>

      <text x="130" y="172" text-anchor="middle" font-size="8" fill="currentColor" opacity="0.5">The best players are obsessive transcribers</text>
    </svg>
  </Block>

  <Block type="tip" title="RESOURCES">
    <p><strong>YouTube:</strong> Search "Am pentatonic backing track" — practice over these daily.</p>
    <p><strong>Tonegym.co</strong> — ear training to recognize intervals and chord tones.</p>
    <p><strong>Ultimate Guitar</strong> — find tabs of your favorite anime openings and transcribe them.</p>
  </Block>
</section>

<!-- ═══════════════════════════════════════════════════
     APPENDIX
════════════════════════════════════════════════════ -->
<section class="section" id="appendix">
  <h2 class="section-title">Appendix — Reference Diagrams</h2>

  <Block type="diagram" title="COMPLETE FRETBOARD NOTE MAP — ALL 6 STRINGS, FRETS 0–12">
    <div style="overflow-x:auto">
    <svg viewBox="0 0 560 120" width="100%" style="display:block;min-width:400px" role="img" aria-label="Complete fretboard note map">
      {#if true}
      {@const STR_Y_APP = [14, 26, 38, 50, 62, 74]}
      {@const FRET_X_APP = Array.from({length:13}, (_, i) => 38 + i * 40)}
      <!-- String lines -->
      {#each STR_Y_APP as y, i}
        <line x1="38" y1={y} x2="556" y2={y} stroke="currentColor" stroke-width={i>=3?1+(i-3)*0.3:0.8} opacity="0.5"/>
      {/each}
      <!-- Nut -->
      <line x1="38" y1="8" x2="38" y2="80" stroke="currentColor" stroke-width="4" stroke-linecap="round" opacity="0.6"/>
      <!-- Fret lines -->
      {#each FRET_X_APP as fx}
        <line x1={fx} y1="8" x2={fx} y2="80" stroke="currentColor" stroke-width="0.8" opacity="0.2"/>
      {/each}
      <!-- String names -->
      {#each ['e','B','G','D','A','E'] as sn, i}
        <text x="20" y={STR_Y_APP[i]+4} text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">{sn}</text>
      {/each}
      <!-- All notes -->
      {#each Array(6) as _, si}
        {@const strIdx = si + 1}
        {#each Array(13) as _, fi}
          {@const note = noteAtFret(strIdx, fi)}
          {@const isRoot = note === 'A'}
          {@const isSharp = note.includes('#')}
          {@const x = fi === 0 ? 38 - 14 : FRET_X_APP[fi] - 19}
          <rect x={x+1} y={STR_Y_APP[si]-6} width={fi===0?16:17} height={11} rx="2"
            fill={isRoot?ROOT:isSharp?GRAY:OTHER}
            opacity={isRoot?0.95:isSharp?0.3:0.6}/>
          <text x={x+9.5} y={STR_Y_APP[si]+3} text-anchor="middle" font-size={isSharp?5.5:6.5} fill="white" font-weight={isRoot?'800':'600'}>{note}</text>
        {/each}
      {/each}
      <!-- Fret numbers -->
      {#each Array(13) as _, fi}
        {@const fx = fi === 0 ? 38 - 14 : FRET_X_APP[fi] - 19}
        <text x={fx+9} y={94} text-anchor="middle" font-size="8" fill="currentColor" opacity={[3,5,7,9,12].includes(fi)?0.8:0.4}
          font-weight={[3,5,7,9,12].includes(fi)?'700':'400'}>{fi}</text>
      {/each}
      <!-- Landmark indicators -->
      {#each [3,5,7,9,12] as lf}
        {@const fx = FRET_X_APP[lf] - 19}
        <text x={fx+9} y="108" text-anchor="middle" font-size="8" fill="#3D348B">●</text>
      {/each}
      <text x="280" y="118" text-anchor="middle" font-size="7.5" fill="currentColor" opacity="0.5">■ = A (root) everywhere on the neck</text>
      {/if}
    </svg>
    </div>
  </Block>

  <Block type="diagram" title="OPEN CHORD REFERENCE — C Am G D E Em">
    <div class="chord-row-wrap">
      {#each [
        { name:'C', frets:[0,1,0,2,3,null], roots:[2,5], thirds:[1,4], fifths:[3], labels:['E','C','G','E','C','×'] },
        { name:'Am', frets:[0,1,2,2,0,null], roots:[1,4], thirds:[2,5], fifths:[3], labels:['E','C','A','E','A','×'] },
        { name:'G', frets:[3,0,0,0,2,3], roots:[1,6], thirds:[2], fifths:[3,4,5], labels:['G','B','G','D','B','G'] },
        { name:'D', frets:[2,3,2,0,null,null], roots:[1,4], thirds:[3], fifths:[2], labels:['D','A','F#','D','×','×'] },
        { name:'E', frets:[0,0,1,2,2,0], roots:[1,3,6], thirds:[5], fifths:[2,4], labels:['E','B','G#','E','B','E'] },
        { name:'Em', frets:[0,0,0,2,2,0], roots:[1,3,6], thirds:[4], fifths:[2,5], labels:['E','B','G','E','B','E'] },
      ] as shape}
        <div class="chord-mini-app">
          <ChordBox
            name={shape.name}
            frets_data={shape.frets}
            startFret={1}
            roots={shape.roots}
            thirds={shape.thirds}
            fifths={shape.fifths}
            labels={shape.labels}
          />
        </div>
      {/each}
    </div>
  </Block>
</section>

<!-- Footer -->
<footer class="guide-footer">
  <p>Built with ♥ for guitar learners · <a href="{base}/caged">CAGED Visualizer</a> · <a href="{base}/tuner">Tuner</a></p>
  <p style="opacity:0.4;font-size:0.75rem;margin-top:4px">Am → anime solo. You've got this.</p>
</footer>

</div><!-- end .guide-root -->

<!-- Sticky phase nav -->
<div class="phase-nav">
  <div class="phase-nav-inner">
    {#each PHASES as ph}
      <button
        class="phase-dot"
        class:active={currentPhase === ph.n}
        onclick={() => scrollToPhase(ph.n)}
        aria-label="Go to phase {ph.n}"
        title="Phase {ph.n}: {ph.name}"
      >
        {ph.n}
      </button>
    {/each}
  </div>
</div>

<style>
  /* ——— Progress bar ——— */
  .progress-bar {
    position: fixed;
    top: 0;
    left: 0;
    height: 3px;
    background: linear-gradient(90deg, #3D348B, #DC2626);
    z-index: 1000;
    transition: width 0.1s linear;
  }

  /* ——— Nav ——— */
  .top-nav {
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(255,255,255,0.95);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid #E5E7EB;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    max-width: 100%;
  }
  .nav-links { display: flex; gap: 16px; align-items: center; }
  .nav-brand { font-weight: 800; font-size: 1rem; color: #3D348B; text-decoration: none; }
  .top-nav a { font-size: 0.85rem; color: #5A5A6E; text-decoration: none; }
  .top-nav a:hover { color: #3D348B; }
  .dark-toggle {
    background: none;
    border: 1px solid #E5E7EB;
    border-radius: 20px;
    padding: 4px 10px;
    cursor: pointer;
    font-size: 1rem;
  }

  /* ——— Guide root ——— */
  .guide-root {
    background: #FFFFFF;
    color: #1A1A2E;
    min-height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 1rem;
    line-height: 1.65;
    padding-bottom: 80px;
  }
  .guide-root.dark {
    background: #1A1A2E;
    color: #E8E8F0;
  }
  .guide-root.dark :global(.top-nav) {
    background: rgba(26,26,46,0.95);
    border-bottom-color: #2D2D4E;
  }
  .guide-root.dark .top-nav { background: rgba(26,26,46,0.95); border-bottom-color: #2D2D4E; }
  .guide-root.dark .top-nav a { color: #A0A0C0; }
  .guide-root.dark .dark-toggle { border-color: #2D2D4E; color: #E8E8F0; }

  /* ——— Sections ——— */
  .section {
    max-width: 480px;
    margin: 0 auto;
    padding: 24px 16px 8px;
  }
  .section-title {
    font-size: 1.25rem;
    font-weight: 800;
    margin-bottom: 16px;
    color: #3D348B;
  }
  .guide-root.dark .section-title { color: #A0A0FF; }

  /* ——— Hero ——— */
  .hero {
    background: linear-gradient(135deg, #3D348B 0%, #1A1A2E 100%);
    color: white;
    padding: 48px 16px 40px;
    text-align: center;
  }
  .hero-inner { max-width: 480px; margin: 0 auto; }
  .hero-title {
    font-size: 2.2rem;
    font-weight: 900;
    line-height: 1.15;
    margin: 0 0 8px;
    letter-spacing: -0.02em;
  }
  .arrow { color: #F59E0B; }
  .hero-sub {
    font-size: 1.2rem;
    opacity: 0.85;
    margin: 0 0 16px;
  }
  .hero-tags {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
    margin-bottom: 16px;
  }
  .tag {
    background: rgba(255,255,255,0.15);
    border-radius: 20px;
    padding: 4px 12px;
    font-size: 0.78rem;
    font-weight: 600;
  }
  .hero-desc {
    font-size: 0.95rem;
    opacity: 0.75;
    line-height: 1.6;
  }

  /* ——— Phase headers ——— */
  .phase {
    border-top: 2px solid #F3F4F6;
    padding-top: 28px;
  }
  .guide-root.dark .phase { border-top-color: #2D2D4E; }
  .phase-header {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 16px;
  }
  .phase-num {
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--accent, #3D348B);
    background: color-mix(in srgb, var(--accent, #3D348B) 12%, transparent);
    padding: 3px 10px;
    border-radius: 20px;
    white-space: nowrap;
  }
  .phase-title {
    font-size: 1.35rem;
    font-weight: 800;
    line-height: 1.25;
  }

  /* ——— Diagram wrap ——— */
  .diagram-wrap {
    margin: 8px 0;
  }
  .diagram-caption {
    font-size: 0.78rem;
    color: #5A5A6E;
    margin-top: 6px;
    line-height: 1.5;
  }
  .guide-root.dark .diagram-caption { color: #9090B0; }

  /* ——— Chord grids ——— */
  .chord-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 12px;
  }
  .chord-wrap { }
  .chord-row-5 {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 4px;
    margin-bottom: 4px;
  }
  .chord-mini { }
  .chord-row-wrap {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }
  .chord-mini-app { }

  /* ——— Legend ——— */
  .legend-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    margin-bottom: 12px;
  }
  .symbol-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  /* ——— Phase nav ——— */
  .phase-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(255,255,255,0.96);
    backdrop-filter: blur(8px);
    border-top: 1px solid #E5E7EB;
    padding: 8px 12px;
    z-index: 200;
  }
  .guide-root.dark ~ .phase-nav,
  .phase-nav {
    /* Always shown, dark mode handled by root context */
  }
  .phase-nav-inner {
    display: flex;
    gap: 6px;
    justify-content: center;
    max-width: 480px;
    margin: 0 auto;
    overflow-x: auto;
  }
  .phase-dot {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid #E5E7EB;
    background: none;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    color: #5A5A6E;
    flex-shrink: 0;
    transition: all 0.15s;
  }
  .phase-dot:hover {
    border-color: #3D348B;
    color: #3D348B;
  }
  .phase-dot.active {
    background: #3D348B;
    border-color: #3D348B;
    color: white;
  }

  /* ——— Footer ——— */
  .guide-footer {
    text-align: center;
    padding: 24px 16px 32px;
    font-size: 0.82rem;
    color: #5A5A6E;
    border-top: 1px solid #F3F4F6;
    max-width: 480px;
    margin: 0 auto;
  }
  .guide-footer a { color: #3D348B; }
  .guide-root.dark .guide-footer { color: #9090B0; border-top-color: #2D2D4E; }

  /* ——— Fret legend ——— */
  .fret-legend { margin-top: 8px; }

  /* ——— Responsive ——— */
  @media (max-width: 380px) {
    .chord-row-5 { grid-template-columns: repeat(5, 1fr); }
    .hero-title { font-size: 1.75rem; }
  }
</style>
