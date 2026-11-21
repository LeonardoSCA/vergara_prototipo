"""
Segmentación de clientes con K-Means (referencia con scikit-learn).

Equivale a js/services/ml/kmeans.js del prototipo:
  - Mismas variables por cliente: frecuencia, ticket promedio y días desde la última compra.
  - MinMaxScaler → igual que la normalización min-max que aplica el prototipo antes de entrenar.
  - KMeans(n_clusters=4, init='k-means++') → misma inicialización y k=4 segmentos.
  - silhouette_score → equivale a Vergara.ml.kmeans.silhouetteScore().

Los 100 clientes son sintéticos y se generan con 4 comportamientos distintos.
"""
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import MinMaxScaler

rng = np.random.default_rng(42)

# --- 1. Clientes sintéticos (25 por comportamiento): frecuencia, ticket (S/), días sin comprar ---
perfiles = [
    (10, 550, 4),    # VIP
    (6, 270, 10),    # Recurrente
    (3, 150, 32),    # Ocasional
    (2, 100, 90),    # En riesgo
]
filas = []
for frecuencia, ticket, dias in perfiles:
    for _ in range(25):
        filas.append({
            "frecuencia": max(1, int(rng.normal(frecuencia, 1))),
            "ticketPromedio": max(30, rng.normal(ticket, ticket * 0.12)),
            "diasDesdeUltimaCompra": max(0, rng.normal(dias, dias * 0.2)),
        })
clientes = pd.DataFrame(filas)

# --- 2. Normalización y entrenamiento ---
escalador = MinMaxScaler()
X = escalador.fit_transform(clientes)
modelo = KMeans(n_clusters=4, init="k-means++", n_init=10, random_state=42).fit(X)

# --- 3. Resultados ---
print(f"Silhouette score: {silhouette_score(X, modelo.labels_):.3f}")
print(f"Inercia: {modelo.inertia_:.3f}")

centroides = pd.DataFrame(escalador.inverse_transform(modelo.cluster_centers_), columns=clientes.columns)
# Igual que el prototipo: se nombran los grupos por ticket promedio descendente
centroides = centroides.sort_values("ticketPromedio", ascending=False).reset_index()
centroides["segmento"] = ["VIP", "Recurrente", "Ocasional", "En riesgo"]
centroides["clientes"] = [int((modelo.labels_ == i).sum()) for i in centroides["index"]]
print("\nCentroides (en unidades originales):")
print(centroides.drop(columns="index").round(1).to_string(index=False))

print("\n>>> Este script corresponde a js/services/ml/kmeans.js del prototipo.")
