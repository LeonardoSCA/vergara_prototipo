// ============================================
// Vergara.ml.metricas — Métricas de validación de los modelos
//
// Justificación: la exactitud sobre los datos de entrenamiento no mide
// desempeño real. Con un dataset pequeño (30 pedidos etiquetados) se usa
// VALIDACIÓN CRUZADA LEAVE-ONE-OUT (LOO) porque:
//   1. Aprovecha todos los datos: cada muestra se usa una vez como prueba y
//      el resto (n-1) como entrenamiento; no se "gasta" un conjunto de prueba.
//   2. Es determinista (no depende de un reparto aleatorio de datos).
//   3. Su costo (n entrenamientos) es aceptable con n = 17 o 30.
// Además calcula el silhouette de K-Means sobre el historial de clientes.
//
// Es autónomo: solo necesita data.js y los módulos ml/ (no depende de la UI,
// no escribe en el estado ni en localStorage). Uso desde la consola:
//     Vergara.ml.metricas.calcularTodo()
// ============================================
Vergara.ml = Vergara.ml || {};
Vergara.ml.metricas = (function () {

  // Mismos hiperparámetros con los que pedidos.js entrena el SVM del prototipo
  const PARAMS_SVM = { learningRate: 0.1, epochs: 2000, lambda: 0.05 };

  // Accuracy leave-one-out genérica: entrenar(resto) devuelve un modelo y
  // predecir(modelo, muestra) devuelve la etiqueta; etiqueta(muestra) la real.
  function leaveOneOut(muestras, entrenar, predecir, etiqueta) {
    let aciertos = 0;
    muestras.forEach((muestra, i) => {
      const resto = muestras.filter((_, j) => j !== i);
      if (predecir(entrenar(resto), muestra) === etiqueta(muestra)) aciertos++;
    });
    return aciertos / muestras.length;
  }

  // Accuracy sobre los mismos datos de entrenamiento (referencia, es optimista)
  function accuracyEntrenamiento(muestras, entrenar, predecir, etiqueta) {
    const modelo = entrenar(muestras);
    return muestras.filter(m => predecir(modelo, m) === etiqueta(m)).length / muestras.length;
  }

  const etiqueta = m => m.label;
  const vectorSvm = f => [f.monto, f.numItems, f.clienteHistorial, f.clienteCumplimiento];

  // --- Árbol de decisión (3 clases) ---
  function arbol() {
    const A = Vergara.ml.arbolDecision, datos = Vergara.data.historicoRiesgo;
    const entrenar = d => A.entrenar(d, { maxDepth: 5, minSamplesSplit: 2 });
    const predecir = (modelo, m) => A.predecir(modelo, m.features).label;
    return {
      muestras: datos.length,
      entrenamiento: accuracyEntrenamiento(datos, entrenar, predecir, etiqueta),
      loo: leaveOneOut(datos, entrenar, predecir, etiqueta)
    };
  }

  // --- KNN, k = 5 (3 clases) ---
  function knn() {
    const A = Vergara.ml.arbolDecision, K = Vergara.ml.knn, datos = Vergara.data.historicoRiesgo;
    const entrenar = d => K.entrenar(A.preprocesar(d), { k: 5 });
    const predecir = (modelo, m) => K.predecir(modelo, A.preprocesarFeatures(m.features)).label;
    return {
      muestras: datos.length,
      entrenamiento: accuracyEntrenamiento(datos, entrenar, predecir, etiqueta),
      loo: leaveOneOut(datos, entrenar, predecir, etiqueta)
    };
  }

  // --- SVM lineal (binario alto/bajo; los "medio" se excluyen) ---
  function svm() {
    const S = Vergara.ml.svm;
    const datos = Vergara.data.historicoRiesgo.filter(d => d.label !== "medio");
    const entrenar = d => S.entrenar(d.map(m => vectorSvm(m.features)), d.map(m => (m.label === "alto" ? 1 : -1)), PARAMS_SVM);
    const predecir = (modelo, m) => (S.predecir(modelo, vectorSvm(m.features)) === 1 ? "alto" : "bajo");
    return {
      muestras: datos.length,
      entrenamiento: accuracyEntrenamiento(datos, entrenar, predecir, etiqueta),
      loo: leaveOneOut(datos, entrenar, predecir, etiqueta)
    };
  }

  // --- K-Means (k = 4): silhouette sobre el historial de 16 clientes ---
  // Mismas features y normalización que analitica.js: [frecuencia, ticket, días desde última compra]
  function silhouetteKMeans() {
    const grupos = {};
    Vergara.data.analitica.pedidos.forEach(p => { (grupos[p.cliente] = grupos[p.cliente] || []).push(p); });
    const crudos = Object.keys(grupos).map(nombre => {
      const ps = grupos[nombre];
      return [ps.length, ps.reduce((a, p) => a + p.monto, 0) / ps.length, Math.min(...ps.map(p => p.diasAtras))];
    });
    const { datos } = Vergara.ml.estadistica.normalizarMatriz(crudos);
    const k = Math.min(4, crudos.length);
    const modelo = Vergara.ml.kmeans.entrenar(datos, { k, semilla: 7 });
    return { clientes: crudos.length, k, silhouette: Vergara.ml.kmeans.silhouetteScore(datos, modelo.asignaciones) };
  }

  const pct = x => (x * 100).toFixed(1) + " %";

  // Calcula todo, lo imprime en la consola y devuelve los números
  function calcularTodo() {
    const resultado = { arbol: arbol(), knn: knn(), svm: svm(), kmeans: silhouetteKMeans() };
    console.log("=== Vergara · Métricas de validación (leave-one-out) ===");
    console.table([
      { Modelo: "Árbol de decisión (3 clases)", Muestras: resultado.arbol.muestras, "Accuracy entrenamiento": pct(resultado.arbol.entrenamiento), "Accuracy LOO": pct(resultado.arbol.loo) },
      { Modelo: "KNN k=5 (3 clases)", Muestras: resultado.knn.muestras, "Accuracy entrenamiento": pct(resultado.knn.entrenamiento), "Accuracy LOO": pct(resultado.knn.loo) },
      { Modelo: "SVM lineal (alto/bajo)", Muestras: resultado.svm.muestras, "Accuracy entrenamiento": pct(resultado.svm.entrenamiento), "Accuracy LOO": pct(resultado.svm.loo) }
    ]);
    console.log("K-Means (k=" + resultado.kmeans.k + ", " + resultado.kmeans.clientes + " clientes) · silhouette = " + resultado.kmeans.silhouette.toFixed(3));
    return resultado;
  }

  return { calcularTodo, arbol, knn, svm, silhouetteKMeans, leaveOneOut };
})();
