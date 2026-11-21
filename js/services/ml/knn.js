// ============================================
// Vergara.ml.knn
// K-Nearest Neighbors: clasifica por voto mayoritario de los k vecinos más
// cercanos (distancia euclidiana sobre features numéricas normalizadas).
//
// Justificación: KNN se incluye como SEGUNDO clasificador para comparar contra
// el Árbol. Ventaja de KNN: no requiere entrenamiento, aprende de los datos al
// predecir. Desventaja: no genera reglas interpretables. Se usa como referencia.
//
// Detalle: las features se escalan a [0,1] con el mínimo y máximo del conjunto
// de entrenamiento, para que el monto (cientos de soles) no domine sobre el
// número de ítems (1 a 5) al calcular la distancia.
// ============================================
window.Vergara = window.Vergara || {};
Vergara.ml = Vergara.ml || {};
Vergara.ml.knn = (function () {

  // datos: [{features:{...numéricas}, label}]. "Entrenar" solo memoriza y calcula los límites de escala.
  function entrenar(datos, opciones) {
    const { k = 5 } = opciones || {};
    if (!Array.isArray(datos) || datos.length === 0) throw new Error("knn: se requieren datos de entrenamiento");
    const claves = Object.keys(datos[0].features);
    const matriz = datos.map(d => claves.map(c => Number(d.features[c])));
    const { min, max } = Vergara.ml.estadistica.minMax(matriz);
    return { datos, k, claves, min, max, normalizados: Vergara.ml.estadistica.normalizarMatriz(matriz, { min, max }).datos };
  }

  function predecir(modelo, features, opciones) {
    if (!modelo || !modelo.datos) throw new Error("knn: modelo inválido");
    const k = (opciones && opciones.k) || modelo.k;
    if (k > modelo.datos.length) throw new Error("knn: k (" + k + ") no puede ser mayor que el número de muestras (" + modelo.datos.length + ")");

    const punto = Vergara.ml.estadistica.normalizarMatriz(
      [modelo.claves.map(c => Number(features[c]))], { min: modelo.min, max: modelo.max }).datos[0];

    const vecinos = modelo.normalizados
      .map((fila, i) => ({ i, d: Vergara.ml.estadistica.distanciaEuclidiana(fila, punto) }))
      .sort((a, b) => a.d - b.d || a.i - b.i)
      .slice(0, k);

    const votos = {};
    vecinos.forEach(v => { const l = modelo.datos[v.i].label; votos[l] = (votos[l] || 0) + 1; });
    // En caso de empate gana la clase del vecino más cercano entre las empatadas
    const maxVotos = Math.max(...Object.values(votos));
    const label = modelo.datos[vecinos.find(v => votos[modelo.datos[v.i].label] === maxVotos).i].label;
    return { label, votos };
  }

  return { entrenar, predecir };
})();
