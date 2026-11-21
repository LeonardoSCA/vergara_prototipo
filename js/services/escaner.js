/* Escáner de código de barras con la cámara del navegador (IoT sin hardware adicional).
   Usa solo APIs estándar: navigator.mediaDevices.getUserMedia + BarcodeDetector (sin librerías externas).
   Justificación: BarcodeDetector decodifica los códigos en el propio navegador, sin enviar imágenes a ningún
   servidor. Si el navegador no lo soporta (p. ej. Firefox) se informa y se mantiene el ingreso manual.
   En producción se conectaría a un lector físico por Bluetooth o USB. */
Vergara.escaner = {
  sesion: 0,          // se incrementa en cada inicio/detención para ignorar respuestas tardías
  stream: null,
  temporizador: null,
  FORMATOS: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf", "codabar", "qr_code"],

  soportado() {
    return typeof window !== "undefined" && "BarcodeDetector" in window;
  },

  // Texto de estado visible bajo el video (por defecto "Buscando código...")
  estado(texto) {
    const el = document.getElementById("escaner-estado");
    if (el) el.textContent = texto;
  },

  // Muestra un error claro dentro del modal, oculta el video y ofrece el botón "Cerrar"
  error(mensaje) {
    const caja = document.getElementById("escaner-error"), msg = document.getElementById("escaner-msg");
    const video = document.getElementById("escaner-video"), estado = document.getElementById("escaner-estado");
    if (msg) msg.textContent = mensaje;
    if (caja) caja.hidden = false;
    if (video) video.hidden = true;
    if (estado) estado.hidden = true;
  },

  // Traduce los errores de getUserMedia a mensajes comprensibles
  mensajeDeError(e) {
    const n = e && e.name;
    if (n === "NotAllowedError" || n === "SecurityError") return "Permiso de cámara denegado. Permite el acceso a la cámara en tu navegador o usa el input manual.";
    if (n === "NotFoundError" || n === "DevicesNotFoundError" || n === "OverconstrainedError") return "No se encontró ninguna cámara en este dispositivo. Usa el input manual.";
    if (n === "NotReadableError" || n === "TrackStartError") return "La cámara está siendo usada por otra aplicación. Ciérrala e inténtalo de nuevo.";
    return "No se pudo abrir la cámara (" + (n || "error desconocido") + "). Usa el input manual.";
  },

  // Abre la cámara y busca códigos; al detectar uno llama a alDetectar(valor)
  async iniciar(alDetectar) {
    this.detener();
    const sesion = ++this.sesion;

    if (!this.soportado()) { this.error("Tu navegador no soporta escaneo. Usa el input manual."); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.error("Tu navegador no permite acceder a la cámara (requiere HTTPS o localhost). Usa el input manual."); return;
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    } catch (e) {
      if (sesion === this.sesion) this.error(this.mensajeDeError(e));
      return;
    }
    // Si el usuario cerró el modal mientras se pedía el permiso, se libera la cámara
    if (sesion !== this.sesion) { stream.getTracks().forEach(t => t.stop()); return; }
    this.stream = stream;

    const video = document.getElementById("escaner-video");
    if (!video) { this.detener(); return; }
    video.srcObject = stream;
    try { await video.play(); } catch (e) { /* el atributo autoplay lo reintenta */ }

    let detector;
    try {
      const disponibles = BarcodeDetector.getSupportedFormats ? await BarcodeDetector.getSupportedFormats() : this.FORMATOS;
      const formatos = this.FORMATOS.filter(f => disponibles.includes(f));
      detector = formatos.length ? new BarcodeDetector({ formats: formatos }) : new BarcodeDetector();
    } catch (e) {
      this.detener(); this.error("No se pudo iniciar el detector de códigos. Usa el input manual."); return;
    }

    this.estado("Buscando código...");
    const buscar = async () => {
      if (sesion !== this.sesion) return;
      try {
        const codigos = await detector.detect(video);
        if (sesion !== this.sesion) return;
        const hallado = codigos.find(c => c.rawValue);
        if (hallado) { this.detener(); alDetectar(hallado.rawValue); return; }
      } catch (e) { /* detección fallida en este cuadro: se mantiene la cámara abierta */ }
      this.estado("Buscando código...");
      this.temporizador = setTimeout(buscar, 250);
    };
    buscar();
  },

  // Apaga la cámara y cancela la búsqueda
  detener() {
    this.sesion++;
    clearTimeout(this.temporizador);
    this.temporizador = null;
    if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; }
  }
};
