import { NOTES, CHORD_TYPES } from '$lib/constants/music.js';
import { NT_NATURAL, noteAt, BASE_MIDI, LANDMARKS, nearestLandmark, landmarkZone } from '$lib/music/fretboard.js';

function mapToneToIdx(toneLbl, ct) {
  for (let i = 0; i < ct.fm.length; i++) {
    const f = ct.fm[i];
    if (f === toneLbl) return i;
    if (toneLbl === '3' && (f === '3' || f === '\u266d3')) return i;
    if (toneLbl === '7' && (f === '7' || f === '\u266d7')) return i;
  }
  return -1;
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function buildItem(root, ct, toneIdx, pos) {
  const ri = NOTES.indexOf(root);
  const semi = ct.iv[toneIdx];
  const targetNote = NOTES[(ri + semi) % 12];
  return { root, ctId: ct.id, toneLabel: ct.fm[toneIdx], targetNote, pos };
}

function candidates(root, ct, toneIdx, maxFret) {
  const ri = NOTES.indexOf(root);
  const semi = ct.iv[toneIdx];
  const targetNote = NOTES[(ri + semi) % 12];
  const cands = [];
  for (let s = 0; s < 6; s++)
    for (let f = 0; f <= maxFret; f++)
      if (noteAt(s, f) === targetNote)
        cands.push({ note: targetNote, str: s, fret: f, midi: BASE_MIDI[s] + f });
  return cands;
}

export const chordToneConfig = {
  initialParams: { maxFret: 5, naturalsOnly: true, timer: 0, types: ['maj', 'min'], tones: ['R', '3', '5'] },

  itemKey(item) {
    return item.root + '_' + item.ctId + '_' + item.toneLabel + '_s' + item.pos.str + 'f' + item.pos.fret;
  },

  itemClusters(item) {
    const clusters = [
      'type_' + item.ctId,
      'tone_' + item.toneLabel,
      'str_' + item.pos.str,
      'note_' + item.targetNote,
      landmarkZone(item.pos.fret)
    ];
    if (LANDMARKS.includes(item.pos.fret)) clusters.push('landmark');
    return clusters;
  },

  itemFromKey(key, params) {
    // key format: root_ctId_toneLabel_sPOSfFRET
    const m = key.match(/^(.+?)_(.+?)_(.+?)_s(\d+)f(\d+)$/);
    const root = m[1];
    const ctId = m[2];
    const toneLabel = m[3];
    const str = parseInt(m[4], 10);
    const fret = parseInt(m[5], 10);
    const ct = CHORD_TYPES.find(c => c.id === ctId);
    const ri = NOTES.indexOf(root);
    const toneIdx = ct.fm.indexOf(toneLabel);
    const semi = ct.iv[toneIdx];
    const targetNote = NOTES[(ri + semi) % 12];
    return { root, ctId, toneLabel, targetNote, pos: { note: targetNote, str, fret, midi: BASE_MIDI[str] + fret } };
  },

  genRandom(params, lastItem) {
    const useLandmark = Math.random() < 0.4;
    const allowedTypes = CHORD_TYPES.filter(ct => params.types.includes(ct.id));
    const roots = params.naturalsOnly ? NT_NATURAL : NOTES;

    for (let attempt = 0; attempt < 50; attempt++) {
      const ct = pick(allowedTypes);
      const root = pick(roots);
      const toneLbl = pick(params.tones);
      const toneIdx = mapToneToIdx(toneLbl, ct);
      if (toneIdx === -1) continue;

      let cands = candidates(root, ct, toneIdx, params.maxFret);
      if (cands.length === 0) continue;

      if (useLandmark) {
        const lmCands = cands.filter(c => LANDMARKS.includes(c.fret));
        if (lmCands.length > 0) cands = lmCands;
      }

      const pos = pick(cands);
      const item = buildItem(root, ct, toneIdx, pos);

      if (lastItem && item.root === lastItem.root && item.ctId === lastItem.ctId && item.toneLabel === lastItem.toneLabel && item.pos.str === lastItem.pos.str) continue;

      return item;
    }

    // Fallback
    const ct = pick(allowedTypes);
    const root = pick(roots);
    const toneIdx = 0;
    const cands = candidates(root, ct, toneIdx, params.maxFret);
    const pos = cands.length > 0 ? pick(cands) : { note: root, str: 0, fret: 0, midi: BASE_MIDI[0] };
    return buildItem(root, ct, toneIdx, pos);
  },

  genFromCluster(clusterId, params, lastItem) {
    const allowedTypes = CHORD_TYPES.filter(ct => params.types.includes(ct.id));
    const roots = params.naturalsOnly ? NT_NATURAL : NOTES;
    const cands = [];

    for (const ct of allowedTypes) {
      for (const root of roots) {
        for (const toneLbl of params.tones) {
          const toneIdx = mapToneToIdx(toneLbl, ct);
          if (toneIdx === -1) continue;
          const positions = candidates(root, ct, toneIdx, params.maxFret);
          for (const pos of positions) {
            let match = false;
            if (clusterId.startsWith('type_')) { match = ct.id === clusterId.slice(5); }
            else if (clusterId.startsWith('tone_')) { match = ct.fm[toneIdx] === clusterId.slice(5); }
            else if (clusterId.startsWith('str_')) { match = pos.str === parseInt(clusterId.slice(4), 10); }
            else if (clusterId.startsWith('note_')) { match = pos.note === clusterId.slice(5); }
            else if (clusterId.startsWith('zone_')) { match = landmarkZone(pos.fret) === clusterId; }
            else if (clusterId === 'landmark') { match = LANDMARKS.includes(pos.fret); }

            if (match) cands.push(buildItem(root, ct, toneIdx, pos));
          }
        }
      }
    }

    if (cands.length === 0) return this.genRandom(params, lastItem);

    if (lastItem && cands.length > 1) {
      const filtered = cands.filter(c => !(c.root === lastItem.root && c.ctId === lastItem.ctId && c.toneLabel === lastItem.toneLabel && c.pos.str === lastItem.pos.str));
      if (filtered.length > 0) return pick(filtered);
    }
    return pick(cands);
  },

  microDrill(failedItem, params) {
    const { root, ctId, toneLabel, pos } = failedItem;
    const ct = CHORD_TYPES.find(c => c.id === ctId);
    const toneIdx = ct.fm.indexOf(toneLabel);
    if (toneIdx === -1) return [];

    const s = pos.str;

    // 1. Same chord + root tone at nearest landmark fret
    const lmFret = nearestLandmark(pos.fret);
    const lmCands = candidates(root, ct, toneIdx, params.maxFret).filter(c => c.str === s && c.fret === lmFret);
    let drill1;
    if (lmCands.length > 0) {
      drill1 = buildItem(root, ct, toneIdx, lmCands[0]);
    } else {
      // Fallback: same tone on same string, nearest landmark
      const allCands = candidates(root, ct, toneIdx, params.maxFret).filter(c => c.str === s);
      drill1 = allCands.length > 0 ? buildItem(root, ct, toneIdx, pick(allCands)) : failedItem;
    }

    // 2. Same tone at a different landmark
    const otherLandmarks = LANDMARKS.filter(l => l !== lmFret && l <= params.maxFret);
    let drill2;
    if (otherLandmarks.length > 0) {
      const lm2Fret = otherLandmarks.sort((a, b) => Math.abs(a - pos.fret) - Math.abs(b - pos.fret))[0];
      const lm2Cands = candidates(root, ct, toneIdx, params.maxFret).filter(c => c.fret === lm2Fret);
      if (lm2Cands.length > 0) {
        drill2 = buildItem(root, ct, toneIdx, pick(lm2Cands));
      } else {
        const anyCands = candidates(root, ct, toneIdx, params.maxFret).filter(c => c.str !== s);
        drill2 = anyCands.length > 0 ? buildItem(root, ct, toneIdx, pick(anyCands)) : failedItem;
      }
    } else {
      drill2 = failedItem;
    }

    return [drill1, drill2];
  },

  pickScaffold(item, weakCluster, params) {
    if (!weakCluster) return [];
    const allowedTypes = CHORD_TYPES.filter(ct => params.types.includes(ct.id));

    if (weakCluster.startsWith('type_')) {
      // Same root with contrasting type
      const contrastId = weakCluster.slice(5);
      const contrastCt = CHORD_TYPES.find(c => c.id === contrastId);
      if (!contrastCt || contrastCt.id === item.ctId) return [];
      const toneLbl = pick(params.tones);
      const toneIdx = mapToneToIdx(toneLbl, contrastCt);
      if (toneIdx === -1) return [];
      const cands = candidates(item.root, contrastCt, toneIdx, params.maxFret);
      if (cands.length > 0) return [buildItem(item.root, contrastCt, toneIdx, pick(cands))];
    }

    if (weakCluster.startsWith('tone_')) {
      // Different tone, same chord
      const ct = CHORD_TYPES.find(c => c.id === item.ctId);
      if (!ct) return [];
      const otherTones = params.tones.filter(t => {
        const idx = mapToneToIdx(t, ct);
        return idx !== -1 && ct.fm[idx] !== item.toneLabel;
      });
      if (otherTones.length === 0) return [];
      const toneLbl = pick(otherTones);
      const toneIdx = mapToneToIdx(toneLbl, ct);
      const cands = candidates(item.root, ct, toneIdx, params.maxFret);
      if (cands.length > 0) return [buildItem(item.root, ct, toneIdx, pick(cands))];
    }

    if (weakCluster.startsWith('zone_')) {
      // Pick from that zone
      const zoneToLandmark = { zone_0: 0, zone_3: 3, zone_5: 5, zone_7: 7, zone_9: 9, zone_12: 12 };
      const lmFret = zoneToLandmark[weakCluster];
      if (lmFret === undefined || lmFret > params.maxFret) return [];
      const ct = CHORD_TYPES.find(c => c.id === item.ctId);
      if (!ct) return [];
      const toneIdx = ct.fm.indexOf(item.toneLabel);
      if (toneIdx === -1) return [];
      const cands = candidates(item.root, ct, toneIdx, params.maxFret)
        .filter(c => landmarkZone(c.fret) === weakCluster);
      if (cands.length > 0) return [buildItem(item.root, ct, toneIdx, pick(cands))];
    }

    return [];
  },

  adjustParams(params, dir, mag) {
    const p = { ...params, types: [...params.types], tones: [...params.tones] };
    if (mag <= 0.3) return p;

    const typeSteps = [['maj', 'min'], ['maj', 'min', '7', 'maj7', 'm7']];
    const toneSteps = [['R', '3', '5'], ['R', '3', '5', '7']];
    const fretSteps = [5, 7, 9, 12];

    if (dir > 0) {
      // Expand types
      if (p.types.length <= 2) {
        p.types = [...typeSteps[1]];
        p.tones = [...toneSteps[1]];
        return p;
      }
      // Increase maxFret
      const curIdx = fretSteps.indexOf(p.maxFret);
      if (curIdx >= 0 && curIdx < fretSteps.length - 1) {
        const jump = mag > 0.6 ? 2 : 1;
        p.maxFret = fretSteps[Math.min(curIdx + jump, fretSteps.length - 1)];
        return p;
      } else if (p.maxFret < 12) {
        const next = fretSteps.find(s => s > p.maxFret);
        if (next) { p.maxFret = next; return p; }
      }
      // Remove naturals restriction
      if (p.naturalsOnly) {
        p.naturalsOnly = false;
        return p;
      }
      // Add timer
      if (p.timer === 0) {
        p.timer = 12;
        return p;
      }
    } else {
      // Reverse: remove timer first
      if (p.timer > 0) {
        p.timer = 0;
        return p;
      }
      // Restore naturals only
      if (!p.naturalsOnly) {
        p.naturalsOnly = true;
        return p;
      }
      // Decrease maxFret
      const curIdx = fretSteps.indexOf(p.maxFret);
      if (curIdx > 0) {
        p.maxFret = fretSteps[curIdx - 1];
        return p;
      } else if (p.maxFret > fretSteps[0]) {
        const prev = [...fretSteps].reverse().find(s => s < p.maxFret);
        if (prev) { p.maxFret = prev; return p; }
      }
      // Shrink types/tones
      if (p.types.length > 2) {
        p.types = [...typeSteps[0]];
        p.tones = [...toneSteps[0]];
        return p;
      }
    }

    return p;
  }
};
