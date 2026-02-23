import { yinDetect, rms, freqToNote } from './pitch.js';

export class AudioManager {
  constructor() {
    this.audioCtx = null;
    this.analyser = null;
    this.stream = null;
    this.rafId = null;
    this.buf = null;
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
      this.buf = new Float32Array(an.fftSize);
      return true;
    } catch {
      return false;
    }
  }

  stop() {
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; }
    if (this.audioCtx) { this.audioCtx.close(); this.audioCtx = null; }
    this.analyser = null;
    this.buf = null;
  }

  startLoop(onDetect, onSilence) {
    const loop = () => {
      if (!this.analyser) return;
      this.analyser.getFloatTimeDomainData(this.buf);
      if (rms(this.buf) < 0.003) {
        onSilence();
        this.rafId = requestAnimationFrame(loop);
        return;
      }
      const hz = yinDetect(this.buf, this.audioCtx.sampleRate);
      if (!hz || hz < 50 || hz > 1400) {
        onSilence();
        this.rafId = requestAnimationFrame(loop);
        return;
      }
      const {note, cents, semi} = freqToNote(hz);
      onDetect(note, cents, hz, semi);
      this.rafId = requestAnimationFrame(loop);
    };
    loop();
  }
}
