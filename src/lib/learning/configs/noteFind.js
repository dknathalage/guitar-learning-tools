import { NOTES } from '$lib/constants/music.js';
import { NT_NATURAL, noteAt, BASE_MIDI, LANDMARKS, nearestLandmark, landmarkZone } from '$lib/music/fretboard.js';

export const noteFindConfig = {
  initialParams: { maxFret: 5, naturalsOnly: true, timer: 0 },

  itemKey(item) {
    return 's' + item.str + 'f' + item.fret;
  },

  itemClusters(item) {
    const clusters = [
      'str_' + item.str,
      'note_' + item.note,
      landmarkZone(item.fret),
      NT_NATURAL.includes(item.note) ? 'natural' : 'accidental'
    ];
    if (LANDMARKS.includes(item.fret)) clusters.push('landmark');
    return clusters;
  },

  itemFromKey(key, params) {
    const m = key.match(/^s(\d+)f(\d+)$/);
    const str = parseInt(m[1], 10);
    const fret = parseInt(m[2], 10);
    return { note: noteAt(str, fret), str, fret, midi: BASE_MIDI[str] + fret };
  },

  genRandom(params, lastItem) {
    const useLandmark = Math.random() < 0.4;
    const cands = [];
    for (let s = 0; s < 6; s++) {
      const fretPool = useLandmark ? LANDMARKS.filter(l => l <= params.maxFret) : null;
      const frets = fretPool || Array.from({ length: params.maxFret + 1 }, (_, i) => i);
      for (const f of frets) {
        const n = noteAt(s, f);
        if (params.naturalsOnly && !NT_NATURAL.includes(n)) continue;
        cands.push({ note: n, str: s, fret: f, midi: BASE_MIDI[s] + f });
      }
    }
    if (lastItem && cands.length > 6) {
      const filtered = cands.filter(c => !(c.note === lastItem.note && c.str === lastItem.str));
      if (filtered.length > 0) {
        return filtered[Math.floor(Math.random() * filtered.length)];
      }
    }
    return cands[Math.floor(Math.random() * cands.length)];
  },

  genFromCluster(clusterId, params, lastItem) {
    const cands = [];
    for (let s = 0; s < 6; s++) {
      for (let f = 0; f <= params.maxFret; f++) {
        const n = noteAt(s, f);
        if (params.naturalsOnly && !NT_NATURAL.includes(n)) continue;

        if (clusterId.startsWith('str_')) {
          if (s !== parseInt(clusterId.slice(4), 10)) continue;
        } else if (clusterId.startsWith('note_')) {
          if (n !== clusterId.slice(5)) continue;
        } else if (clusterId.startsWith('zone_')) {
          if (landmarkZone(f) !== clusterId) continue;
        } else if (clusterId === 'landmark') {
          if (!LANDMARKS.includes(f)) continue;
        } else if (clusterId === 'natural') {
          if (!NT_NATURAL.includes(n)) continue;
        } else if (clusterId === 'accidental') {
          if (NT_NATURAL.includes(n)) continue;
        }

        cands.push({ note: n, str: s, fret: f, midi: BASE_MIDI[s] + f });
      }
    }
    if (cands.length === 0) return this.genRandom(params, lastItem);

    if (lastItem && cands.length > 1) {
      const filtered = cands.filter(c => !(c.note === lastItem.note && c.str === lastItem.str));
      if (filtered.length > 0) {
        return filtered[Math.floor(Math.random() * filtered.length)];
      }
    }
    return cands[Math.floor(Math.random() * cands.length)];
  },

  microDrill(failedItem, params) {
    const s = failedItem.str;
    const f = failedItem.fret;

    // 1. Nearest landmark on same string
    const lmFret = nearestLandmark(f);
    const lm = { note: noteAt(s, lmFret), str: s, fret: lmFret, midi: BASE_MIDI[s] + lmFret };

    // 2. Next nearest landmark (different from first)
    const sorted = LANDMARKS.filter(l => l !== lmFret && l <= params.maxFret)
      .sort((a, b) => Math.abs(a - f) - Math.abs(b - f));
    const lm2Fret = sorted.length > 0 ? sorted[0] : 0;
    const lm2 = { note: noteAt(s, lm2Fret), str: s, fret: lm2Fret, midi: BASE_MIDI[s] + lm2Fret };

    return [lm, lm2];
  },

  pickScaffold(item, weakCluster, params) {
    if (!weakCluster) return [];

    if (weakCluster.startsWith('str_')) {
      const s = item.str;
      const cands = [];
      for (let f = 0; f <= params.maxFret; f++) {
        if (f === item.fret) continue;
        const n = noteAt(s, f);
        if (params.naturalsOnly && !NT_NATURAL.includes(n)) continue;
        cands.push({ note: n, str: s, fret: f, midi: BASE_MIDI[s] + f });
      }
      if (cands.length > 0) return [cands[Math.floor(Math.random() * cands.length)]];
    }

    if (weakCluster.startsWith('note_')) {
      const cands = [];
      for (let s = 0; s < 6; s++) {
        if (s === item.str) continue;
        for (let f = 0; f <= params.maxFret; f++) {
          if (noteAt(s, f) === item.note) {
            cands.push({ note: item.note, str: s, fret: f, midi: BASE_MIDI[s] + f });
          }
        }
      }
      if (cands.length > 0) return [cands[Math.floor(Math.random() * cands.length)]];
    }

    if (weakCluster.startsWith('zone_')) {
      const zoneToLandmark = { zone_0: 0, zone_3: 3, zone_5: 5, zone_7: 7, zone_9: 9, zone_12: 12 };
      const lmFret = zoneToLandmark[weakCluster];
      if (lmFret !== undefined && lmFret <= params.maxFret) {
        const n = noteAt(item.str, lmFret);
        if (!params.naturalsOnly || NT_NATURAL.includes(n)) {
          return [{ note: n, str: item.str, fret: lmFret, midi: BASE_MIDI[item.str] + lmFret }];
        }
      }
    }

    if (weakCluster === 'accidental') {
      const cands = [];
      for (let f = Math.max(0, item.fret - 2); f <= Math.min(params.maxFret, item.fret + 2); f++) {
        for (let s = 0; s < 6; s++) {
          const n = noteAt(s, f);
          if (!NT_NATURAL.includes(n)) {
            cands.push({ note: n, str: s, fret: f, midi: BASE_MIDI[s] + f });
          }
        }
      }
      if (cands.length > 0) return [cands[Math.floor(Math.random() * cands.length)]];
    }

    return [];
  },

  adjustParams(params, dir, mag) {
    const p = { ...params };
    if (mag <= 0.3) return p;
    const steps = [5, 7, 9, 12];

    if (dir > 0) {
      const curIdx = steps.indexOf(p.maxFret);
      if (curIdx >= 0 && curIdx < steps.length - 1) {
        const jump = mag > 0.6 ? 2 : 1;
        p.maxFret = steps[Math.min(curIdx + jump, steps.length - 1)];
      } else if (p.maxFret < 12) {
        const next = steps.find(s => s > p.maxFret);
        if (next) p.maxFret = next;
      } else if (p.naturalsOnly) {
        p.naturalsOnly = false;
      } else if (p.timer === 0) {
        p.timer = 15;
      } else if (p.timer > 5) {
        p.timer = 5;
      }
    } else {
      if (p.timer > 0 && p.timer < 15) { p.timer = 15; }
      else if (p.timer > 0) { p.timer = 0; }
      else if (!p.naturalsOnly) { p.naturalsOnly = true; }
      else {
        const curIdx = steps.indexOf(p.maxFret);
        if (curIdx > 0) {
          p.maxFret = steps[curIdx - 1];
        } else if (p.maxFret > steps[0]) {
          const prev = [...steps].reverse().find(s => s < p.maxFret);
          if (prev) p.maxFret = prev;
        }
      }
    }

    return p;
  }
};
