<script>
  import { onMount, onDestroy } from 'svelte';
  import { base } from '$app/paths';
  import { NOTES, A4, TUNINGS, BASE_MIDI } from '$lib/constants/music.js';
  import { freqToNote, yinDetect, rms } from '$lib/audio/pitch.js';

  const LS_KEY = 'guitar-tuner-custom-tunings';
  const STD_SEMI = TUNINGS.std.tuning;

  // ═══ Reactive state ═══
  let running = $state(false);
  let tuningId = $state('std');
  let tuning = $state([...TUNINGS.std.tuning]);
  let strNames = $state([...TUNINGS.std.stringNames]);
  let locked = $state(-1);
  let tunedFlags = $state([false, false, false, false, false, false]);
  let tunedTimers = $state([0, 0, 0, 0, 0, 0]);
  let activeStr = $state(-1);
  let customOpen = $state(false);
  let detNote = $state(null);
  let detCents = $state(0);
  let detHz = $state(0);
  let detColor = $state('var(--mt)');
  let msg = $state('Press Start to tune');
  let msgErr = $state(false);
  let customSelections = $state([...TUNINGS.std.tuning]);
  let savedCustoms = $state([]);

  // ═══ Non-reactive audio state ═══
  let audioCtx = null, analyser = null, stream = null, rafId = null, buf = null;

  // ═══ Derived ═══
  let targetFreqs = $derived(calcTargetFreqs(tuning));

  let centsBarLeft = $derived.by(() => {
    if (!detNote) return 50;
    return Math.max(5, Math.min(95, 50 + detCents / 50 * 45));
  });

  let centsLabel = $derived.by(() => {
    if (!detNote) return '';
    const sign = detCents > 0 ? '+' : '';
    return `${sign}${detCents}c`;
  });

  let hzLabel = $derived.by(() => {
    if (!detNote) return '';
    return detHz.toFixed(1) + ' Hz';
  });

  // ═══ Target frequencies ═══
  function calcTargetFreqs(tun) {
    const freqs = [];
    for (let i = 0; i < 6; i++) {
      const diff = ((tun[i] - STD_SEMI[i]) + 12) % 12;
      const semiOffset = diff <= 6 ? diff : diff - 12;
      const midi = BASE_MIDI[i] + semiOffset;
      freqs.push(A4 * Math.pow(2, (midi - 69) / 12));
    }
    return freqs;
  }

  // ═══ Closest string matching ═══
  function closestString(hz) {
    let best = -1, bestDist = Infinity;
    for (let i = 0; i < 6; i++) {
      const target = targetFreqs[i];
      const cents = Math.abs(1200 * Math.log2(hz / target));
      if (cents < bestDist) { bestDist = cents; best = i; }
    }
    return bestDist < 200 ? best : -1;
  }

  function centsFromTarget(hz, strIdx) {
    const target = targetFreqs[strIdx];
    return Math.round(1200 * Math.log2(hz / target));
  }

  function centsColor(cents) {
    const a = Math.abs(cents);
    if (a <= 5) return '#4ECB71';
    if (a <= 15) return '#FFB347';
    return '#FF6B6B';
  }

  // ═══ Audio lifecycle ═══
  async function startAudio() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      await ctx.resume();
      const s = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      });
      const src = ctx.createMediaStreamSource(s);
      const an = ctx.createAnalyser();
      an.fftSize = 8192;
      src.connect(an);
      audioCtx = ctx;
      analyser = an;
      stream = s;
      buf = new Float32Array(an.fftSize);
      return true;
    } catch (e) {
      msg = 'Mic access denied. Please allow microphone.';
      msgErr = true;
      return false;
    }
  }

  function stopAudio() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    if (audioCtx) { audioCtx.close(); audioCtx = null; }
    analyser = null; buf = null;
  }

  // ═══ Detection loop ═══
  function detectLoop() {
    if (!running || !analyser) return;
    analyser.getFloatTimeDomainData(buf);

    if (rms(buf) < 0.005) {
      detNote = null; detCents = 0; detHz = 0; detColor = 'var(--mt)';
      activeStr = -1;
      rafId = requestAnimationFrame(detectLoop);
      return;
    }

    const hz = yinDetect(buf, audioCtx.sampleRate);
    if (!hz || hz < 50 || hz > 1400) {
      detNote = null; detCents = 0; detHz = 0; detColor = 'var(--mt)';
      activeStr = -1;
      rafId = requestAnimationFrame(detectLoop);
      return;
    }

    const { note } = freqToNote(hz);
    let strIdx;
    if (locked >= 0) {
      strIdx = locked;
    } else {
      strIdx = closestString(hz);
    }

    if (strIdx < 0) {
      detNote = note; detCents = 0; detHz = hz; detColor = 'var(--mt)';
      activeStr = -1;
      rafId = requestAnimationFrame(detectLoop);
      return;
    }

    const cents = centsFromTarget(hz, strIdx);
    const col = centsColor(cents);
    detNote = note; detCents = cents; detHz = hz; detColor = col;

    activeStr = strIdx;

    // Tuned detection: held within 5 cents for 1 second
    const now = performance.now();
    if (Math.abs(cents) <= 5) {
      if (!tunedTimers[strIdx]) tunedTimers[strIdx] = now;
      if (now - tunedTimers[strIdx] >= 1000 && !tunedFlags[strIdx]) {
        tunedFlags[strIdx] = true;
      }
    } else {
      tunedTimers[strIdx] = 0;
    }

    rafId = requestAnimationFrame(detectLoop);
  }

  // ═══ Controls ═══
  async function onStart() {
    const ok = await startAudio();
    if (!ok) return;
    running = true;
    resetTuned();
    msg = 'Listening... pluck a string';
    msgErr = false;
    detectLoop();
  }

  function onStop() {
    running = false;
    stopAudio();
    detNote = null; detCents = 0; detHz = 0; detColor = 'var(--mt)';
    activeStr = -1;
    msg = 'Press Start to tune';
    msgErr = false;
  }

  function resetTuned() {
    tunedTimers = [0, 0, 0, 0, 0, 0];
    tunedFlags = [false, false, false, false, false, false];
    activeStr = -1;
  }

  function toggleLock(i) {
    locked = locked === i ? -1 : i;
  }

  // ═══ Tuning changes ═══
  function onTuningChange(val) {
    if (val === '__custom__') {
      openCustomEditor();
      return;
    }
    if (val.startsWith('custom_')) {
      const idx = parseInt(val.split('_')[1]);
      const customs = loadCustomTunings();
      if (customs[idx]) {
        tuningId = val;
        tuning = [...customs[idx].tuning];
        strNames = [...customs[idx].stringNames];
      }
    } else if (TUNINGS[val]) {
      tuningId = val;
      tuning = [...TUNINGS[val].tuning];
      strNames = [...TUNINGS[val].stringNames];
    }
    resetTuned();
    locked = -1;
  }

  function handleTuningSelect(e) {
    onTuningChange(e.target.value);
    // If custom was selected, reset the dropdown to current tuning
    if (e.target.value === '__custom__') {
      e.target.value = tuningId;
    }
  }

  // ═══ Custom tuning editor ═══
  function openCustomEditor() {
    customOpen = true;
    customSelections = [...tuning];
    savedCustoms = loadCustomTunings();
  }

  function closeCustomEditor() {
    customOpen = false;
  }

  function getCustomValues() {
    const t = [...customSelections];
    const names = [];
    for (let i = 0; i < 6; i++) {
      names.push(i === 5 ? NOTES[t[i]].toLowerCase() : NOTES[t[i]]);
    }
    return { tuning: t, stringNames: names, label: names.join('') };
  }

  function applyCustom() {
    const c = getCustomValues();
    tuningId = '__applied__';
    tuning = c.tuning;
    strNames = c.stringNames;
    resetTuned();
    locked = -1;
    closeCustomEditor();
  }

  function saveCustom() {
    const c = getCustomValues();
    const name = prompt('Tuning name:');
    if (!name || !name.trim()) return;
    const customs = loadCustomTunings();
    customs.push({ name: name.trim(), label: c.label, tuning: c.tuning, stringNames: c.stringNames });
    localStorage.setItem(LS_KEY, JSON.stringify(customs));
    const idx = customs.length - 1;
    tuningId = 'custom_' + idx;
    tuning = c.tuning;
    strNames = c.stringNames;
    resetTuned();
    locked = -1;
    savedCustoms = customs;
    closeCustomEditor();
  }

  function loadCustomTunings() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY)) || [];
    } catch { return []; }
  }

  function deleteCustomTuning(idx) {
    const customs = loadCustomTunings();
    customs.splice(idx, 1);
    localStorage.setItem(LS_KEY, JSON.stringify(customs));
    if (tuningId === 'custom_' + idx) {
      onTuningChange('std');
    } else if (tuningId.startsWith('custom_')) {
      const curIdx = parseInt(tuningId.split('_')[1]);
      if (curIdx > idx) tuningId = 'custom_' + (curIdx - 1);
    }
    savedCustoms = customs;
  }

  function loadSavedCustomAndSelect(idx) {
    onTuningChange('custom_' + idx);
    closeCustomEditor();
  }

  // ═══ Lifecycle ═══
  onMount(() => {
    savedCustoms = loadCustomTunings();
  });

  onDestroy(() => {
    stopAudio();
  });

  // String labels for custom editor
  const customLabels = ['6th', '5th', '4th', '3rd', '2nd', '1st'];
