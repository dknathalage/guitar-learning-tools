<script>
  import { noteAt, STRING_NAMES } from '$lib/music/fretboard.js';

  let { dots = [], onclick = null, highlightedFrets = [] } = $props();

  const NUM_FRETS = 15;
  const WIDTH = 800;
  const HEIGHT = 240;
  const NECK_LEFT = 40;
  const NECK_RIGHT = 780;
  const NECK_TOP = 30;
  const NECK_HEIGHT = 140;
  const FRET_WIDTH = (NECK_RIGHT - NECK_LEFT) / (NUM_FRETS + 1);
  const SINGLE_DOT_FRETS = [3, 5, 7, 9, 15];
  const DOUBLE_DOT_FRET = 12;

  function stringY(stringIndex) {
    return NECK_TOP + 10 + (5 - stringIndex) * (NECK_HEIGHT - 20) / 5;
  }

  function handleClick(str, fret) {
    if (onclick) {
      onclick({ str, fret, note: noteAt(str, fret) });
    }
  }

  let fretLines = $derived(
    Array.from({ length: NUM_FRETS }, (_, i) => ({
      x: NECK_LEFT + (i + 1) * FRET_WIDTH,
      y1: NECK_TOP,
      y2: NECK_TOP + NECK_HEIGHT
    }))
  );

  let strings = $derived(
    Array.from({ length: 6 }, (_, i) => ({
      y: stringY(i),
      width: 0.8 + i * 0.18,
      name: STRING_NAMES[i]
    }))
  );

  let fretNumbers = $derived(
    Array.from({ length: NUM_FRETS }, (_, i) => ({
      x: NECK_LEFT + (i + 0.5) * FRET_WIDTH,
      label: i + 1
    }))
  );

  let singleDots = $derived(
    SINGLE_DOT_FRETS.filter(f => f <= NUM_FRETS).map(f => ({
      cx: NECK_LEFT + (f - 0.5) * FRET_WIDTH,
      cy: NECK_TOP + NECK_HEIGHT + 30
    }))
  );

  let hasDoubleDot = $derived(NUM_FRETS >= DOUBLE_DOT_FRET);
  let doubleDotX = $derived(NECK_LEFT + (DOUBLE_DOT_FRET - 0.5) * FRET_WIDTH);

  // Build hit targets: 6 strings x (NUM_FRETS + 1) frets (including open/fret 0)
  let hitTargets = $derived(
    Array.from({ length: 6 }, (_, str) =>
      Array.from({ length: NUM_FRETS + 1 }, (_, fret) => {
        const cy = stringY(str);
        const cellHeight = (NECK_HEIGHT - 20) / 5;
        const y = cy - cellHeight / 2;
        let x, w;
        if (fret === 0) {
          x = NECK_LEFT - 14;
          w = 14 + FRET_WIDTH * 0.5;
        } else {
          x = NECK_LEFT + (fret - 1) * FRET_WIDTH;
          w = FRET_WIDTH;
        }
        return { str, fret, x, y, w, h: cellHeight };
      })
    ).flat()
  );

  // Index dots by "str,fret" for fast lookup
  let dotMap = $derived(
    new Map(dots.map(d => [`${d.str},${d.fret}`, d]))
  );

  let highlightSet = $derived(new Set(highlightedFrets));
</script>

<svg viewBox="0 0 {WIDTH} {HEIGHT}" xmlns="http://www.w3.org/2000/svg" class="interactive-fretboard">
  <!-- Neck background -->
  <rect x={NECK_LEFT} y={NECK_TOP} width={NECK_RIGHT - NECK_LEFT} height={NECK_HEIGHT} rx="4" fill="#1a1a2e" />

  <!-- Highlighted fret columns -->
  {#each Array.from(highlightSet) as hf}
    {#if hf >= 1 && hf <= NUM_FRETS}
      <rect
        x={NECK_LEFT + (hf - 1) * FRET_WIDTH}
        y={NECK_TOP}
        width={FRET_WIDTH}
        height={NECK_HEIGHT}
        fill="#58A6FF"
        opacity="0.12"
        rx="2"
      />
    {/if}
  {/each}

  <!-- Nut -->
  <rect x={NECK_LEFT} y={NECK_TOP} width="4" height={NECK_HEIGHT} rx="2" fill="#ddd" />

  <!-- Fret lines -->
  {#each fretLines as fl}
    <line x1={fl.x} y1={fl.y1} x2={fl.x} y2={fl.y2} stroke="#333" stroke-width="1" />
  {/each}

  <!-- Strings and open string labels -->
  {#each strings as s}
    <line x1={NECK_LEFT} y1={s.y} x2={NECK_RIGHT} y2={s.y} stroke="#444" stroke-width={s.width} />
    <text x={NECK_LEFT - 14} y={s.y + 4} text-anchor="middle" fill="#555" font-size="11" font-family="JetBrains Mono">{s.name}</text>
  {/each}

  <!-- Fret numbers -->
  {#each fretNumbers as fn}
    <text x={fn.x} y={NECK_TOP + NECK_HEIGHT + 18} text-anchor="middle" fill="#444" font-size="11" font-family="JetBrains Mono">{fn.label}</text>
  {/each}

  <!-- Single inlay dots -->
  {#each singleDots as dot}
    <circle cx={dot.cx} cy={dot.cy} r="3" fill="#333" />
  {/each}

  <!-- Double dot at fret 12 -->
  {#if hasDoubleDot}
    <circle cx={doubleDotX - 5} cy={NECK_TOP + NECK_HEIGHT + 30} r="3" fill="#333" />
    <circle cx={doubleDotX + 5} cy={NECK_TOP + NECK_HEIGHT + 30} r="3" fill="#333" />
  {/if}

  <!-- Programmatic dots -->
  {#each dots as dot}
    {@const absoluteFret = dot.fret}
    {@const cx = absoluteFret === 0 ? NECK_LEFT + 2 : NECK_LEFT + (absoluteFret - 0.5) * FRET_WIDTH}
    {@const cy = stringY(dot.str)}
    {@const r = 9}
    {@const fontSize = dot.label && dot.label.length > 1 ? 8 : 10}
    <circle {cx} {cy} {r} fill={dot.color || '#58A6FF'} />
    {#if dot.label}
      <text
        x={cx}
        y={cy}
        text-anchor="middle"
        dominant-baseline="central"
        fill="#fff"
        font-size={fontSize}
        font-weight="bold"
        font-family="JetBrains Mono"
      >{dot.label}</text>
    {/if}
  {/each}

  <!-- Invisible hit targets for click interaction -->
  {#each hitTargets as ht}
    <rect
      x={ht.x}
      y={ht.y}
      width={ht.w}
      height={ht.h}
      fill="transparent"
      class="hit-target"
      onclick={() => handleClick(ht.str, ht.fret)}
      role="button"
      tabindex="-1"
      aria-label="String {ht.str}, fret {ht.fret}"
    />
  {/each}
</svg>

<style>
  .interactive-fretboard {
    width: 100%;
    max-width: 900px;
    user-select: none;
  }
  .hit-target {
    cursor: pointer;
  }
  .hit-target:hover {
    fill: rgba(88, 166, 255, 0.08);
  }
</style>
