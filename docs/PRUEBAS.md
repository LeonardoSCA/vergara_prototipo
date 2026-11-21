# Pruebas y métricas

## Métricas clave de desempeño (tabla resumen)

| Métrica | Valor | Cómo se mide |
|---------|-------|--------------|
| Tests unitarios pasados | 25/25 | `tests.html` |
| Precisión Árbol (LOO) | 70 % | Validación cruzada leave-one-out, 30 pedidos (3 clases) |
| Precisión KNN (LOO) | 50 % | Validación cruzada leave-one-out, 30 pedidos (3 clases) |
| Precisión SVM (LOO) | 100 % | Validación cruzada leave-one-out, 17 pedidos alto/bajo (binario, no comparable con las filas anteriores; en ese mismo subconjunto Árbol 82 % y KNN 100 %) |
| R² regresión demanda | 0.52–0.87 | Por producto, sobre los datos de entrenamiento |
| Silhouette K-Means | 0.652 | `Vergara.ml.metricas.calcularTodo()`, 16 clientes, k = 4 |
| Ahorro A* vs NN (8 paradas) | 14.0 % (27.47 km vs 31.96 km) | Botón "Generar escenario de prueba (8 paradas)" |
| Ahorro A* vs NN (4 reales) | 0 % (15.99 km ambos) | Caso real con los 4 clientes del prototipo |
| Outliers DBSCAN | 3 de 87 pedidos (84 normales) | Dashboard de gerencia; eps = 0.15, minSamples = 3 (87 pedidos, no 30) |
| Tiempo de carga inicial | ≈ 100 ms (94–108 ms en 5 corridas) | `PerformanceNavigationTiming`, Chrome 158 headless, `file://` local (ver nota) |
| Tiempo de predicción demanda | ≈ 0.6 ms por producto (entrena y predice, sin caché) | `performance.now()`, mediana de 20 corridas, mismo entorno |
| Tiempo de optimización ruta 8 paradas | ≈ 0.7 ms (A*, 263 expansiones) | `performance.now()`, mediana de 20 corridas, mismo entorno |
| SUS simplificado | Pendiente | Encuesta UAT real (`docs/UAT.md`); aún no se ha aplicado |

**Nota sobre los tiempos:** se midieron en Chrome headless en la máquina de desarrollo (sin red ni throttling de CPU). Son una referencia; en un celular serán mayores. Para repetirlos en un dispositivo real: Chrome DevTools > Performance (carga) o `performance.now()` en la consola.

**Para regenerar métricas:** abrir `tests.html`; para tiempos, usar Chrome DevTools > Performance; para LOO y silhouette, ejecutar en la consola de `index.html` (o de `tests.html`) la función de validación `Vergara.ml.metricas.calcularTodo()`.

## Cómo ejecutar
Abrir `tests.html` en el navegador (ver `README.md`). Resultado obtenido (Chrome headless): **25 tests passed / 0 tests failed**.

