export function getCoverageMatrix(items) {
  const zones = ['zone_0', 'zone_3', 'zone_5', 'zone_7', 'zone_9', 'zone_12'];
  const matrix = {};
  for (let s = 0; s < 6; s++) {
    for (const z of zones) {
      const cellKey = `str_${s}:${z}`;
      matrix[cellKey] = { count: 0, totalPL: 0, avgPL: 0 };
    }
  }

  for (const [, rec] of items) {
    const strCl = rec.clusters.find(c => c.startsWith('str_'));
    const zoneCl = rec.clusters.find(c => c.startsWith('zone_'));
    if (strCl && zoneCl) {
      const cellKey = `${strCl}:${zoneCl}`;
      if (matrix[cellKey]) {
        matrix[cellKey].count++;
        matrix[cellKey].totalPL += rec.pL;
        matrix[cellKey].avgPL = matrix[cellKey].totalPL / matrix[cellKey].count;
      }
    }
  }

  return matrix;
}

export function getCoverageCell(items, strCluster, zoneCluster) {
  let count = 0, totalPL = 0;
  for (const [, rec] of items) {
    if (rec.clusters.includes(strCluster) && rec.clusters.includes(zoneCluster)) {
      count++;
      totalPL += rec.pL;
    }
  }
  return { count, avgPL: count > 0 ? totalPL / count : 0 };
}
