// ============================================
// Vergara.ml.aStar
// Búsqueda A* para ordenar las paradas de reparto (ruta abierta desde el
// almacén, sin regreso), con f = g + h:
//   g = distancia ya recorrida
//   h = distancia desde el punto actual hasta la parada pendiente MÁS LEJANA
// Justificación: A* es una búsqueda informada que, con una heurística
// ADMISIBLE (nunca sobrestima el costo restante), garantiza la ruta óptima.
// Aquí h es admisible porque cualquier ruta que visite todas las paradas
// pendientes debe, como mínimo, llegar hasta la más lejana. Se compara contra
// Hill Climbing y Vecino más cercano para mostrar el costo/beneficio de cada
// enfoque. El costo es exponencial en el número de paradas, por eso se limita
// el número de expansiones (para muchas paradas convendría un algoritmo genético).
//
// Estado de búsqueda: (conjunto de paradas visitadas, parada actual).
// Las coordenadas del prototipo están en km sobre un plano, por lo que la
// distancia es euclidiana; para coordenadas GPS reales se incluye haversine().
// ============================================
window.Vergara = window.Vergara || {};
Vergara.ml = Vergara.ml || {};
Vergara.ml.aStar = (function () {

  const euclidiana = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // Distancia en km entre dos coordenadas GPS (grados). Para uso con latitud/longitud reales.
  function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371, rad = g => g * Math.PI / 180;
    const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  // Cola de prioridad mínima (montículo binario) ordenada por f y, en empate, por mayor g
  function crearCola() {
    const h = [];
    const menor = (a, b) => a.f < b.f - 1e-12 || (Math.abs(a.f - b.f) <= 1e-12 && a.g > b.g);
    return {
      get tamano() { return h.length; },
      push(x) {
        h.push(x);
        let i = h.length - 1;
        while (i > 0) { const p = (i - 1) >> 1; if (!menor(h[i], h[p])) break; [h[i], h[p]] = [h[p], h[i]]; i = p; }
      },
      pop() {
        const top = h[0], ultimo = h.pop();
        if (h.length) {
          h[0] = ultimo;
          let i = 0;
          for (;;) {
            let m = i; const l = 2 * i + 1, r = l + 1;
            if (l < h.length && menor(h[l], h[m])) m = l;
            if (r < h.length && menor(h[r], h[m])) m = r;
            if (m === i) break;
            [h[i], h[m]] = [h[m], h[i]]; i = m;
          }
        }
        return top;
      }
    };
  }

  // Representa un orden de paradas: el `id` de cada parada cuando existe; si no, un objeto
  // {indice, x, y, ...} con la posición original de la parada y sus datos.
  // (A*, Hill Climbing y el vecino más cercano comparten este formato.)
  function representarOrden(paradas, indices) {
    return indices.map(i => {
      const p = paradas[i];
      return p.id !== undefined ? p.id : Object.assign({ indice: i }, p);
    });
  }

  // origen: {x, y}; paradas: [{id?, x, y, ...}].
  // Devuelve {orden, indices, distanciaTotal, iteraciones}:
  //   orden   → ids de las paradas (o {indice, x, y, ...} si no tienen id), en el orden de visita
  //   indices → posiciones originales de las paradas en el arreglo recibido
  function optimizar(origen, paradas, opciones) {
    const { maxExpansiones = 200000 } = opciones || {};
    const n = paradas.length;
    if (n === 0) return { orden: [], indices: [], distanciaTotal: 0, iteraciones: 0 };
    if (n > 24) throw new Error("aStar: demasiadas paradas (" + n + "); máximo 24");

    const completo = (1 << n) - 1;
    const pos = idx => (idx < 0 ? origen : paradas[idx]);
    const heuristica = (mask, idx) => {
      let max = 0;
      for (let j = 0; j < n; j++) if (!(mask & (1 << j))) max = Math.max(max, euclidiana(pos(idx), paradas[j]));
      return max;
    };

    const cola = crearCola();
    const mejorG = new Map();
    const clave = (mask, idx) => mask * 32 + (idx + 1);
    cola.push({ mask: 0, idx: -1, g: 0, f: heuristica(0, -1), padre: null });
    mejorG.set(clave(0, -1), 0);
    let iteraciones = 0;

    while (cola.tamano) {
      const nodo = cola.pop();
      if (nodo.g > mejorG.get(clave(nodo.mask, nodo.idx)) + 1e-12) continue;   // entrada obsoleta
      iteraciones++;
      if (iteraciones > maxExpansiones) throw new Error("aStar: se superó el límite de expansiones");

      if (nodo.mask === completo) {
        const indices = [];
        for (let x = nodo; x.padre; x = x.padre) indices.unshift(x.idx);
        return { orden: representarOrden(paradas, indices), indices, distanciaTotal: nodo.g, iteraciones };
      }
      for (let j = 0; j < n; j++) {
        if (nodo.mask & (1 << j)) continue;
        const mask2 = nodo.mask | (1 << j);
        const g2 = nodo.g + euclidiana(pos(nodo.idx), paradas[j]);
        const k = clave(mask2, j);
        if (g2 < (mejorG.has(k) ? mejorG.get(k) : Infinity) - 1e-12) {
          mejorG.set(k, g2);
          cola.push({ mask: mask2, idx: j, g: g2, f: g2 + heuristica(mask2, j), padre: nodo });
        }
      }
    }
    throw new Error("aStar: no se encontró ruta");
  }

  return { optimizar, representarOrden, haversine, distancia: euclidiana };
})();
