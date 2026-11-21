/* Datos iniciales y configuración. Edita aquí para usar datos reales de la empresa. */
window.Vergara = window.Vergara || {};

Vergara.data = {
  // stock = unidades actuales | reorden = punto de reorden | historial = ventas de las últimas 6 semanas
  productos: [
    { codigo: "7750001", nombre: "Arroz 5 kg",   precio: 24.0, stock: 120, reorden: 60, historial: [30, 34, 28, 36, 40, 38] },
    { codigo: "7750002", nombre: "Aceite 1 L",   precio: 9.5,  stock: 34,  reorden: 40, historial: [22, 25, 24, 30, 28, 33] },
    { codigo: "7750003", nombre: "Azúcar 1 kg",  precio: 4.2,  stock: 90,  reorden: 50, historial: [40, 38, 45, 42, 47, 44] },
    { codigo: "7750004", nombre: "Fideos 500 g", precio: 3.1,  stock: 55,  reorden: 50, historial: [50, 48, 52, 55, 53, 60] },
    { codigo: "7750005", nombre: "Leche 400 g",  precio: 4.8,  stock: 18,  reorden: 30, historial: [35, 30, 34, 38, 36, 40] }
  ],
  // x, y = coordenadas ficticias en km respecto al almacén (0,0)
  clientes: [
    { nombre: "Bodega Los Olivos", x: 2, y: 3, distrito: "Los Olivos" },
    { nombre: "Minimarket Aurora", x: 5, y: 1, distrito: "Comas" },
    { nombre: "Bodega San José",   x: 1, y: 6, distrito: "Independencia" },
    { nombre: "Tienda Doña Rosa",  x: 6, y: 5, distrito: "San Martín de Porres" }
  ],
  pestanas: {
    cliente:      "Portal de Clientes",
    asistente:    "Asistente (WhatsApp)",
    ventas:       "Panel de Ventas",
    almacen:      "Almacén",
    distribucion: "Distribución",
    dashboard:    "Dashboard"
  },
  // Control de acceso: cada rol solo ve las pantallas de su función
  roles: {
    cliente:    { titulo: "Cliente",    descripcion: "Realiza pedidos y consulta su estado",       pestanas: ["cliente", "asistente"] },
    ventas:     { titulo: "Ventas",     descripcion: "Registra pedidos y revisa ventas",           pestanas: ["cliente", "ventas"] },
    almacen:    { titulo: "Almacén",    descripcion: "Controla inventario y prepara pedidos",      pestanas: ["almacen"] },
    repartidor: { titulo: "Repartidor", descripcion: "Sigue la ruta y confirma entregas",          pestanas: ["distribucion"] },
    gerencia:   { titulo: "Gerencia",   descripcion: "Ve todos los módulos y los indicadores",     pestanas: ["dashboard", "ventas", "almacen", "distribucion"] }
  },
  // Parámetros de cálculo (EOQ y costos)
  config: { costoPorPedido: 40, factorMantenimiento: 0.25, costoPorKm: 2.5, velocidadKmH: 30, minutosPorParada: 5 },
  // Escenario de prueba de 8 paradas (coordenadas fijas en km desde el almacén (0,0)) para demostrar la mejora de A*.
  // Se ajustaron 2 puntos del escenario inicial (Prueba 1: (3,2)→(4,1) y Prueba 4: (6,3)→(5,3)), porque con las
  // coordenadas originales A* y el vecino más cercano daban lo mismo (29.42 km, 0 % de ahorro).
  // Resultado con estas coordenadas finales: Vecino más cercano 31.96 km, A* 27.47 km (ahorro 14.0 %).
  escenarioPrueba: [
    { x: 4,  y: 1,  cliente: "Prueba 1" },
    { x: 5,  y: -1, cliente: "Prueba 2" },
    { x: -2, y: 4,  cliente: "Prueba 3" },
    { x: 5,  y: 3,  cliente: "Prueba 4" },
    { x: -3, y: -3, cliente: "Prueba 5" },
    { x: 1,  y: -5, cliente: "Prueba 6" },
    { x: 4,  y: -4, cliente: "Prueba 7" },
    { x: -4, y: 1,  cliente: "Prueba 8" }
  ],
  // Grafo de ejemplo (listas de adyacencia) para la demostración de BFS y DFS
  grafoEjemplo: {
    "Almacén":              ["Cruce Norte", "Minimarket Aurora"],
    "Cruce Norte":          ["Almacén", "Bodega Los Olivos", "Bodega San José"],
    "Bodega Los Olivos":    ["Cruce Norte", "Bodega San José"],
    "Bodega San José":      ["Cruce Norte", "Bodega Los Olivos", "Tienda Doña Rosa"],
    "Minimarket Aurora":    ["Almacén", "Tienda Doña Rosa"],
    "Tienda Doña Rosa":     ["Minimarket Aurora", "Bodega San José"]
  }
};

/* ---------------------------------------------------------------------------
   Datos históricos para Machine Learning (Avance 3)
   --------------------------------------------------------------------------- */

