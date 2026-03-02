<script>
  import { NOTES } from '$lib/constants/music.js';
  import { CHORD_TYPES } from '$lib/constants/music.js';

  let { root, quality, degree, active = false, onclick } = $props();

  let sym = $derived(CHORD_TYPES.find(c => c.id === quality)?.sym ?? quality);
  let label = $derived(NOTES[root] + sym);
</script>

<button class="cc" class:cc-active={active} onclick={onclick}>
  <span class="cc-name">{label}</span>
  <span class="cc-deg">{degree}</span>
</button>

<style>
  .cc{display:flex;flex-direction:column;align-items:center;justify-content:center;width:80px;height:60px;background:var(--sf);border:2px solid var(--bd);border-radius:8px;cursor:pointer;transition:transform .12s,border-color .12s,background .12s;padding:0;font-family:inherit;color:inherit}
  .cc:hover{transform:translateY(-2px);border-color:var(--mt)}
  .cc-active{border-color:#58A6FF;background:rgba(88,166,255,.1)}
  .cc-name{font-size:16px;font-weight:700;color:var(--tx);line-height:1.2}
  .cc-deg{font-size:12px;color:var(--mt);font-family:'JetBrains Mono',monospace;margin-top:2px}
</style>
