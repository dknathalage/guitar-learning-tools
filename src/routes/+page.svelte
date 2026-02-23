<script>
  import { base } from '$app/paths';
  import { CHAPTERS, EDGES, renderRing } from '$lib/skilltree.js';
  import { loadProgress, getChapterProgress, THRESHOLD } from '$lib/progress.js';

  let expandedCh = $state(null);
  let progress = $state(loadProgress());

  let chapProgress = $derived(
    Object.fromEntries(CHAPTERS.map(ch => [
      ch.id,
      ch.exercises.length > 0 ? getChapterProgress(ch.id, CHAPTERS) : { total: 0, completed: 0, pct: 0 }
    ]))
  );

  let totalExercises = $derived(CHAPTERS.reduce((s, c) => s + c.exercises.length, 0));
  let totalCompleted = $derived(Object.values(chapProgress).reduce((s, p) => s + p.completed, 0));

  function isCompleted(exId) {
    const rec = progress.exercises[exId];
    return rec && (rec.bestScore >= THRESHOLD || rec.visited);
  }

  function toggleChapter(id) {
    expandedCh = expandedCh === id ? null : id;
  }

  function refreshProgress() {
    progress = loadProgress();
  }

  // Grid positions for desktop layout
  // Row 0: Ch1(0) → Ch2(1) → Ch3(2) → Ch4(3) → Ch5(4) → Ch6(5) → Ch8(7) → Ch9(8)
  // Row 1: Ch7(5)
  const POS = {
    1: { col: 0, row: 0 },
    2: { col: 1, row: 0 },
    3: { col: 2, row: 0 },
    4: { col: 3, row: 0 },
    5: { col: 4, row: 0 },
    6: { col: 5, row: 0 },
    7: { col: 5, row: 1 },
    8: { col: 6, row: 0 },
    9: { col: 7, row: 0 }
  };

  // Main chain = row 0, Rhythm branches from below
  const ROW0 = CHAPTERS.filter(ch => POS[ch.id].row === 0);
  const ROW1 = CHAPTERS.filter(ch => POS[ch.id].row === 1);
</script>

<svelte:head>
  <title>Guitar Learning Tools</title>
  <meta name="description" content="Interactive guitar learning pathway — master the fretboard through 9 chapters of theory and exercises.">
