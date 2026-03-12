<script lang="ts">
  // Props
  let {
    frets = 5,
    notes = [] as Array<{string: number; fret: number; color?: string; label?: string; finger?: number; muted?: boolean}>,
    startFret = 0,
    title = '',
    highlightFrets = [] as number[],
    showStringNames = true,
    showFretNumbers = true,
    dim = [] as number[], // string indices (1-based) to dim/gray
    arrows = [] as Array<{from: {s:number;f:number}; to: {s:number;f:number}; label?: string}>,
  } = $props();

  const STRING_NAMES = ['e', 'B', 'G', 'D', 'A', 'E'];
  const PAD_LEFT = showStringNames ? 28 : 8;
  const PAD_RIGHT = 12;
  const PAD_TOP = title ? 28 : 14;
  const PAD_BOT = showFretNumbers ? 28 : 10;
  const STRING_SPACING = 22;
  const FRET_SPACING = 40;
  const NUM_STRINGS = 6;
  const CIRCLE_R = 10;

  function sx(fret: number) {
    // x position of a fret line
    return PAD_LEFT + fret * FRET_SPACING;
  }
  function sy(str: number) {
    // y position of a string line (str 1=high e, 6=low E)
    return PAD_TOP + (str - 1) * STRING_SPACING;
  }
  function noteX(fret: number) {
    if (fret === 0) return sx(0) - 12;
    return sx(fret - 0.5);
  }
  function noteY(str: number) { return sy(str); }

  function noteColor(color?: string) {
    if (!color) return '#1A1A2E';
    return color;
  }

  const W_COMPUTED = PAD_LEFT + frets * FRET_SPACING + PAD_RIGHT;
  const H_COMPUTED = PAD_TOP + (NUM_STRINGS - 1) * STRING_SPACING + PAD_BOT;
</script>

<svg
  viewBox="0 0 {W_COMPUTED} {H_COMPUTED}"
  width="100%"
  xmlns="http://www.w3.org/2000/svg"
  style="display:block;max-width:100%"
  role="img"
  aria-label={title || 'Guitar fretboard diagram'}
>
  {#if title}
    <text x={W_COMPUTED/2} y={16} text-anchor="middle" font-size="11" font-weight="600" fill="currentColor" opacity="0.7">{title}</text>
  {/if}

  <!-- Highlight frets -->
  {#each highlightFrets as hf}
    <rect
      x={sx(hf - 0.5)}
      y={PAD_TOP - 6}
      width={FRET_SPACING}
      height={(NUM_STRINGS - 1) * STRING_SPACING + 12}
      fill="#3D348B"
      opacity="0.12"
      rx="3"
    />
  {/each}

  <!-- Nut (thick line when startFret=0) -->
  {#if startFret === 0}
    <line x1={sx(0)} y1={PAD_TOP - 4} x2={sx(0)} y2={PAD_TOP + (NUM_STRINGS-1)*STRING_SPACING + 4} stroke="currentColor" stroke-width="4" stroke-linecap="round" opacity="0.7"/>
  {/if}

  <!-- Fret lines -->
  {#each Array(frets + 1) as _, i}
    {#if !(startFret === 0 && i === 0)}
      <line x1={sx(i)} y1={PAD_TOP} x2={sx(i)} y2={PAD_TOP + (NUM_STRINGS-1)*STRING_SPACING} stroke="currentColor" stroke-width="1" opacity="0.25"/>
    {/if}
  {/each}

  <!-- String lines -->
  {#each Array(NUM_STRINGS) as _, i}
    {@const strIdx = i + 1}
    {@const isDim = dim.includes(strIdx)}
    <line
      x1={PAD_LEFT}
      y1={sy(strIdx)}
      x2={PAD_LEFT + frets * FRET_SPACING}
      y2={sy(strIdx)}
      stroke="currentColor"
      stroke-width={strIdx >= 4 ? 1.5 + (strIdx - 4) * 0.4 : 1}
      opacity={isDim ? 0.2 : 0.6}
    />
  {/each}

  <!-- String names -->
  {#if showStringNames}
    {#each Array(NUM_STRINGS) as _, i}
      {@const strIdx = i + 1}
      {@const isDim = dim.includes(strIdx)}
      <text x={PAD_LEFT - 8} y={sy(strIdx) + 4} text-anchor="middle" font-size="10" fill="currentColor" opacity={isDim ? 0.3 : 0.7} font-family="monospace">{STRING_NAMES[i]}</text>
    {/each}
  {/if}

  <!-- Fret numbers -->
  {#if showFretNumbers}
    {#each Array(frets) as _, i}
      {@const fretNum = startFret + i + 1}
      <text x={sx(i) + FRET_SPACING/2} y={H_COMPUTED - 8} text-anchor="middle" font-size="9" fill="currentColor" opacity="0.5" font-family="monospace">{fretNum}</text>
    {/each}
  {/if}

  <!-- Arrows between notes -->
  {#each arrows as arr}
    {@const x1 = sx(arr.from.f - 0.5)}
    {@const y1 = sy(arr.from.s)}
    {@const x2 = sx(arr.to.f - 0.5)}
    {@const y2 = sy(arr.to.s)}
    <defs>
      <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
        <polygon points="0 0, 6 2, 0 4" fill="#D97706"/>
      </marker>
    </defs>
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#D97706" stroke-width="1.5" stroke-dasharray="4,2" marker-end="url(#arrowhead)" opacity="0.8"/>
    {#if arr.label}
      <text x={(x1+x2)/2} y={(y1+y2)/2 - 4} text-anchor="middle" font-size="8" fill="#D97706">{arr.label}</text>
    {/if}
  {/each}

  <!-- Notes -->
  {#each notes as note}
    {@const cx = noteX(note.fret)}
    {@const cy = noteY(note.string)}
    {@const col = noteColor(note.color)}
    {#if note.muted}
      <text x={cx} y={cy + 4} text-anchor="middle" font-size="13" fill={col} opacity="0.8">×</text>
    {:else if note.fret === 0}
      <!-- Open string: circle outline -->
      <circle cx={cx} cy={cy} r={CIRCLE_R - 2} fill="none" stroke={col} stroke-width="2"/>
      {#if note.label}
        <text x={cx} y={cy + 4} text-anchor="middle" font-size="8" fill={col} font-weight="600">{note.label}</text>
      {/if}
    {:else}
      <circle cx={cx} cy={cy} r={CIRCLE_R} fill={col} opacity="0.9"/>
      {#if note.label}
        <text x={cx} y={cy + 4} text-anchor="middle" font-size="8" fill="white" font-weight="700">{note.label}</text>
      {/if}
      {#if note.finger}
        <text x={cx} y={cy + 4} text-anchor="middle" font-size="9" fill="white" font-weight="700">{note.finger}</text>
      {/if}
    {/if}
  {/each}
</svg>