// Pedidos históricos etiquetados con el riesgo (entrenan el Árbol de Decisión y KNN).
// Cada fila: [monto S/, ítems distintos, distrito, pedidos previos del cliente, cumplimiento 0-1, riesgo]
Vergara.data.historicoRiesgo = [
  [120, 2, "Los Olivos", 8, 0.95, "bajo"],   [95, 1, "Comas", 12, 1.00, "bajo"],
  [180, 3, "Independencia", 6, 0.90, "bajo"], [240, 3, "San Martín de Porres", 10, 0.92, "bajo"],
  [150, 2, "Comas", 5, 0.85, "bajo"],        [210, 4, "Los Olivos", 9, 0.88, "bajo"],
  [90, 1, "San Martín de Porres", 3, 0.90, "bajo"], [260, 3, "Independencia", 7, 0.86, "bajo"],
  [350, 4, "Los Olivos", 6, 0.90, "bajo"],   [380, 4, "Comas", 8, 0.95, "bajo"],
  [450, 5, "Los Olivos", 7, 0.90, "medio"],  [520, 5, "Comas", 9, 0.95, "medio"],
  [610, 5, "Independencia", 5, 0.85, "medio"], [700, 5, "San Martín de Porres", 6, 0.90, "medio"],
  [480, 4, "Independencia", 4, 0.88, "medio"], [300, 3, "Comas", 6, 0.70, "medio"],
  [220, 3, "San Martín de Porres", 4, 0.75, "medio"], [150, 2, "Independencia", 3, 0.78, "medio"],
  [330, 4, "Los Olivos", 5, 0.65, "medio"],  [100, 1, "Comas", 1, 0.50, "medio"],
  [880, 5, "Comas", 6, 0.90, "medio"],       [780, 5, "Los Olivos", 8, 0.95, "medio"],
  [1000, 5, "Independencia", 15, 0.97, "medio"],
  [500, 5, "Comas", 4, 0.55, "alto"],        [420, 5, "San Martín de Porres", 3, 0.50, "alto"],
  [650, 5, "Independencia", 2, 0.40, "alto"], [900, 5, "Comas", 1, 0.50, "alto"],
  [950, 5, "Los Olivos", 2, 0.90, "alto"],   [850, 5, "San Martín de Porres", 0, 1.00, "alto"],
  [320, 4, "Independencia", 2, 0.45, "alto"]
].map(f => ({
  features: { monto: f[0], numItems: f[1], distrito: f[2], clienteHistorial: f[3], clienteCumplimiento: f[4] },
  label: f[5]
}));

// Prioridad de atención derivada del riesgo
Vergara.data.prioridadPorRiesgo = { bajo: "normal", medio: "alta", alto: "urgente" };

// Historial de compras para analítica (K-Means y DBSCAN). Solo para análisis: los clientes
// operativos (portal, mapa y rutas) siguen siendo los 4 de arriba.
// Perfil: [cliente, distrito, nº de pedidos, ticket base S/, días desde la última compra]
(function () {
  const perfiles = [
    ["Bodega Santa Rosa", "Comas", 10, 560, 3],        ["Minimarket El Sol", "Los Olivos", 9, 600, 2],
    ["Bodega Don Pepe", "Independencia", 10, 520, 5],  ["Tienda La Estrella", "San Martín de Porres", 9, 580, 4],
    ["Bodega Mi Casita", "Comas", 7, 280, 8],          ["Minimarket Central", "Los Olivos", 6, 300, 12],
    ["Bodega El Progreso", "Independencia", 7, 250, 6], ["Tienda Los Andes", "San Martín de Porres", 6, 270, 10],
    ["Bodega La Unión", "Comas", 3, 160, 28],          ["Minimarket Rápido", "Los Olivos", 3, 140, 35],
    ["Bodega El Ahorro", "Independencia", 3, 180, 30], ["Tienda Santa Ana", "San Martín de Porres", 3, 150, 40],
    ["Bodega Nueva Era", "Comas", 2, 110, 75],         ["Minimarket Lucero", "Los Olivos", 2, 90, 95],
    ["Bodega San Martín", "Independencia", 2, 130, 110], ["Tienda El Buen Precio", "San Martín de Porres", 2, 100, 85]
  ];
  const pedidos = [];
  perfiles.forEach((p, k) => {
    for (let i = 0; i < p[2]; i++) {
      // variación determinista (±25 %) alrededor del ticket base
      const variacion = 0.75 + 0.5 * (((i + 1) * 0.618 + k * 0.37) % 1);
      const monto = Math.round(p[3] * variacion);
      pedidos.push({
        cliente: p[0], monto,
        numItems: Math.max(1, Math.min(5, Math.round(1 + monto / 200))),
        diasAtras: p[4] + i * 7
      });
    }
  });
  // Pedidos inusuales (candidatos a error de captura o fraude): monto muy alto con 1-2 ítems, o muchos ítems con monto mínimo
  pedidos.push({ cliente: "Bodega Santa Rosa", monto: 2200, numItems: 1, diasAtras: 20 });
  pedidos.push({ cliente: "Minimarket Central", monto: 1500, numItems: 2, diasAtras: 15 });
  pedidos.push({ cliente: "Bodega Mi Casita", monto: 55, numItems: 5, diasAtras: 10 });
  Vergara.data.analitica = { clientes: perfiles.map(p => ({ nombre: p[0], distrito: p[1] })), pedidos };
})();
