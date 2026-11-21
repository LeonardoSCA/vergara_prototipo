# Scripts Python de referencia (scikit-learn)

Estos scripts **NO forman parte de la demo del prototipo**. Sirven como **referencia** para mostrar el enfoque productivo con scikit-learn.

Para ejecutarlos:

```bash
pip install -r requirements.txt && python <archivo>.py
```

Los algoritmos implementados en `js/services/ml/` son funcionalmente equivalentes y corren en el navegador **sin dependencias**.

| Script Python | Equivale a (prototipo JS) | Qué hace |
|---|---|---|
| `regresion_demanda.py` | `js/services/ml/regresionLineal.js` | `LinearRegression` sobre ventas semanales sintéticas; imprime coeficientes, MAE y R² |
| `arbol_riesgo.py` | `js/services/ml/arbolDecision.js` | `DecisionTreeClassifier(criterion='entropy', max_depth=5)` sobre 500 pedidos; imprime accuracy, matriz de confusión y reglas |
| `kmeans_clientes.py` | `js/services/ml/kmeans.js` | `KMeans(n_clusters=4)` sobre 100 clientes; imprime silhouette y centroides |
| `dbscan_anomalias.py` | `js/services/ml/dbscan.js` | `DBSCAN(eps=0.15, min_samples=3)` sobre transacciones con outliers; imprime los outliers |

Todos los datos son sintéticos y las semillas son fijas, por lo que los resultados se pueden reproducir.
