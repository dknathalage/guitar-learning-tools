const SESSION_WINDOW = 20;

export function checkFatigue(sessionWindow, fatigued, preFatigueAccuracy) {
  if (sessionWindow.length < SESSION_WINDOW) {
    return { fatigued, preFatigueAccuracy };
  }

  const half = SESSION_WINDOW / 2;
  const older = sessionWindow.slice(0, half);
  const newer = sessionWindow.slice(half);

  const accOlder = older.filter(r => r.ok).length / older.length;
  const accNewer = newer.filter(r => r.ok).length / newer.length;

  const timesOlder = older.filter(r => r.timeMs > 0).map(r => r.timeMs);
  const timesNewer = newer.filter(r => r.timeMs > 0).map(r => r.timeMs);
  const avgTimeOlder = timesOlder.length > 0 ? timesOlder.reduce((s, t) => s + t, 0) / timesOlder.length : 0;
  const avgTimeNewer = timesNewer.length > 0 ? timesNewer.reduce((s, t) => s + t, 0) / timesNewer.length : 0;

  if (!fatigued) {
    const accDrop = accOlder > 0 ? (accOlder - accNewer) / accOlder : 0;
    const timeIncrease = avgTimeOlder > 0 ? (avgTimeNewer - avgTimeOlder) / avgTimeOlder : 0;

    if (accDrop > 0.20 || timeIncrease > 0.40) {
      return { fatigued: true, preFatigueAccuracy: accOlder };
    }
  } else {
    if (preFatigueAccuracy != null && accNewer >= preFatigueAccuracy * 0.90) {
      return { fatigued: false, preFatigueAccuracy: null };
    }
  }

  return { fatigued, preFatigueAccuracy };
}
