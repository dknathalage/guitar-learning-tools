export class TonePlayer {
  constructor() {
    this.ctx = null;
    this.activeSets = new Set();
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  playNote(freq, duration = 0.8, startTime) {
    if (!this.ctx) this.init();
    const t = startTime ?? this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
    gain.gain.setValueAtTime(0.3, t + duration - 0.05);
    gain.gain.linearRampToValueAtTime(0, t + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
    const nodeSet = new Set([osc, gain]);
    this.activeSets.add(nodeSet);
    osc.onended = () => {
      this.activeSets.delete(nodeSet);
    };
  }

  playInterval(rootFreq, intervalFreq, gap = 0.9) {
    if (!this.ctx) this.init();
    const t = this.ctx.currentTime;
    this.playNote(rootFreq, 0.8, t);
    this.playNote(intervalFreq, 0.8, t + gap);
  }

  playChord(freqs, arpeggiate = true, gap = 0.25) {
    if (!this.ctx) this.init();
    const t = this.ctx.currentTime;
    freqs.forEach((f, i) => {
      this.playNote(f, arpeggiate ? 1.2 : 0.8, t + (arpeggiate ? i * gap : 0));
    });
  }

  stop() {
    for (const nodeSet of this.activeSets) {
      for (const n of nodeSet) {
        try { if (n.stop) n.stop(); } catch {}
        try { n.disconnect(); } catch {}
      }
    }
    this.activeSets.clear();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}
