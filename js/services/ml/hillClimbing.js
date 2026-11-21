// ============================================
// Vergara.ml.hillClimbing
// Hill Climbing con vecindad por intercambio (swap) de paradas adyacentes,
// partiendo de un orden aleatorio y aceptando solo mejoras de distancia.
//
// Justificación: es una búsqueda local muy barata y simple de explicar; sirve
// para mostrar que puede quedar atrapada en óptimos locales frente a A* (que sí
// garantiza el óptimo). Su costo crece de forma lineal con las paradas, no
// exponencial.
//
// Algoritmo:
//   1. Orden inicial aleatorio (generador con semilla → resultados reproducibles).
//   2. Evaluar todos los vecinos: intercambiar dos paradas adyacentes.
//   3. Si el mejor vecino reduce la distancia total, moverse a él y repetir.
//   4. Si ningún vecino mejora → se detiene (óptimo local).
// ============================================
window.Vergara = window.Vergara || {};
Vergara.ml = Vergara.ml || {};
Vergara.ml.hillClimbing = (function () {

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // Longitud de la ruta abierta origen → paradas[orden[0]] → paradas[orden[1]] → ...
  function distanciaRuta(origen, paradas, orden) {
    let total = 0, actual = origen;
    orden.forEach(i => { total += dist(actual, paradas[i]); actual = paradas[i]; });
    return total;
  }

  // Devuelve {orden, indices, distanciaTotal, iteraciones, ordenInicial, indicesIniciales, distanciaInicial}
  //   orden / ordenInicial → ids de las paradas (o {indice, x, y, ...} si no tienen id), como en A*
  //   indices / indicesIniciales → posiciones originales de las paradas en el arreglo recibido
  function optimizar(origen, paradas, opciones) {
    const { semilla = 1 } = opciones || {};
    const n = paradas.length;
    const azar = Vergara.ml.estadistica.aleatorio(semilla);

    // Orden inicial aleatorio (Fisher-Yates)
    const orden = paradas.map((_, i) => i);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(azar() * (i + 1)); [orden[i], orden[j]] = [orden[j], orden[i]]; }
    const ordenInicial = orden.slice();
    let actual = distanciaRuta(origen, paradas, orden);
    const distanciaInicial = actual;

    let iteraciones = 0;
    for (;;) {
      iteraciones++;
      let mejorI = -1, mejorDist = actual;
      for (let i = 0; i < n - 1; i++) {
        [orden[i], orden[i + 1]] = [orden[i + 1], orden[i]];
        const d = distanciaRuta(origen, paradas, orden);
        if (d < mejorDist - 1e-12) { mejorDist = d; mejorI = i; }
        [orden[i], orden[i + 1]] = [orden[i + 1], orden[i]];   // deshacer
      }
      if (mejorI < 0) break;   // ningún vecino mejora: óptimo local
      [orden[mejorI], orden[mejorI + 1]] = [orden[mejorI + 1], orden[mejorI]];
      actual = mejorDist;
    }
    const repr = Vergara.ml.aStar.representarOrden;   // aStar.js se carga antes que este archivo
    return {
      orden: repr(paradas, orden), indices: orden.slice(), distanciaTotal: actual, iteraciones,
      ordenInicial: repr(paradas, ordenInicial), indicesIniciales: ordenInicial, distanciaInicial
    };
  }

  return { optimizar, distanciaRuta };
})();
