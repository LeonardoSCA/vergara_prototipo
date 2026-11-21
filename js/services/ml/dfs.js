// ============================================
// Vergara.ml.dfs
// Búsqueda por profundidad (Depth-First Search) sobre un grafo pequeño de
// ejemplo, para encontrar caminos entre el almacén y un cliente.
//
// Justificación: se incluye solo para COMPARACIÓN. DFS prueba la EXISTENCIA de
// un camino pero no garantiza el más corto ni considera distancias, por lo que
// no sirve para optimizar rutas de reparto. Además de explorar(), ofrece
// todosLosCaminos() para listar todas las rutas posibles entre dos nodos.
//
// Grafo: objeto de listas de adyacencia, p. ej. { A: ["B", "C"], B: ["A"], C: ["A"] }.
// ============================================
window.Vergara = window.Vergara || {};
Vergara.ml = Vergara.ml || {};
Vergara.ml.dfs = (function () {

  // Devuelve {camino: [nodos] (vacío si no hay), visitados: [nodos en orden de visita]}
  function explorar(grafo, inicio, objetivo) {
    if (!grafo || !(inicio in grafo)) throw new Error("dfs: nodo de inicio inexistente");
    const visitados = [];
    const vistos = new Set();

    function visitar(nodo, camino) {
      vistos.add(nodo); visitados.push(nodo);
      if (nodo === objetivo) return camino;
      for (const vecino of grafo[nodo] || []) {
        if (!vistos.has(vecino)) {
          const r = visitar(vecino, camino.concat(vecino));
          if (r) return r;
        }
      }
      return null;
    }
    return { camino: visitar(inicio, [inicio]) || [], visitados };
  }

  // Todos los caminos simples (sin repetir nodos) entre inicio y objetivo
  function todosLosCaminos(grafo, inicio, objetivo) {
    const caminos = [];
    (function recorrer(nodo, camino) {
      if (nodo === objetivo) { caminos.push(camino); return; }
      (grafo[nodo] || []).forEach(v => { if (!camino.includes(v)) recorrer(v, camino.concat(v)); });
    })(inicio, [inicio]);
    return caminos;
  }

  return { explorar, todosLosCaminos };
})();
