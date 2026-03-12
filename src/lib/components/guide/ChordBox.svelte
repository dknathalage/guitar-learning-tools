<script lang="ts">
  // Vertical chord diagram
  let {
    name = '',
    frets_data = [] as Array<number | null>, // 6 values, null=muted, 0=open, 1-n=fret
    startFret = 1,
    barre = null as null | { fret: number; fromString: number; toString: number },
    fingers = [] as Array<number | null>, // finger numbers per string
    roots = [] as number[], // string indices (1-based) that are root
    thirds = [] as number[], // string indices that are 3rd
    fifths = [] as number[], // string indices that are 5th
    labels = [] as Array<string | null>, // optional note labels
  } = $props();

  const STR_SPACING = 22;
  const FRET_SPACING = 22;
  const NUM_STRINGS = 6;
  const NUM_FRETS = 5;
  const PAD_LEFT = 14;
  const PAD_TOP = 32;
  const PAD_BOT = 14;
  const PAD_RIGHT = 14;
  const W = PAD_LEFT + (NUM_STRINGS - 1) * STR_SPACING + PAD_RIGHT;
  const H = PAD_TOP + NUM_FRETS * FRET_SPACING + PAD_BOT;
  const CIRCLE_R = 9;

  function sx(strIdx: number) {
    // str 1 = high e = rightmost
    return PAD_LEFT + (NUM_STRINGS - strIdx) * STR_SPACING;
  }
  function fy(fretIdx: number) {
    return PAD_TOP + fretIdx * FRET_SPACING;
  }
  function noteY(fret: number) {
    return fy(fret - startFret) + FRET_SPACING / 2;
  }
  function dotColor(strIdx: number): string {
    if (roots.includes(strIdx)) return '#DC2626';
    if (thirds.includes(strIdx)) return '#2563EB';
    if (fifths.includes(strIdx)) return '#16A34A';
    return '#1A1A2E';
  }
</script>

<svg
  viewBox="0 0 {W} {H}"
  width="100%"
  xmlns="http://www.w3.org/2000/svg"
  style="display:block;max-width:100%"
  role="img"
  aria-label="{name} chord diagram"
>
  <!-- Title -->
  {#if name}
    <text x={W/2} y={14} text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">{name}</text>
  {/if}

  <!-- Nut or start fret indicator -->
  {#if startFret === 1}
    <line x1={PAD_LEFT} y1={PAD_TOP} x2={PAD_LEFT + (NUM_STRINGS-1)*STR_SPACING} y2={PAD_TOP} stroke="currentColor" stroke-width="4" stroke-linecap="round" opacity="0.7"/>
  {:else}
    <text x={PAD_LEFT - 10} y={PAD_TOP + FRET_SPACING/2 + 4} text-anchor="end" font-size="9" fill="currentColor" opacity="0.6">{startFret}fr</text>
  {/if}

  <!-- Fret lines -->
  {#each Array(NUM_FRETS + 1) as _, i}
    <line x1={PAD_LEFT} y1={fy(i)} x2={PAD_LEFT + (NUM_STRINGS-1)*STR_SPACING} y2={fy(i)} stroke="currentColor" stroke-width="1" opacity="0.2"/>
  {/each}

  <!-- String lines -->
  {#each Array(NUM_STRINGS) as _, i}
    <line x1={sx(i+1)} y1={PAD_TOP} x2={sx(i+1)} y2={fy(NUM_FRETS)} stroke="currentColor" stroke-width={i >= 3 ? 1 + (i-3)*0.3 : 0.8} opacity="0.5"/>
  {/each}

  <!-- Barre -->
  {#if barre}
    {@const y = noteY(barre.fret)}
    <line
      x1={sx(barre.fromString) - CIRCLE_R}
      y1={y}
      x2={sx(barre.toString) + CIRCLE_R}
      y2={y}
      stroke="#1A1A2E"
      stroke-width={CIRCLE_R * 2}
      stroke-linecap="round"
      opacity="0.85"
    />
  {/if}

  <!-- Open / muted indicators above nut -->
  {#each frets_data as fret, i}
    {@const strIdx = i + 1}
    {@const x = sx(strIdx)}
    {#if fret === null}
      <text x={x} y={PAD_TOP - 8} text-anchor="middle" font-size="11" fill="currentColor" opacity="0.7">×</text>
    {:else if fret === 0}
      <circle cx={x} cy={PAD_TOP - 10} r={5} fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.7"/>
    {/if}
  {/each}

  <!-- Dots -->
  {#each frets_data as fret, i}
    {@const strIdx = i + 1}
    {#if fret !== null && fret > 0}
      {@const x = sx(strIdx)}
      {@const y = noteY(fret)}
      {@const col = dotColor(strIdx)}
      <circle cx={x} cy={y} r={CIRCLE_R} fill={col} opacity="0.9"/>
      {#if labels[i]}
        <text x={x} y={y + 4} text-anchor="middle" font-size="7.5" fill="white" font-weight="700">{labels[i]}</text>
      {:else if fingers[i]}
        <text x={x} y={y + 4} text-anchor="middle" font-size="8" fill="white" font-weight="700">{fingers[i]}</text>
      {/if}
    {/if}
  {/each}
</svg>
