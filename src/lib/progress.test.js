import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage for Node environment
const store = {};
const localStorageMock = {
  getItem: vi.fn(k => store[k] ?? null),
  setItem: vi.fn((k, v) => { store[k] = String(v); }),
  removeItem: vi.fn(k => { delete store[k]; }),
  clear: vi.fn(() => { for (const k in store) delete store[k]; })
};
globalThis.localStorage = localStorageMock;
globalThis.window = globalThis;

const { loadProgress, saveExercise, markVisited, getChapterProgress, resetProgress, THRESHOLD } = await import('./progress.js');

const CHAPTERS_MOCK = [
  { id: 1, exercises: [{ id: 'note-find' }, { id: 'fretboard-quiz' }, { id: 'string-traversal' }] },
  { id: 2, exercises: [{ id: 'interval-trainer' }, { id: 'interval-namer' }] },
  { id: 6, exercises: [] }
];

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

describe('loadProgress', () => {
  it('returns empty structure when no data stored', () => {
    const p = loadProgress();
    expect(p).toEqual({ exercises: {} });
  });

  it('returns stored data', () => {
    const data = { exercises: { 'note-find': { bestScore: 100, bestAccuracy: 90, completedAt: '2025-01-01' } } };
    store['gl_progress'] = JSON.stringify(data);
    expect(loadProgress()).toEqual(data);
  });

  it('returns empty on malformed JSON', () => {
    store['gl_progress'] = '{bad';
    expect(loadProgress()).toEqual({ exercises: {} });
  });

  it('returns empty on missing exercises key', () => {
    store['gl_progress'] = JSON.stringify({ foo: 1 });
    expect(loadProgress()).toEqual({ exercises: {} });
  });
});

describe('saveExercise', () => {
  it('saves a new exercise score', () => {
    saveExercise('note-find', { bestScore: 60, bestAccuracy: 80 });
    const p = loadProgress();
    expect(p.exercises['note-find'].bestScore).toBe(60);
    expect(p.exercises['note-find'].bestAccuracy).toBe(80);
  });

  it('keeps personal best — only updates if higher', () => {
    saveExercise('note-find', { bestScore: 100, bestAccuracy: 90 });
    saveExercise('note-find', { bestScore: 40, bestAccuracy: 70 });
    const p = loadProgress();
    expect(p.exercises['note-find'].bestScore).toBe(100);
    expect(p.exercises['note-find'].bestAccuracy).toBe(90);
  });

  it('updates best when new score is higher', () => {
    saveExercise('note-find', { bestScore: 30, bestAccuracy: 50 });
    saveExercise('note-find', { bestScore: 80, bestAccuracy: 95 });
    const p = loadProgress();
    expect(p.exercises['note-find'].bestScore).toBe(80);
    expect(p.exercises['note-find'].bestAccuracy).toBe(95);
  });

  it('sets completedAt when threshold reached', () => {
    saveExercise('note-find', { bestScore: THRESHOLD, bestAccuracy: 80 });
    const p = loadProgress();
    expect(p.exercises['note-find'].completedAt).toBeTruthy();
  });

  it('does not set completedAt below threshold', () => {
    saveExercise('note-find', { bestScore: THRESHOLD - 1, bestAccuracy: 80 });
    const p = loadProgress();
    expect(p.exercises['note-find'].completedAt).toBeNull();
  });

  it('preserves completedAt once set', () => {
    saveExercise('note-find', { bestScore: 100, bestAccuracy: 90 });
    const ts = loadProgress().exercises['note-find'].completedAt;
    saveExercise('note-find', { bestScore: 200, bestAccuracy: 95 });
    expect(loadProgress().exercises['note-find'].completedAt).toBe(ts);
  });
});

describe('markVisited', () => {
  it('creates entry with visited flag', () => {
    markVisited('caged');
    const p = loadProgress();
    expect(p.exercises['caged'].visited).toBe(true);
    expect(p.exercises['caged'].bestScore).toBe(0);
  });

  it('adds visited flag to existing entry', () => {
    saveExercise('caged', { bestScore: 10, bestAccuracy: 50 });
    markVisited('caged');
    const p = loadProgress();
    expect(p.exercises['caged'].visited).toBe(true);
    expect(p.exercises['caged'].bestScore).toBe(10);
  });
});

describe('getChapterProgress', () => {
  it('returns 0% for chapter with no completed exercises', () => {
    const prog = getChapterProgress(1, CHAPTERS_MOCK);
    expect(prog).toEqual({ total: 3, completed: 0, pct: 0 });
  });

  it('counts exercises above threshold as completed', () => {
    saveExercise('note-find', { bestScore: THRESHOLD, bestAccuracy: 80 });
    saveExercise('fretboard-quiz', { bestScore: THRESHOLD + 10, bestAccuracy: 90 });
    const prog = getChapterProgress(1, CHAPTERS_MOCK);
    expect(prog).toEqual({ total: 3, completed: 2, pct: 67 });
  });

  it('counts visited exercises as completed', () => {
    markVisited('note-find');
    const prog = getChapterProgress(1, CHAPTERS_MOCK);
    expect(prog).toEqual({ total: 3, completed: 1, pct: 33 });
  });

  it('returns 0/0/0 for chapter with no exercises', () => {
    const prog = getChapterProgress(6, CHAPTERS_MOCK);
    expect(prog).toEqual({ total: 0, completed: 0, pct: 0 });
  });

  it('returns 0/0/0 for unknown chapter', () => {
    const prog = getChapterProgress(99, CHAPTERS_MOCK);
    expect(prog).toEqual({ total: 0, completed: 0, pct: 0 });
  });
});

describe('resetProgress', () => {
  it('clears all stored progress', () => {
    saveExercise('note-find', { bestScore: 100, bestAccuracy: 90 });
    resetProgress();
    expect(loadProgress()).toEqual({ exercises: {} });
  });
});
