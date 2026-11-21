// ============================================
// Vergara.ml.bfs
// Búsqueda por anchura (Breadth-First Search) sobre un grafo pequeño de
// ejemplo, para encontrar el camino entre el almacén y un cliente.
//
// Justificación: se incluye solo para COMPARACIÓN. BFS encuentra el camino con
// MENOS SALTOS, pero no considera distancias, por lo que no sirve para
// optimizar rutas de reparto (un camino con pocos tramos puede ser mucho más
// largo en kilómetros).
//
// Grafo: objeto de listas de adyacencia, p. ej. { A: ["B", "C"], B: ["A"], C: ["A"] }.
// ============================================
window.Vergara = window.Vergara || {};
Vergara.ml = Vergara.ml || {};
Vergara.ml.bfs = (function () {

  // Devuelve {camino: [nodos] (vacío si no hay), visitados: [nodos en orden de visita]}
  function explorar(grafo, inicio, objetivo) {
    if (!grafo || !(inicio in grafo)) throw new Error("bfs: nodo de inicio inexistente");
    const visitados = [inicio];
    const padre = { [inicio]: null };
    const cola = [inicio];

    while (cola.length) {
      const actual = cola.shift();
      if (actual === objetivo) {
        const camino = [];
        for (let n = actual; n !== null; n = padre[n]) camino.unshift(n);
        return { camino, visitados };
      }
      (grafo[actual] || []).forEach(vecino => {
        if (!(vecino in padre)) { padre[vecino] = actual; visitados.push(vecino); cola.push(vecino); }
      });
    }
    return { camino: [], visitados };
  }

  return { explorar };
})();
