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
    exercises: [
      { id: 'note-find',         name: 'Note Find',         path: '/exercises/note-find',         mic: true },
      { id: 'fretboard-quiz',    name: 'Fretboard Quiz',    path: '/theory/fretboard-quiz',       mic: false },
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
    exercises: [
      { id: 'interval-trainer',     name: 'Interval Trainer',     path: '/exercises/interval',           mic: true },
      { id: 'interval-namer',       name: 'Interval Namer',       path: '/theory/interval-namer',        mic: false },
      { id: 'interval-recognition', name: 'Interval Recognition', path: '/theory/interval-recognition',  mic: false }
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
    exercises: [
      { id: 'chord-speller',  name: 'Chord Speller',    path: '/theory/chord-speller',       mic: false },
      { id: 'chord-tone',     name: 'Chord Tone Find',  path: '/exercises/chord-tone',       mic: true },
      { id: 'chord-quality',  name: 'Chord Quality',    path: '/theory/chord-quality',       mic: false }
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
    exercises: [
      { id: 'caged-visualizer', name: 'CAGED Visualizer', path: '/caged',                       mic: false },
      { id: 'chord-player',     name: 'Chord Player',     path: '/exercises/chord-player',      mic: true }
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
    exercises: [
      { id: 'scale-runner',  name: 'Scale Runner',  path: '/exercises/scale-runner',   mic: true },
      { id: 'mode-trainer',  name: 'Mode Trainer',  path: '/exercises/mode-trainer',   mic: true }
    ]
  },
  {
    id: 6, title: 'Harmony', color: '#FB923C', docsPath: 'docs/ch6-harmony.md',
    deps: [5],
    theory: [
      'Diatonic chords: harmonize each scale degree by stacking 3rds',
      'Key of C: I-ii-iii-IV-V-vi-vii\u00b0 (C-Dm-Em-F-G-Am-Bdim)',
      'Roman numerals show chord functions: tonic, subdominant, dominant',
      'Same progressions appear across pop, rock, folk, and classical'
    ],
    exercises: [
      { id: 'diatonic-quiz',     name: 'Diatonic Quiz',     path: '/theory/diatonic-quiz',     mic: false },
      { id: 'progression-namer', name: 'Progression Namer', path: '/theory/progression-namer', mic: false }
    ]
  },
  {
    id: 7, title: 'Rhythm', color: '#A78BFA', docsPath: 'docs/ch7-rhythm.md',
    deps: [],
    theory: [
      'Pulse, beat (4 per measure in 4/4), and tempo (BPM) are foundational',
      'Note values subdivide: whole, half, quarter, eighth, sixteenth',
      'Counting: 1-2-3-4 (quarters), 1&2&3&4& (eighths), triplets',
      'Rhythm is the neglected dimension self-taught guitarists must internalize'
    ],
    exercises: [
      { id: 'rhythm-tap', name: 'Rhythm Tap', path: '/exercises/rhythm-tap', mic: false }
    ]
  },
  {
    id: 8, title: 'Application', color: '#34D399', docsPath: 'docs/ch8-application.md',
    deps: [6, 7],
    theory: [
      'Analyze songs: identify key, use Roman numerals, spot patterns',
      'Improvisation: pentatonic boxes \u2192 chord tone targeting \u2192 full scales',
      'Transpose progressions across keys to deepen understanding',
      'Combines fretboard, intervals, chords, harmony, and rhythm'
    ],
    exercises: []
  },
  {
    id: 9, title: 'Advanced', color: '#F87171', docsPath: 'docs/ch9-advanced.md',
    deps: [8],
    theory: [
      'Tritone substitution: replace dom7 with dom7 a tritone away',
      'Chord substitutions maintain function while adding harmonic color',
      'Relative major/minor substitution for smoother voice leading',
      'Tools for breaking out of diatonic harmony and basic patterns'
    ],
    exercises: []
  }
];

export const EDGES = [
  { from: 1, to: 2 },
  { from: 2, to: 3 },
  { from: 3, to: 4 },
  { from: 4, to: 5 },
  { from: 5, to: 6 },
  { from: 6, to: 8 },
  { from: 7, to: 8 },
  { from: 8, to: 9 }
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
