import { FRETBOARD_LAYOUT, drawBoard } from '$lib/music/fretboard.js';

/**
 * Renders a sequence fretboard (for scale/mode exercises) showing
 * which notes have been played, the current note, and upcoming notes.
 */
export function renderSeqFB(seq, currentIdx, startFret) {
  const center = startFret + 2;
  let sf = Math.max(0, center - Math.floor(FRETBOARD_LAYOUT.VISIBLE_FRETS / 2));
  if (sf + FRETBOARD_LAYOUT.VISIBLE_FRETS > 22) sf = Math.max(0, 22 - FRETBOARD_LAYOUT.VISIBLE_FRETS);
  return drawBoard(sf, ({ fretLeft, topMargin, STRING_HEIGHT, FRET_WIDTH, DOT_RADIUS, startFret, VISIBLE_FRETS }) => {
    const uniqueNotes = [...new Map(seq.map(n => [`${n.str}-${n.fret}`, n])).values()];
    let d = '';
    for (const n of uniqueNotes) {
      const tfr = n.fret - startFret;
      if (tfr < 0 || tfr > VISIBLE_FRETS) continue;
      const cy = topMargin + (5 - n.str) * STRING_HEIGHT + STRING_HEIGHT / 2;
      const cx = n.fret === 0 ? fretLeft + DOT_RADIUS * 0.2 : fretLeft + (tfr - 1) * FRET_WIDTH + FRET_WIDTH / 2;
      const seqIdx = seq.findIndex(sn => sn.str === n.str && sn.fret === n.fret);
      const lastIdx = seq.findLastIndex(sn => sn.str === n.str && sn.fret === n.fret);
      let col, opacity;
      if (seqIdx <= currentIdx && lastIdx <= currentIdx) { col = '#4ECB71'; opacity = 0.4; }
      else if (seqIdx === currentIdx || lastIdx === currentIdx) { col = '#4ECB71'; opacity = 1.0; }
      else { col = '#58A6FF'; opacity = 0.7; }
      d += `<circle cx="${cx}" cy="${cy}" r="${DOT_RADIUS * 1.3}" fill="${col}" opacity="${opacity * 0.15}"/>`;
      d += `<circle cx="${cx}" cy="${cy}" r="${DOT_RADIUS}" fill="${col}" opacity="${opacity}"/>`;
      const fs = n.note.length > 1 ? DOT_RADIUS * 0.8 : DOT_RADIUS;
      d += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="${fs}" font-weight="bold" font-family="JetBrains Mono">${n.note}</text>`;
    }
    return d;
  });
}
