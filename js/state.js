/* Estado global de la aplicación. Se guarda en el navegador (localStorage). */
Vergara.ESTADO = { PENDIENTE: "Pendiente", LISTO: "Listo", ENTREGADO: "Entregado" };

Vergara.state = {
  // --- Datos persistentes ---
  productos: [], pedidos: [], movimientos: [], notificaciones: [], siguienteId: 1,
  segmentos: {},   // segmento de cada cliente según K-Means: { "Nombre cliente": "VIP" }
  // --- Estado de la sesión (no se guarda) ---
  rol: null, pestana: null, clienteSeleccionado: 0, carrito: {},
  filtroEstado: "Todos", chat: [], modal: null, escenarioPrueba: false,

  // Restaura los datos de fábrica
  reiniciar() {
    this.productos = JSON.parse(JSON.stringify(Vergara.data.productos));
    this.pedidos = []; this.movimientos = []; this.notificaciones = []; this.segmentos = {};
    this.siguienteId = 1; this.carrito = {}; this.chat = []; this.filtroEstado = "Todos"; this.modal = null; this.escenarioPrueba = false;
  }
};
Vergara.state.reiniciar();
