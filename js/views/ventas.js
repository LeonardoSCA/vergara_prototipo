/* Vista: Panel de Ventas (todos los pedidos, filtros, riesgo y reporte) */
Vergara.views.ventas = function () {
  const s = Vergara.state, ui = Vergara.ui, ESTADO = Vergara.ESTADO;
  const lista = s.pedidos.filter(o => s.filtroEstado === "Todos" || o.estado === s.filtroEstado).slice().reverse();
  const total = lista.reduce((a, o) => a + o.total, 0);

  const filtro = ["Todos", ESTADO.PENDIENTE, ESTADO.LISTO, ESTADO.ENTREGADO]
    .map(e => `<option ${e === s.filtroEstado ? "selected" : ""}>${e}</option>`).join("");

  // Riesgo del pedido (Árbol de Decisión). Pedidos antiguos sin riesgo se clasifican al vuelo
  const badge = o => {
    if (!o.riesgo) Vergara.pedidos.clasificarRiesgo(o);
    return `<span class="badge ${o.riesgo}" title="Prioridad: ${o.prioridad}">${o.riesgo}</span>`;
  };

  const filas = lista.map(o => `<div class="fila">
      <div class="col-nombre"><b>#${o.id} · ${Vergara.pedidos.cliente(o).nombre}</b><br>
        <span class="muted">${o.items.map(i => i.cantidad + "× " + i.nombre).join(", ")} · ${ui.fecha(o.creado)}</span></div>
      <span title="Riesgo">${badge(o)}</span>
      <b>${ui.moneda(o.total)}</b><span>${o.estado}</span></div>`).join("")
    || '<p class="muted">No hay pedidos con ese filtro.</p>';

  const porCliente = Vergara.data.clientes.map((c, i) => {
    const suma = s.pedidos.filter(o => o.clienteIdx === i).reduce((a, o) => a + o.total, 0);
    return `<div class="fila"><span>${c.nombre}</span><b>${ui.moneda(suma)}</b></div>`;
  }).join("");

  return `<div class="dos-columnas">
    <section class="card">
      <h2>Pedidos</h2>
      <p class="muted">Riesgo calculado por un Árbol de Decisión (verde = bajo, amarillo = medio, rojo = alto).</p>
      <div class="fila"><span>Filtrar por estado</span><select data-change="filtro">${filtro}</select></div>
      ${filas}
      <div class="fila"><b>Total mostrado</b><b>${ui.moneda(total)}</b></div>
      <div class="acciones no-imprimir">
        <button class="btn secundario" data-action="exportar-pedidos">Exportar pedidos (CSV)</button>
        <button class="btn secundario" data-action="imprimir">📄 Exportar a PDF</button>
        <button class="btn secundario" data-action="abrir-modal" data-id="reglas">Ver reglas del modelo</button>
        <button class="btn secundario" data-action="abrir-modal" data-id="comparar">Comparar clasificadores</button>
      </div>
    </section>
    <aside class="card"><h2>Ventas por cliente</h2>${porCliente}</aside></div>`;
};

/* Ventanas modales del panel de ventas (se abren con data-action="abrir-modal") */
Vergara.modales = Vergara.modales || {};

Vergara.modales.reglas = function () {
  const ui = Vergara.ui, A = Vergara.ml.arbolDecision, P = Vergara.pedidos;
  const acierto = A.exactitud(P.arbolRiesgo, Vergara.data.historicoRiesgo);
  return `<div class="modal-fondo" data-action="cerrar-modal"></div>
    <div class="modal" role="dialog" aria-label="Reglas del modelo">
      <div class="modal-cabecera"><h2>Reglas del Árbol de Decisión</h2>
        <button class="btn secundario pequeno" data-action="cerrar-modal">Cerrar</button></div>
      <p class="muted">Entrenado con ${Vergara.data.historicoRiesgo.length} pedidos históricos (entropía, profundidad máx. 5).
        Exactitud sobre los datos de entrenamiento: <b>${Math.round(acierto * 100)}%</b> (con pocos datos, sirve para ilustrar las reglas, no como medida de desempeño real). Cada línea es una regla que la gerencia puede leer y auditar.</p>
      <pre class="reglas">${ui.escapar(A.imprimirReglas(P.arbolRiesgo))}</pre></div>`;
};

Vergara.modales.comparar = function () {
  const ui = Vergara.ui;
  const filas = Vergara.pedidos.compararClasificadores(20);
  const coinciden = filas.filter(f => f.coinciden).length;
  const badge = r => (r ? `<span class="badge ${r}">${r}</span>` : '<span class="muted" title="El SVM es binario (alto/bajo): no clasifica riesgo medio">—</span>');
  const sv = Vergara.pedidos.infoSvm();
  return `<div class="modal-fondo" data-action="cerrar-modal"></div>
    <div class="modal" role="dialog" aria-label="Comparar clasificadores">
      <div class="modal-cabecera"><h2>Árbol de Decisión vs KNN vs SVM</h2>
        <button class="btn secundario pequeno" data-action="cerrar-modal">Cerrar</button></div>
      <p class="muted">Los tres modelos clasifican los últimos ${filas.length} pedidos (si hay pocos pedidos reales se completa con históricos).
        Coinciden en <b>${coinciden} de ${filas.length}</b>. El árbol explica sus reglas; KNN y SVM sirven como referencia.
        El SVM es binario (alto = +1, bajo = −1): cuando el árbol indica riesgo medio, su celda queda en "—" y solo se compara Árbol con KNN.</p>
      <div class="tabla-scroll"><table class="tabla">
        <thead><tr><th>Pedido</th><th>Monto</th><th>Árbol</th><th>KNN</th><th>SVM</th><th>¿Coinciden los 3?</th></tr></thead>
        <tbody>${filas.map(f => `<tr><td>${f.id}</td><td>${ui.moneda(f.monto)}</td><td>${badge(f.arbol)}</td><td>${badge(f.knn)}</td><td>${badge(f.svm)}</td>
          <td>${f.coinciden ? '<span class="ok">✔ Sí</span>' : '<span class="bad">✘ No</span>'}${f.svm === null ? ' <span class="muted">(sin SVM)</span>' : ""}</td></tr>`).join("")}</tbody></table></div>
      <h3>Vectores de soporte del SVM</h3>
      <p class="muted">SVM lineal entrenado con ${sv.muestras} pedidos históricos de riesgo alto o bajo (hiperplano de margen máximo; los de riesgo medio se excluyen).</p>
      <div class="fila"><span>Vectores de soporte encontrados</span><b>${sv.vectoresSoporte} de ${sv.muestras}</b></div>
      <div class="fila"><span>Margen promedio de los vectores de soporte</span><b>${sv.margen.toFixed(3)}</b></div>
      <div class="fila"><span>Ancho total del margen (2 / ‖w‖)</span><b>${sv.anchoMargen.toFixed(3)}</b></div>
      <div class="fila"><span>Accuracy sobre los datos de entrenamiento</span><b>${Math.round(sv.accuracy * 100)}%</b></div>
      <p class="muted">Los vectores de soporte son los pedidos que quedan dentro o sobre el margen (|f(x)| &lt; 1); solo ellos determinan la posición del hiperplano.</p></div>`;
};