## Resultados de los tests
| # | Prueba | Resultado |
|---|--------|-----------|
| 1 | `estadistica.media([1,2,3,4,5]) === 3` | ✅ |
| 2 | `estadistica.mediana([1,2,3,4,5]) === 3` | ✅ |
| 3 | `estadistica.mediana([1,2,3,4]) === 2.5` | ✅ |
| 4 | `estadistica.varianza([1,2,3,4,5]) ≈ 2` (tol. 0.01) | ✅ |
| 5 | `detectarOutliers([1,1,1,1,100])` contiene el 100 | ✅ |
| 6 | Regresión: entrenar `y = 2x + 1` (con los valores por defecto), predecir x=10 → ≈ 21 | ✅ |
| 7 | Regresión: R² de un ajuste perfecto ≈ 1 (con tolerancia, ver nota) | ✅ |
| 8 | Regresión: predecir con modelo vacío lanza error | ✅ |
| 9 | Árbol: entropía de un set puro = 0 | ✅ |
| 10 | Árbol: entropía de 50/50 = 1 | ✅ |
| 11 | Árbol: entrenar con datos triviales y predecir | ✅ |
| 12 | KNN: predecir con vecinos claros | ✅ |
| 13 | KNN: k mayor que las muestras lanza error | ✅ |
| 14 | K-Means: 2 grupos obvios → 2 clusters separados | ✅ |
| 15 | K-Means: silhouette > 0.5 en datos separables | ✅ |
| 16 | DBSCAN: detecta 1 outlier en un cluster compacto | ✅ |
| 17 | DBSCAN: puntos densos → ningún outlier | ✅ |
| 18 | A*: origen (0,0), paradas con id (1,0),(2,0),(3,0) → orden = [1,2,3] (devuelve los `id`; sin `id` devuelve `{indice, x, y, ...}`) | ✅ |
| 19 | Hill Climbing: ruta mejor o igual que la aleatoria inicial | ✅ |
| 20 | BFS: encuentra camino en un grafo pequeño | ✅ |
| 21 | DFS: encuentra camino en un grafo pequeño | ✅ |
| 22 | Resultados consistentes (sin NaN ni undefined) | ✅ |
| 23 | SVM separa perfectamente 2 clases linealmente separables | ✅ |
| 24 | SVM tiene accuracy > 0.8 en datos casi separables | ✅ |
| 25 | SVM con datos no separables tiene accuracy < 1 | ✅ |

**Nota sobre el test 7:** usa tolerancia (`toBeCloseTo`) por errores de punto flotante en JS. Comparar floats con `===` es mala práctica; el gradiente descendente se acerca a R² = 1 pero rara vez cae exactamente en 1.

**Nota sobre los valores por defecto de la regresión:** con `learningRate = 0.01` y `epochs = 1000` el modelo no convergía con pocos datos (en `y = 2x + 1` predecía 17.56 en lugar de 21). Los valores por defecto son ahora `learningRate = 0.1` y `epochs = 2000`, y los tests 6, 7 y 22 los usan sin pasar parámetros. El resultado para los 5 productos del prototipo no cambió (mismos R² y demanda proyectada).

## Métricas de los modelos con los datos del prototipo
Valores obtenidos al ejecutar el código con los datos de `js/data.js` (los datos son sintéticos).

### Regresión lineal (demanda a 30 días, 6 semanas de historial por producto)
| Producto | R² | RMSE (und/sem) | Demanda 30 días | ¿Baja confianza? (R² < 0.5) |
|---|---|---|---|---|
| Arroz 5 kg | 0.75 | 2.11 | 174 | No |
| Aceite 1 L | 0.87 | 1.36 | 148 | No |
| Azúcar 1 kg | 0.52 | 2.10 | 196 | No (límite) |
| Fideos 500 g | 0.75 | 1.90 | 251 | No |
| Leche 400 g | 0.63 | 1.90 | 168 | No |

**Limitación (colinealidad):** con 6 semanas los features `semana` y `mes` son casi colineales, afectando la estabilidad de los coeficientes. El R² sí es correcto (0.52–0.87), pero se mide sobre los mismos datos de entrenamiento. En producción se usaría SARIMA o LSTM para capturar estacionalidad. Está en el plan de mejoras (`docs/PLAN_MEJORAS.md`, punto 2).

## Validación cruzada
**Método:** leave-one-out (LOO): se deja 1 muestra fuera, se entrena con las demás (29 de 30) y se predice la muestra excluida; se repite para cada muestra. La exactitud es el porcentaje de muestras acertadas.

### Clasificación de riesgo en 3 clases (bajo / medio / alto, 30 pedidos)
| Modelo | Accuracy entrenamiento | Accuracy LOO |
|---|---|---|
| Árbol de decisión | 100 % | 70 % |
| KNN (k = 5) | 77 % | 50 % |
| SVM | no aplica (es binario) | no aplica |

### Clasificación binaria alto vs bajo (17 pedidos; los "medio" se excluyen porque el SVM es binario)
| Modelo | Accuracy entrenamiento | Accuracy LOO |
|---|---|---|
| Árbol de decisión | 100 % | 82 % |
| KNN (k = 5) | 100 % | 100 % |
| SVM lineal | 100 % | 100 % |

