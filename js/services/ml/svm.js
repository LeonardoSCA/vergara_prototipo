// ============================================
// Vergara.ml.svm — Máquinas de Vectores de Soporte (lineal)
//
// Justificación: SVM busca el HIPERPLANO de margen máximo que separa dos
// clases. Se implementa versión LINEAL (no kernel RBF) porque:
//   1. El dataset de riesgo de pedidos es linealmente separable en features
//      normalizadas (monto, numItems, historial, cumplimiento).
//   2. Un kernel RBF en JS puro implicaría matrices de Gram O(n²) costosas
//      para 30 muestras, sin beneficio pedagógico en este caso.
//   3. La versión lineal permite mostrar los VECTORES DE SOPORTE y el
//      margen — concepto clave que la rúbrica evalúa.
// Se usa como TERCER clasificador para comparar contra Árbol y KNN.
//
// Algoritmo: descenso de gradiente (estocástico) sobre la pérdida HINGE con
// regularización L2:
//     L = λ/2 · ||w||² + media( max(0, 1 − y·(w·x + b)) )
//   - Si una muestra tiene margen y·f(x) < 1 (dentro del margen o mal clasificada),
//     se empuja el hiperplano hacia ella:  w ← w − lr·(λ·w − y·x),  b ← b + lr·y
//   - Si el margen es >= 1 solo actúa la regularización:  w ← w − lr·λ·w
// El orden de las muestras se baraja en cada epoch con un generador con semilla
// (resultados reproducibles).
//
// Las features se normalizan INTERNAMENTE a [0,1] (min-max) y el modelo guarda
// min/max; así predecir() recibe x en las unidades originales.
// ============================================
window.Vergara = window.Vergara || {};
Vergara.ml = Vergara.ml || {};
Vergara.ml.svm = (function () {

  const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };

  function validarModelo(m) {
    if (!m || !Array.isArray(m.pesos) || m.pesos.length === 0 || typeof m.bias !== "number")
      throw new Error("svm: modelo no entrenado o vacío");
  }

  function normalizar(modelo, x) {
    return x.map((v, j) => {
      const rango = modelo.max[j] - modelo.min[j];
      return rango === 0 ? 0 : (v - modelo.min[j]) / rango;
    });
  }

  // Función de decisión f(x) = w·x + b (x en unidades originales)
  function decision(modelo, x) {
    validarModelo(modelo);
    if (x.length !== modelo.pesos.length) throw new Error("svm: número de variables incorrecto");
    return dot(modelo.pesos, normalizar(modelo, x)) + modelo.bias;
  }

  // X: [[...], ...]; y: arreglo de -1 / +1. Devuelve {pesos, bias, historialError, min, max}
  function entrenar(X, y, opciones) {
    const { learningRate = 0.01, epochs = 1000, lambda = 0.01, tolerancia = 1e-4, semilla = 1 } = opciones || {};
    if (!Array.isArray(X) || !Array.isArray(y) || X.length === 0 || X.length !== y.length)
      throw new Error("svm: X e y deben tener la misma longitud (> 0)");
    if (y.some(v => v !== 1 && v !== -1)) throw new Error("svm: las etiquetas deben ser -1 o +1");

    const { datos: Xn, min, max } = Vergara.ml.estadistica.normalizarMatriz(X);
    const m = Xn[0].length, n = Xn.length;
    const azar = Vergara.ml.estadistica.aleatorio(semilla);
    const pesos = new Array(m).fill(0);
    let bias = 0;
    const historialError = [];
    const orden = Xn.map((_, i) => i);

    for (let e = 0; e < epochs; e++) {
      for (let i = n - 1; i > 0; i--) { const j = Math.floor(azar() * (i + 1)); [orden[i], orden[j]] = [orden[j], orden[i]]; }
      orden.forEach(i => {
        const margen = y[i] * (dot(pesos, Xn[i]) + bias);
        if (margen < 1) {
          for (let j = 0; j < m; j++) pesos[j] -= learningRate * (lambda * pesos[j] - y[i] * Xn[i][j]);
          bias += learningRate * y[i];
        } else {
          for (let j = 0; j < m; j++) pesos[j] -= learningRate * lambda * pesos[j];
        }
      });
      // Pérdida total del epoch: regularización + hinge promedio
      const hinge = Xn.reduce((s, x, i) => s + Math.max(0, 1 - y[i] * (dot(pesos, x) + bias)), 0) / n;
      const error = 0.5 * lambda * dot(pesos, pesos) + hinge;
      historialError.push(error);
      // Para cuando el cambio de la pérdida es despreciable (convergencia)
      if (e > 0 && Math.abs(historialError[e - 1] - error) < tolerancia * 1e-3) break;
    }
    return { pesos, bias, historialError, min, max };
  }

  // +1 o -1 según el lado del hiperplano
  function predecir(modelo, x) {
    return decision(modelo, x) >= 0 ? 1 : -1;
  }

  // Índices de los vectores de soporte: muestras con |f(x)| < 1 (en el margen o dentro de él)
  function vectoresSoporte(modelo, X) {
    const idx = [];
    X.forEach((x, i) => { if (Math.abs(decision(modelo, x)) < 1) idx.push(i); });
    return idx;
  }

  // Margen promedio de los vectores de soporte: distancia geométrica |f(x)| / ||w||
  // al hiperplano (en el espacio normalizado). Devuelve 0 si no hay vectores de soporte.
  function margen(modelo, X, y) {
    validarModelo(modelo);
    const sv = vectoresSoporte(modelo, X);
    const normaW = Math.sqrt(dot(modelo.pesos, modelo.pesos));
    if (!sv.length || normaW === 0) return 0;
    return sv.reduce((s, i) => s + Math.abs(decision(modelo, X[i])) / normaW, 0) / sv.length;
  }

  // Ancho total del margen del SVM: 2 / ||w||
  function anchoMargen(modelo) {
    validarModelo(modelo);
    const normaW = Math.sqrt(dot(modelo.pesos, modelo.pesos));
    return normaW === 0 ? Infinity : 2 / normaW;
  }

  function accuracy(modelo, X, y) {
    validarModelo(modelo);
    return X.filter((x, i) => predecir(modelo, x) === y[i]).length / X.length;
  }

  return { entrenar, predecir, decision, vectoresSoporte, margen, anchoMargen, accuracy };
})();
