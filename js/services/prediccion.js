/* Predicción de demanda con regresión lineal múltiple (Vergara.ml.regresionLineal).
   Variables: semana (1..6), mes del año y promoción (0/1, por ahora siempre 0).
   Reemplaza al antiguo promedio móvil. La firma pública se mantiene. */
Vergara.prediccion = {
  SEMANAS_FUTURAS: [7, 8, 9, 10],   // ≈ 30 días
  _cache: {},

  unidadesVendidasEnSesion(codigo) {
    return Vergara.state.pedidos.reduce((total, ped) =>
      total + ped.items.filter(i => i.codigo === codigo).reduce((s, i) => s + i.cantidad, 0), 0);
  },

  // Mes (1-12) de una semana: la semana 6 es la actual; las demás se desplazan 7 días
  mesDeSemana(semana) {
    const f = new Date();
    f.setDate(f.getDate() + (semana - 6) * 7);
    return f.getMonth() + 1;
  },

  // Matriz de variables [semana, mes, promo] para las semanas indicadas
  variables(semanas) {
    return semanas.map(sem => [sem, this.mesDeSemana(sem), 0]);
  },

  // Entrena (con caché) el modelo de un producto con su historial de 6 semanas
  modelo(producto) {
    const clave = producto.codigo + "|" + producto.historial.join(",") + "|" + this.mesDeSemana(6);
    if (!this._cache[clave]) {
      const semanas = producto.historial.map((_, i) => i + 1);
      const X = this.variables(semanas), y = producto.historial.slice();
      const R = Vergara.ml.regresionLineal;
      const m = R.entrenar(X, y);   // usa los valores por defecto (learningRate=0.1, epochs=2000)
      this._cache[clave] = { modelo: m, r2: R.coeficienteDeterminacion(m, X, y), rmse: R.raizErrorCuadratico(m, X, y) };
    }
    return this._cache[clave];
  },

  // Confianza del modelo: R² del ajuste sobre el historial
  confianza(producto) {
    return this.modelo(producto).r2;
  },

  // Ecuación legible del modelo (para explicar qué variables impactan)
  ecuacion(producto) {
    return Vergara.ml.regresionLineal.ecuacion(this.modelo(producto).modelo, ["semana", "mes", "promo"]);
  },

  // Proyección de unidades a 30 días: semanas 7-10 predichas + ventas de la sesión
  demanda30Dias(producto) {
    const { modelo } = this.modelo(producto);
    const pred = Vergara.ml.regresionLineal.predecir(modelo, this.variables(this.SEMANAS_FUTURAS));
    const proyectado = pred.reduce((suma, p) => suma + Math.max(0, p), 0);
    return Math.round(proyectado + this.unidadesVendidasEnSesion(producto.codigo));
  }
};
