<script>
  import { onDestroy } from 'svelte';

  let { engine, onclose } = $props();
  let mastery = $state(null);
  let sortCol = $state('pL');
  let sortAsc = $state(true);
  let tab = $state('overview');

  function refresh() {
    if (engine) mastery = engine.getMastery();
  }

  // Auto-refresh every 1s while panel is open
  refresh();
  const _ivl = setInterval(refresh, 1000);
  onDestroy(() => clearInterval(_ivl));

  let sortedItems = $derived(() => {
    if (!mastery) return [];
    const items = [...mastery.items];
    items.sort((a, b) => {
      const av = a[sortCol] ?? 0;
      const bv = b[sortCol] ?? 0;
      return sortAsc ? av - bv : bv - av;
    });
    return items;
  });

  function setSort(col) {
    if (sortCol === col) sortAsc = !sortAsc;
    else { sortCol = col; sortAsc = true; }
  }

  function fmtPct(v) { return (v * 100).toFixed(0) + '%'; }
  function fmtMs(v) { return v > 0 ? (v / 1000).toFixed(1) + 's' : '\u2014'; }
  function fmtPL(v) { return v.toFixed(2); }
  function fmtEF(v) { return v.toFixed(1); }

  function plColor(pL) {
    if (pL >= 0.95) return '#4ECB71';
    if (pL >= 0.5) return '#F0A030';
    return '#FF6B6B';
  }

  function sparkline(times) {
    if (!times || times.length < 2) return '';
    const w = 120, h = 28, pad = 2;
    const max = Math.max(...times);
    const min = Math.min(...times);
    const range = max - min || 1;
    const pts = times.map((t, i) => {
      const x = pad + (i / (times.length - 1)) * (w - 2 * pad);
      const y = pad + (1 - (t - min) / range) * (h - 2 * pad);
      return `${x},${y}`;
    });
    return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><polyline points="${pts.join(' ')}" fill="none" stroke="#58A6FF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
</script>

<div class="ld-panel">
    <div class="ld-header">
      <div class="ld-tabs">
        <button class="ld-tab" class:active={tab === 'overview'} onclick={() => tab = 'overview'}>Overview</button>
        <button class="ld-tab" class:active={tab === 'items'} onclick={() => tab = 'items'}>Items</button>
        <button class="ld-tab" class:active={tab === 'clusters'} onclick={() => tab = 'clusters'}>Clusters</button>
      </div>
      <div class="ld-header-actions">
        <button class="ld-refresh" onclick={refresh} title="Refresh">&#8635;</button>
        <button class="ld-close" onclick={onclose} title="Close">&times;</button>
      </div>
    </div>

    {#if mastery}
      {#if tab === 'overview'}
        <div class="ld-overview">
          <div class="ld-bar-section">
            <div class="ld-bar-label">Mastery</div>
            <div class="ld-bar">
              <div class="ld-bar-fill" style="width:{fmtPct(mastery.overall.pctMastered)};background:#4ECB71"></div>
            </div>
            <div class="ld-bar-val">{mastery.overall.masteredCount}/{mastery.overall.totalItems}</div>
          </div>
          <div class="ld-bar-section">
            <div class="ld-bar-label">Avg pL</div>
            <div class="ld-bar">
              <div class="ld-bar-fill" style="width:{fmtPct(mastery.overall.avgPL)};background:{plColor(mastery.overall.avgPL)}"></div>
            </div>
            <div class="ld-bar-val">{fmtPL(mastery.overall.avgPL)}</div>
          </div>
          <div class="ld-stats-grid">
            <div class="ld-stat"><span class="ld-stat-val">{mastery.overall.sessionQuestions}</span><span class="ld-stat-lbl">Questions</span></div>
            <div class="ld-stat"><span class="ld-stat-val">{fmtPct(mastery.overall.sessionAccuracy)}</span><span class="ld-stat-lbl">Accuracy</span></div>
            <div class="ld-stat"><span class="ld-stat-val">{fmtMs(mastery.overall.avgResponseTime)}</span><span class="ld-stat-lbl">Avg Time</span></div>
            <div class="ld-stat"><span class="ld-stat-val">{mastery.overall.timeThreshold > 0 ? fmtMs(mastery.overall.timeThreshold) : '\u2014'}</span><span class="ld-stat-lbl">Threshold</span></div>
          </div>
          {#if mastery.overall.avgResponseTime > 0}
            <div class="ld-sparkline-section">
              <div class="ld-bar-label">Recent Times</div>
              <div class="ld-sparkline">{@html sparkline(engine.allCorrectTimes.slice(-20))}</div>
            </div>
          {/if}
        </div>
      {:else if tab === 'items'}
        <div class="ld-table-wrap">
          <table class="ld-table">
            <thead>
              <tr>
                <th onclick={() => setSort('key')}>Key</th>
                <th onclick={() => setSort('pL')}>pL</th>
                <th onclick={() => setSort('ef')}>EF</th>
                <th onclick={() => setSort('avgTime')}>Time</th>
                <th onclick={() => setSort('attempts')}>Att</th>
                <th onclick={() => setSort('reps')}>Reps</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {#each sortedItems() as it}
                <tr>
                  <td class="ld-key">{it.key.length > 16 ? it.key.slice(0, 16) + '\u2026' : it.key}</td>
                  <td style="color:{plColor(it.pL)}">{fmtPL(it.pL)}</td>
                  <td>{fmtEF(it.ef)}</td>
                  <td>{fmtMs(it.avgTime)}</td>
                  <td>{it.attempts}</td>
                  <td>{it.reps}</td>
                  <td>{it.mastered ? '\u2705' : it.pL > 0.7 ? '\ud83d\udfe1' : '\ud83d\udd34'}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else if tab === 'clusters'}
        <div class="ld-clusters">
          {#each mastery.clusters as cl}
            <div class="ld-cluster">
              <div class="ld-cluster-name">{cl.id}</div>
              <div class="ld-bar">
                <div class="ld-bar-fill" style="width:{fmtPct(cl.avgPL)};background:{plColor(cl.avgPL)}"></div>
              </div>
              <div class="ld-cluster-stats">
                pL {fmtPL(cl.avgPL)} &middot; {cl.correct}/{cl.total} &middot; {fmtPct(cl.masteredPct)} mastered
              </div>
            </div>
          {/each}
          {#if mastery.clusters.length === 0}
            <div class="ld-empty">No cluster data yet</div>
          {/if}
        </div>
      {/if}
    {:else}
      <div class="ld-empty">No data yet</div>
    {/if}
</div>

<style>
  .ld-panel{position:fixed;top:0;right:0;z-index:900;width:min(320px,80vw);height:100vh;background:var(--sf);border-left:1px solid var(--bd);padding:.8rem;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--tx);overflow-y:auto;animation:ld-slide-in .2s ease-out;display:flex;flex-direction:column;gap:.5rem;box-shadow:-4px 0 20px rgba(0,0,0,.3)}

  @keyframes ld-slide-in{from{transform:translateX(100%)}to{transform:translateX(0)}}

  .ld-header{display:flex;justify-content:space-between;align-items:center}
  .ld-header-actions{display:flex;align-items:center;gap:.3rem}
  .ld-tabs{display:flex;gap:.3rem}
  .ld-tab{padding:.2rem .5rem;border-radius:6px;border:1px solid var(--bd);background:transparent;color:var(--mt);font-family:inherit;font-size:11px;cursor:pointer;transition:all .15s}
  .ld-tab.active{border-color:var(--ac);color:var(--ac);background:rgba(88,166,255,.1)}
  .ld-refresh{background:none;border:none;color:var(--mt);font-size:16px;cursor:pointer;padding:.2rem}
  .ld-refresh:hover{color:var(--ac)}
  .ld-close{background:none;border:none;color:var(--mt);font-size:22px;cursor:pointer;padding:.2rem;line-height:1}
  .ld-close:hover{color:var(--ac)}

  .ld-overview{display:flex;flex-direction:column;gap:.6rem}
  .ld-bar-section{display:flex;align-items:center;gap:.5rem}
  .ld-bar-label{font-size:11px;color:var(--mt);min-width:55px;text-transform:uppercase;letter-spacing:.5px}
  .ld-bar{flex:1;height:8px;background:var(--sf2);border-radius:4px;overflow:hidden}
  .ld-bar-fill{height:100%;border-radius:4px;transition:width .3s}
  .ld-bar-val{font-size:11px;color:var(--mt);min-width:40px;text-align:right}

  .ld-stats-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:.4rem}
  .ld-stat{text-align:center;padding:.3rem;background:rgba(88,166,255,.05);border-radius:6px}
  .ld-stat-val{display:block;font-size:14px;font-weight:700;color:var(--ac)}
  .ld-stat-lbl{display:block;font-size:9px;color:var(--mt);text-transform:uppercase;letter-spacing:.5px;margin-top:.1rem}

  .ld-sparkline-section{display:flex;align-items:center;gap:.5rem}
  .ld-sparkline{flex:1}
  .ld-sparkline :global(svg){display:block}

  .ld-table-wrap{overflow-x:auto;flex:1;overflow-y:auto}
  .ld-table{width:100%;border-collapse:collapse;font-size:11px}
  .ld-table th{text-align:left;padding:.3rem .4rem;border-bottom:1px solid var(--bd);color:var(--mt);cursor:pointer;user-select:none;font-size:10px;text-transform:uppercase;letter-spacing:.5px;position:sticky;top:0;background:var(--sf)}
  .ld-table th:hover{color:var(--ac)}
  .ld-table td{padding:.25rem .4rem;border-bottom:1px solid rgba(255,255,255,.05)}
  .ld-key{max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--mt)}

  .ld-clusters{display:flex;flex-direction:column;gap:.5rem}
  .ld-cluster{padding:.3rem 0}
  .ld-cluster-name{font-size:11px;color:var(--tx);margin-bottom:.2rem}
  .ld-cluster-stats{font-size:10px;color:var(--mt);margin-top:.2rem}

  .ld-empty{text-align:center;color:var(--mt);padding:1rem;font-size:12px}
</style>
