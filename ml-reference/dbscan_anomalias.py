"""
Detección de pedidos anómalos con DBSCAN (referencia con scikit-learn).

Equivale a js/services/ml/dbscan.js del prototipo:
  - Variables por pedido: [monto, numItems] normalizadas con min-max.
  - DBSCAN(eps=0.15, min_samples=3): mismos parámetros que la vista del dashboard.
  - labels == -1 → ruido (outlier), igual que en Vergara.ml.dbscan.entrenar().
  - Como en scikit-learn, min_samples cuenta al propio punto (el prototipo hace lo mismo).

Las transacciones son sintéticas: una banda densa de pedidos normales y unos pocos pedidos inusuales.
"""
import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import MinMaxScaler

rng = np.random.default_rng(42)

# --- 1. Transacciones sintéticas ---
monto = rng.uniform(60, 700, 200)
numItems = np.clip(np.round(1 + monto / 200 + rng.normal(0, 0.3, 200)), 1, 5)
pedidos = pd.DataFrame({"monto": monto.round(2), "numItems": numItems.astype(int)})

# Pedidos inusuales: monto muy alto con pocos ítems, o muchos ítems con monto mínimo
anomalias = pd.DataFrame({"monto": [2200.0, 1500.0, 55.0], "numItems": [1, 2, 5]})
pedidos = pd.concat([pedidos, anomalias], ignore_index=True)

# --- 2. Normalización y entrenamiento ---
X = MinMaxScaler().fit_transform(pedidos[["monto", "numItems"]])
modelo = DBSCAN(eps=0.15, min_samples=3).fit(X)
pedidos["cluster"] = modelo.labels_

# --- 3. Resultados ---
outliers = pedidos[pedidos["cluster"] == -1]
print(f"Pedidos analizados: {len(pedidos)}")
print(f"Clusters encontrados: {len(set(modelo.labels_) - {-1})}")
print(f"Normales: {len(pedidos) - len(outliers)}  |  Anómalos: {len(outliers)}")
print("\nOutliers detectados:")
print(outliers[["monto", "numItems"]].to_string())

print("\n>>> Este script corresponde a js/services/ml/dbscan.js del prototipo.")