**Lectura de los resultados:**
- La diferencia entre entrenamiento y validación indica sobreajuste por dataset pequeño (30 muestras). Con más datos reales se reduciría. Está en plan de mejoras.
- El sobreajuste se ve sobre todo en el árbol (100 % → 70 % y 100 % → 82 %). El SVM lineal no muestra brecha en el problema binario, coherente con que ese conjunto es linealmente separable.
- En el problema de 3 clases el árbol (70 %) supera a KNN (50 %). En el binario, KNN y SVM (100 %) superan al árbol (82 %).
- Por eso el árbol se justifica por su **interpretabilidad** (reglas legibles para la gerencia) y no por tener la mayor exactitud. El 100 % de entrenamiento del árbol no mide desempeño real; la cifra a citar es la de LOO.
- El tamaño de las muestras es muy pequeño (17 y 30): una sola muestra equivale a 3–6 puntos porcentuales. Son cifras ilustrativas.
- Acuerdo Árbol–KNN sobre los 30 históricos: 23 de 30 (77 %).

### K-Means (16 clientes históricos, k = 4)
| Métrica | Valor |
|---|---|
| Silhouette | 0.65 |
| Iteraciones hasta converger | 2 |
| Distribución | 4 VIP · 4 Recurrente · 4 Ocasional · 4 En riesgo |
| Inercia (k = 2 … 6) | 1.53 · 0.86 · 0.29 · 0.27 · 0.17 |

El codo se ve en k = 4: la inercia baja de 0.86 a 0.29 y de ahí en adelante mejora poco.

### DBSCAN (87 pedidos, eps = 0.15, minSamples = 3)
| Métrica | Valor |
|---|---|
| Pedidos normales | 84 |
| Pedidos anómalos | 3 (2200 con 1 ítem · 1500 con 2 ítems · 55 con 5 ítems) |

Las 3 anomalías fueron insertadas a propósito en los datos de ejemplo, así que se espera detectarlas.

### Rutas (8 paradas aleatorias, 5 casos)
| Caso | A* (km) | Vecino más cercano (km) | Hill Climbing (km) |
|---|---|---|---|
| 1 | 21.98 | 23.07 | 37.87 |
| 2 | 18.96 | 18.96 | 26.88 |
| 3 | 18.70 | 18.70 | 25.97 |
| 4 | 21.16 | 24.74 | 21.16 |
| 5 | 19.82 | 23.96 | 19.82 |

A* nunca es peor que el vecino más cercano (es óptimo; se comprobó contra fuerza bruta en un caso de 8 paradas). Con los 4 clientes del prototipo, A* y el vecino más cercano coinciden (15.99 km, 0 % de ahorro).

**Escenario de prueba de 8 paradas** (botón en Distribución, coordenadas fijas en `Vergara.data.escenarioPrueba`): vecino más cercano 31.96 km, A* 27.47 km (**ahorro 14.0 %**) y Hill Climbing 45.59 km (−42.7 %).

**Hallazgo esperado (Hill Climbing):** cae en óptimos locales como predice la teoría (S12). A* garantiza optimalidad por su heurística admisible. La comparación demuestra esta limitación: en 3 de los 5 casos aleatorios y en el escenario de prueba Hill Climbing recorre más que el vecino más cercano.

## Verificación de integración
Se ejecutó el flujo completo en Chrome headless (cliente → ventas → almacén → repartidor → gerencia) sin errores de consola: riesgo asignado al confirmar el pedido, modales de reglas y comparación, comparación de rutas, segmentación y anomalías en el dashboard, y segmentos guardados en `localStorage`.

## No verificado
- Los scripts de `ml-reference/` pasaron la revisión de sintaxis de Python pero no se ejecutaron en este entorno porque scikit-learn no estaba instalado.
- El escáner de código de barras se probó con una cámara falsa y un detector simulado; la lectura de un código físico requiere un navegador con `BarcodeDetector` (Chrome en Android, macOS o ChromeOS, o Edge).
