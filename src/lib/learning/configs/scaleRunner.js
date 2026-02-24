import { NOTES, SCALES } from '$lib/constants/music.js';
import { NT_NATURAL, LANDMARKS, nearestLandmark, landmarkZone } from '$lib/music/fretboard.js';

const PENT_IDS = ['maj_pent', 'min_pent'];
const ALL_SCALE_IDS = ['major', 'natural_min', 'maj_pent', 'min_pent'];

export const scaleRunnerConfig = {
  initialParams: { scales: ['maj_pent', 'min_pent'], naturalsOnly: true, dir: 'up', timer: 0 },

  itemKey(item) {
    return item.scaleId + '_' + item.rootIdx + '_f' + item.startFret;
  },

  itemClusters(item) {
    const clusters = [
      'scale_' + item.scaleId,
      'root_' + NOTES[item.rootIdx],
      landmarkZone(item.startFret)
    ];
    if (LANDMARKS.includes(item.startFret)) clusters.push('landmark');
    return clusters;
  },

  itemFromKey(key, params) {
    // scaleId can contain underscores (e.g. 'maj_pent', 'natural_min')
    // Format: scaleId_rootIdx_fStartFret
    // Parse by finding _f\d+$ at the end, then the number before that for rootIdx
    const fretMatch = key.match(/_f(\d+)$/);
    const startFret = parseInt(fretMatch[1], 10);
    const beforeFret = key.slice(0, fretMatch.index);
    const lastUnderscore = beforeFret.lastIndexOf('_');
    const rootIdx = parseInt(beforeFret.slice(lastUnderscore + 1), 10);
    const scaleId = beforeFret.slice(0, lastUnderscore);
    return { scaleId, rootIdx, startFret, dir: params.dir || 'up' };
  },

  genRandom(params, lastItem) {
    const scaleId = params.scales[Math.floor(Math.random() * params.scales.length)];
    const roots = params.naturalsOnly
      ? NT_NATURAL.map(n => NOTES.indexOf(n))
      : Array.from({ length: 12 }, (_, i) => i);
    const rootIdx = roots[Math.floor(Math.random() * roots.length)];

    // 40% landmark bias on startFret
    let startFret;
    const landmarksInRange = LANDMARKS.filter(l => l >= 1 && l <= 8);
    if (Math.random() < 0.4 && landmarksInRange.length > 0) {
      startFret = landmarksInRange[Math.floor(Math.random() * landmarksInRange.length)];
    } else {
      startFret = Math.floor(Math.random() * 8) + 1;
    }

    const item = { scaleId, rootIdx, startFret, dir: params.dir || 'up' };

    // Avoid repeating the same item
    if (lastItem && item.scaleId === lastItem.scaleId && item.rootIdx === lastItem.rootIdx && item.startFret === lastItem.startFret) {
      return this.genRandom(params, lastItem);
    }

    return item;
  },

  genFromCluster(clusterId, params, lastItem) {
    if (clusterId.startsWith('scale_')) {
      const scaleId = clusterId.slice(6);
      const roots = params.naturalsOnly
        ? NT_NATURAL.map(n => NOTES.indexOf(n))
        : Array.from({ length: 12 }, (_, i) => i);
      const rootIdx = roots[Math.floor(Math.random() * roots.length)];
      const startFret = Math.floor(Math.random() * 8) + 1;
      return { scaleId, rootIdx, startFret, dir: params.dir || 'up' };
    }

    if (clusterId.startsWith('root_')) {
      const noteName = clusterId.slice(5);
      const rootIdx = NOTES.indexOf(noteName);
      const scaleId = params.scales[Math.floor(Math.random() * params.scales.length)];
      const startFret = Math.floor(Math.random() * 8) + 1;
      return { scaleId, rootIdx, startFret, dir: params.dir || 'up' };
    }

    if (clusterId.startsWith('zone_')) {
      const zoneToLandmark = { zone_0: 0, zone_3: 3, zone_5: 5, zone_7: 7, zone_9: 9, zone_12: 12 };
      const lm = zoneToLandmark[clusterId];
      // Pick a startFret in this zone
      let startFret;
      if (lm !== undefined && lm >= 1 && lm <= 8) {
        startFret = lm;
      } else {
        startFret = Math.floor(Math.random() * 8) + 1;
      }
      const scaleId = params.scales[Math.floor(Math.random() * params.scales.length)];
      const roots = params.naturalsOnly
        ? NT_NATURAL.map(n => NOTES.indexOf(n))
        : Array.from({ length: 12 }, (_, i) => i);
      const rootIdx = roots[Math.floor(Math.random() * roots.length)];
      return { scaleId, rootIdx, startFret, dir: params.dir || 'up' };
    }

    if (clusterId === 'landmark') {
      const landmarksInRange = LANDMARKS.filter(l => l >= 1 && l <= 8);
      const startFret = landmarksInRange.length > 0
        ? landmarksInRange[Math.floor(Math.random() * landmarksInRange.length)]
        : Math.floor(Math.random() * 8) + 1;
      const scaleId = params.scales[Math.floor(Math.random() * params.scales.length)];
      const roots = params.naturalsOnly
        ? NT_NATURAL.map(n => NOTES.indexOf(n))
        : Array.from({ length: 12 }, (_, i) => i);
      const rootIdx = roots[Math.floor(Math.random() * roots.length)];
      return { scaleId, rootIdx, startFret, dir: params.dir || 'up' };
    }

    return this.genRandom(params, lastItem);
  },

  microDrill(failedItem, params) {
    const drills = [];

    // 1. Same scale+root at nearest landmark fret
    const lmFret = nearestLandmark(failedItem.startFret);
    const landmarkFret = lmFret >= 1 ? lmFret : 1;
    drills.push({
      scaleId: failedItem.scaleId,
      rootIdx: failedItem.rootIdx,
      startFret: landmarkFret,
      dir: params.dir || 'up'
    });

    // 2. Same position with a pentatonic scale (easier)
    const pentId = PENT_IDS.includes(failedItem.scaleId)
      ? (failedItem.scaleId === 'maj_pent' ? 'min_pent' : 'maj_pent')
      : 'maj_pent';
    drills.push({
      scaleId: pentId,
      rootIdx: failedItem.rootIdx,
      startFret: failedItem.startFret,
      dir: params.dir || 'up'
    });

    return drills;
  },

  pickScaffold(item, weakCluster, params) {
    if (!weakCluster) return [];

    if (weakCluster.startsWith('scale_')) {
      const scaleId = weakCluster.slice(6);
      // Same root with the weak scale
      return [{ scaleId, rootIdx: item.rootIdx, startFret: item.startFret, dir: params.dir || 'up' }];
    }

    if (weakCluster.startsWith('root_')) {
      const noteName = weakCluster.slice(5);
      const rootIdx = NOTES.indexOf(noteName);
      // Same scale, different root
      if (rootIdx >= 0) {
        return [{ scaleId: item.scaleId, rootIdx, startFret: item.startFret, dir: params.dir || 'up' }];
      }
    }

    if (weakCluster.startsWith('zone_')) {
      const zoneToLandmark = { zone_0: 0, zone_3: 3, zone_5: 5, zone_7: 7, zone_9: 9, zone_12: 12 };
      const lm = zoneToLandmark[weakCluster];
      if (lm !== undefined) {
        const startFret = Math.max(1, lm);
        return [{ scaleId: item.scaleId, rootIdx: item.rootIdx, startFret, dir: params.dir || 'up' }];
      }
    }

    return [];
  },

  adjustParams(params, dir, mag) {
    const p = { ...params, scales: [...params.scales] };
    if (mag <= 0.3) return p;

    if (dir > 0) {
      // Level 1 -> 2: expand scales from pentatonics to all
      const hasPentOnly = p.scales.length <= 2 && p.scales.every(s => PENT_IDS.includes(s));
      if (hasPentOnly && p.naturalsOnly && p.dir === 'up') {
        p.scales = [...ALL_SCALE_IDS];
        return p;
      }
      // Level 2 -> 3: dir up -> updown
      if (p.dir === 'up' && p.naturalsOnly) {
        p.dir = 'updown';
        return p;
      }
      // Level 3 -> 4: naturalsOnly false
      if (p.naturalsOnly) {
        p.naturalsOnly = false;
        return p;
      }
      // Then timer: 0 -> 45 -> 15
      if (p.timer === 0) {
        p.timer = 45;
        return p;
      }
      if (p.timer > 15) {
        p.timer = 15;
        return p;
      }
    } else {
      // Reverse: timer 15 -> 45 -> 0 -> naturalsOnly true -> dir up -> scales pentatonics
      if (p.timer > 0 && p.timer <= 15) {
        p.timer = 45;
        return p;
      }
      if (p.timer > 0) {
        p.timer = 0;
        return p;
      }
      if (!p.naturalsOnly) {
        p.naturalsOnly = true;
        return p;
      }
      if (p.dir === 'updown') {
        p.dir = 'up';
        return p;
      }
      const hasFull = p.scales.some(s => !PENT_IDS.includes(s));
      if (hasFull) {
        p.scales = [...PENT_IDS];
        return p;
      }
    }

    return p;
  }
};
