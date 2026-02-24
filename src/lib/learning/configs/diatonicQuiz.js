import { NOTES } from '$lib/constants/music.js';

export const diatonicQuizConfig = {
  initialParams: { scales: ['major'], use7ths: false, timer: 0 },

  itemKey(item) {
    return item.mode + '_' + item.rootIdx + '_' + item.scaleType + '_' + item.degree;
  },

  itemClusters(item) {
    return [
      'degree_' + item.degree,
      'scale_' + item.scaleType,
      'mode_' + item.mode
    ];
  },

  itemFromKey(key, params) {
    const parts = key.split('_');
    // key format: mode_rootIdx_scaleType_degree
    // mode is 'd2c' or 'c2n'
    const mode = parts[0];
    const rootIdx = parseInt(parts[1], 10);
    // scaleType may contain '_' (e.g. 'natural_min'), so rejoin middle parts
    const degree = parseInt(parts[parts.length - 1], 10);
    const scaleType = parts.slice(2, parts.length - 1).join('_');
    return { rootIdx, scaleType, degree, mode };
  },

  genRandom(params, lastItem) {
    const rootIdx = Math.floor(Math.random() * 12);
    const scaleType = params.scales[Math.floor(Math.random() * params.scales.length)];
    const degree = Math.floor(Math.random() * 7);
    const mode = Math.random() < 0.5 ? 'd2c' : 'c2n';
    return { rootIdx, scaleType, degree, mode };
  },

  genFromCluster(clusterId, params, lastItem) {
    if (clusterId.startsWith('degree_')) {
      const degree = parseInt(clusterId.slice(7), 10);
      const rootIdx = Math.floor(Math.random() * 12);
      const scaleType = params.scales[Math.floor(Math.random() * params.scales.length)];
      const mode = Math.random() < 0.5 ? 'd2c' : 'c2n';
      return { rootIdx, scaleType, degree, mode };
    }

    if (clusterId.startsWith('scale_')) {
      const scaleType = clusterId.slice(6);
      if (params.scales.includes(scaleType)) {
        const rootIdx = Math.floor(Math.random() * 12);
        const degree = Math.floor(Math.random() * 7);
        const mode = Math.random() < 0.5 ? 'd2c' : 'c2n';
        return { rootIdx, scaleType, degree, mode };
      }
    }

    if (clusterId.startsWith('mode_')) {
      const mode = clusterId.slice(5);
      const rootIdx = Math.floor(Math.random() * 12);
      const scaleType = params.scales[Math.floor(Math.random() * params.scales.length)];
      const degree = Math.floor(Math.random() * 7);
      return { rootIdx, scaleType, degree, mode };
    }

    return this.genRandom(params, lastItem);
  },

  microDrill(failedItem, params) {
    const { rootIdx, scaleType, mode } = failedItem;

    // 1. Same key + easy degree (0 = tonic)
    const drill1 = { rootIdx, scaleType, degree: 0, mode };

    // 2. Same degree in a different key
    let newRootIdx;
    do {
      newRootIdx = Math.floor(Math.random() * 12);
    } while (newRootIdx === rootIdx);
    const drill2 = { rootIdx: newRootIdx, scaleType, degree: failedItem.degree, mode };

    return [drill1, drill2];
  },

  pickScaffold(item, weakCluster, params) {
    if (!weakCluster) return [];

    if (weakCluster.startsWith('degree_')) {
      // Neighbor degree (+-1 mod 7)
      const weakDeg = parseInt(weakCluster.slice(7), 10);
      const neighborDeg = (weakDeg + (Math.random() < 0.5 ? 1 : 6)) % 7;
      return [{ rootIdx: item.rootIdx, scaleType: item.scaleType, degree: neighborDeg, mode: item.mode }];
    }

    if (weakCluster.startsWith('scale_')) {
      // Same degree in other scale
      const weakScale = weakCluster.slice(6);
      const otherScale = weakScale === 'major' ? 'natural_min' : 'major';
      if (params.scales.includes(otherScale)) {
        return [{ rootIdx: item.rootIdx, scaleType: otherScale, degree: item.degree, mode: item.mode }];
      }
      return [];
    }

    if (weakCluster.startsWith('mode_')) {
      // Opposite mode
      const otherMode = item.mode === 'd2c' ? 'c2n' : 'd2c';
      return [{ rootIdx: item.rootIdx, scaleType: item.scaleType, degree: item.degree, mode: otherMode }];
    }

    return [];
  },

  adjustParams(params, dir, mag) {
    const p = structuredClone(params);
    if (mag <= 0.3) return p;

    // Escalation levels:
    // Level 1: scales ['major'], use7ths false, timer 0
    // Level 2: scales ['major','natural_min'], use7ths false, timer 0
    // Level 3: scales ['major','natural_min'], use7ths true, timer 0
    // Then timer: 0 -> 15 -> 8

    const hasMinor = p.scales.includes('natural_min');
    const currentScaleLevel = hasMinor ? 2 : 1;

    if (dir > 0) {
      // Harder
      if (currentScaleLevel === 1) {
        p.scales = ['major', 'natural_min'];
      } else if (!p.use7ths) {
        p.use7ths = true;
      } else if (p.timer === 0) {
        p.timer = 15;
      } else if (p.timer > 8) {
        p.timer = 8;
      }
    } else {
      // Easier
      if (p.timer > 0 && p.timer <= 8) {
        p.timer = 15;
      } else if (p.timer > 0) {
        p.timer = 0;
      } else if (p.use7ths) {
        p.use7ths = false;
      } else if (currentScaleLevel === 2) {
        p.scales = ['major'];
      }
    }

    return p;
  }
};
