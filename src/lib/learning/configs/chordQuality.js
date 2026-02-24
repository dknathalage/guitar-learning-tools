import { NOTES, CHORD_TYPES } from '$lib/constants/music.js';

export const chordQualityConfig = {
  initialParams: { types: ['maj', 'min'], timer: 0 },

  itemKey(item) {
    return item.ctId + '_' + item.rootSemi;
  },

  itemClusters(item) {
    const ct = CHORD_TYPES.find(c => c.id === item.ctId);
    const clusters = ['type_' + item.ctId];
    if (ct) {
      if (ct.iv.length <= 3) clusters.push('triads');
      else clusters.push('sevenths');
    }
    if (item.ctId === 'sus2' || item.ctId === 'sus4') clusters.push('sus');
    return clusters;
  },

  itemFromKey(key, params) {
    const idx = key.lastIndexOf('_');
    const ctId = key.slice(0, idx);
    const rootSemi = parseInt(key.slice(idx + 1), 10);
    return { ctId, rootSemi };
  },

  genRandom(params, lastItem) {
    const ctId = params.types[Math.floor(Math.random() * params.types.length)];
    const rootSemi = Math.floor(Math.random() * 13) - 9;
    return { ctId, rootSemi };
  },

  genFromCluster(clusterId, params, lastItem) {
    if (clusterId.startsWith('type_')) {
      const ctId = clusterId.slice(5);
      if (params.types.includes(ctId)) {
        const rootSemi = Math.floor(Math.random() * 13) - 9;
        return { ctId, rootSemi };
      }
    }

    if (clusterId === 'triads' || clusterId === 'sevenths' || clusterId === 'sus') {
      let filtered;
      if (clusterId === 'triads') {
        filtered = CHORD_TYPES.filter(c => params.types.includes(c.id) && c.iv.length <= 3);
      } else if (clusterId === 'sevenths') {
        filtered = CHORD_TYPES.filter(c => params.types.includes(c.id) && c.iv.length > 3);
      } else {
        filtered = CHORD_TYPES.filter(c => params.types.includes(c.id) && (c.id === 'sus2' || c.id === 'sus4'));
      }
      if (filtered.length > 0) {
        const ct = filtered[Math.floor(Math.random() * filtered.length)];
        const rootSemi = Math.floor(Math.random() * 13) - 9;
        return { ctId: ct.id, rootSemi };
      }
    }

    return this.genRandom(params, lastItem);
  },

  microDrill(failedItem, params) {
    const { rootSemi, ctId } = failedItem;

    // 1. Same root, major (easy chord)
    const drill1 = { ctId: 'maj', rootSemi };

    // 2. Contrast
    let contrastId;
    if (ctId === 'maj') contrastId = 'min';
    else if (ctId === 'min') contrastId = 'maj';
    else if (ctId === '7' || ctId === 'maj7') contrastId = 'maj';
    else if (ctId === 'm7') contrastId = 'min';
    else contrastId = 'maj';

    const drill2 = { ctId: contrastId, rootSemi };

    return [drill1, drill2];
  },

  pickScaffold(item, weakCluster, params) {
    if (!weakCluster) return [];

    if (weakCluster.startsWith('type_')) {
      // Contrast quality, same root
      const failedId = item.ctId;
      let contrastId;
      if (failedId === 'maj') contrastId = 'min';
      else if (failedId === 'min') contrastId = 'maj';
      else if (failedId === '7' || failedId === 'maj7' || failedId === 'm7') {
        contrastId = failedId === 'm7' ? 'min' : 'maj';
      } else {
        contrastId = 'maj';
      }
      if (params.types.includes(contrastId)) {
        return [{ ctId: contrastId, rootSemi: item.rootSemi }];
      }
      return [];
    }

    if (weakCluster === 'triads' || weakCluster === 'sevenths') {
      // Switch between triads and sevenths
      const isTriad = weakCluster === 'triads';
      const opposite = CHORD_TYPES.filter(c =>
        params.types.includes(c.id) && (isTriad ? c.iv.length > 3 : c.iv.length <= 3)
      );
      if (opposite.length > 0) {
        const ct = opposite[Math.floor(Math.random() * opposite.length)];
        return [{ ctId: ct.id, rootSemi: item.rootSemi }];
      }
      return [];
    }

    return [];
  },

  adjustParams(params, dir, mag) {
    const p = structuredClone(params);
    if (mag <= 0.3) return p;

    // Level 1: ['maj','min'], timer 0
    // Level 2: ['maj','min','dim','aug','7'], timer 0
    // Level 3: all 9 types, timer 0
    // Then timer: 0 -> 15 -> 10

    const level1 = ['maj', 'min'];
    const level2 = ['maj', 'min', 'dim', 'aug', '7'];
    const level3 = ['maj', 'min', 'dim', 'aug', '7', 'maj7', 'm7', 'sus2', 'sus4'];

    const currentLevel = p.types.length <= 2 ? 1 : p.types.length <= 5 ? 2 : 3;

    if (dir > 0) {
      // Harder
      if (currentLevel === 1) { p.types = level2; }
      else if (currentLevel === 2) { p.types = level3; }
      else if (p.timer === 0) { p.timer = 15; }
      else if (p.timer > 10) { p.timer = 10; }
    } else {
      // Easier
      if (p.timer > 0 && p.timer <= 10) { p.timer = 15; }
      else if (p.timer > 0) { p.timer = 0; }
      else if (currentLevel === 3) { p.types = level2; }
      else if (currentLevel === 2) { p.types = level1; }
    }

    return p;
  }
};
