export function topConfusion(rec) {
  if (!rec.confusions || rec.confusions.length === 0) return null;
  const freq = {};
  for (const c of rec.confusions) freq[c.detected] = (freq[c.detected] || 0) + 1;
  let top = null, topN = 0;
  for (const [k, n] of Object.entries(freq)) {
    if (n > topN) { top = k; topN = n; }
  }
  return top;
}

export function getConfusions(rec) {
  if (!rec || rec.confusions.length === 0) return {};
  const freq = {};
  for (const c of rec.confusions) {
    freq[c.detected] = (freq[c.detected] || 0) + 1;
  }
  return freq;
}
