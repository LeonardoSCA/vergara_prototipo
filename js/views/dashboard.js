/* Vista: Dashboard ejecutivo (KPIs, ventas por producto y demanda proyectada) */
Vergara.views.dashboard = function () {
  const s = Vergara.state, ui = Vergara.ui, ESTADO = Vergara.ESTADO;
  const entregados = s.pedidos.filter(o => o.estado === ESTADO.ENTREGADO);
  const pctEntregas = s.pedidos.length ? Math.round(entregados.length / s.pedidos.length * 100) : 0;
  const ventas = s.pedidos.reduce((suma, o) => suma + o.total, 0);
  const costoDist = entregados.reduce((a, o) => a + (o.kmTramo || 0), 0) * Vergara.data.config.costoPorKm;
  const tiempos = entregados.map(o => o.entregado - o.creado);
  const tiempoProm = tiempos.length ? ui.duracion(tiempos.reduce((a, b) => a + b, 0) / tiempos.length) : "–";

  const barras = (filas, formato) => {
    const max = Math.max(...filas.map(f => f.valor), 1);
    return filas.map(f => `<div class="fila"><span style="min-width:120px">${f.nombre}</span>
      <span style="flex:1;min-width:100px"><div class="barra" style="width:${f.valor / max * 100}%"></div></span>${formato(f)}</div>`).join("");
  };

  const ventasProd = barras(s.productos.map(p => ({ nombre: p.nombre, valor: Vergara.prediccion.unidadesVendidasEnSesion(p.codigo) })),
    f => `<span>${f.valor} und</span>`);

  const proy = s.productos.map(p => ({ nombre: p.nombre, valor: Vergara.prediccion.demanda30Dias(p), r2: Vergara.prediccion.confianza(p), p }));
  const demanda = barras(proy, f => {
    const ok = f.p.stock >= f.valor;
    return `<span>${f.valor} und</span><span class="${ok ? "ok" : "bad"}">${ok ? "Cubierto" : "Faltan " + (f.valor - f.p.stock)}</span>
      <span class="muted" title="Confiabilidad de la predicción: R² = ${f.r2.toFixed(2)} (Regresión Lineal)">ⓘ</span>
      ${f.r2 < 0.5 ? '<span class="warn">⚠ Modelo con baja confianza</span>' : ""}`;
  });

  // --- Análisis descriptivo de ventas semanales (Vergara.ml.estadistica) ---
  const E = Vergara.ml.estadistica;
  const fmt = n => (Math.round(n * 100) / 100).toString();
  const resumenes = s.productos.map(p => ({ p, r: E.resumen(p.historial) }));
  const tablaStats = `<div class="tabla-scroll"><table class="tabla">
      <thead><tr><th>Producto</th><th>Media</th><th>Mediana</th><th>Moda</th><th>Varianza</th><th>Desv. est.</th><th>Mín</th><th>Máx</th><th>Rango normal</th></tr></thead>
      <tbody>${resumenes.map(({ p, r }) => `<tr><td>${p.nombre}</td><td>${fmt(r.media)}</td><td>${fmt(r.mediana)}</td><td>${fmt(r.moda)}</td>
        <td>${fmt(r.varianza)}</td><td>${fmt(r.std)}</td><td>${r.min}</td><td>${r.max}</td>
        <td>${fmt(r.rango.inferior)} – ${fmt(r.rango.superior)}</td></tr>`).join("")}</tbody></table></div>`;
  const listaOutliers = resumenes.flatMap(({ p, r }) => r.outliers.map(o =>
    `<div class="fila"><span>${p.nombre} · semana ${o.indice + 1}</span><b class="bad">${o.valor} und</b><span class="muted">${o.motivo}</span></div>`)).join("")
    || '<p class="muted">No se detectaron valores atípicos en las ventas semanales.</p>';
  const analisis = `<section class="card"><h2>Análisis descriptivo de ventas semanales</h2>
      <p class="muted">Estadística de las últimas 6 semanas de cada producto (varianza poblacional).</p>${tablaStats}
      <h3>Valores atípicos (outliers)</h3>${listaOutliers}
      <p class="muted">Los valores fuera del rango Q1 − 1.5·IQR a Q3 + 1.5·IQR (columna "Rango normal") son atípicos:
      se alejan del comportamiento habitual de ventas y conviene revisarlos antes de usarlos para predecir.</p></section>`;

  // --- Segmentación de clientes (K-Means) ---
  const seg = Vergara.analitica.segmentar();
  const clasesSeg = { "VIP": "ok", "Recurrente": "ok", "Ocasional": "warn", "En riesgo": "bad" };
  const tablaSeg = `<div class="tabla-scroll"><table class="tabla">
      <thead><tr><th>Cliente</th><th>Frecuencia</th><th>Ticket prom.</th><th>Días desde última compra</th><th>Segmento</th></tr></thead>
      <tbody>${seg.filas.map(f => `<tr><td>${f.nombre}</td><td>${f.frecuencia}</td><td>${ui.moneda(f.ticketPromedio)}</td>
        <td>${Math.round(f.diasDesdeUltimaCompra)}</td><td><b class="${clasesSeg[f.segmento]}">${f.segmento}</b></td></tr>`).join("")}</tbody></table></div>`;
  const barrasSeg = barras(Vergara.analitica.SEGMENTOS.map(n => ({ nombre: n, valor: seg.distribucion[n] })), f => `<span>${f.valor} clientes</span>`);
  const segmentacion = `<section class="card"><h2>Segmentación de Clientes</h2>
      <p class="muted" title="K-Means con k = 4 sobre frecuencia, ticket promedio y días desde la última compra (normalizados con min-max). Silhouette = ${seg.silhouette.toFixed(2)} (cercano a 1 = grupos bien separados). La inercia deja de bajar de forma notable a partir de k = 4 (método del codo).">Los clientes se agrupan automáticamente según su frecuencia de compra, su ticket promedio y los días desde su última compra.
      Los grupos se ordenan del que más compra al que menos.</p>
      ${tablaSeg}
      <h3>Distribución de segmentos</h3>${barrasSeg}</section>`;

  // --- Detección de anomalías en pedidos (DBSCAN) ---
  const an = Vergara.analitica.anomalias({ eps: 0.15, minSamples: 3 });
  const listaAnom = an.anomalos.map(p => `<div class="fila"><div class="col-nombre"><b>${p.id} · ${p.cliente}</b><br>
      <span class="muted">${p.origen === "sesión" ? "Pedido de esta sesión" : "Pedido histórico"}</span></div>
      <span>${ui.moneda(p.monto)}</span><span>${p.numItems} ${p.numItems === 1 ? "ítem" : "ítems"}</span></div>`).join("")
    || '<p class="muted">No se detectaron pedidos atípicos.</p>';
  const anomalias = `<section class="card"><h2>Detección de Pedidos Atípicos</h2>
      <p class="muted" title="DBSCAN sobre [monto, nº de ítems] normalizados (eps = ${an.eps}, mínimo de vecinos = ${an.minSamples}).">Pedidos cuyo monto y cantidad de productos se alejan de lo habitual.</p>
      <div class="kpis">
        <div class="card kpi"><small>Pedidos analizados</small><b>${an.total}</b></div>
        <div class="card kpi"><small>Normales</small><b class="ok">${an.normales}</b></div>
        <div class="card kpi"><small>Atípicos</small><b class="${an.anomalos.length ? "bad" : "ok"}">${an.anomalos.length}</b></div>
      </div>
      ${listaAnom}
      <p class="muted">Estos pedidos tienen combinaciones inusuales de monto y cantidad; pueden requerir revisión manual (posible fraude o error de captura).</p></section>`;

  return `<div class="acciones no-imprimir" style="margin:0 0 10px"><button class="btn secundario" data-action="imprimir">📄 Exportar a PDF</button></div>
    <div class="kpis">
      <div class="card kpi"><small>Pedidos</small><b>${s.pedidos.length}</b></div>
      <div class="card kpi"><small>Ventas</small><b>${ui.moneda(ventas)}</b></div>
      <div class="card kpi"><small>Entregas completadas</small><b>${pctEntregas}%</b></div>
      <div class="card kpi"><small>Tiempo promedio de atención</small><b>${tiempoProm}</b></div>
      <div class="card kpi"><small>Costo de distribución</small><b>${ui.moneda(costoDist)}</b></div>
      <div class="card kpi"><small>Productos en riesgo de rotura</small><b>${Vergara.inventario.productosBajos().length}</b></div>
    </div>
    <section class="card"><h2>Ventas por producto (esta sesión)</h2>${ventasProd}</section>
    <section class="card"><h2>Predicción de Demanda (Próximos 30 días)</h2>
      <p class="muted" title="Regresión lineal múltiple (semana, mes, promoción) sobre las últimas 6 semanas, proyectada a las semanas 7-10, más los pedidos de esta sesión.">Unidades que se estima vender en los próximos 30 días, según el historial de ventas y los pedidos de esta sesión, y si el stock actual las cubre.</p>${demanda}</section>
    ${segmentacion}
    ${anomalias}
    ${analisis}`;
};
