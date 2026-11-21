/* Punto de entrada: sesión por rol, menú, render y manejo de eventos (delegación). */
(function () {
  const s = Vergara.state, ui = Vergara.ui, D = Vergara.data;
  const $ = id => document.getElementById(id);

  // Ventana modal (reglas del árbol, comparación de clasificadores, escáner de cámara, etc.)
  function renderModal() {
    // Si el escáner ya está abierto no se vuelve a dibujar: se perdería el <video> con la cámara activa
    if (s.modal === "escaner" && $("modal").firstChild) return;
    if (s.modal !== "escaner" && Vergara.escaner) Vergara.escaner.detener();   // libera la cámara al cerrar
    const modal = Vergara.modales && Vergara.modales[s.modal];
    $("modal").innerHTML = s.rol && modal ? modal() : "";
  }

  // Abre el escáner sin redibujar la pantalla (para conservar lo escrito en los campos de Almacén)
  function abrirEscaner() {
    s.modal = "escaner";
    $("modal").innerHTML = "";
    renderModal();
    Vergara.escaner.iniciar(codigo => {
      // Código detectado: rellena el input, cierra el modal y aplica la misma lógica que el registro manual
      s.modal = null;
      $("modal").innerHTML = "";
      $("codigo").value = codigo;
      acciones["registrar"]();
    });
  }

  function cerrarEscaner() {
    s.modal = null;
    Vergara.escaner.detener();
    $("modal").innerHTML = "";
  }

  function render() {
    // Cabecera y menú según el rol
    $("sesion").innerHTML = s.rol
      ? `<span class="muted">Rol: <b>${D.roles[s.rol].titulo}</b></span>
         <button class="btn secundario pequeno" data-action="salir">Cambiar rol</button>
         <button class="btn secundario pequeno" data-action="reiniciar">Reiniciar datos</button>` : "";
    $("menu").innerHTML = s.rol ? D.roles[s.rol].pestanas.map(id =>
      `<button class="${s.pestana === id ? "activo" : ""}" data-action="pestana" data-id="${id}">${D.pestanas[id]}</button>`).join("") : "";

    $("contenido").innerHTML = Vergara.views[s.rol ? s.pestana : "login"]();
    renderModal();
    const chat = $("chat"); if (chat) chat.scrollTop = chat.scrollHeight;
  }

  // Ejecuta una acción de servicio, muestra el mensaje, guarda y vuelve a dibujar
  function ejecutar(resultado) {
    if (resultado && resultado.mensaje) ui.toast(resultado.mensaje);
    Vergara.storage.guardar();
    render();
  }

  function enviarChat(texto) {
    texto = texto.trim();
    if (!texto) return;
    s.chat.push({ autor: "yo", texto }, { autor: "bot", texto: Vergara.chatbot.responder(texto) });
    render();
  }

  // Cada data-action del HTML corresponde a una función de este mapa
  const acciones = {
    "entrar":     d => { s.rol = d.rol; s.pestana = D.roles[d.rol].pestanas[0]; s.modal = null; render(); },
    "salir":      () => { s.rol = null; s.modal = null; s.escenarioPrueba = false; render(); },
    "abrir-modal":  d => { s.modal = d.id; render(); },
    "cerrar-modal": () => { s.modal = null; render(); },
    "escanear":        () => abrirEscaner(),
    "cerrar-escaner":  () => cerrarEscaner(),
    // Escenario efímero de 8 paradas (no modifica los pedidos reales ni se guarda)
    "escenario-prueba":   () => { s.escenarioPrueba = true; render(); },
    "limpiar-escenario":  () => { s.escenarioPrueba = false; render(); },
    "reiniciar":  () => { if (confirm("¿Borrar todos los datos y volver al estado inicial?")) { Vergara.storage.reiniciar(); ejecutar({ mensaje: "Datos reiniciados" }); } },
    "pestana":    d => { s.pestana = d.id; s.modal = null; render(); },
    "cantidad":   d => { Vergara.pedidos.cambiarCantidad(d.codigo, Number(d.delta)); render(); },
    "confirmar-pedido": () => ejecutar(Vergara.pedidos.confirmar()),
    "registrar":  () => ejecutar(Vergara.inventario.registrarMovimiento($("codigo").value, parseInt($("cantidad").value) || 0)),
    "reponer":    () => ejecutar({ mensaje: Vergara.inventario.reponer() + " productos repuestos" }),
    "preparar":   d => ejecutar(Vergara.pedidos.marcarPreparado(Number(d.id))),
    "entregar":   d => ejecutar(Vergara.pedidos.confirmarEntrega(Number(d.id), $("firma-" + d.id).value, $("foto-" + d.id).checked)),
    "chat-enviar": () => enviarChat($("chat-input").value),
    "chat-rapido": d => enviarChat(d.texto),
    "imprimir":   () => window.print(),   // "Exportar a PDF": el usuario elige "Guardar como PDF" en el diálogo del navegador
    "exportar-pedidos":     () => Vergara.exportar.pedidos(),
    "exportar-inventario":  () => Vergara.exportar.inventario(),
    "exportar-movimientos": () => Vergara.exportar.movimientos()
  };

  document.addEventListener("click", e => {
    const el = e.target.closest("[data-action]");
    if (el && acciones[el.dataset.action]) acciones[el.dataset.action](el.dataset);
  });

  document.addEventListener("change", e => {
    const tipo = e.target.dataset.change;
    if (tipo === "cliente") { s.clienteSeleccionado = Number(e.target.value); render(); }
    if (tipo === "filtro")  { s.filtroEstado = e.target.value; render(); }
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Enter" && e.target.id === "chat-input") enviarChat(e.target.value);
    if (e.key === "Escape" && s.modal === "escaner") cerrarEscaner();
    else if (e.key === "Escape" && s.modal) { s.modal = null; render(); }
  });

  Vergara.storage.cargar();
  render();
})();
