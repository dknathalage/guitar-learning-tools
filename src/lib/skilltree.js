export const CHAPTERS = [
  {
    id: 1, title: 'Fretboard', color: '#4ECB71', docsPath: 'docs/ch1-fretboard.md',
    deps: [],
    theory: [
      'Guitar fretboard is a logical 12-note repeating pattern across 6 strings',
      'Standard tuning: E-A-D-G-B-E with perfect 4ths (except G\u2013B = major 3rd)',
      'Each fret = one semitone (half step) in the chromatic scale',
      'Understanding fretboard geometry enables playing in any position'
    ],
    hints: [
      'Start with natural notes on strings 5+6 \u2014 these are root notes for barre chords.',
      'Aim for 80%+ on Note Find before moving on.'
    ],
    exercises: [
      { id: 'note-quiz',         name: 'Note Quiz',         path: '/exercises/note-quiz',         mic: false },
      { id: 'note-find',         name: 'Note Find',         path: '/exercises/note-find',         mic: true },
      { id: 'string-traversal',  name: 'String Traversal',  path: '/exercises/string-traversal',  mic: true }
    ]
  },
  {
    id: 2, title: 'Intervals', color: '#38BDF8', docsPath: 'docs/ch2-intervals.md',
    deps: [1],
    theory: [
      'Intervals are distances between notes measured in semitones',
      '13 intervals within one octave, each with a unique sound character',
      'Major/minor distinction (4 vs 3 semitones) is fundamental to music',
      'Every chord, scale, and melody is built from interval stacking'
    ],
    hints: [
      'Sing each interval as you play it \u2014 train your ear, not just your fingers.',
      'Learn minor 3rd vs major 3rd first \u2014 they define major vs minor.'
    ],
    exercises: [
      { id: 'interval-trainer', name: 'Interval Trainer', path: '/exercises/interval', mic: true }
    ]
  },
  {
    id: 3, title: 'Chords', color: '#F0A030', docsPath: 'docs/ch3-chords.md',
    deps: [2],
    theory: [
      'Chords = intervals stacked from a root note, not random shapes',
      'Triads: major (1-3-5), minor (1-\u266d3-5), dim (1-\u266d3-\u266d5), aug (1-3-#5)',
      'Seventh chords add a 7th: maj7, dom7, min7, min7\u266d5',
      'The 3rd determines major vs minor \u2014 one semitone difference'
    ],
    hints: [
      'Every chord is a formula \u2014 know the formula, build it anywhere.',
      'Use Chord Tone Find to hear individual tones within chords.'
    ],
    exercises: [
      { id: 'chord-tone', name: 'Chord Tone Find', path: '/exercises/chord-tone', mic: true }
    ]
  },
  {
    id: 4, title: 'CAGED', color: '#C084FC', docsPath: 'docs/ch4-caged.md',
    deps: [3],
    theory: [
      'Five shapes (C, A, G, E, D) tile the entire fretboard',
      'Each derives from a familiar open chord form',
      'Shapes connect in sequence: C \u2192 A \u2192 G \u2192 E \u2192 D \u2192 C\u2026',
      'Any chord root has 5 positions across the neck using CAGED'
    ],
    hints: [
      'Learn E and A shapes first \u2014 most common barre forms.',
      'Use the Visualizer to see how shapes connect across the neck.'
    ],
    exercises: [
      { id: 'caged-visualizer', name: 'CAGED Visualizer', path: '/caged',                  mic: false },
      { id: 'chord-player',     name: 'Chord Player',     path: '/exercises/chord-player',  mic: true }
    ]
  },
  {
    id: 5, title: 'Scales', color: '#F472B6', docsPath: 'docs/ch5-scales.md',
    deps: [4],
    theory: [
      'Scales = intervals played sequentially (melodic counterpart to chords)',
      'Major scale: W-W-H-W-W-W-H = 1-2-3-4-5-6-7',
      'Natural minor (Aeolian): 1-2-\u266d3-4-5-\u266d6-\u266d7',
      'Seven modes from rotating the major scale across root notes'
    ],
    hints: [
      'Play scales slowly with a metronome \u2014 speed comes from accuracy.',
      'Connect scale patterns to CAGED shapes you already know.'
    ],
    exercises: [
      { id: 'scale-runner',  name: 'Scale Runner',  path: '/exercises/scale-runner',   mic: true },
      { id: 'mode-trainer',  name: 'Mode Trainer',  path: '/exercises/mode-trainer',   mic: true }
    ]
  }
];

export const EDGES = [
  { from: 1, to: 2 },
  { from: 2, to: 3 },
  { from: 3, to: 4 },
  { from: 4, to: 5 }
];

export function renderRing(pct, color, size = 64) {
  const r = (size - 6) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const gap = circ - dash;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#30363D" stroke-width="3"/>` +
    (pct > 0 ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="3" ` +
      `stroke-dasharray="${dash} ${gap}" stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})"/>` : '') +
    `</svg>`;
}
