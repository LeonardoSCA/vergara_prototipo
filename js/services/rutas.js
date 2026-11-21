/* Optimización de rutas de reparto sobre coordenadas 2D (km desde el almacén).
   Por defecto usa A* (Vergara.ml.aStar, ruta óptima). Mantiene el vecino más cercano como
   respaldo y como punto de comparación junto con Hill Climbing. */
Vergara.rutas = {
  ALMACEN: { x: 0, y: 0 },
  algoritmoActivo: "A*",

  listos() {
    return Vergara.state.pedidos.filter(p => p.estado === Vergara.ESTADO.LISTO);
  },

  // Vecino más cercano (heurística voraz). paradas: [{id?, x, y}] → {orden, indices, distanciaTotal, iteraciones}
  // (mismo formato que A* y Hill Climbing: orden = ids o {indice, x, y, ...}; indices = posiciones originales)
  vecinoMasCercano(origen, paradas) {
    const dist = Vergara.ml.aStar.distancia;
    const pendientes = paradas.map((_, i) => i);
    const orden = [];
    let actual = origen, total = 0, iteraciones = 0;
    while (pendientes.length) {
      iteraciones++;
      let mejor = 0;
      pendientes.forEach((idx, k) => { if (dist(paradas[idx], actual) < dist(paradas[pendientes[mejor]], actual)) mejor = k; });
      const idx = pendientes.splice(mejor, 1)[0];
      total += dist(paradas[idx], actual);
      orden.push(idx);
      actual = paradas[idx];
    }
    return { orden: Vergara.ml.aStar.representarOrden(paradas, orden), indices: orden, distanciaTotal: total, iteraciones };
  },

  // Ruta del día para los pedidos 'Listo': A* por defecto, vecino más cercano si A* falla
  calcular() {
    const pendientes = this.listos();
    if (!pendientes.length) return [];
    const paradas = pendientes.map(p => Vergara.pedidos.cliente(p));
    let resultado;
    try {
      resultado = Vergara.ml.aStar.optimizar(this.ALMACEN, paradas);
      this.algoritmoActivo = "A*";
    } catch (e) {
      resultado = this.vecinoMasCercano(this.ALMACEN, paradas);
      this.algoritmoActivo = "Vecino más cercano (respaldo)";
    }

    const dist = Vergara.ml.aStar.distancia;
    const ruta = [];
    let actual = this.ALMACEN, acumulado = 0;
    resultado.indices.forEach(i => {
      const pedido = pendientes[i], destino = paradas[i];
      pedido.kmTramo = dist(destino, actual);
      acumulado += pedido.kmTramo;
      pedido.km = acumulado;
      ruta.push(pedido);
      actual = destino;
    });
    return ruta;
  },

  // Ejecuta A*, Hill Climbing y vecino más cercano sobre los mismos pedidos y compara resultados
  compararAlgoritmos(pedidos) {
    pedidos = pedidos || this.listos();
    const r = this.compararParadas(pedidos.map(p => Vergara.pedidos.cliente(p)));
    [r.aStar, r.hillClimbing, r.nearestNeighbor].forEach(x => { x.pedidos = x.indices.map(i => pedidos[i]); });
    return r;
  },

  // Igual que compararAlgoritmos pero directamente sobre paradas [{x, y, ...}] (no necesita pedidos;
  // lo usa el escenario de prueba de 8 paradas, que no toca los datos reales)
  compararParadas(paradas) {
    const cfg = Vergara.data.config;
    const completar = (nombre, r) => Object.assign({ nombre }, r, {
      paradas: r.indices.map(i => paradas[i]),
      tiempoMin: r.distanciaTotal / cfg.velocidadKmH * 60 + paradas.length * cfg.minutosPorParada
    });

    const nn = completar("Vecino más cercano", this.vecinoMasCercano(this.ALMACEN, paradas));
    const hc = completar("Hill Climbing", Vergara.ml.hillClimbing.optimizar(this.ALMACEN, paradas, { semilla: 1 }));
    let as;
    try { as = completar("A*", Vergara.ml.aStar.optimizar(this.ALMACEN, paradas)); }
    catch (e) { as = completar("A* (no disponible: se usó vecino más cercano)", this.vecinoMasCercano(this.ALMACEN, paradas)); }

    const ahorro = r => (nn.distanciaTotal > 0 ? (nn.distanciaTotal - r.distanciaTotal) / nn.distanciaTotal * 100 : 0);
    [as, hc, nn].forEach(r => { r.ahorroPct = ahorro(r); });
    return { aStar: as, hillClimbing: hc, nearestNeighbor: nn };
  }
};
