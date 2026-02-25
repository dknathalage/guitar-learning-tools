import { yinDetect, rms, freqToNote } from './pitch.js';

export class AudioManager extends EventTarget {
  constructor() {
    super();
    this.audioCtx = null;
    this.analyser = null;
    this.stream = null;
    this.rafId = null;
    this.buffer = null;
    this.cachedSampleRate = null;
  }

  async start() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      await ctx.resume();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {echoCancellation: false, noiseSuppression: false, autoGainControl: false}
      });
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 8192;
      src.connect(an);
      this.audioCtx = ctx;
      this.analyser = an;
      this.stream = stream;
      this.buffer = new Float32Array(an.fftSize);
      this.cachedSampleRate = ctx.sampleRate;
      return { ok: true };
    } catch (err) {
      const name = err && err.name;
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        return { ok: false, error: 'mic_denied', message: 'Microphone access denied. Please allow microphone in browser settings.' };
      }
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        return { ok: false, error: 'no_mic', message: 'No microphone found on this device.' };
      }
      return { ok: false, error: 'unknown', message: 'Could not start audio: ' + (err && err.message || 'unknown error') };
    }
  }

  stop() {
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; }
    if (this.audioCtx) { this.audioCtx.close(); this.audioCtx = null; }
    this.analyser = null;
    this.buffer = null;
  }

  startLoop() {
    let prevNote = null;
    let stableCount = 0;
    const STABLE_FRAMES = 3;
    const loop = () => {
      if (!this.analyser) return;
      this.analyser.getFloatTimeDomainData(this.buffer);
      if (rms(this.buffer) < 0.01) {
        prevNote = null; stableCount = 0;
        this.dispatchEvent(new CustomEvent('silence'));
        this.rafId = requestAnimationFrame(loop);
        return;
      }
      const hz = yinDetect(this.buffer, this.audioCtx.sampleRate);
      if (!hz || hz < 50 || hz > 1400) {
        prevNote = null; stableCount = 0;
        this.dispatchEvent(new CustomEvent('silence'));
        this.rafId = requestAnimationFrame(loop);
        return;
      }
      const {note, cents, semi} = freqToNote(hz);
      if (note === prevNote) {
        stableCount++;
      } else {
        prevNote = note;
        stableCount = 1;
      }
      if (stableCount >= STABLE_FRAMES) {
        this.dispatchEvent(new CustomEvent('detect', { detail: { note, cents, hz, semitones: semi } }));
      }
      this.rafId = requestAnimationFrame(loop);
    };
    loop();
  }
}
