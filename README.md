# Vergara Intelligent Logistics – Prototipo funcional con Machine Learning

Prototipo web del **Avance 3 – Innovación y Transformación Digital** para Distribuidora Vergara S.A.C. Cubre el flujo completo pedido → almacén → reparto → indicadores y le añade **Machine Learning implementado a mano**: regresión lineal para la demanda, árbol de decisión y KNN para el riesgo de pedidos, K-Means para segmentar clientes, DBSCAN para detectar anomalías y A*, Hill Climbing, BFS y DFS para las rutas.

## Stack
- HTML + CSS + JavaScript **vanilla**.
- **Sin dependencias**: no hay Node, npm, bundler, librerías ni CDN. Todos los algoritmos de ML están escritos en JS puro.
- Persistencia en el navegador (`localStorage`); no hay backend.
- Todo el código vive en el namespace global `window.Vergara` (sin módulos ES6).

## Cómo ejecutarlo
**Opción 1.** Doble clic en `index.html`.

**Opción 2.** Servidor local:
```bash
python3 -m http.server 8000
```
y abrir <http://localhost:8000>.

**Opción 3.** Extensión **Live Server** de VS Code / Cursor: clic derecho en `index.html` → *Open with Live Server*.

## Tests
Abrir `tests.html` (doble clic o <http://localhost:8000/tests.html>). Ejecuta 22 pruebas de los algoritmos de ML, muestra ✅/❌ por cada una y un resumen "X tests passed / Y tests failed". Resultados y métricas en [`docs/PRUEBAS.md`](docs/PRUEBAS.md).

## Scripts Python de referencia (opcional)
No forman parte de la demo; muestran el enfoque productivo con scikit-learn.
```bash
cd ml-reference && pip install -r requirements.txt && python regresion_demanda.py
```
Los otros scripts son `arbol_riesgo.py`, `kmeans_clientes.py` y `dbscan_anomalias.py`. Más detalle en [`ml-reference/README.md`](ml-reference/README.md).

## Credenciales demo
No hay usuario ni contraseña: al abrir la app se **selecciona un rol**. Cada rol solo ve las pantallas de su función.

| Rol | Pantallas |
|---|---|
| Cliente | Portal de Clientes · Asistente (WhatsApp) |
| Ventas | Portal de Clientes · Panel de Ventas |
| Almacén | Almacén |
| Repartidor | Distribución |
| Gerencia | Dashboard · Panel de Ventas · Almacén · Distribución |

## Flujo de prueba sugerido
1. **Cliente o Ventas**: confirma un pedido (valida stock, baja el inventario y se clasifica su riesgo).
2. **Ventas**: revisa el badge de **riesgo** del pedido, abre **Ver reglas del modelo** y **Comparar clasificadores** (Árbol vs KNN).
3. **Almacén**: revisa alertas, genera la reposición (EOQ) y marca el pedido como preparado.
4. **Repartidor**: mira el mapa (ruta A*), la **comparación A\* / Hill Climbing / vecino más cercano**, firma y confirma la entrega.
5. **Gerencia**: en el Dashboard revisa KPIs, la regresión de demanda, los segmentos K-Means, las anomalías DBSCAN y el análisis descriptivo.
6. **Cliente**: prueba el asistente (“¿Hay arroz?”, “Estado de mi pedido”).

## Machine Learning
| Algoritmo | Archivo | Dónde se usa | Por qué se eligió |
|---|---|---|---|
| Estadística descriptiva (media, mediana, moda, varianza, IQR) | `ml/estadistica.js` | Dashboard: análisis de ventas semanales y outliers | Entender la distribución antes de modelar |
| Regresión lineal múltiple (gradiente descendente) | `ml/regresionLineal.js` | `prediccion.js`: demanda a 30 días, R² en el dashboard | La demanda es continua y el modelo es interpretable |
| Árbol de decisión (entropía, ID3) | `ml/arbolDecision.js` | `pedidos.js`: riesgo y prioridad; Panel de Ventas | Genera reglas que la gerencia puede leer |
| KNN | `ml/knn.js` | Panel de Ventas: comparar contra el árbol | Segundo clasificador de referencia |
| K-Means (k-means++) | `ml/kmeans.js` | Dashboard: segmentación de clientes | Se conocen los 4 segmentos comerciales |
| DBSCAN | `ml/dbscan.js` | Dashboard: pedidos anómalos | No se sabe cuántos outliers hay; los marca como ruido |
| A* | `ml/aStar.js` | `rutas.js`: ruta por defecto | Ruta óptima con heurística admisible |
| Hill Climbing | `ml/hillClimbing.js` | Comparación de rutas | Búsqueda local barata; ilustra el óptimo local |
| BFS / DFS | `ml/bfs.js`, `ml/dfs.js` | Distribución: demostración en un grafo | Mostrar por qué no sirven para optimizar rutas |

Cada archivo explica en su header por qué se eligió el algoritmo.

## Estructura del proyecto
```
vergara-prototipo-mejorado/
├── index.html            Prototipo (orden de <script> importante)
├── tests.html            Tests de ML (22 pruebas)
├── css/                  base.css · layout.css · components.css
├── js/
│   ├── data.js           Datos iniciales, roles, históricos para ML
│   ├── state.js          Estado de la aplicación
│   ├── ui.js             Utilidades de formato y mensajes
│   ├── main.js           Sesión, menú, render, eventos y modales
│   ├── services/
│   │   ├── storage.js · notificaciones.js · inventario.js
│   │   ├── prediccion.js     Demanda con regresión lineal
│   │   ├── pedidos.js        Pedidos + clasificación de riesgo
│   │   ├── analitica.js      Segmentación (K-Means) y anomalías (DBSCAN)
│   │   ├── rutas.js          Rutas con A* y comparación de algoritmos
│   │   ├── chatbot.js · exportar.js
│   │   └── ml/               Algoritmos de ML (JS puro)
│   │       └── estadistica · regresionLineal · arbolDecision · knn · kmeans
│   │           dbscan · aStar · hillClimbing · bfs · dfs
│   └── views/            Una pantalla por archivo
├── ml-reference/         Scripts Python de referencia (scikit-learn)
└── docs/                 PLAN_MEJORAS · GUION_DEMO · PRUEBAS · DEPLOY
```

## Qué sigue simulado
- Los datos de históricos de riesgo y de compras son **sintéticos** (en `js/data.js`); con tan pocos datos las métricas son ilustrativas.
- Chatbot: reconocimiento de palabras clave (representa NLP en WhatsApp).
- Notificaciones: se muestran en pantalla (representan correo / WhatsApp).
- Rutas: coordenadas ficticias en km (representan GPS real).
- Sin cámara real ni base de datos de servidor.
