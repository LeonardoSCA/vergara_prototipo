# Guion de la demo (12 minutos)

Antes de empezar: abrir `index.html`, pulsar **Reiniciar datos** y dejar `tests.html` abierto en otra pestaña.

| Tiempo | Acción | Pantalla |
|--------|--------|----------|
| 0:00–0:30 | Presentación del problema: pedidos, stock y reparto sin datos que apoyen las decisiones de Distribuidora Vergara | Intro |
| 0:30–1:30 | Login como **Cliente**, crear un pedido (ej. 10 Arroz + 5 Aceite) y ver la validación de stock | Portal cliente |
| 1:30–2:00 | Entrar como **Ventas** → Panel de Ventas: ver el badge de **riesgo** del pedido y abrir **Ver reglas del modelo** (Árbol de Decisión) | Panel ventas |
| 2:00–2:30 | Pulsar **Comparar clasificadores**: Árbol vs KNN sobre los últimos pedidos y comentar las diferencias | Panel ventas |
| 2:30–3:30 | **Almacén**: ver inventario, alertas EOQ (la demanda viene de la regresión) y registrar un código de barras | Almacén |
| 3:30–5:00 | Marcar pedidos como preparados (conviene crear 3 o 4 de clientes distintos) y entrar como **Repartidor**: comparar **A\* vs Hill Climbing vs Vecino más cercano** y explicar BFS/DFS | Distribución |
| 5:00–6:00 | Entregar un pedido con firma + foto simulada | Distribución |
| 6:00–8:00 | **Gerencia** → Dashboard: KPIs, regresión de demanda (R²), segmentos K-Means (método del codo) y anomalías DBSCAN | Dashboard |
| 8:00–9:00 | Análisis descriptivo y outliers (tabla de estadísticas, rango Q1−1.5·IQR a Q3+1.5·IQR) | Dashboard |
| 9:00–10:00 | Tests en vivo: abrir `/tests.html` y mostrar **22 tests passed** | Tests |
| 10:00–12:00 | Plan de mejoras (`docs/PLAN_MEJORAS.md`) + arquitectura (namespace `Vergara`, algoritmos en `js/services/ml/`, scripts de referencia en `ml-reference/`) | Slides |

## Mensajes clave por algoritmo
- **Regresión lineal**: la demanda es continua; se prefiere por interpretable. R² bajo = aviso de baja confianza.
- **Árbol de decisión**: da reglas legibles para la gerencia; KNN es solo referencia.
- **K-Means**: se conoce k = 4 (segmentos comerciales); el codo lo respalda.
- **DBSCAN**: no se sabe cuántos outliers hay, por eso no se usa K-Means.
- **A\***: ruta óptima con heurística admisible; con pocas paradas el vecino más cercano suele igualarlo.
- **BFS/DFS**: encuentran un camino pero ignoran la distancia, por eso no optimizan rutas.

## Aviso honesto para el jurado
Los datos históricos son sintéticos y pequeños (30 pedidos etiquetados, 16 clientes). Las métricas ilustran el funcionamiento; para medir desempeño real hacen falta datos de la empresa.
