/* Vista: Distribución (mapa de ruta, GPS simulado y confirmación de entregas) */
Vergara.views.distribucion = function () {
  const ui = Vergara.ui, s = Vergara.state;
  const ruta = Vergara.rutas.calcular();
  const entregados = s.pedidos.filter(o => o.estado === Vergara.ESTADO.ENTREGADO);
  const kmTotal = ruta.reduce((a, o) => a + o.kmTramo, 0);

  const paradas = ruta.map((o, i) => `<div class="fila">
      <div class="col-nombre"><b>${i + 1}. ${Vergara.pedidos.cliente(o).nombre}</b><br>
        <span class="muted">Pedido #${o.id} · tramo ${o.kmTramo.toFixed(1)} km · acumulado ${o.km.toFixed(1)} km</span></div>
      <input id="firma-${o.id}" placeholder="Nombre de quien recibe" size="18">
      <label class="muted"><input type="checkbox" id="foto-${o.id}"> Foto tomada</label>
      <button class="btn" data-action="entregar" data-id="${o.id}">Confirmar entrega</button></div>`).join("")
    || '<p class="muted">No hay pedidos listos. Márquelos como preparados en Almacén.</p>';

  const hechos = entregados.map(o => `<div class="fila"><span>#${o.id} · ${Vergara.pedidos.cliente(o).nombre}</span>
      <span class="ok">Firmó: ${ui.escapar(o.firmadoPor)}</span></div>`).join("") || '<p class="muted">Ninguna aún.</p>';

  // --- Comparación de algoritmos de rutas (A*, Hill Climbing, Vecino más cercano) ---
  // Con menos de 2 pedidos listos se usa un ejemplo con los 4 clientes para poder comparar
  // Con el botón "Generar escenario de prueba" se usan 8 paradas temporales fijas (efímero: no toca los pedidos reales)
  const escenario = s.escenarioPrueba;
  const listos = Vergara.rutas.listos();
  const esEjemplo = !escenario && listos.length < 2;
  const comp = escenario ? Vergara.rutas.compararParadas(Vergara.data.escenarioPrueba)
    : Vergara.rutas.compararAlgoritmos(esEjemplo ? Vergara.data.clientes.map((_, i) => ({ clienteIdx: i })) : listos);
  const opt = comp.aStar;   // ruta óptima (la que se muestra al usuario)
  // Frase de negocio: el porcentaje sale del cálculo real (distancia de la ruta óptima vs método tradicional)
  const fraseAhorro = opt.ahorroPct > 0.05 ? `La ruta óptima ahorra un ${opt.ahorroPct.toFixed(1)}% de distancia frente al método tradicional.`
    : `Con pocas paradas la ruta óptima coincide con el método tradicional (0% de ahorro).`;
  const botonEscenario = escenario
    ? '<button class="btn secundario" data-action="limpiar-escenario">Limpiar escenario</button>'
    : '<button class="btn secundario" data-action="escenario-prueba">🎲 Generar escenario de prueba (8 paradas)</button>';
  const comparacion = `<section class="card"><h2>Análisis de eficiencia de rutas${escenario ? " · escenario de prueba" : ""}</h2>
      <p class="muted">${escenario ? "Escenario de prueba con 8 paradas fijas (siempre el mismo); no usa ni modifica los pedidos reales."
        : esEjemplo ? "No hay al menos 2 pedidos listos: se muestra un ejemplo con los 4 clientes." : "Calculado sobre los " + listos.length + " pedidos listos."}
        Tiempo estimado a ${Vergara.data.config.velocidadKmH} km/h más ${Vergara.data.config.minutosPorParada} min por parada.</p>
      <div class="acciones no-imprimir" style="margin-bottom:10px">${botonEscenario}
        <button class="btn secundario" data-action="imprimir">📄 Exportar a PDF</button></div>
      <div class="tabla-scroll"><table class="tabla">
        <thead><tr><th></th><th>Ruta optimizada</th></tr></thead>
        <tbody>
          <tr><td>Distancia total</td><td>${opt.distanciaTotal.toFixed(2)} km</td></tr>
          <tr><td>Tiempo estimado</td><td>${Math.round(opt.tiempoMin)} min</td></tr>
          <tr><td>Ahorro vs método tradicional</td><td class="${opt.ahorroPct > 0.05 ? "ok" : ""}">${opt.ahorroPct.toFixed(1)}%</td></tr>
        </tbody></table></div>
      <p>${fraseAhorro}</p></section>`;

  // --- BFS vs DFS en un grafo de calles de ejemplo ---
  const G = Vergara.data.grafoEjemplo, destino = "Tienda Doña Rosa";
  const bfs = Vergara.ml.bfs.explorar(G, "Almacén", destino), dfs = Vergara.ml.dfs.explorar(G, "Almacén", destino);
  const nCaminos = Vergara.ml.dfs.todosLosCaminos(G, "Almacén", destino).length;
  const busqueda = `<section class="card"><h2>BFS y DFS: ¿por qué no sirven para optimizar rutas?</h2>
      <p class="muted">Grafo de ejemplo de ${Object.keys(G).length} puntos. Hay ${nCaminos} caminos posibles de Almacén a ${destino}.</p>
      <div class="fila"><div class="col-nombre"><b>BFS (anchura)</b><br><span class="muted">${bfs.camino.join(" → ")}</span></div><span>${bfs.camino.length - 1} tramos · ${bfs.visitados.length} nodos visitados</span></div>
      <div class="fila"><div class="col-nombre"><b>DFS (profundidad)</b><br><span class="muted">${dfs.camino.join(" → ")}</span></div><span>${dfs.camino.length - 1} tramos · ${dfs.visitados.length} nodos visitados</span></div>
      <p class="muted">Ambos solo prueban que existe un camino: BFS minimiza el número de tramos y DFS toma el primero que encuentra, pero ninguno considera los kilómetros.
        Por eso la ruta de reparto se optimiza con A*, que sí usa la distancia.</p></section>`;

  return `<section class="card"><h2>Ruta optimizada del día</h2>
      <p class="muted" title="Algoritmo de optimización: ${Vergara.rutas.algoritmoActivo}">Ruta optimizada desde el almacén (GPS simulado). ${ruta.length ? "Distancia total: <b>" + kmTotal.toFixed(1) + " km</b>." : ""}</p>
      ${mapa(ruta)}</section>
    <section class="card"><h2>Paradas</h2>${paradas}</section>
    <section class="card"><h2>Entregas realizadas</h2>${hechos}</section>
    ${comparacion}
    ${busqueda}`;

  // Dibuja el mapa esquemático con SVG
  function mapa(ruta) {
    const esc = 36, pad = 28, px = x => pad + x * esc, py = y => pad + y * esc;
    const puntos = Vergara.data.clientes.map(c =>
      `<circle cx="${px(c.x)}" cy="${py(c.y)}" r="4" fill="var(--muted)"/>
       <text x="${px(c.x) + 8}" y="${py(c.y) + 4}" font-size="10" fill="var(--muted)">${c.nombre}</text>`).join("");
    const trazo = [Vergara.rutas.ALMACEN, ...ruta.map(o => Vergara.pedidos.cliente(o))].map(c => `${px(c.x)},${py(c.y)}`).join(" ");
    const numeros = ruta.map((o, i) => { const c = Vergara.pedidos.cliente(o);
      return `<circle cx="${px(c.x)}" cy="${py(c.y)}" r="10" fill="var(--accent)"/>
              <text x="${px(c.x)}" y="${py(c.y) + 4}" font-size="11" font-weight="700" fill="#fff" text-anchor="middle">${i + 1}</text>`; }).join("");
    return `<svg class="mapa" viewBox="0 0 380 280" role="img" aria-label="Mapa de la ruta">
      ${ruta.length ? `<polyline points="${trazo}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="6 4"/>` : ""}
      ${puntos}${numeros}
      <rect x="${px(0) - 9}" y="${py(0) - 9}" width="18" height="18" rx="3" fill="var(--ok)"/>
      <text x="${px(0) + 14}" y="${py(0) + 4}" font-size="10" font-weight="700" fill="var(--ok)">Almacén</text></svg>`;
  }
};