</script>

<svelte:head>
  <title>Guitar Tuner - Chromatic Tuner with Preset & Custom Tunings</title>
  <meta name="description" content="Free online guitar tuner with real-time pitch detection. Supports standard, drop D, open G, open D, DADGAD tunings, and custom tuning presets.">
</svelte:head>

<div class="tu-wrap">
  <header class="tu-hdr">
    <h1>Guitar Tuner</h1>
    <nav class="tu-nav">
      <a href="{base}/" class="pill" style="font-size:13px;text-decoration:none">Home</a>
      <a href="{base}/caged" class="pill" style="font-size:13px;text-decoration:none">CAGED</a>
    </nav>
  </header>

  <div class="tu-tun-row">
    <select class="tu-tun-sel" aria-label="Tuning" onchange={handleTuningSelect} value={tuningId}>
      {#each Object.values(TUNINGS) as t}
        <option value={t.id}>{t.name} ({t.label})</option>
      {/each}
      {#if savedCustoms.length}
        <option disabled>────────</option>
        {#each savedCustoms as c, i}
          <option value="custom_{i}">{c.name} ({c.label})</option>
        {/each}
      {/if}
      <option value="__custom__">Custom...</option>
    </select>
    <button class="tu-btn tu-small" onclick={() => customOpen ? closeCustomEditor() : openCustomEditor()}>+ Custom</button>
  </div>

  <div class="tu-custom" class:tu-open={customOpen}>
    <div class="tu-custom-title">Custom Tuning</div>
    <div class="tu-custom-row">
      {#each customLabels as label, i}
        <div class="tu-custom-str">
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label>{label}
            <select bind:value={customSelections[i]}>
              {#each NOTES as n, ni}
                <option value={ni}>{n}</option>
              {/each}
            </select>
          </label>
        </div>
      {/each}
    </div>
    <div class="tu-custom-btns">
      <button class="tu-btn tu-small" onclick={applyCustom}>Apply</button>
      <button class="tu-btn tu-small" onclick={saveCustom}>Save</button>
      <button class="tu-btn tu-small" onclick={closeCustomEditor}>Cancel</button>
    </div>
    {#if savedCustoms.length}
      <div>
        {#each savedCustoms as c, i}
          <div class="tu-saved-item">
            <button class="tu-btn tu-small" onclick={() => loadSavedCustomAndSelect(i)}>{c.name} ({c.label})</button>
            <button class="tu-saved-del" onclick={() => deleteCustomTuning(i)} title="Delete">&times;</button>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <div class="tu-main">
    <div class="tu-detect">
      <div class="tu-detect-lbl">Detected</div>
      <div class="tu-detect-note" style="color: {detNote ? detColor : 'var(--mt)'}">
        {detNote ?? '\u2014'}
      </div>
      <div class="tu-cents-wrap">
        <span class="tu-cents-lbl">{centsLabel}</span>
        <div class="tu-cents-bar">
          <div class="tu-cents-tick"></div>
          <div
            class="tu-cents-ind"
            style="left: {centsBarLeft}%; background: {detNote ? detColor : 'var(--bd)'};"
          ></div>
        </div>
        <span class="tu-hz">{hzLabel}</span>
      </div>
    </div>

    <div class="tu-strings">
      {#each [5, 4, 3, 2, 1, 0] as i}
        {@const freq = targetFreqs[i]}
        {@const isActive = activeStr === i}
        {@const isLocked = locked === i}
        {@const isTuned = tunedFlags[i]}
        <div
          class="tu-str"
          class:tu-active={isActive}
          class:tu-locked={isLocked}
          class:tu-tuned={isTuned}
          onclick={() => toggleLock(i)}
          role="button"
          tabindex="0"
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleLock(i); }}
        >
          <span class="tu-str-name">{strNames[i]}</span>
          <span class="tu-str-line"><span class="tu-str-dot"></span></span>
          <span class="tu-str-hz">{freq.toFixed(1)} Hz</span>
          <span class="tu-str-status">
            {#if isLocked}
              &#x1F512;
            {:else if isTuned}
              &#x2713;
            {:else if isActive}
              &#x25CF;
            {/if}
          </span>
        </div>
      {/each}
    </div>

    <div class="tu-msg" class:tu-err={msgErr}>{msg}</div>
  </div>

  <div class="tu-controls">
    {#if !running}
      <button class="tu-btn tu-primary" onclick={onStart}>Start</button>
    {:else}
      <button class="tu-btn tu-danger" onclick={onStop}>Stop</button>
    {/if}
  </div>
</div>

<style>
  .tu-wrap{display:flex;flex-direction:column;height:100vh;width:100%;padding:.5rem 1rem;gap:.6rem;background:var(--bg);color:var(--tx);font-family:'Outfit',sans-serif}
  .tu-hdr{display:flex;justify-content:space-between;align-items:center;flex-shrink:0;flex-wrap:wrap;gap:.5rem}
  .tu-hdr h1{font-size:18px;font-weight:900;letter-spacing:-1px}
  .tu-nav{display:flex;gap:.4rem}
  .tu-tun-row{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;justify-content:center;flex-shrink:0}
  .tu-tun-sel{padding:.35rem .6rem;border-radius:10px;border:1.5px solid var(--bd);background:var(--sf);color:var(--tx);font-family:'JetBrains Mono',monospace;font-size:13px;cursor:pointer;outline:none}
  .tu-tun-sel:focus{border-color:var(--ac)}
  .tu-btn{padding:.35rem .8rem;border-radius:20px;border:1.5px solid var(--bd);background:var(--sf);color:var(--mt);font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s}
  .tu-btn:hover{border-color:#555;color:var(--tx)}
  .tu-btn.tu-primary{border-color:var(--ac);color:var(--ac);background:rgba(88,166,255,.1)}
  .tu-btn.tu-danger{border-color:#FF6B6B;color:#FF6B6B;background:rgba(255,107,107,.08)}
  .tu-btn.tu-small{font-size:11px;padding:.2rem .5rem}
  .tu-main{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.8rem;min-height:0;overflow-y:auto}
  .tu-detect{text-align:center;background:var(--sf);border:1.5px solid var(--bd);border-radius:14px;padding:1.2rem 1.5rem;width:100%;max-width:440px}
  .tu-detect-lbl{font-size:12px;color:var(--mt);text-transform:uppercase;letter-spacing:1px;margin-bottom:.3rem}
  .tu-detect-note{font-family:'JetBrains Mono',monospace;font-size:64px;font-weight:700;line-height:1;min-height:68px;transition:color .15s}
  .tu-cents-wrap{display:flex;align-items:center;justify-content:center;gap:.5rem;margin-top:.5rem}
  .tu-cents-bar{width:220px;height:8px;background:var(--sf2);border-radius:4px;position:relative;overflow:visible}
  .tu-cents-tick{position:absolute;top:-2px;width:2px;height:12px;background:var(--bd);left:50%;transform:translateX(-50%);border-radius:1px}
  .tu-cents-ind{position:absolute;top:-3px;width:14px;height:14px;border-radius:50%;left:50%;transform:translateX(-50%);transition:left .08s,background .15s}
  .tu-cents-lbl{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--mt);min-width:55px;text-align:right}
  .tu-hz{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--mt);min-width:55px;text-align:left}
  .tu-strings{width:100%;max-width:440px;display:flex;flex-direction:column;gap:2px}
  .tu-str{display:flex;align-items:center;gap:.5rem;padding:.45rem .8rem;background:var(--sf);border:1.5px solid var(--bd);border-radius:10px;cursor:pointer;transition:border-color .15s,background .15s;font-family:'JetBrains Mono',monospace;font-size:14px}
  .tu-str:hover{border-color:#555}
  .tu-str.tu-active{border-color:var(--ac);background:rgba(88,166,255,.06)}
  .tu-str.tu-locked{border-color:#FFB347;background:rgba(255,179,71,.06)}
  .tu-str-name{font-weight:700;width:2rem;text-align:center;font-size:16px}
  .tu-str-line{flex:1;height:2px;border-radius:1px;background:var(--bd);position:relative}
  .tu-str-dot{position:absolute;top:50%;left:50%;width:8px;height:8px;border-radius:50%;transform:translate(-50%,-50%);background:var(--bd);transition:background .15s}
  .tu-str.tu-active .tu-str-dot{background:var(--ac)}
  .tu-str.tu-tuned .tu-str-dot{background:#4ECB71}
  .tu-str-hz{font-size:12px;color:var(--mt);min-width:60px;text-align:right}
  .tu-str-status{width:1.3rem;text-align:center;font-size:14px}
  .tu-controls{display:flex;gap:.4rem;flex-wrap:wrap;justify-content:center;flex-shrink:0;padding-bottom:.5rem}
  .tu-msg{text-align:center;font-size:13px;color:var(--mt);min-height:18px}
  .tu-msg.tu-err{color:#FF6B6B}
  .tu-custom{background:var(--sf);border:1.5px solid var(--bd);border-radius:12px;padding:.8rem 1rem;width:100%;max-width:440px;display:none;margin:0 auto}
  .tu-custom.tu-open{display:block}
  .tu-custom-title{font-size:13px;font-weight:700;margin-bottom:.5rem;color:var(--mt);text-transform:uppercase;letter-spacing:.5px}
  .tu-custom-row{display:flex;gap:.4rem;flex-wrap:wrap;align-items:center;margin-bottom:.5rem}
  .tu-custom-str{display:flex;flex-direction:column;align-items:center;gap:.2rem}
  .tu-custom-str label{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--mt)}
  .tu-custom-str select{padding:.25rem .3rem;border-radius:6px;border:1.5px solid var(--bd);background:var(--sf2);color:var(--tx);font-family:'JetBrains Mono',monospace;font-size:13px;cursor:pointer;outline:none}
  .tu-custom-str select:focus{border-color:var(--ac)}
  .tu-custom-btns{display:flex;gap:.3rem;margin-top:.3rem}
  .tu-saved-item{display:flex;align-items:center;gap:.3rem;margin-top:.3rem}
  .tu-saved-item .tu-btn{flex:1}
  .tu-saved-del{width:24px;height:24px;border-radius:50%;border:1.5px solid var(--bd);background:none;color:var(--mt);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}
  .tu-saved-del:hover{border-color:#FF6B6B;color:#FF6B6B}
  @media(max-width:600px){
    .tu-wrap{padding:.4rem;gap:.4rem}
    .tu-hdr h1{font-size:15px}
    .tu-detect{padding:.8rem 1rem}
    .tu-detect-note{font-size:44px;min-height:48px}
    .tu-cents-bar{width:160px}
    .tu-str{padding:.35rem .6rem;font-size:12px}
    .tu-str-name{font-size:14px;width:1.6rem}
    .tu-str-hz{font-size:11px;min-width:50px}
    .tu-btn{font-size:11px;padding:.25rem .5rem}
  }
</style>
