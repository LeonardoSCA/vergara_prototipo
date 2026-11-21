// ============================================
// Vergara.ml.regresionLineal
// Regresión lineal múltiple entrenada por gradiente descendente, con
// normalización min-max de las variables y métricas MSE, RMSE y R².
//
// Justificación de elección: la demanda es un valor CONTINUO (unidades),
// por lo que el problema es de REGRESIÓN, no de clasificación. Se eligió
// regresión lineal sobre SVM/árboles porque es interpretable: se puede
// mostrar la ecuación resultante y explicar qué variables impactan.
//
// Detalles de implementación:
//   - Gradiente descendente (en vez de la ecuación normal) porque es más simple
//     y numéricamente estable en JS puro, sin invertir matrices.
//   - Las variables X se escalan a [0,1] (min-max). La variable y también se
//     escala internamente y se des-escala al predecir, para que la tasa de
//     aprendizaje funcione igual sin importar las unidades.
//   - Los valores por defecto (learningRate=0.1, epochs=2000) están ajustados al tamaño
//     de datos del prototipo (pocas muestras, variables en [0,1]): con 0.01 y 1000
//     el modelo no converge (en y = 2x + 1 predecía 17.6 en lugar de 21).
//   - Normalización robusta: se validan filas de distinto largo y valores no numéricos,
//     una columna constante (p. ej. promo = 0 en todas las semanas) se escala a 0 en vez
//     de dividir por cero, y si el entrenamiento diverge se lanza un error claro.
// ============================================
window.Vergara = window.Vergara || {};
Vergara.ml = Vergara.ml || {};
Vergara.ml.regresionLineal = (function () {

  function validarModelo(modelo) {
    if (!modelo || !Array.isArray(modelo.pesos) || modelo.pesos.length === 0 || typeof modelo.bias !== "number")
      throw new Error("regresionLineal: modelo no entrenado o vacío");
  }

  // Predicción en el espacio normalizado de un solo vector
  function predecirUno(modelo, x) {
    if (x.length !== modelo.pesos.length) throw new Error("regresionLineal: número de variables incorrecto");
    let z = modelo.bias;
    for (let j = 0; j < x.length; j++) {
      const rango = modelo.max[j] - modelo.min[j];
      const xn = rango === 0 ? 0 : (x[j] - modelo.min[j]) / rango;
      z += modelo.pesos[j] * xn;
    }
    return modelo.yMin + z * modelo.yRango;
  }

  // Valida que X sea una matriz rectangular de números finitos y que y sea un vector de números finitos
  function validarDatos(X, y) {
    if (!Array.isArray(X) || !Array.isArray(y) || X.length === 0 || X.length !== y.length)
      throw new Error("regresionLineal: X e y deben tener la misma longitud (> 0)");
    const m = Array.isArray(X[0]) ? X[0].length : 0;
    if (m === 0) throw new Error("regresionLineal: cada fila de X debe tener al menos una variable");
    X.forEach((fila, i) => {
      if (!Array.isArray(fila) || fila.length !== m) throw new Error("regresionLineal: la fila " + i + " de X tiene distinto número de variables");
      if (fila.some(v => typeof v !== "number" || !isFinite(v))) throw new Error("regresionLineal: la fila " + i + " de X contiene valores no numéricos");
    });
    if (y.some(v => typeof v !== "number" || !isFinite(v))) throw new Error("regresionLineal: y contiene valores no numéricos");
  }

  // Entrena el modelo. X: [[...], ...], y: [...]
  function entrenar(X, y, opciones) {
    const { learningRate = 0.1, epochs = 2000 } = opciones || {};
    validarDatos(X, y);

    const n = X.length, m = X[0].length;
    const min = new Array(m).fill(Infinity), max = new Array(m).fill(-Infinity);
    X.forEach(f => f.forEach((v, j) => { if (v < min[j]) min[j] = v; if (v > max[j]) max[j] = v; }));
    const Xn = X.map(f => f.map((v, j) => (max[j] === min[j] ? 0 : (v - min[j]) / (max[j] - min[j]))));

    const yMin = Math.min(...y), yMax = Math.max(...y);
    const yRango = yMax === yMin ? 1 : yMax - yMin;
    const yn = y.map(v => (v - yMin) / yRango);

    const pesos = new Array(m).fill(0);
    let bias = 0;
    const historialError = [];

    for (let e = 0; e < epochs; e++) {
      const gradW = new Array(m).fill(0);
      let gradB = 0, mse = 0;
      for (let i = 0; i < n; i++) {
        let pred = bias;
        for (let j = 0; j < m; j++) pred += pesos[j] * Xn[i][j];
        const error = pred - yn[i];
        mse += error * error;
        gradB += error;
        for (let j = 0; j < m; j++) gradW[j] += error * Xn[i][j];
      }
      for (let j = 0; j < m; j++) pesos[j] -= learningRate * gradW[j] / n;
      bias -= learningRate * gradB / n;
      if (!isFinite(mse)) throw new Error("regresionLineal: el entrenamiento divergió; reduce learningRate");
      historialError.push(mse / n);
    }

    return { pesos, bias, historialError, min, max, yMin, yRango };
  }

  // Si X_nuevo es un vector devuelve un número; si es una matriz, un arreglo
  function predecir(modelo, X_nuevo) {
    validarModelo(modelo);
    if (!Array.isArray(X_nuevo)) throw new Error("regresionLineal: X_nuevo inválido");
    return Array.isArray(X_nuevo[0]) ? X_nuevo.map(f => predecirUno(modelo, f)) : predecirUno(modelo, X_nuevo);
  }

  function errorCuadraticoMedio(modelo, X, y) {
    const pred = predecir(modelo, X);
    return pred.reduce((s, p, i) => s + (p - y[i]) * (p - y[i]), 0) / y.length;
  }

  function raizErrorCuadratico(modelo, X, y) {
    return Math.sqrt(errorCuadraticoMedio(modelo, X, y));
  }

  // R² = 1 − SS_residual / SS_total (1 = ajuste perfecto, 0 = igual que predecir la media)
  function coeficienteDeterminacion(modelo, X, y) {
    const pred = predecir(modelo, X);
    const mu = y.reduce((a, b) => a + b, 0) / y.length;
    const ssRes = pred.reduce((s, p, i) => s + (y[i] - p) * (y[i] - p), 0);
    const ssTot = y.reduce((s, v) => s + (v - mu) * (v - mu), 0);
    if (ssTot === 0) return ssRes < 1e-9 ? 1 : 0;
    return 1 - ssRes / ssTot;
  }

  // Coeficientes en las unidades originales: y = intercepto + Σ coef_j · x_j
  function coeficientes(modelo) {
    validarModelo(modelo);
    const coef = modelo.pesos.map((w, j) => {
      const rango = modelo.max[j] - modelo.min[j];
      return rango === 0 ? 0 : modelo.yRango * w / rango;
    });
    let intercepto = modelo.bias;
    modelo.pesos.forEach((w, j) => {
      const rango = modelo.max[j] - modelo.min[j];
      if (rango !== 0) intercepto -= w * modelo.min[j] / rango;
    });
    return { coef, intercepto: modelo.yMin + modelo.yRango * intercepto };
  }

  // Ecuación legible, por ejemplo: "y = 12.30 + 3.10·semana"
  function ecuacion(modelo, nombres) {
    const { coef, intercepto } = coeficientes(modelo);
    const terminos = coef.map((c, j) => ({ c, nombre: (nombres && nombres[j]) || "x" + (j + 1) })).filter(t => Math.abs(t.c) > 1e-9)
      .map(t => `${t.c >= 0 ? "+" : "−"} ${Math.abs(t.c).toFixed(2)}·${t.nombre}`);
    return `y = ${intercepto.toFixed(2)} ${terminos.join(" ")}`.trim();
  }

  return { entrenar, predecir, errorCuadraticoMedio, raizErrorCuadratico, coeficienteDeterminacion, coeficientes, ecuacion };
})();
