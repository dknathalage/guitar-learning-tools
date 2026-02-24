import { NT_NATURAL, noteAt, fretForNote, LANDMARKS, nearestLandmark, landmarkZone } from '$lib/music/fretboard.js';

export const fretboardQuizConfig = {
  initialParams: { maxFret: 5, naturalsOnly: true, timer: 0 },

  itemKey(item) {
    return item.mode + '_s' + item.str + 'f' + item.fret;
  },

  itemClusters(item) {
    const clusters = [
      'str_' + item.str,
      'note_' + item.note,
      'mode_' + item.mode,
      NT_NATURAL.includes(item.note) ? 'natural' : 'accidental',
      landmarkZone(item.fret)
    ];
    if (LANDMARKS.includes(item.fret)) clusters.push('landmark');
    return clusters;
  },

  itemFromKey(key, params) {
    const m = key.match(/^(note|fret)_s(\d+)f(\d+)$/);
    const mode = m[1];
    const str = parseInt(m[2], 10);
    const fret = parseInt(m[3], 10);
    return { str, fret, note: noteAt(str, fret), mode };
  },

  genRandom(params, lastItem) {
    const modes = ['note', 'fret'];
    const useLandmark = Math.random() < 0.4;
    let str, fret, note;
    let attempts = 0;
    do {
      str = Math.floor(Math.random() * 6);
      if (useLandmark) {
        const valid = LANDMARKS.filter(l => l <= params.maxFret);
        fret = valid[Math.floor(Math.random() * valid.length)];
      } else {
        fret = Math.floor(Math.random() * (params.maxFret + 1));
      }
      note = noteAt(str, fret);
      attempts++;
    } while (
      (params.naturalsOnly && !NT_NATURAL.includes(note)) ||
      (lastItem && str === lastItem.str && fret === lastItem.fret && attempts < 100)
    );
    const mode = modes[Math.floor(Math.random() * 2)];
    return { str, fret, note, mode };
  },

  genFromCluster(clusterId, params, lastItem) {
    const cands = [];
    const modes = ['note', 'fret'];
    for (let s = 0; s < 6; s++) {
      for (let f = 0; f <= params.maxFret; f++) {
        const n = noteAt(s, f);
        if (params.naturalsOnly && !NT_NATURAL.includes(n)) continue;

        for (const mode of modes) {
          if (clusterId.startsWith('str_')) {
            if (s !== parseInt(clusterId.slice(4), 10)) continue;
          } else if (clusterId.startsWith('note_')) {
            if (n !== clusterId.slice(5)) continue;
          } else if (clusterId.startsWith('mode_')) {
            if (mode !== clusterId.slice(5)) continue;
          } else if (clusterId.startsWith('zone_')) {
            if (landmarkZone(f) !== clusterId) continue;
          } else if (clusterId === 'landmark') {
            if (!LANDMARKS.includes(f)) continue;
          } else if (clusterId === 'natural') {
            if (!NT_NATURAL.includes(n)) continue;
          } else if (clusterId === 'accidental') {
            if (NT_NATURAL.includes(n)) continue;
          }

          cands.push({ str: s, fret: f, note: n, mode });
        }
      }
    }
    if (cands.length === 0) return this.genRandom(params, lastItem);

    if (lastItem && cands.length > 1) {
      const filtered = cands.filter(c => !(c.str === lastItem.str && c.fret === lastItem.fret));
      if (filtered.length > 0) {
        return filtered[Math.floor(Math.random() * filtered.length)];
      }
    }
    return cands[Math.floor(Math.random() * cands.length)];
  },

  microDrill(failedItem, params) {
    const s = failedItem.str;
    const oppositeMode = failedItem.mode === 'note' ? 'fret' : 'note';

    // 1. Nearest landmark on same string, opposite mode
    const lmFret = nearestLandmark(failedItem.fret);
    const lm = { str: s, fret: lmFret, note: noteAt(s, lmFret), mode: oppositeMode };

    // 2. Same str+fret, opposite mode
    const same = { str: s, fret: failedItem.fret, note: failedItem.note, mode: oppositeMode };

    return [lm, same];
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
        const mode = Math.random() < 0.5 ? 'note' : 'fret';
        cands.push({ str: s, fret: f, note: n, mode });
      }
      if (cands.length > 0) return [cands[Math.floor(Math.random() * cands.length)]];
    }

    if (weakCluster.startsWith('note_')) {
      const cands = [];
      for (let s = 0; s < 6; s++) {
        if (s === item.str) continue;
        for (let f = 0; f <= params.maxFret; f++) {
          if (noteAt(s, f) === item.note) {
            const mode = Math.random() < 0.5 ? 'note' : 'fret';
            cands.push({ str: s, fret: f, note: item.note, mode });
          }
        }
      }
      if (cands.length > 0) return [cands[Math.floor(Math.random() * cands.length)]];
    }

    if (weakCluster.startsWith('zone_')) {
      // Pick the landmark fret within that zone on the item's string
      const zoneToLandmark = { zone_0: 0, zone_3: 3, zone_5: 5, zone_7: 7, zone_9: 9, zone_12: 12 };
      const lmFret = zoneToLandmark[weakCluster];
      if (lmFret !== undefined && lmFret <= params.maxFret) {
        const n = noteAt(item.str, lmFret);
        if (!params.naturalsOnly || NT_NATURAL.includes(n)) {
          const mode = Math.random() < 0.5 ? 'note' : 'fret';
          return [{ str: item.str, fret: lmFret, note: n, mode }];
        }
      }
    }

    if (weakCluster === 'accidental') {
      const cands = [];
      for (let f = Math.max(0, item.fret - 2); f <= Math.min(params.maxFret, item.fret + 2); f++) {
        for (let s = 0; s < 6; s++) {
          const n = noteAt(s, f);
          if (!NT_NATURAL.includes(n)) {
            const mode = Math.random() < 0.5 ? 'note' : 'fret';
            cands.push({ str: s, fret: f, note: n, mode });
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
      // Harder: expand maxFret along landmark steps
      const curIdx = steps.indexOf(p.maxFret);
      if (curIdx >= 0 && curIdx < steps.length - 1) {
        const jump = mag > 0.6 ? 2 : 1;
        p.maxFret = steps[Math.min(curIdx + jump, steps.length - 1)];
      } else if (p.maxFret < 12) {
        // Not on a step — snap to next step
        const next = steps.find(s => s > p.maxFret);
        if (next) p.maxFret = next;
      } else if (p.naturalsOnly) {
        p.naturalsOnly = false;
      } else if (p.timer === 0) {
        p.timer = 20;
      } else if (p.timer > 5) {
        p.timer = 5;
      }
    } else {
      // Easier: step one landmark back
      if (p.timer > 0 && p.timer <= 5) { p.timer = 20; }
      else if (p.timer > 0) { p.timer = 0; }
      else if (!p.naturalsOnly) { p.naturalsOnly = true; }
      else {
        const curIdx = steps.indexOf(p.maxFret);
        if (curIdx > 0) {
          p.maxFret = steps[curIdx - 1];
        } else if (p.maxFret > steps[0]) {
          // Snap down to nearest step
          const prev = [...steps].reverse().find(s => s < p.maxFret);
          if (prev) p.maxFret = prev;
        }
      }
    }

    return p;
  }
};
