export function shouldMicroDrill(lastItem, items, config, questionNumber) {
  if (!lastItem) return false;
  const key = config.itemKey(lastItem);
  const rec = items.get(key);
  if (!rec || rec.hist.length < 3) return false;
  // Cooldown: don't micro-drill same item within 8 questions
  if (rec._lastMicroDrill && (questionNumber - rec._lastMicroDrill) < 8) return false;
  const recent = rec.hist.slice(-5);
  const failures = recent.filter(h => !h).length;
  if (failures >= 3) {
    rec._lastMicroDrill = questionNumber;
    return true;
  }
  return false;
}

export function buildOverdueQueue(items, config) {
  const now = Date.now();
  const overdue = [];
  for (const [key, rec] of items) {
    if (rec.due > 0 && rec.due < now) {
      const item = config.itemFromKey(key);
      if (!item) continue; // type was removed
      overdue.push({ item, overdueness: now - rec.due });
    }
  }
  overdue.sort((a, b) => b.overdueness - a.overdueness);
  return overdue.slice(0, 10).map(o => o.item);
}

export function buildConfusionDrill(lastItem, items, config, questionNumber, itemForConfusedValue) {
  if (!lastItem) return [];
  const key = config.itemKey(lastItem);
  const rec = items.get(key);
  if (!rec || rec.confusions.length === 0) return [];

  // Cooldown: 10-question gap
  if (rec._lastConfDrill && (questionNumber - rec._lastConfDrill) < 10) return [];

  // Last answer must be wrong
  if (rec.hist.length === 0 || rec.hist[rec.hist.length - 1]) return [];

  // Find confused values with >=2 occurrences
  const freq = {};
  for (const cf of rec.confusions) freq[cf.detected] = (freq[cf.detected] || 0) + 1;
  let confusedValue = null;
  for (const [val, count] of Object.entries(freq)) {
    if (count >= 2) { confusedValue = val; break; }
  }
  if (!confusedValue) return [];

  // Build alternation: [original, confused, original, confused]
  const original = lastItem;
  const confused = itemForConfusedValue(confusedValue, original);
  if (!confused) return [];

  rec._lastConfDrill = questionNumber;
  return [original, confused, original, confused];
}
