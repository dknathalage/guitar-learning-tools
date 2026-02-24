import { INTERVALS } from '$lib/constants/music.js';

const ALL_SEMI = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function abbrForSemi(semi) {
  const iv = INTERVALS.find(i => i.semi === semi);
  return iv ? iv.abbr : String(semi);
}

export const intervalRecognitionConfig = {
  initialParams: { intervals: [3, 4, 5, 7, 12], dir: 'asc', timer: 0 },

  itemKey(item) {
    return item.intvSemi + '_' + item.rootSemi + '_' + (item.ascending ? 'a' : 'd');
  },

  itemClusters(item) {
    const clusters = [
      'intv_' + abbrForSemi(item.intvSemi),
      item.intvSemi <= 4 ? 'size_small' : item.intvSemi <= 8 ? 'size_med' : 'size_large',
      item.ascending ? 'dir_asc' : 'dir_desc'
    ];
    return clusters;
  },

  itemFromKey(key, params) {
    const parts = key.split('_');
    const intvSemi = parseInt(parts[0], 10);
    const rootSemi = parseInt(parts[1], 10);
    const ascending = parts[2] === 'a';
    return { intvSemi, rootSemi, ascending };
  },

  genRandom(params, lastItem) {
    const pool = Array.isArray(params.intervals) ? params.intervals : ALL_SEMI;

    for (let attempt = 0; attempt < 50; attempt++) {
      const intvSemi = pool[Math.floor(Math.random() * pool.length)];
      const rootSemi = Math.floor(Math.random() * 13) - 9;
      const ascending = params.dir === 'both' ? Math.random() < 0.5 : true;
      const item = { intvSemi, rootSemi, ascending };

      if (lastItem && item.intvSemi === lastItem.intvSemi && item.rootSemi === lastItem.rootSemi && item.ascending === lastItem.ascending) continue;

      return item;
    }

    // Fallback
    return { intvSemi: pool[0], rootSemi: 0, ascending: true };
  },

  genFromCluster(clusterId, params, lastItem) {
    const pool = Array.isArray(params.intervals) ? params.intervals : ALL_SEMI;

    if (clusterId.startsWith('intv_')) {
      const abbr = clusterId.slice(5);
      const iv = INTERVALS.find(i => i.abbr === abbr);
      if (iv && pool.includes(iv.semi)) {
        const rootSemi = Math.floor(Math.random() * 13) - 9;
        const ascending = params.dir === 'both' ? Math.random() < 0.5 : true;
        return { intvSemi: iv.semi, rootSemi, ascending };
      }
    }

    if (clusterId === 'size_small' || clusterId === 'size_med' || clusterId === 'size_large') {
      let range;
      if (clusterId === 'size_small') range = [1, 2, 3, 4];
      else if (clusterId === 'size_med') range = [5, 6, 7, 8];
      else range = [9, 10, 11, 12];

      const filtered = pool.filter(s => range.includes(s));
      if (filtered.length > 0) {
        const intvSemi = filtered[Math.floor(Math.random() * filtered.length)];
        const rootSemi = Math.floor(Math.random() * 13) - 9;
        const ascending = params.dir === 'both' ? Math.random() < 0.5 : true;
        return { intvSemi, rootSemi, ascending };
      }
    }

    if (clusterId === 'dir_asc') {
      const intvSemi = pool[Math.floor(Math.random() * pool.length)];
      const rootSemi = Math.floor(Math.random() * 13) - 9;
      return { intvSemi, rootSemi, ascending: true };
    }

    if (clusterId === 'dir_desc') {
      const intvSemi = pool[Math.floor(Math.random() * pool.length)];
      const rootSemi = Math.floor(Math.random() * 13) - 9;
      return { intvSemi, rootSemi, ascending: false };
    }

    return this.genRandom(params, lastItem);
  },

  microDrill(failedItem, params) {
    // 1. Same root + easy interval (P5, semi=7)
    const drill1 = { intvSemi: 7, rootSemi: failedItem.rootSemi, ascending: true };

    // 2. Same interval but ascending (if failed was descending)
    const drill2 = { intvSemi: failedItem.intvSemi, rootSemi: failedItem.rootSemi, ascending: true };

    return [drill1, drill2];
  },

  pickScaffold(item, weakCluster, params) {
    if (!weakCluster) return [];
    const pool = Array.isArray(params.intervals) ? params.intervals : ALL_SEMI;

    if (weakCluster.startsWith('intv_')) {
      // Pick next interval up (semi+1)
      const nextSemi = item.intvSemi < 12 ? item.intvSemi + 1 : 1;
      const iv = INTERVALS.find(i => i.semi === nextSemi);
      if (iv) {
        return [{ intvSemi: iv.semi, rootSemi: item.rootSemi, ascending: item.ascending }];
      }
    }

    if (weakCluster === 'size_small' || weakCluster === 'size_med' || weakCluster === 'size_large') {
      let range;
      if (weakCluster === 'size_small') range = [1, 2, 3, 4];
      else if (weakCluster === 'size_med') range = [5, 6, 7, 8];
      else range = [9, 10, 11, 12];

      const filtered = pool.filter(s => range.includes(s));
      if (filtered.length > 0) {
        const intvSemi = filtered[Math.floor(Math.random() * filtered.length)];
        return [{ intvSemi, rootSemi: item.rootSemi, ascending: item.ascending }];
      }
    }

    if (weakCluster === 'dir_asc') {
      return [{ intvSemi: item.intvSemi, rootSemi: item.rootSemi, ascending: true }];
    }

    if (weakCluster === 'dir_desc') {
      return [{ intvSemi: item.intvSemi, rootSemi: item.rootSemi, ascending: false }];
    }

    return [];
  },

  adjustParams(params, dir, mag) {
    const p = { ...params };
    if (mag <= 0.3) return p;

    // Level 1: intervals [3,4,5,7,12], dir 'asc', timer 0
    // Level 2: all 12 intervals, dir 'asc', timer 0
    // Level 3: all 12 intervals, dir 'both', timer 0
    // Then timer: 0 -> 15 -> 10
    // Reverse for dir < 0

    const isSubset = Array.isArray(p.intervals) && p.intervals.length < 12;

    if (dir > 0) {
      // Harder
      if (isSubset) {
        p.intervals = ALL_SEMI.slice();
      } else if (p.dir === 'asc') {
        p.dir = 'both';
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
      } else if (p.dir === 'both') {
        p.dir = 'asc';
      } else if (!isSubset) {
        p.intervals = [3, 4, 5, 7, 12];
      }
    }

    return p;
  }
};