</svelte:head>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="tree-page">
  <header class="tree-header">
    <h1 class="tree-title">Guitar Learning Tools</h1>
    <div class="tree-sub">
      <span class="tree-sub-track">{totalCompleted}/{totalExercises} exercises</span>
      <span class="tree-sub-sep">&middot;</span>
      <span>9 chapters</span>
    </div>
  </header>

  <!-- DESKTOP TREE -->
  <div class="tree-desktop">
    <!-- SVG connector lines -->
    <svg class="tree-connectors" viewBox="0 0 800 200" preserveAspectRatio="xMidYMid meet">
      <!-- Main horizontal chain: Ch1 through Ch6 -->
      {#each [[0,1],[1,2],[2,3],[3,4],[4,5]] as [a,b]}
        <line
          x1={50 + a * 100} y1="50"
          x2={50 + b * 100} y2="50"
          class="connector"
        />
      {/each}
      <!-- Ch6 → Ch8 -->
      <line x1="550" y1="50" x2="650" y2="50" class="connector" />
      <!-- Ch8 → Ch9 -->
      <line x1="650" y1="50" x2="750" y2="50" class="connector" />
      <!-- Ch7 (below) → Ch8 -->
      <path d="M 550 150 Q 600 150 650 50" class="connector" fill="none" />
    </svg>

    <!-- Row 0 nodes -->
    <div class="tree-row tree-row-main">
      {#each ROW0 as ch, i}
        {@const prog = chapProgress[ch.id]}
        <div class="tree-node-col" style="--delay:{i * 0.06}s">
          <button
            class="tree-node"
            class:expanded={expandedCh === ch.id}
            style="--node-color:{ch.color}"
            onclick={() => toggleChapter(ch.id)}
          >
            <div class="node-ring">{@html renderRing(prog.pct, ch.color, 64)}</div>
            <div class="node-num">{ch.id}</div>
            {#if prog.pct === 100}
              <div class="node-check">&#10003;</div>
            {/if}
            <div class="node-glow"></div>
          </button>
          <div class="node-label">{ch.title}</div>
          {#if prog.total > 0}
            <div class="node-progress-label">{prog.completed}/{prog.total}</div>
          {/if}
        </div>
      {/each}
    </div>

    <!-- Row 1 nodes (Rhythm) -->
    <div class="tree-row tree-row-branch">
      <div class="tree-row-spacer"></div>
      {#each ROW1 as ch}
        {@const prog = chapProgress[ch.id]}
        <div class="tree-node-col" style="--delay:0.42s">
          <button
            class="tree-node"
            class:expanded={expandedCh === ch.id}
            style="--node-color:{ch.color}"
            onclick={() => toggleChapter(ch.id)}
          >
            <div class="node-ring">{@html renderRing(prog.pct, ch.color, 64)}</div>
            <div class="node-num">{ch.id}</div>
            <div class="node-glow"></div>
          </button>
          <div class="node-label">{ch.title}</div>
        </div>
      {/each}
    </div>
  </div>

  <!-- MOBILE LIST -->
  <div class="tree-mobile">
    {#each CHAPTERS as ch, i}
      {@const prog = chapProgress[ch.id]}
      <div class="mob-node-wrap" style="--delay:{i * 0.05}s">
        {#if i > 0}
          <div class="mob-connector" style="--c:{CHAPTERS[i-1].color}"></div>
        {/if}
        <button
          class="mob-node"
          class:expanded={expandedCh === ch.id}
          style="--node-color:{ch.color}"
          onclick={() => toggleChapter(ch.id)}
        >
          <div class="mob-ring">{@html renderRing(prog.pct, ch.color, 48)}</div>
          <div class="mob-num">{ch.id}</div>
          {#if prog.pct === 100}
            <div class="mob-check">&#10003;</div>
          {/if}
        </button>
        <div class="mob-info">
          <div class="mob-title" style="color:{ch.color}">{ch.title}</div>
          {#if prog.total > 0}
            <div class="mob-pct">{prog.completed}/{prog.total} done</div>
          {:else}
            <div class="mob-pct">Theory</div>
          {/if}
        </div>
        <div class="mob-arrow" class:open={expandedCh === ch.id} style="color:{ch.color}">&#9662;</div>
      </div>

      <!-- Mobile expansion panel -->
      {#if expandedCh === ch.id}
        <div class="detail-panel" style="--panel-color:{ch.color}">
          <div class="detail-theory">
            <div class="detail-section-label">Key Concepts</div>
            <ul class="detail-bullets">
              {#each ch.theory as bullet}
                <li>{bullet}</li>
              {/each}
            </ul>
          </div>
          {#if ch.exercises.length > 0}
            <div class="detail-section-label">Exercises</div>
            <div class="detail-exercises">
              {#each ch.exercises as ex}
                <a href="{base}{ex.path}" class="detail-ex" onclick={refreshProgress}>
                  <span class="ex-name">{ex.name}</span>
                  <span class="ex-badges">
                    {#if ex.mic}<span class="ex-mic" title="Uses microphone">&#127908;</span>{/if}
                    {#if isCompleted(ex.id)}<span class="ex-done">&#10003;</span>{/if}
                  </span>
                </a>
              {/each}
            </div>
          {:else}
            <div class="detail-placeholder">
              <span>Exercises coming soon</span>
              <a href="{base}/{ch.docsPath}" class="detail-docs-link">Read chapter notes &rarr;</a>
            </div>
          {/if}
        </div>
      {/if}
    {/each}
  </div>

  <!-- DESKTOP expansion panel -->
  {#if expandedCh !== null}
    {@const ch = CHAPTERS.find(c => c.id === expandedCh)}
    {#if ch}
      <div class="detail-panel detail-panel-desktop" style="--panel-color:{ch.color}">
        <div class="detail-inner">
          <div class="detail-head">
            <div class="detail-ch-badge" style="background:{ch.color}">{ch.id}</div>
            <div>
              <div class="detail-ch-title">{ch.title}</div>
              {#if chapProgress[ch.id].total > 0}
                <div class="detail-ch-progress">{chapProgress[ch.id].completed}/{chapProgress[ch.id].total} completed</div>
              {/if}
            </div>
            <button class="detail-close" onclick={() => expandedCh = null}>&times;</button>
          </div>
          <div class="detail-body">
            <div class="detail-theory">
              <div class="detail-section-label">Key Concepts</div>
              <ul class="detail-bullets">
                {#each ch.theory as bullet}
                  <li>{bullet}</li>
                {/each}
              </ul>
            </div>
            {#if ch.exercises.length > 0}
              <div class="detail-ex-section">
                <div class="detail-section-label">Exercises</div>
                <div class="detail-exercises detail-exercises-desktop">
                  {#each ch.exercises as ex}
                    <a href="{base}{ex.path}" class="detail-ex" onclick={refreshProgress}>
                      <span class="ex-name">{ex.name}</span>
                      <span class="ex-badges">
                        {#if ex.mic}<span class="ex-mic" title="Uses microphone">&#127908;</span>{/if}
                        {#if isCompleted(ex.id)}<span class="ex-done">&#10003;</span>{/if}
                      </span>
                    </a>
                  {/each}
                </div>
              </div>
            {:else}
              <div class="detail-placeholder">
                <span>Exercises coming soon</span>
                <a href="{base}/{ch.docsPath}" class="detail-docs-link">Read chapter notes &rarr;</a>
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  {/if}

  <!-- Tuner FAB -->
  <a href="{base}/tuner" class="tuner-fab" title="Guitar Tuner">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
    <span class="fab-label">Tuner</span>
  </a>
</div>

<style>
  :global(html),
  :global(body) {
    overflow: visible;
    overflow-y: auto;
  }

  .tree-page {
    min-height: 100vh;
    padding: 2.5rem 1.5rem 5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    background:
      radial-gradient(ellipse 80% 50% at 50% 0%, rgba(88,166,255,.04) 0%, transparent 60%),
      var(--bg);
  }

  /* ── Header ── */
  .tree-header {
    text-align: center;
    margin-bottom: 3rem;
    opacity: 0;
    animation: fadeUp .6s ease forwards;
  }
  .tree-title {
    font-size: clamp(1.6rem, 4.5vw, 2.6rem);
    font-weight: 900;
    letter-spacing: -1.5px;
    background: linear-gradient(135deg, var(--ac) 0%, #C084FC 50%, #F472B6 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: .5rem;
  }
  .tree-sub {
    font-family: 'JetBrains Mono', monospace;
    font-size: .75rem;
    color: var(--mt);
    letter-spacing: .5px;
    display: flex;
    gap: .5rem;
    justify-content: center;
    align-items: center;
  }
  .tree-sub-track {
    color: var(--ac);
    font-weight: 600;
  }
  .tree-sub-sep {
    opacity: .4;
  }

  /* ── Desktop Tree ── */
  .tree-desktop {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    width: 100%;
    max-width: 900px;
  }
  .tree-connectors {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 900px;
    height: 200px;
    pointer-events: none;
    z-index: 0;
  }
  .connector {
    stroke: var(--bd);
    stroke-width: 2;
    stroke-dasharray: 6 4;
    opacity: .5;
  }
  .tree-row {
    display: flex;
    gap: 1.5rem;
    justify-content: center;
    position: relative;
    z-index: 1;
  }
  .tree-row-main {
    margin-bottom: .5rem;
  }
  .tree-row-branch {
    display: flex;
    justify-content: center;
    margin-bottom: 1rem;
  }
  .tree-row-spacer {
    width: calc(5 * (64px + 1.5rem));
  }

  /* ── Node ── */
  .tree-node-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: .35rem;
    opacity: 0;
    animation: nodeIn .5s ease forwards;
    animation-delay: var(--delay, 0s);
  }
  .tree-node {
    position: relative;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    border: none;
    background: var(--sf);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform .2s, box-shadow .3s;
    outline: none;
  }
  .tree-node:hover {
    transform: scale(1.12);
    box-shadow: 0 0 24px color-mix(in srgb, var(--node-color) 40%, transparent);
  }
  .tree-node.expanded {
    transform: scale(1.15);
    box-shadow: 0 0 30px color-mix(in srgb, var(--node-color) 50%, transparent);
  }
  .node-ring {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .node-ring :global(svg) {
    display: block;
  }
  .node-num {
    position: relative;
    z-index: 2;
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.3rem;
    font-weight: 800;
    color: var(--node-color);
    text-shadow: 0 0 12px color-mix(in srgb, var(--node-color) 30%, transparent);
  }
  .node-check {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #4ECB71;
    color: #0D1117;
    font-size: 10px;
    font-weight: 900;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 3;
    box-shadow: 0 0 8px rgba(78,203,113,.5);
  }
  .node-glow {
    position: absolute;
    inset: -8px;
    border-radius: 50%;
    background: radial-gradient(circle, color-mix(in srgb, var(--node-color) 8%, transparent) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }
  .node-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: .65rem;
    font-weight: 600;
    color: var(--mt);
    text-transform: uppercase;
    letter-spacing: 1px;
    text-align: center;
    white-space: nowrap;
  }
  .node-progress-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: .6rem;
    color: var(--mt);
    opacity: .6;
  }

  /* ── Detail Panel (Desktop) ── */
  .detail-panel-desktop {
    width: 100%;
    max-width: 900px;
    margin-top: .5rem;
    animation: panelSlide .3s ease forwards;
  }
  .detail-panel {
    background: var(--sf);
    border: 1px solid var(--bd);
    border-radius: 14px;
    padding: 1.5rem;
    border-top: 2px solid var(--panel-color);
    position: relative;
    overflow: hidden;
  }
  .detail-panel::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 60px;
    background: linear-gradient(180deg, color-mix(in srgb, var(--panel-color) 6%, transparent) 0%, transparent 100%);
    pointer-events: none;
  }
  .detail-inner {
    position: relative;
    z-index: 1;
  }
  .detail-head {
    display: flex;
    align-items: center;
    gap: .8rem;
    margin-bottom: 1.2rem;
  }
  .detail-ch-badge {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'JetBrains Mono', monospace;
    font-size: .9rem;
    font-weight: 800;
    color: var(--bg);
    flex-shrink: 0;
  }
  .detail-ch-title {
    font-size: 1.1rem;
    font-weight: 700;
  }
  .detail-ch-progress {
    font-family: 'JetBrains Mono', monospace;
    font-size: .7rem;
    color: var(--mt);
  }
  .detail-close {
    margin-left: auto;
    background: none;
    border: 1px solid var(--bd);
    color: var(--mt);
    width: 28px;
    height: 28px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 1.1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all .15s;
  }
  .detail-close:hover {
    border-color: var(--panel-color);
    color: var(--tx);
  }
  .detail-body {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }
  .detail-section-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: .65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--mt);
    margin-bottom: .6rem;
  }
  .detail-bullets {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: .5rem;
  }
  .detail-bullets li {
    font-size: .82rem;
    color: var(--tx);
    line-height: 1.45;
    padding-left: 1rem;
    position: relative;
  }
  .detail-bullets li::before {
    content: '';
    position: absolute;
    left: 0;
    top: .5em;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--panel-color);
    opacity: .6;
  }
  .detail-exercises {
    display: flex;
    flex-direction: column;
    gap: .5rem;
  }
  .detail-exercises-desktop {
    gap: .5rem;
  }
  .detail-ex {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: .65rem .9rem;
    background: var(--sf2);
    border: 1px solid var(--bd);
    border-radius: 10px;
    text-decoration: none;
    color: var(--tx);
    transition: all .15s;
    gap: .5rem;
  }
  .detail-ex:hover {
    border-color: var(--panel-color);
    background: color-mix(in srgb, var(--panel-color) 6%, var(--sf2));
    transform: translateX(3px);
  }
  .ex-name {
    font-size: .85rem;
    font-weight: 600;
  }
  .ex-badges {
    display: flex;
    align-items: center;
    gap: .4rem;
    flex-shrink: 0;
  }
  .ex-mic {
    font-size: .75rem;
    opacity: .5;
  }
  .ex-done {
    color: #4ECB71;
    font-size: .85rem;
    font-weight: 700;
    text-shadow: 0 0 6px rgba(78,203,113,.4);
  }
  .detail-placeholder {
    display: flex;
    flex-direction: column;
    gap: .5rem;
    padding: 1rem;
    background: var(--sf2);
    border: 1px dashed var(--bd);
    border-radius: 10px;
    font-size: .85rem;
    color: var(--mt);
  }
  .detail-docs-link {
    color: var(--panel-color);
    text-decoration: none;
    font-family: 'JetBrains Mono', monospace;
    font-size: .75rem;
    font-weight: 600;
    transition: opacity .15s;
  }
  .detail-docs-link:hover {
    opacity: .7;
  }

  /* ── Tuner FAB ── */
  .tuner-fab {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    width: auto;
    height: 44px;
    border-radius: 22px;
    background: var(--sf);
    border: 1.5px solid var(--bd);
    color: var(--mt);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: .4rem;
    padding: 0 1rem 0 .8rem;
    text-decoration: none;
    box-shadow: 0 4px 20px rgba(0,0,0,.4);
    transition: all .2s;
    z-index: 100;
    font-family: 'JetBrains Mono', monospace;
    font-size: .7rem;
    font-weight: 600;
    letter-spacing: .5px;
    text-transform: uppercase;
  }
  .tuner-fab:hover {
    border-color: var(--ac);
    color: var(--ac);
    box-shadow: 0 4px 24px rgba(88,166,255,.15);
    transform: translateY(-2px);
  }
  .fab-label {
    line-height: 1;
  }

  /* ── Mobile Tree ── */
  .tree-mobile {
    display: none;
    flex-direction: column;
    align-items: stretch;
    width: 100%;
    max-width: 480px;
    gap: 0;
  }
  .mob-node-wrap {
    display: flex;
    align-items: center;
    gap: .8rem;
    padding: .6rem 0;
    position: relative;
    opacity: 0;
    animation: fadeUp .4s ease forwards;
    animation-delay: var(--delay, 0s);
    cursor: pointer;
  }
  .mob-connector {
    position: absolute;
    left: 23px;
    top: -8px;
    width: 2px;
    height: 16px;
    background: var(--bd);
    opacity: .4;
  }
  .mob-node {
    position: relative;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: none;
    background: var(--sf);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: transform .2s, box-shadow .2s;
    outline: none;
  }
  .mob-node:hover, .mob-node.expanded {
    transform: scale(1.08);
    box-shadow: 0 0 16px color-mix(in srgb, var(--node-color) 35%, transparent);
  }
  .mob-ring {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .mob-ring :global(svg) {
    display: block;
  }
  .mob-num {
    position: relative;
    z-index: 2;
    font-family: 'JetBrains Mono', monospace;
    font-size: 1rem;
    font-weight: 800;
    color: var(--node-color);
  }
  .mob-check {
    position: absolute;
    top: -2px;
    right: -2px;
    width: 15px;
    height: 15px;
    border-radius: 50%;
    background: #4ECB71;
    color: #0D1117;
    font-size: 8px;
    font-weight: 900;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 3;
  }
  .mob-info {
    flex: 1;
    min-width: 0;
  }
  .mob-title {
    font-size: .95rem;
    font-weight: 700;
  }
  .mob-pct {
    font-family: 'JetBrains Mono', monospace;
    font-size: .65rem;
    color: var(--mt);
  }
  .mob-arrow {
    font-size: .7rem;
    transition: transform .2s;
    flex-shrink: 0;
  }
  .mob-arrow.open {
    transform: rotate(180deg);
  }

  /* Mobile detail panel adjustments */
  .tree-mobile .detail-panel {
    margin: 0 0 .5rem 56px;
    padding: 1rem;
  }

  /* ── Animations ── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: none; }
  }
  @keyframes nodeIn {
    from { opacity: 0; transform: scale(.7) translateY(8px); }
    to { opacity: 1; transform: none; }
  }
  @keyframes panelSlide {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: none; }
  }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .tree-desktop { display: none; }
    .detail-panel-desktop { display: none; }
    .tree-mobile { display: flex; }
    .tree-page { padding: 1.5rem 1rem 5rem; }
    .tree-header { margin-bottom: 1.5rem; }
    .tuner-fab { bottom: 1rem; right: 1rem; }
  }

  @media (min-width: 769px) {
    .tree-mobile { display: none !important; }
  }

  @media (max-width: 950px) and (min-width: 769px) {
    .tree-row { gap: .8rem; }
    .tree-node { width: 56px; height: 56px; }
    .node-num { font-size: 1.1rem; }
    .tree-connectors { display: none; }
    .tree-row-spacer { width: calc(5 * (56px + .8rem)); }
    .detail-body { grid-template-columns: 1fr; }
  }
</style>
