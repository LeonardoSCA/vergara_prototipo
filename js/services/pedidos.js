/* Lógica de pedidos: carrito, confirmación, preparación y entrega. */
Vergara.pedidos = {
  buscarPorId(id) { return Vergara.state.pedidos.find(p => p.id === id); },
  cliente(pedido) { return Vergara.data.clientes[pedido.clienteIdx]; },

  totalCarrito() {
    const { productos, carrito } = Vergara.state;
    return productos.reduce((suma, p) => suma + (carrito[p.codigo] || 0) * p.precio, 0);
  },

  cantidadCarrito() {
    return Object.values(Vergara.state.carrito).reduce((a, b) => a + b, 0);
  },

  // Cambia la cantidad sin superar el stock disponible
  cambiarCantidad(codigo, delta) {
    const p = Vergara.state.productos.find(x => x.codigo === codigo);
    const actual = Vergara.state.carrito[codigo] || 0;
    Vergara.state.carrito[codigo] = Math.max(0, Math.min(p.stock, actual + delta));
  },

  // --- Clasificación de riesgo (Árbol de Decisión) y comparación con KNN ---

  // Entrena una sola vez el árbol y KNN con los pedidos históricos etiquetados de data.js
  entrenarModelos() {
    const A = Vergara.ml.arbolDecision, datos = Vergara.data.historicoRiesgo;
    this.arbolRiesgo = A.entrenar(datos, { maxDepth: 5, minSamplesSplit: 2 });
    this.knnRiesgo = Vergara.ml.knn.entrenar(A.preprocesar(datos), { k: 5 });

    // SVM lineal binario: riesgo "alto" = +1, "bajo" = -1 (los "medio" se excluyen)
    const binarios = datos.filter(d => d.label !== "medio");
    this.svmX = binarios.map(d => this.vectorSvm(d.features));
    this.svmY = binarios.map(d => (d.label === "alto" ? 1 : -1));
    this.svmRiesgo = Vergara.ml.svm.entrenar(this.svmX, this.svmY, { learningRate: 0.1, epochs: 2000, lambda: 0.05 });
  },

  // Features numéricas del SVM (sin distrito, que es categórico): monto, ítems, historial, cumplimiento
  vectorSvm(f) {
    return [f.monto, f.numItems, f.clienteHistorial, f.clienteCumplimiento];
  },

  // Datos del panel "Vectores de soporte del SVM"
  infoSvm() {
    const S = Vergara.ml.svm, m = this.svmRiesgo;
    return {
      muestras: this.svmX.length,
      vectoresSoporte: S.vectoresSoporte(m, this.svmX).length,
      margen: S.margen(m, this.svmX, this.svmY),
      anchoMargen: S.anchoMargen(m),
      accuracy: S.accuracy(m, this.svmX, this.svmY)
    };
  },

  // Features del pedido; el historial del cliente solo cuenta pedidos anteriores (id menor)
  featuresPedido(pedido) {
    const previos = Vergara.state.pedidos.filter(o => o.clienteIdx === pedido.clienteIdx && o.id < pedido.id);
    const entregados = previos.filter(o => o.estado === Vergara.ESTADO.ENTREGADO).length;
    return {
      monto: pedido.total,
      numItems: pedido.items.length,
      distrito: this.cliente(pedido).distrito,
      clienteHistorial: previos.length,
      clienteCumplimiento: previos.length ? entregados / previos.length : 1   // sin historial: neutro
    };
  },

  // Predice el riesgo con el árbol y guarda riesgo + prioridad en el pedido
  clasificarRiesgo(pedido) {
    const r = Vergara.ml.arbolDecision.predecir(this.arbolRiesgo, this.featuresPedido(pedido));
    pedido.riesgo = r.label;
    pedido.prioridad = Vergara.data.prioridadPorRiesgo[r.label];
    return { riesgo: pedido.riesgo, prioridad: pedido.prioridad, probabilidad: r.probabilidad };
  },

  // Compara Árbol vs KNN sobre los últimos pedidos (si hay pocos, completa con históricos)
  compararClasificadores(cantidad) {
    cantidad = cantidad || 20;
    const A = Vergara.ml.arbolDecision, K = Vergara.ml.knn;
    const filas = Vergara.state.pedidos.slice(-cantidad).reverse().map(o => ({ id: "#" + o.id, features: this.featuresPedido(o), origen: "pedido" }));
    Vergara.data.historicoRiesgo.slice().reverse().forEach((h, i) => {
      if (filas.length < cantidad) filas.push({ id: "Hist. " + (i + 1), features: h.features, origen: "histórico" });
    });
    return filas.map(f => {
      const arbol = A.predecir(this.arbolRiesgo, f.features).label;
      const knn = K.predecir(this.knnRiesgo, A.preprocesarFeatures(f.features)).label;
      // El SVM es binario (alto/bajo): si el árbol dice "medio" no aplica (null)
      const svm = arbol === "medio" ? null
        : (Vergara.ml.svm.predecir(this.svmRiesgo, this.vectorSvm(f.features)) === 1 ? "alto" : "bajo");
      const coinciden = svm === null ? arbol === knn : (arbol === knn && knn === svm);
      return { id: f.id, monto: f.features.monto, origen: f.origen, arbol, knn, svm, coinciden };
    });
  },

  // Valida stock, crea el pedido, descuenta inventario y notifica al cliente
  confirmar() {
    const s = Vergara.state;
    const items = s.productos.filter(p => (s.carrito[p.codigo] || 0) > 0);
    if (!items.length) return { ok: false, mensaje: "Agregue productos al pedido" };

    const sinStock = items.find(p => s.carrito[p.codigo] > p.stock);
    if (sinStock) return { ok: false, mensaje: "Sin stock suficiente: " + sinStock.nombre };

    const pedido = {
      id: s.siguienteId++, clienteIdx: s.clienteSeleccionado,
      items: items.map(p => ({ codigo: p.codigo, nombre: p.nombre, cantidad: s.carrito[p.codigo], precio: p.precio })),
      total: this.totalCarrito(), estado: Vergara.ESTADO.PENDIENTE, creado: Date.now()
    };
    this.clasificarRiesgo(pedido);   // añade .riesgo y .prioridad al pedido
    pedido.items.forEach(i => Vergara.inventario.mover(s.productos.find(p => p.codigo === i.codigo), -i.cantidad, "Venta pedido #" + pedido.id));
    s.pedidos.push(pedido);
    s.carrito = {};
    Vergara.notificaciones.agregar(pedido.clienteIdx, `Pedido #${pedido.id} confirmado (${Vergara.ui.moneda(pedido.total)}). Entrega estimada: mañana.`);
    return { ok: true, mensaje: `Pedido #${pedido.id} confirmado. Stock actualizado.` };
  },

  marcarPreparado(id) {
    const p = this.buscarPorId(id);
    p.estado = Vergara.ESTADO.LISTO;
    p.preparado = Date.now();
    Vergara.notificaciones.agregar(p.clienteIdx, `Pedido #${id} preparado. Saldrá en la próxima ruta de reparto.`);
    return { ok: true, mensaje: `Pedido #${id} listo para despacho` };
  },

  confirmarEntrega(id, firma, foto) {
    if (!firma.trim()) return { ok: false, mensaje: "Ingrese el nombre de quien recibe (firma digital)" };
    if (!foto) return { ok: false, mensaje: "Marque que se tomó la foto de entrega" };
    const p = this.buscarPorId(id);
    p.estado = Vergara.ESTADO.ENTREGADO;
    p.firmadoPor = firma.trim();
    p.entregado = Date.now();
    Vergara.notificaciones.agregar(p.clienteIdx, `Pedido #${id} entregado. Recibió: ${p.firmadoPor}.`);
    return { ok: true, mensaje: `Entrega #${id} confirmada` };
  }
};

// El árbol y KNN se entrenan al iniciar la app
Vergara.pedidos.entrenarModelos();
