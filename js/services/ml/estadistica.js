// ============================================
// Vergara.ml.estadistica
// Estadística descriptiva: media, mediana, moda, varianza, desviación
// estándar, cuartiles y detección de outliers por rango intercuartílico (IQR).
// Justificación: base para entender la distribución de ventas y detectar
// valores atípicos antes de aplicar modelos predictivos.
//
// Además incluye utilidades compartidas por los demás algoritmos de ML:
//   - aleatorio(semilla): generador pseudoaleatorio determinista (mulberry32),
//     para que k-means++ y Hill Climbing den siempre el mismo resultado y los
//     tests sean reproducibles.
//   - minMax / normalizarMatriz: escalado a [0,1] para que ninguna variable
//     domine la distancia (monto en soles vs. número de ítems, por ejemplo).
// ============================================
window.Vergara = window.Vergara || {};
Vergara.ml = Vergara.ml || {};
Vergara.ml.estadistica = (function () {

  function validar(arr) {
    if (!Array.isArray(arr) || arr.length === 0) throw new Error("estadistica: se requiere un arreglo no vacío");
  }

  function media(arr) {
    validar(arr);
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  // Valor central; con cantidad par promedia los dos centrales
  function mediana(arr) {
    validar(arr);
    const o = arr.slice().sort((a, b) => a - b);
    const m = Math.floor(o.length / 2);
    return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
  }

  // Valor más frecuente; en caso de empate devuelve el menor
  function moda(arr) {
    validar(arr);
    const frecuencia = new Map();
    arr.forEach(v => frecuencia.set(v, (frecuencia.get(v) || 0) + 1));
    let mejor = null, max = 0;
    frecuencia.forEach((f, v) => {
      if (f > max || (f === max && v < mejor)) { max = f; mejor = v; }
    });
    return mejor;
  }

  // Varianza poblacional: promedio de las desviaciones al cuadrado
  function varianza(arr) {
    const mu = media(arr);
    return arr.reduce((s, v) => s + (v - mu) * (v - mu), 0) / arr.length;
  }

  function desviacionEstandar(arr) {
    return Math.sqrt(varianza(arr));
  }

  // Percentil con interpolación lineal sobre el arreglo ordenado
  function percentil(ordenado, p) {
    const pos = (ordenado.length - 1) * p;
    const base = Math.floor(pos);
    const resto = pos - base;
    return base + 1 < ordenado.length
      ? ordenado[base] + resto * (ordenado[base + 1] - ordenado[base])
      : ordenado[base];
  }

  function cuartiles(arr) {
    validar(arr);
    const o = arr.slice().sort((a, b) => a - b);
    return { q1: percentil(o, 0.25), q2: percentil(o, 0.5), q3: percentil(o, 0.75) };
  }

  // Límites del criterio 1.5 × IQR
  function limitesOutliers(arr) {
    const { q1, q3 } = cuartiles(arr);
    const iqr = q3 - q1;
    return { inferior: q1 - 1.5 * iqr, superior: q3 + 1.5 * iqr, iqr };
  }

  // Valor atípico si queda fuera de [q1 - 1.5·iqr, q3 + 1.5·iqr]
  function detectarOutliers(arr) {
    const { inferior, superior } = limitesOutliers(arr);
    const resultado = [];
    arr.forEach((valor, indice) => {
      if (valor < inferior) resultado.push({ indice, valor, motivo: `Menor que el límite inferior (${inferior.toFixed(2)})` });
      else if (valor > superior) resultado.push({ indice, valor, motivo: `Mayor que el límite superior (${superior.toFixed(2)})` });
    });
    return resultado;
  }

  function resumen(arr) {
    validar(arr);
    const lim = limitesOutliers(arr);
    return {
      media: media(arr), mediana: mediana(arr), moda: moda(arr),
      varianza: varianza(arr), std: desviacionEstandar(arr),
      min: Math.min(...arr), max: Math.max(...arr),
      outliers: detectarOutliers(arr),
      rango: { inferior: lim.inferior, superior: lim.superior }
    };
  }

  // Generador pseudoaleatorio determinista (mulberry32). Devuelve una función () → [0,1)
  function aleatorio(semilla) {
    let a = (semilla === undefined ? 123456789 : semilla) >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Mínimo y máximo por columna de una matriz (arreglo de filas)
  function minMax(matriz) {
    const cols = matriz[0].length;
    const min = new Array(cols).fill(Infinity), max = new Array(cols).fill(-Infinity);
    matriz.forEach(f => f.forEach((v, j) => { if (v < min[j]) min[j] = v; if (v > max[j]) max[j] = v; }));
    return { min, max };
  }

  // Escala cada columna a [0,1]; si una columna es constante queda en 0
  function normalizarMatriz(matriz, limites) {
    const { min, max } = limites || minMax(matriz);
    return {
      datos: matriz.map(f => f.map((v, j) => (max[j] === min[j] ? 0 : (v - min[j]) / (max[j] - min[j])))),
      min, max
    };
  }

  function distanciaEuclidiana(a, b) {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) * (a[i] - b[i]);
    return Math.sqrt(s);
  }

  return {
    media, mediana, moda, varianza, desviacionEstandar, cuartiles, limitesOutliers,
    detectarOutliers, resumen, aleatorio, minMax, normalizarMatriz, distanciaEuclidiana
  };
})();
