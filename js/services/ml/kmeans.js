// ============================================
// Vergara.ml.kmeans
// K-Means con inicialización k-means++ simplificada, silhouette score y
// método del codo, para segmentar clientes (VIP, Recurrente, Ocasional, En riesgo).
//
// Justificación: K-Means se eligió sobre DBSCAN/GMM porque conocemos K=4
// (segmentos comerciales) y queremos grupos balanceados y accionables. DBSCAN
// es mejor para detectar ruido (lo usamos en otro módulo). GMM añade
// complejidad probabilística sin beneficio claro en este caso.
//
// Algoritmo:
//   1. k-means++: el primer centroide se elige al azar; cada siguiente con
//      probabilidad proporcional a su distancia² al centroide más cercano.
//   2. Asignar cada punto a su centroide más cercano.
//   3. Recalcular cada centroide como la media de sus puntos.
//   4. Repetir hasta que el mayor desplazamiento de un centroide sea < tol o
//      se llegue a maxIter.
// Usa un generador pseudoaleatorio con semilla para que el resultado sea reproducible.
// ============================================
window.Vergara = window.Vergara || {};
Vergara.ml = Vergara.ml || {};
Vergara.ml.kmeans = (function () {

  const dist = (a, b) => Vergara.ml.estadistica.distanciaEuclidiana(a, b);

  function indiceMasCercano(punto, centroides) {
    let mejor = 0, dMin = Infinity;
    centroides.forEach((c, i) => { const d = dist(punto, c); if (d < dMin) { dMin = d; mejor = i; } });
    return mejor;
  }

  // k-means++ simplificado
  function inicializar(datos, k, azar) {
    const centroides = [datos[Math.floor(azar() * datos.length)].slice()];
    while (centroides.length < k) {
      const d2 = datos.map(p => Math.min(...centroides.map(c => dist(p, c) ** 2)));
      const suma = d2.reduce((a, b) => a + b, 0);
      let elegido = datos.length - 1;
      if (suma === 0) elegido = Math.floor(azar() * datos.length);
      else {
        let umbral = azar() * suma;
        for (let i = 0; i < d2.length; i++) { umbral -= d2[i]; if (umbral <= 0) { elegido = i; break; } }
      }
      centroides.push(datos[elegido].slice());
    }
    return centroides;
  }

  function inercia(datos, asignaciones, centroides) {
    return datos.reduce((s, p, i) => s + dist(p, centroides[asignaciones[i]]) ** 2, 0);
  }

  // datos: [[f1, f2, ...], ...] (ya normalizadas). Devuelve {centroides, asignaciones, historial, inercia, iteraciones}
  function entrenar(datos, opciones) {
    const { k = 4, maxIter = 100, tol = 0.001, semilla = 42 } = opciones || {};
    if (!Array.isArray(datos) || datos.length === 0) throw new Error("kmeans: se requieren datos");
    if (k < 1 || k > datos.length) throw new Error("kmeans: k debe estar entre 1 y el número de puntos");

    const azar = Vergara.ml.estadistica.aleatorio(semilla);
    let centroides = inicializar(datos, k, azar);
    let asignaciones = new Array(datos.length).fill(0);
    const historial = [];
    let iteraciones = 0;

    for (let it = 1; it <= maxIter; it++) {
      iteraciones = it;
      asignaciones = datos.map(p => indiceMasCercano(p, centroides));
      const nuevos = centroides.map((c, j) => {
        const miembros = datos.filter((_, i) => asignaciones[i] === j);
        if (!miembros.length) return c;   // cluster vacío: conserva su centroide
        return c.map((_, d) => miembros.reduce((s, p) => s + p[d], 0) / miembros.length);
      });
      const movimiento = Math.max(...nuevos.map((c, j) => dist(c, centroides[j])));
      centroides = nuevos;
      historial.push({ iteracion: it, inercia: inercia(datos, asignaciones, centroides), movimiento });
      if (movimiento < tol) break;
    }
    asignaciones = datos.map(p => indiceMasCercano(p, centroides));
    return { centroides, asignaciones, historial, inercia: inercia(datos, asignaciones, centroides), iteraciones };
  }

  // Silhouette medio: (b − a) / max(a, b); cercano a 1 = clusters bien separados
  function silhouetteScore(datos, asignaciones) {
    const clusters = Array.from(new Set(asignaciones));
    if (clusters.length < 2) return 0;
    let total = 0;
    datos.forEach((p, i) => {
      const propios = datos.filter((_, j) => j !== i && asignaciones[j] === asignaciones[i]);
      if (!propios.length) return;   // cluster de un solo punto: silhouette 0
      const a = propios.reduce((s, q) => s + dist(p, q), 0) / propios.length;
      let b = Infinity;
      clusters.filter(c => c !== asignaciones[i]).forEach(c => {
        const otros = datos.filter((_, j) => asignaciones[j] === c);
        b = Math.min(b, otros.reduce((s, q) => s + dist(p, q), 0) / otros.length);
      });
      total += (b - a) / Math.max(a, b);
    });
    return total / datos.length;
  }

  // Inercia para cada k (gráfico del codo)
  function metodoDelCodo(datos, opciones) {
    const { kMin = 2, kMax = 6 } = opciones || {};
    const resultado = [];
    for (let k = kMin; k <= Math.min(kMax, datos.length); k++) resultado.push({ k, inercia: entrenar(datos, { k }).inercia });
    return resultado;
  }

  return { entrenar, silhouetteScore, metodoDelCodo };
})();
