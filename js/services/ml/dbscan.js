// ============================================
// Vergara.ml.dbscan
// DBSCAN: clustering por densidad (radio eps y mínimo de vecinos). Los puntos
// que no pertenecen a ningún cluster denso se marcan con -1 (ruido/outlier).
//
// Justificación: DBSCAN se eligió sobre K-Means para anomalías porque NO
// sabemos cuántos outliers hay. K-Means forzaría a asignar cada pedido a un
// cluster, contaminando los grupos. DBSCAN explícitamente marca outliers como -1.
//
// Algoritmo:
//   1. Para cada punto, buscar sus vecinos en un radio eps (incluyéndose a sí
//      mismo, igual que scikit-learn).
//   2. Si tiene >= minSamples vecinos es un punto NÚCLEO → inicia un cluster.
//   3. Expandir el cluster agregando los vecinos alcanzables (y los vecinos de
//      los núcleos que se vayan encontrando).
//   4. Los puntos que nunca fueron alcanzados quedan con label -1 (outliers).
// ============================================
window.Vergara = window.Vergara || {};
Vergara.ml = Vergara.ml || {};
Vergara.ml.dbscan = (function () {

  // datos: [[f1, f2, ...], ...] (normalizadas). Devuelve {labels, outliers, nClusters}
  function entrenar(datos, opciones) {
    const { eps = 0.5, minSamples = 3 } = opciones || {};
    if (!Array.isArray(datos) || datos.length === 0) throw new Error("dbscan: se requieren datos");
    const dist = Vergara.ml.estadistica.distanciaEuclidiana;
    const n = datos.length;
    const vecinosDe = i => { const v = []; for (let j = 0; j < n; j++) if (dist(datos[i], datos[j]) <= eps) v.push(j); return v; };

    const NO_VISITADO = -2, RUIDO = -1;
    const labels = new Array(n).fill(NO_VISITADO);
    let cluster = 0;

    for (let i = 0; i < n; i++) {
      if (labels[i] !== NO_VISITADO) continue;
      const vecinos = vecinosDe(i);
      if (vecinos.length < minSamples) { labels[i] = RUIDO; continue; }   // posible outlier (puede ser absorbido luego)

      labels[i] = cluster;
      const cola = vecinos.filter(j => j !== i);
      while (cola.length) {
        const q = cola.shift();
        if (labels[q] === RUIDO) labels[q] = cluster;          // punto borde
        if (labels[q] !== NO_VISITADO) continue;
        labels[q] = cluster;
        const vq = vecinosDe(q);
        if (vq.length >= minSamples) vq.forEach(r => { if (labels[r] === NO_VISITADO || labels[r] === RUIDO) cola.push(r); });
      }
      cluster++;
    }
    const outliers = [];
    labels.forEach((l, i) => { if (l === RUIDO) outliers.push(i); });
    return { labels, outliers, nClusters: cluster };
  }

  return { entrenar };
})();
