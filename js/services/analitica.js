/* Analítica de clientes y pedidos con Machine Learning.
   - Segmentación de clientes con K-Means (Vergara.ml.kmeans).
   - Detección de pedidos anómalos con DBSCAN (Vergara.ml.dbscan).
   Combina el historial de compras de data.js (solo para análisis) con los pedidos reales de la sesión. */
Vergara.analitica = {
  SEGMENTOS: ["VIP", "Recurrente", "Ocasional", "En riesgo"],
  DIA_MS: 86400000,

  // Pedidos históricos + pedidos creados en la sesión, con la misma forma
  pedidosAnaliticos() {
    const s = Vergara.state;
    const historicos = Vergara.data.analitica.pedidos.map((p, i) => ({ id: "H" + (i + 1), cliente: p.cliente, monto: p.monto, numItems: p.numItems, diasAtras: p.diasAtras, origen: "histórico" }));
    const reales = s.pedidos.map(o => ({
      id: "#" + o.id, cliente: Vergara.pedidos.cliente(o).nombre, monto: o.total, numItems: o.items.length,
      diasAtras: (Date.now() - o.creado) / this.DIA_MS, origen: "sesión"
    }));
    return historicos.concat(reales);
  },

  // Un registro por cliente: frecuencia, ticket promedio y días desde la última compra
  resumenClientes() {
    const grupos = {};
    this.pedidosAnaliticos().forEach(p => { (grupos[p.cliente] = grupos[p.cliente] || []).push(p); });
    return Object.keys(grupos).map(nombre => {
      const ps = grupos[nombre];
      return {
        nombre, frecuencia: ps.length,
        ticketPromedio: ps.reduce((a, p) => a + p.monto, 0) / ps.length,
        diasDesdeUltimaCompra: Math.min(...ps.map(p => p.diasAtras))
      };
    });
  },

  // K-Means (k=4) sobre features normalizadas; nombra los clusters por ticket promedio descendente
  segmentar() {
    const K = Vergara.ml.kmeans, E = Vergara.ml.estadistica;
    const clientes = this.resumenClientes();
    const crudos = clientes.map(c => [c.frecuencia, c.ticketPromedio, c.diasDesdeUltimaCompra]);
    const { datos } = E.normalizarMatriz(crudos);
    const k = Math.min(4, clientes.length);
    const modelo = K.entrenar(datos, { k, semilla: 7 });

    // Cluster con mayor ticket del centroide → "VIP", y así sucesivamente
    const orden = modelo.centroides.map((c, i) => ({ i, ticket: c[1] })).sort((a, b) => b.ticket - a.ticket);
    const nombrePorCluster = {};
    orden.forEach((o, pos) => { nombrePorCluster[o.i] = this.SEGMENTOS[pos]; });

    const filas = clientes.map((c, i) => Object.assign({}, c, { segmento: nombrePorCluster[modelo.asignaciones[i]] }));
    const distribucion = {};
    this.SEGMENTOS.forEach(n => { distribucion[n] = filas.filter(f => f.segmento === n).length; });

    // Guarda el segmento de cada cliente (persistente en localStorage)
    const s = Vergara.state;
    let cambio = false;
    filas.forEach(f => { if (s.segmentos[f.nombre] !== f.segmento) { s.segmentos[f.nombre] = f.segmento; cambio = true; } });
    if (cambio && Vergara.storage) Vergara.storage.guardar();

    return {
      filas, distribucion, k,
      silhouette: K.silhouetteScore(datos, modelo.asignaciones),
      codo: K.metodoDelCodo(datos, { kMin: 2, kMax: 6 }),
      iteraciones: modelo.iteraciones
    };
  },

  // DBSCAN sobre [monto, numItems] normalizados: los pedidos con label -1 son anómalos
  anomalias(opciones) {
    const { eps = 0.15, minSamples = 3 } = opciones || {};
    const pedidos = this.pedidosAnaliticos();
    const { datos } = Vergara.ml.estadistica.normalizarMatriz(pedidos.map(p => [p.monto, p.numItems]));
    const r = Vergara.ml.dbscan.entrenar(datos, { eps, minSamples });
    return {
      total: pedidos.length, eps, minSamples, nClusters: r.nClusters,
      anomalos: r.outliers.map(i => pedidos[i]),
      normales: pedidos.length - r.outliers.length
    };
  }
};
