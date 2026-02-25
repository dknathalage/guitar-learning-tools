<script>
  import { STRING_NAMES, renderNoteFretboard, getFretboardDimensions } from '$lib/music/fretboard.js';
  import { createHoldDetector } from './holdDetection.js';

  let { item = null, recall = false, onComplete, onWrong, setMsg, showDetected } = $props();

  let fbHtml = $state('');
  let fbSuccess = $state(false);
  let fbFlash = $state(false);

  const hold = createHoldDetector();

  export function prepare(inner, isRecall) {
    item = inner;
    recall = isRecall;
    hold.reset();
    if (isRecall) {
      const d = getFretboardDimensions();
      fbHtml = `<svg viewBox="0 0 ${d.W} ${d.H}" xmlns="http://www.w3.org/2000/svg"><text x="${d.W/2}" y="${d.H/2}" text-anchor="middle" dominant-baseline="central" fill="#222" font-size="60" font-family="Outfit" font-weight="900">?</text></svg>`;
    } else {
      fbHtml = renderNoteFretboard(inner, null, false);
    }
    fbSuccess = false;
    fbFlash = false;
    setMsg('Listening...', false);
  }

  export function handleDetection(note, cents, hz, semi) {
    if (!item) return;
    const nm = note === item.note;
    const midiDiff = Math.abs((semi + 69) - item.midi);
    const octOk = !recall || (midiDiff % 12) <= 1 || (midiDiff % 12) >= 11;
    const ok = nm && octOk;
    showDetected(note, cents, hz, ok);
    if (nm && !octOk) { setMsg('Right note, wrong string!', true); }
    hold.check(ok, true, () => {
      fbHtml = renderNoteFretboard(item, null, true);
      fbSuccess = true;
      fbFlash = true;
      onComplete(10, 2);
      setTimeout(() => { fbSuccess = false; fbFlash = false; }, recall ? 1200 : 800);
    }, onWrong);
  }

  export function handleSilence() {
    showDetected(null, 0, 0, false);
    hold.reset();
  }
</script>

<div class="nt-challenge">
  <div class="nt-challenge-lbl">{recall ? 'Play this note' : 'Find this note'}</div>
  <div class="nt-challenge-note" class:nt-recall={recall && item}>{item ? item.note : '\u2014'}</div>
  {#if item}
    <div class="nt-challenge-pos">
      {#if recall}
        on string {STRING_NAMES[item.str]}
      {:else}
        String {STRING_NAMES[item.str]} &middot; Fret {item.fret}
      {/if}
    </div>
  {/if}
</div>

<div class="nt-fb-wrap" class:nt-success={fbSuccess} class:nt-flash={fbFlash}>
  <div>{@html fbHtml}</div>
</div>

<style>
  .nt-challenge{text-align:center}
  .nt-challenge-lbl{font-size:13px;color:var(--mt);text-transform:uppercase;letter-spacing:1px;margin-bottom:.2rem}
  .nt-challenge-note{font-family:'JetBrains Mono',monospace;font-size:56px;font-weight:700;color:var(--ac);line-height:1}
  .nt-challenge-pos{font-family:'JetBrains Mono',monospace;font-size:14px;color:var(--mt);margin-top:.2rem}
  .nt-challenge-note.nt-recall{font-size:80px}
  .nt-fb-wrap{background:var(--sf);border:2px solid var(--bd);border-radius:10px;padding:.5rem;width:100%;max-width:700px;transition:border-color .3s,box-shadow .3s}
  .nt-fb-wrap.nt-success{border-color:#4ECB71;box-shadow:0 0 20px rgba(78,203,113,.25)}
  @keyframes nt-glow{0%{box-shadow:0 0 20px rgba(78,203,113,.4)}100%{box-shadow:none}}
  .nt-flash{animation:nt-glow .8s ease-out}
  @media(max-width:600px){
    .nt-challenge-note{font-size:40px}
    .nt-challenge-note.nt-recall{font-size:56px}
  }
</style>
