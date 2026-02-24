import { NOTES, MODES } from '$lib/constants/music.js';
import { NT_NATURAL, LANDMARKS, nearestLandmark, landmarkZone } from '$lib/music/fretboard.js';

const ALL_MODE_IDS = MODES.map(m => m.id);

export const modeTrainerConfig = {
  initialParams: { modes: ['ionian', 'aeolian'], naturalsOnly: true, dir: 'up', timer: 0 },

  itemKey(item) {
    return item.modeId + '_' + item.rootIdx + '_f' + item.startFret;
  },

  itemClusters(item) {
    const clusters = [
      'mode_' + item.modeId,
      'root_' + NOTES[item.rootIdx],
      landmarkZone(item.startFret)
    ];
    if (LANDMARKS.includes(item.startFret)) clusters.push('landmark');
    return clusters;
  },

  itemFromKey(key, params) {
    // Format: modeId_rootIdx_fStartFret
    // modeId never contains underscores, so split from the end
    const parts = key.split('_');
    const fPart = parts.pop();                // 'fN'
    const rootIdx = parseInt(parts.pop(), 10); // rootIdx
    const modeId = parts.join('_');            // modeId (safe even if no underscores)
    const startFret = parseInt(fPart.slice(1), 10);
    return { rootIdx, modeId, startFret, dir: params.dir };
  },

  genRandom(params, lastItem) {
    const allowedModes = MODES.filter(m => params.modes.includes(m.id));
    const mode = allowedModes[Math.floor(Math.random() * allowedModes.length)];

    const roots = params.naturalsOnly
      ? NOTES.map((n, i) => ({ n, i })).filter(x => NT_NATURAL.includes(x.n))
      : NOTES.map((n, i) => ({ n, i }));
    const root = roots[Math.floor(Math.random() * roots.length)];

    // 40% landmark bias for startFret (1-8 range)
    let startFret;
    const lmInRange = LANDMARKS.filter(l => l >= 1 && l <= 8);
    if (Math.random() < 0.4 && lmInRange.length > 0) {
      startFret = lmInRange[Math.floor(Math.random() * lmInRange.length)];
    } else {
      startFret = Math.floor(Math.random() * 8) + 1;
    }

    const item = { rootIdx: root.i, modeId: mode.id, startFret, dir: params.dir };

    // Avoid repeating the same item
    if (lastItem && item.modeId === lastItem.modeId && item.rootIdx === lastItem.rootIdx && item.startFret === lastItem.startFret) {
      return this.genRandom(params, lastItem);
    }
    return item;
  },

  genFromCluster(clusterId, params, lastItem) {
    if (clusterId.startsWith('mode_')) {
      const modeId = clusterId.slice(5);
      if (MODES.find(m => m.id === modeId)) {
        const roots = params.naturalsOnly
          ? NOTES.map((n, i) => ({ n, i })).filter(x => NT_NATURAL.includes(x.n))
          : NOTES.map((n, i) => ({ n, i }));
        const root = roots[Math.floor(Math.random() * roots.length)];
        const lmInRange = LANDMARKS.filter(l => l >= 1 && l <= 8);
        const startFret = Math.random() < 0.4 && lmInRange.length > 0
          ? lmInRange[Math.floor(Math.random() * lmInRange.length)]
          : Math.floor(Math.random() * 8) + 1;
        const item = { rootIdx: root.i, modeId, startFret, dir: params.dir };
        if (lastItem && item.modeId === lastItem.modeId && item.rootIdx === lastItem.rootIdx && item.startFret === lastItem.startFret) {
          return this.genFromCluster(clusterId, params, null);
        }
        return item;
      }
    }

    if (clusterId.startsWith('root_')) {
      const noteName = clusterId.slice(5);
      const rootIdx = NOTES.indexOf(noteName);
      if (rootIdx >= 0) {
        const allowedModes = MODES.filter(m => params.modes.includes(m.id));
        const mode = allowedModes[Math.floor(Math.random() * allowedModes.length)];
        const lmInRange = LANDMARKS.filter(l => l >= 1 && l <= 8);
        const startFret = Math.random() < 0.4 && lmInRange.length > 0
          ? lmInRange[Math.floor(Math.random() * lmInRange.length)]
          : Math.floor(Math.random() * 8) + 1;
        const item = { rootIdx, modeId: mode.id, startFret, dir: params.dir };
        if (lastItem && item.modeId === lastItem.modeId && item.rootIdx === lastItem.rootIdx && item.startFret === lastItem.startFret) {
          return this.genFromCluster(clusterId, params, null);
        }
        return item;
      }
    }

    if (clusterId.startsWith('zone_')) {
      const zoneToLandmark = { zone_0: 0, zone_3: 3, zone_5: 5, zone_7: 7, zone_9: 9, zone_12: 12 };
      const zoneFrets = [];
      for (let f = 1; f <= 8; f++) {
        if (landmarkZone(f) === clusterId) zoneFrets.push(f);
      }
      if (zoneFrets.length > 0) {
        const startFret = zoneFrets[Math.floor(Math.random() * zoneFrets.length)];
        const allowedModes = MODES.filter(m => params.modes.includes(m.id));
        const mode = allowedModes[Math.floor(Math.random() * allowedModes.length)];
        const roots = params.naturalsOnly
          ? NOTES.map((n, i) => ({ n, i })).filter(x => NT_NATURAL.includes(x.n))
          : NOTES.map((n, i) => ({ n, i }));
        const root = roots[Math.floor(Math.random() * roots.length)];
        return { rootIdx: root.i, modeId: mode.id, startFret, dir: params.dir };
      }
    }

    if (clusterId === 'landmark') {
      const lmInRange = LANDMARKS.filter(l => l >= 1 && l <= 8);
      if (lmInRange.length > 0) {
        const startFret = lmInRange[Math.floor(Math.random() * lmInRange.length)];
        const allowedModes = MODES.filter(m => params.modes.includes(m.id));
        const mode = allowedModes[Math.floor(Math.random() * allowedModes.length)];
        const roots = params.naturalsOnly
          ? NOTES.map((n, i) => ({ n, i })).filter(x => NT_NATURAL.includes(x.n))
          : NOTES.map((n, i) => ({ n, i }));
        const root = roots[Math.floor(Math.random() * roots.length)];
        return { rootIdx: root.i, modeId: mode.id, startFret, dir: params.dir };
      }
    }

    return this.genRandom(params, lastItem);
  },

  microDrill(failedItem, params) {
    // 1. Same mode+root at nearest landmark fret
    const lmFret = nearestLandmark(failedItem.startFret);
    const atLandmark = lmFret >= 1 ? lmFret : 1;
    const drill1 = {
      rootIdx: failedItem.rootIdx,
      modeId: failedItem.modeId,
      startFret: atLandmark,
      dir: params.dir
    };

    // 2. Same position with ionian (easiest mode)
    const drill2 = {
      rootIdx: failedItem.rootIdx,
      modeId: 'ionian',
      startFret: failedItem.startFret,
      dir: params.dir
    };

    return [drill1, drill2];
  },

  pickScaffold(item, weakCluster, params) {
    if (!weakCluster) return [];

    if (weakCluster.startsWith('mode_')) {
      const modeId = weakCluster.slice(5);
      if (MODES.find(m => m.id === modeId)) {
        return [{ rootIdx: item.rootIdx, modeId, startFret: item.startFret, dir: params.dir }];
      }
    }

    if (weakCluster.startsWith('root_')) {
      const noteName = weakCluster.slice(5);
      const rootIdx = NOTES.indexOf(noteName);
      if (rootIdx >= 0 && rootIdx !== item.rootIdx) {
        return [{ rootIdx, modeId: item.modeId, startFret: item.startFret, dir: params.dir }];
      }
      // If same root, pick a different one
      const roots = params.naturalsOnly
        ? NOTES.map((n, i) => ({ n, i })).filter(x => NT_NATURAL.includes(x.n) && x.i !== item.rootIdx)
        : NOTES.map((n, i) => ({ n, i })).filter(x => x.i !== item.rootIdx);
      if (roots.length > 0) {
        const r = roots[Math.floor(Math.random() * roots.length)];
        return [{ rootIdx: r.i, modeId: item.modeId, startFret: item.startFret, dir: params.dir }];
      }
    }

    if (weakCluster.startsWith('zone_')) {
      const zoneFrets = [];
      for (let f = 1; f <= 8; f++) {
        if (landmarkZone(f) === weakCluster) zoneFrets.push(f);
      }
      if (zoneFrets.length > 0) {
        const startFret = zoneFrets[Math.floor(Math.random() * zoneFrets.length)];
        return [{ rootIdx: item.rootIdx, modeId: item.modeId, startFret, dir: params.dir }];
      }
    }

    if (weakCluster === 'landmark') {
      const lmInRange = LANDMARKS.filter(l => l >= 1 && l <= 8);
      if (lmInRange.length > 0) {
        const startFret = lmInRange[Math.floor(Math.random() * lmInRange.length)];
        return [{ rootIdx: item.rootIdx, modeId: item.modeId, startFret, dir: params.dir }];
      }
    }

    return [];
  },

  adjustParams(params, dir, mag) {
    const p = { ...params, modes: [...params.modes] };
    if (mag <= 0.3) return p;

    const TWO_MODES = ['ionian', 'aeolian'];
    const isTwoModes = p.modes.length === 2 && p.modes.includes('ionian') && p.modes.includes('aeolian');
    const isAllModes = p.modes.length === ALL_MODE_IDS.length;

    if (dir > 0) {
      // Escalate harder
      // Level 1 -> 2: expand to all 7 modes
      if (isTwoModes) {
        p.modes = [...ALL_MODE_IDS];
      }
      // Level 2 -> 3: dir updown
      else if (p.dir === 'up' && isAllModes) {
        p.dir = 'updown';
      }
      // Level 3 -> 4: naturalsOnly false
      else if (p.naturalsOnly) {
        p.naturalsOnly = false;
      }
      // Then timer escalation: 0 -> 45 -> 15
      else if (p.timer === 0) {
        p.timer = 45;
      } else if (p.timer > 15) {
        p.timer = 15;
      }
    } else {
      // Reverse: make easier
      if (p.timer > 0 && p.timer <= 15) {
        p.timer = 45;
      } else if (p.timer > 0) {
        p.timer = 0;
      } else if (!p.naturalsOnly) {
        p.naturalsOnly = true;
      } else if (p.dir === 'updown') {
        p.dir = 'up';
      } else if (isAllModes) {
        p.modes = [...TWO_MODES];
      }
    }

    return p;
  }
};
