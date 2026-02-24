import { NOTES } from '$lib/constants/music.js';

export const MAJOR_IV = [0,2,4,5,7,9,11];
export const MINOR_IV = [0,2,3,5,7,8,10];
export const MAJOR_Q  = ['','m','m','','','m','dim'];
export const MINOR_Q  = ['m','dim','','m','m','',''];
export const MAJOR_RN = ['I','ii','iii','IV','V','vi','vii\u00b0'];
export const MINOR_RN = ['i','ii\u00b0','III','iv','v','VI','VII'];

export const PROG_3 = [[0,3,4],[0,4,3],[0,3,0],[0,4,0],[0,5,3],[0,5,4]];
export const PROG_4 = [[0,4,5,3],[0,5,3,4],[0,3,4,3],[0,3,0,4],[0,4,3,0],[0,3,4,0],[4,3,5,0],[0,0,3,4]];

export const progressionNamerConfig = {
  initialParams: { scales: ['major'], progLen: 3, timer: 0 },

  itemKey(item) {
    return item.mode + '_' + item.rootIdx + '_' + item.scaleType + '_' + item.progIdx;
  },

  itemClusters(item) {
    const lenCluster = item.progIdx < PROG_3.length ? 'len_3' : 'len_4';
    return [
      'scale_' + item.scaleType,
      'mode_' + item.mode,
      lenCluster
    ];
  },

  itemFromKey(key, params) {
    const parts = key.split('_');
    // key format: mode_rootIdx_scaleType_progIdx
    // mode is 'name' or 'chords'
    const mode = parts[0];
    const rootIdx = parseInt(parts[1], 10);
    const progIdx = parseInt(parts[parts.length - 1], 10);
    const scaleType = parts.slice(2, parts.length - 1).join('_');
    return { rootIdx, scaleType, progIdx, mode };
  },

  genRandom(params, lastItem) {
    const rootIdx = Math.floor(Math.random() * 12);
    const scaleType = params.scales[Math.floor(Math.random() * params.scales.length)];
    const pool = params.progLen === 3 ? PROG_3 : PROG_4;
    const progIdx = params.progLen === 3
      ? Math.floor(Math.random() * PROG_3.length)
      : PROG_3.length + Math.floor(Math.random() * PROG_4.length);
    const mode = Math.random() < 0.5 ? 'name' : 'chords';
    return { rootIdx, scaleType, progIdx, mode };
  },

  genFromCluster(clusterId, params, lastItem) {
    if (clusterId.startsWith('scale_')) {
      const scaleType = clusterId.slice(6);
      if (params.scales.includes(scaleType)) {
        const rootIdx = Math.floor(Math.random() * 12);
        const pool = params.progLen === 3 ? PROG_3 : PROG_4;
        const progIdx = params.progLen === 3
          ? Math.floor(Math.random() * PROG_3.length)
          : PROG_3.length + Math.floor(Math.random() * PROG_4.length);
        const mode = Math.random() < 0.5 ? 'name' : 'chords';
        return { rootIdx, scaleType, progIdx, mode };
      }
    }

    if (clusterId.startsWith('mode_')) {
      const mode = clusterId.slice(5);
      const rootIdx = Math.floor(Math.random() * 12);
      const scaleType = params.scales[Math.floor(Math.random() * params.scales.length)];
      const pool = params.progLen === 3 ? PROG_3 : PROG_4;
      const progIdx = params.progLen === 3
        ? Math.floor(Math.random() * PROG_3.length)
        : PROG_3.length + Math.floor(Math.random() * PROG_4.length);
      return { rootIdx, scaleType, progIdx, mode };
    }

    if (clusterId.startsWith('len_')) {
      const len = parseInt(clusterId.slice(4), 10);
      const progIdx = len === 3
        ? Math.floor(Math.random() * PROG_3.length)
        : PROG_3.length + Math.floor(Math.random() * PROG_4.length);
      const rootIdx = Math.floor(Math.random() * 12);
      const scaleType = params.scales[Math.floor(Math.random() * params.scales.length)];
      const mode = Math.random() < 0.5 ? 'name' : 'chords';
      return { rootIdx, scaleType, progIdx, mode };
    }

    return this.genRandom(params, lastItem);
  },

  microDrill(failedItem, params) {
    const { rootIdx, scaleType, mode } = failedItem;

    // 1. Same key + easy prog (index 0 = I-IV-V)
    const drill1 = { rootIdx, scaleType, progIdx: 0, mode };

    // 2. Same prog in a different key
    let newRootIdx;
    do {
      newRootIdx = Math.floor(Math.random() * 12);
    } while (newRootIdx === rootIdx);
    const drill2 = { rootIdx: newRootIdx, scaleType, progIdx: failedItem.progIdx, mode };

    return [drill1, drill2];
  },

  pickScaffold(item, weakCluster, params) {
    if (!weakCluster) return [];

    if (weakCluster.startsWith('scale_')) {
      // Same prog in other scale
      const weakScale = weakCluster.slice(6);
      const otherScale = weakScale === 'major' ? 'natural_min' : 'major';
      if (params.scales.includes(otherScale)) {
        return [{ rootIdx: item.rootIdx, scaleType: otherScale, progIdx: item.progIdx, mode: item.mode }];
      }
      return [];
    }

    if (weakCluster.startsWith('mode_')) {
      // Opposite mode
      const otherMode = item.mode === 'name' ? 'chords' : 'name';
      return [{ rootIdx: item.rootIdx, scaleType: item.scaleType, progIdx: item.progIdx, mode: otherMode }];
    }

    if (weakCluster.startsWith('len_')) {
      // A prog from that length
      const len = parseInt(weakCluster.slice(4), 10);
      const progIdx = len === 3
        ? Math.floor(Math.random() * PROG_3.length)
        : PROG_3.length + Math.floor(Math.random() * PROG_4.length);
      return [{ rootIdx: item.rootIdx, scaleType: item.scaleType, progIdx, mode: item.mode }];
    }

    return [];
  },

  adjustParams(params, dir, mag) {
    const p = structuredClone(params);
    if (mag <= 0.3) return p;

    // Escalation levels:
    // Level 1: scales ['major'], progLen 3, timer 0
    // Level 2: scales ['major','natural_min'], progLen 3, timer 0
    // Level 3: scales ['major','natural_min'], progLen 4, timer 0
    // Then timer: 0 -> 15 -> 10

    const hasMinor = p.scales.includes('natural_min');

    if (dir > 0) {
      // Harder
      if (!hasMinor) {
        p.scales = ['major', 'natural_min'];
      } else if (p.progLen === 3) {
        p.progLen = 4;
      } else if (p.timer === 0) {
        p.timer = 15;
      } else if (p.timer > 10) {
        p.timer = 10;
      }
    } else {
      // Easier
      if (p.timer > 0 && p.timer <= 10) {
        p.timer = 15;
      } else if (p.timer > 0) {
        p.timer = 0;
      } else if (p.progLen === 4) {
        p.progLen = 3;
      } else if (hasMinor) {
        p.scales = ['major'];
      }
    }

    return p;
  }
};
