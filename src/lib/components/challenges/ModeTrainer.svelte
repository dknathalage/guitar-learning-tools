<script>
  import { NOTES, MODES } from '$lib/constants/music.js';
  import { STRING_NAMES, scaleSequence } from '$lib/music/fretboard.js';
  import { renderSeqFB } from './seqFretboard.js';
  import { createHoldDetector } from './holdDetection.js';

  let { item = null, recall = false, onComplete, onWrong, onInvalid, setMsg, showDetected } = $props();

  let challenge = $state(null);
  let noteIdx = $state(0);
  let fbHtml = $state('');
  let fbVisible = $state(false);
  let fbSuccess = $state(false);
  let fbFlash = $state(false);

  const hold = createHoldDetector();

  export function prepare(inner, isRecall) {
    recall = isRecall;
    hold.reset();
    const ri = inner.rootIdx;
    const root = NOTES[ri];
    const mode = MODES.find(m => m.id === inner.modeId);
    const startFret = inner.startFret;
    let seq = scaleSequence(ri, mode.iv, startFret, startFret + 4);
    if (seq.length < 5) { onInvalid(); return; }
    if (inner.dir === 'updown') {
      const desc = [...seq].reverse().slice(1);
      seq = [...seq, ...desc];
    }
    challenge = { root, mode, seq, startFret };
    noteIdx = 0;
    fbVisible = !isRecall;
    fbSuccess = false;
    fbFlash = false;
    fbHtml = renderSeqFB(seq, 0, startFret);
    const t = seq[0];
    setMsg(`Play ${root} ${mode.name}: start with ${t.note} (${STRING_NAMES[t.str]} fret ${t.fret})`, false);
  }

  export function handleDetection(note, cents, hz, semi) {
    if (!challenge) return;
    const target = challenge.seq[noteIdx];
    const nm = note === target.note;
    const midiOk = Math.abs(semi + 69 - target.midi) <= 1;
    const ok = nm && midiOk;
    showDetected(note, cents, hz, ok);
    hold.check(ok, true, () => {
      noteIdx++;
      hold.resetAfterVoice();
      if (noteIdx >= challenge.seq.length) {
        fbHtml = renderSeqFB(challenge.seq, noteIdx, challenge.startFret);
        fbSuccess = true;
        fbFlash = true;
        onComplete(40, 3);
        setTimeout(() => { fbSuccess = false; fbFlash = false; }, 1200);
      } else {
        const t = challenge.seq[noteIdx];
        setMsg(`Next: ${t.note} (${STRING_NAMES[t.str]} fret ${t.fret})`, false);
        fbHtml = renderSeqFB(challenge.seq, noteIdx, challenge.startFret);
      }
    }, onWrong);
  }

  export function handleSilence() {
    showDetected(null, 0, 0, false);
    hold.reset();
  }
</script>

<div class="nt-mode-section">
  <div class="nt-challenge-lbl">{challenge ? `${challenge.root} ${challenge.mode.name}` : 'Mode'}</div>
  <div class="nt-challenge-note">{challenge ? challenge.seq[noteIdx]?.note ?? '\u2714' : '\u2014'}</div>
  {#if challenge && challenge.mode.chars}
    <div class="nt-mode-chars">Characteristic: {challenge.mode.chars}</div>
  {/if}
  {#if challenge}
    <div class="nt-seq-dots">
      {#each challenge.seq as n, i}
        <div class="nt-seq-dot{i < noteIdx ? ' done' : (i === noteIdx ? ' active' : '')}"></div>
      {/each}
    </div>
  {/if}
</div>

{#if fbVisible}
  <div class="nt-fb-wrap" class:nt-success={fbSuccess} class:nt-flash={fbFlash}>
    <div>{@html fbHtml}</div>
  </div>
{/if}

<style>
  .nt-challenge-lbl{font-size:13px;color:var(--mt);text-transform:uppercase;letter-spacing:1px;margin-bottom:.2rem}
  .nt-challenge-note{font-family:'JetBrains Mono',monospace;font-size:56px;font-weight:700;color:var(--ac);line-height:1}
  .nt-mode-section{text-align:center}
  .nt-mode-chars{font-family:'JetBrains Mono',monospace;font-size:13px;color:#F0A030;margin-top:.2rem}
  .nt-seq-dots{display:flex;gap:4px;justify-content:center;margin-top:.5rem;flex-wrap:wrap}
  .nt-seq-dot{width:10px;height:10px;border-radius:50%;border:2px solid var(--bd);background:var(--sf);transition:all .3s}
  .nt-seq-dot.active{border-color:var(--ac);background:rgba(88,166,255,.3);box-shadow:0 0 6px rgba(88,166,255,.4)}
  .nt-seq-dot.done{border-color:#4ECB71;background:#4ECB71}
  .nt-fb-wrap{background:var(--sf);border:2px solid var(--bd);border-radius:10px;padding:.5rem;width:100%;max-width:700px;transition:border-color .3s,box-shadow .3s}
  .nt-fb-wrap.nt-success{border-color:#4ECB71;box-shadow:0 0 20px rgba(78,203,113,.25)}
  @keyframes nt-glow{0%{box-shadow:0 0 20px rgba(78,203,113,.4)}100%{box-shadow:none}}
  .nt-flash{animation:nt-glow .8s ease-out}
  @media(max-width:600px){
    .nt-challenge-note{font-size:40px}
  }
</style>
