import { NOTES } from '$lib/constants/music.js';
import { STD_SHAPES, adaptShape, getBf } from '$lib/music/chords.js';
import { landmarkZone } from '$lib/music/fretboard.js';

export const chordPlayerConfig = {
  initialParams: { shapes: ['e', 'a', 'd'], types: ['maj', 'min'], timer: 0 },

  itemKey(item) {
    return item.shapeId + '_' + item.typeId + '_' + item.rootIdx;
  },

  itemClusters(item) {
    const sh = STD_SHAPES.find(s => s.id === item.shapeId);
    const adapted = adaptShape(sh);
    const bf = getBf(adapted, item.rootIdx);
    return [
      'shape_' + item.shapeId,
      'type_' + item.typeId,
      'root_' + NOTES[item.rootIdx],
      landmarkZone(bf)
    ];
  },

  itemFromKey(key, params) {
    const parts = key.split('_');
    const shapeId = parts[0];
    const rootIdx = parseInt(parts[parts.length - 1], 10);
    const typeId = parts.slice(1, -1).join('_');
    return { shapeId, typeId, rootIdx };
  },

  genRandom(params, lastItem) {
    const allowedShapes = STD_SHAPES.filter(s => params.shapes.includes(s.id));
    const sh = allowedShapes[Math.floor(Math.random() * allowedShapes.length)];
    const typeId = params.types[Math.floor(Math.random() * params.types.length)];
    const rootIdx = Math.floor(Math.random() * 12);
    return { shapeId: sh.id, typeId, rootIdx };
  },

  genFromCluster(clusterId, params, lastItem) {
    if (clusterId.startsWith('shape_')) {
      const shapeId = clusterId.slice(6);
      if (params.shapes.includes(shapeId)) {
        const typeId = params.types[Math.floor(Math.random() * params.types.length)];
        const rootIdx = Math.floor(Math.random() * 12);
        return { shapeId, typeId, rootIdx };
      }
    }

    if (clusterId.startsWith('type_')) {
      const typeId = clusterId.slice(5);
      if (params.types.includes(typeId)) {
        const allowedShapes = STD_SHAPES.filter(s => params.shapes.includes(s.id));
        const sh = allowedShapes[Math.floor(Math.random() * allowedShapes.length)];
        const rootIdx = Math.floor(Math.random() * 12);
        return { shapeId: sh.id, typeId, rootIdx };
      }
    }

    if (clusterId.startsWith('root_')) {
      const rootName = clusterId.slice(5);
      const rootIdx = NOTES.indexOf(rootName);
      if (rootIdx >= 0) {
        const allowedShapes = STD_SHAPES.filter(s => params.shapes.includes(s.id));
        const sh = allowedShapes[Math.floor(Math.random() * allowedShapes.length)];
        const typeId = params.types[Math.floor(Math.random() * params.types.length)];
        return { shapeId: sh.id, typeId, rootIdx };
      }
    }

    if (clusterId.startsWith('zone_')) {
      const allowedShapes = STD_SHAPES.filter(s => params.shapes.includes(s.id));
      const sh = allowedShapes[Math.floor(Math.random() * allowedShapes.length)];
      const typeId = params.types[Math.floor(Math.random() * params.types.length)];
      const rootIdx = Math.floor(Math.random() * 12);
      return { shapeId: sh.id, typeId, rootIdx };
    }

    return this.genRandom(params, lastItem);
  },

  microDrill(failedItem, params) {
    // 1. Same shape, major type (simplest quality)
    const drill1 = { shapeId: failedItem.shapeId, typeId: 'maj', rootIdx: failedItem.rootIdx };
    // 2. Same type, E shape (easiest shape)
    const drill2 = { shapeId: 'e', typeId: failedItem.typeId, rootIdx: failedItem.rootIdx };
    return [drill1, drill2];
  },

  pickScaffold(item, weakCluster, params) {
    if (!weakCluster) return [];

    if (weakCluster.startsWith('shape_')) {
      // Same root + type, different shape
      const otherShapes = params.shapes.filter(id => id !== item.shapeId);
      if (otherShapes.length > 0) {
        const newShapeId = otherShapes[Math.floor(Math.random() * otherShapes.length)];
        return [{ shapeId: newShapeId, typeId: item.typeId, rootIdx: item.rootIdx }];
      }
      return [];
    }

    if (weakCluster.startsWith('type_')) {
      // Same shape + root, different type
      const otherTypes = params.types.filter(id => id !== item.typeId);
      if (otherTypes.length > 0) {
        const newTypeId = otherTypes[Math.floor(Math.random() * otherTypes.length)];
        return [{ shapeId: item.shapeId, typeId: newTypeId, rootIdx: item.rootIdx }];
      }
      return [];
    }

    return [];
  },

  adjustParams(params, dir, mag) {
    const p = structuredClone(params);
    if (mag <= 0.3) return p;

    // Difficulty levels:
    // Level 1: shapes ['e','a','d'], types ['maj','min'], timer 0
    // Level 2: shapes all CAGED, types ['maj','min'], timer 0
    // Level 3: all shapes, types ['maj','min','7','maj7','m7'], timer 0
    // Then timer: 0 -> 30 -> 15

    const level1Shapes = ['e', 'a', 'd'];
    const level2Shapes = ['e', 'a', 'd', 'c', 'g'];
    const level1Types = ['maj', 'min'];
    const level3Types = ['maj', 'min', '7', 'maj7', 'm7'];

    const shapeLevel = p.shapes.length <= 3 ? 1 : 2;
    const typeLevel = p.types.length <= 2 ? 1 : 2;

    if (dir > 0) {
      // Harder
      if (shapeLevel === 1) { p.shapes = level2Shapes; }
      else if (typeLevel === 1) { p.types = level3Types; }
      else if (p.timer === 0) { p.timer = 30; }
      else if (p.timer > 15) { p.timer = 15; }
    } else {
      // Easier
      if (p.timer > 0 && p.timer <= 15) { p.timer = 30; }
      else if (p.timer > 0) { p.timer = 0; }
      else if (typeLevel === 2) { p.types = level1Types; }
      else if (shapeLevel === 2) { p.shapes = level1Shapes; }
    }

    return p;
  }
};
