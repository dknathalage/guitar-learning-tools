import { NOTES } from '$lib/constants/music.js';
import { noteAt, STANDARD_TUNING } from '$lib/music/fretboard.js';

export const DEGREE_COLORS = [
	'#e74c3c', '#e67e22', '#f1c40f', '#2ecc71',
	'#3498db', '#9b59b6', '#1abc9c', '#e91e63'
];

/** Frequency in Hz for a note name + octave. A4 = 440 Hz. */
export function noteFreq(noteName, octave) {
	const noteIndex = NOTES.indexOf(noteName);
	if (noteIndex === -1) return 0;
	return 440 * Math.pow(2, (noteIndex - 9 + (octave - 4) * 12) / 12);
}

/** All fretboard positions [{str, fret}] where `noteName` appears, up to maxFret. */
export function allPositions(noteName, maxFret = 15) {
	const positions = [];
	for (let s = 0; s < 6; s++) {
		for (let f = 0; f <= maxFret; f++) {
			if (noteAt(s, f) === noteName) positions.push({ str: s, fret: f });
		}
	}
	return positions;
}

/** Given root index (0-11) and semitone offsets, return note names from NOTES. */
export function intervalsToNotes(rootIndex, intervals) {
	return intervals.map(iv => NOTES[(rootIndex + iv) % 12]);
}

/**
 * All fretboard positions where chord tones appear.
 * Each entry: {str, fret, note, color} colored by degree index.
 */
export function chordPositions(rootIndex, intervals, maxFret = 15) {
	const positions = [];
	for (let s = 0; s < 6; s++) {
		for (let f = 0; f <= maxFret; f++) {
			const noteIdx = (STANDARD_TUNING[s] + f) % 12;
			const rel = ((noteIdx - rootIndex) % 12 + 12) % 12;
			const degreeIdx = intervals.indexOf(rel);
			if (degreeIdx !== -1) {
				positions.push({
					str: s,
					fret: f,
					note: NOTES[noteIdx],
					color: DEGREE_COLORS[degreeIdx % DEGREE_COLORS.length]
				});
			}
		}
	}
	return positions;
}

/**
 * Fretboard positions for scale tones, colored by degree.
 * `formula` is an array of semitone offsets (e.g. [0,2,4,5,7,9,11] for major).
 */
export function scalePositions(rootIndex, formula, maxFret = 15) {
	const positions = [];
	for (let s = 0; s < 6; s++) {
		for (let f = 0; f <= maxFret; f++) {
			const noteIdx = (STANDARD_TUNING[s] + f) % 12;
			const rel = ((noteIdx - rootIndex) % 12 + 12) % 12;
			const degreeIdx = formula.indexOf(rel);
			if (degreeIdx !== -1) {
				positions.push({
					str: s,
					fret: f,
					note: NOTES[noteIdx],
					color: DEGREE_COLORS[degreeIdx % DEGREE_COLORS.length]
				});
			}
		}
	}
	return positions;
}

/** Random note name from NOTES. */
export function randomNote() {
	return NOTES[Math.floor(Math.random() * NOTES.length)];
}

/** Random key index 0-11. */
export function randomKey() {
	return Math.floor(Math.random() * 12);
}
