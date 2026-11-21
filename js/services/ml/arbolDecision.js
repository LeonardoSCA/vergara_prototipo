// ============================================
// Vergara.ml.arbolDecision
// Árbol de decisión (ID3 simplificado) con ganancia de información por
// ENTROPÍA y splits por umbral numérico. Clasifica el riesgo de un pedido
// en 'bajo' | 'medio' | 'alto' y puede imprimir sus reglas legibles.
//
// Justificación: se eligió Árbol de Decisión sobre SVM/KNN porque produce
// REGLAS interpretables ("SI monto > 500 Y distrito=Comas ENTONCES riesgo alto").
// La gerencia necesita ENTENDER por qué un pedido es riesgoso. SVM y KNN son
// cajas negras.
//
// Algoritmo (recursivo):
//   1. Si todas las muestras tienen la misma clase, o se alcanzó maxDepth, o hay
//      menos de minSamplesSplit muestras → crear HOJA (clase mayoritaria).
//   2. Si no, probar cada feature con cada umbral candidato (punto medio entre
//      valores consecutivos) y elegir el de mayor ganancia de información:
//          Ganancia = H(padre) − Σ (n_hijo / n) · H(hijo)
//          H(S) = −Σ p_i · log2(p_i)
//   3. Dividir en izquierda (valor <= umbral) y derecha (valor > umbral).
// ============================================
window.Vergara = window.Vergara || {};
Vergara.ml = Vergara.ml || {};
Vergara.ml.arbolDecision = (function () {

  // Codificación numérica del distrito (el árbol solo divide por umbrales numéricos)
  const DISTRITOS = { "Comas": 1, "Los Olivos": 2, "Independencia": 3, "San Martín de Porres": 4 };
  const NOMBRES_DISTRITO = Object.keys(DISTRITOS).reduce((o, n) => { o[DISTRITOS[n]] = n; return o; }, {});

  function codigoDistrito(d) {
    return typeof d === "number" ? d : (DISTRITOS[d] || 0);
  }

  function preprocesarFeatures(features) {
    const f = Object.assign({}, features);
    f.distrito = codigoDistrito(features.distrito);
    return f;
  }

  // Convierte el distrito de texto a número en todo el conjunto de datos
  function preprocesar(datos) {
    return datos.map(d => ({ features: preprocesarFeatures(d.features), label: d.label }));
  }

  // H(S) = −Σ p·log2(p). 0 si el conjunto es puro; 1 si es 50/50 con dos clases
  function calcularEntropia(labels) {
    if (!labels.length) return 0;
    const conteo = {};
    labels.forEach(l => { conteo[l] = (conteo[l] || 0) + 1; });
    return Object.keys(conteo).reduce((h, k) => {
      const p = conteo[k] / labels.length;
      return h - p * Math.log2(p);
    }, 0);
  }

  function particionar(datos, feature, umbral) {
    const izq = [], der = [];
    datos.forEach(d => (d.features[feature] <= umbral ? izq : der).push(d));
    return { izq, der };
  }

  // Ganancia de información de dividir por (feature <= umbral)
  function calcularGanancia(datos, feature, umbral) {
    const { izq, der } = particionar(datos, feature, umbral);
    if (!izq.length || !der.length) return 0;
    const n = datos.length;
    const hPadre = calcularEntropia(datos.map(d => d.label));
    const hHijos = (izq.length / n) * calcularEntropia(izq.map(d => d.label))
                 + (der.length / n) * calcularEntropia(der.map(d => d.label));
    return hPadre - hHijos;
  }

  // Mejor (feature, umbral) por ganancia; null si ningún split aporta información
  function encontrarMejorSplit(datos) {
    if (!datos.length) return null;
    let mejor = null;
    Object.keys(datos[0].features).forEach(feature => {
      const valores = Array.from(new Set(datos.map(d => d.features[feature]))).sort((a, b) => a - b);
      for (let i = 0; i < valores.length - 1; i++) {
        const umbral = (valores[i] + valores[i + 1]) / 2;
        const ganancia = calcularGanancia(datos, feature, umbral);
        if (ganancia > 1e-12 && (!mejor || ganancia > mejor.ganancia + 1e-12)) mejor = { feature, umbral, ganancia };
      }
    });
    return mejor;
  }

  function hoja(datos) {
    const conteo = {};
    datos.forEach(d => { conteo[d.label] = (conteo[d.label] || 0) + 1; });
    const label = Object.keys(conteo).sort().reduce((a, b) => (conteo[b] > conteo[a] ? b : a));
    return { tipo: "hoja", label, prob: conteo[label] / datos.length, samples: datos.length };
  }

  function construir(datos, profundidad, maxDepth, minSamplesSplit) {
    const puro = new Set(datos.map(d => d.label)).size === 1;
    if (puro || profundidad >= maxDepth || datos.length < minSamplesSplit) return hoja(datos);
    const split = encontrarMejorSplit(datos);
    if (!split) return hoja(datos);
    const { izq, der } = particionar(datos, split.feature, split.umbral);
    return {
      tipo: "nodo", feature: split.feature, umbral: split.umbral, ganancia: split.ganancia, samples: datos.length,
      izq: construir(izq, profundidad + 1, maxDepth, minSamplesSplit),
      der: construir(der, profundidad + 1, maxDepth, minSamplesSplit)
    };
  }

  // datos: [{features:{monto,numItems,distrito,clienteHistorial,clienteCumplimiento}, label}]
  function entrenar(datos, opciones) {
    const { maxDepth = 5, minSamplesSplit = 2 } = opciones || {};
    if (!Array.isArray(datos) || datos.length === 0) throw new Error("arbolDecision: se requieren datos de entrenamiento");
    return construir(preprocesar(datos), 0, maxDepth, minSamplesSplit);
  }

  function predecir(arbol, features) {
    if (!arbol || !arbol.tipo) throw new Error("arbolDecision: árbol inválido");
    const f = preprocesarFeatures(features);
    let nodo = arbol;
    while (nodo.tipo === "nodo") nodo = f[nodo.feature] <= nodo.umbral ? nodo.izq : nodo.der;
    return { label: nodo.label, probabilidad: nodo.prob };
  }

  // Condiciones legibles de las dos ramas de un nodo
  function condiciones(nodo) {
    const u = Math.round(nodo.umbral * 100) / 100;
    if (nodo.feature === "distrito") {
      const codigos = Object.keys(NOMBRES_DISTRITO).map(Number);
      const nombres = lista => (lista.length === 1 ? "distrito = " + NOMBRES_DISTRITO[lista[0]]
        : "distrito en {" + lista.map(c => NOMBRES_DISTRITO[c]).join(", ") + "}");
      return [nombres(codigos.filter(c => c <= nodo.umbral)), nombres(codigos.filter(c => c > nodo.umbral))];
    }
    return [`${nodo.feature} <= ${u}`, `${nodo.feature} > ${u}`];
  }

  // Una regla por hoja: "SI monto > 500 Y distrito = Comas ENTONCES riesgo=alto"
  // opciones.nivel = sangría inicial; el tercer parámetro es interno (camino recorrido)
  function imprimirReglas(arbol, opciones, camino) {
    const nivel = (opciones && opciones.nivel) || 0;
    camino = camino || [];
    if (arbol.tipo === "hoja") {
      const cond = camino.length ? "SI " + camino.join(" Y ") : "SIEMPRE";
      return `${"  ".repeat(nivel)}${cond} ENTONCES riesgo=${arbol.label} (${Math.round(arbol.prob * 100)}% · ${arbol.samples} casos)`;
    }
    const [cIzq, cDer] = condiciones(arbol);
    return imprimirReglas(arbol.izq, opciones, camino.concat(cIzq)) + "\n" + imprimirReglas(arbol.der, opciones, camino.concat(cDer));
  }

  // Precisión sobre un conjunto etiquetado (para PRUEBAS.md)
  function exactitud(arbol, datos) {
    const ok = datos.filter(d => predecir(arbol, d.features).label === d.label).length;
    return ok / datos.length;
  }

  return {
    DISTRITOS, NOMBRES_DISTRITO, codigoDistrito, preprocesarFeatures, preprocesar, calcularEntropia, calcularGanancia,
    encontrarMejorSplit, entrenar, predecir, imprimirReglas, exactitud
  };
})();
