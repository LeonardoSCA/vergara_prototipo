"""
Árbol de decisión para clasificar el riesgo de un pedido (referencia con scikit-learn).

Equivale a js/services/ml/arbolDecision.js del prototipo:
  - criterion='entropy' → mismo criterio de ganancia de información (ID3) que el prototipo.
  - max_depth=5 → misma profundidad máxima.
  - El distrito se codifica como número (1=Comas, 2=Los Olivos, 3=Independencia,
    4=San Martín de Porres), igual que Vergara.ml.arbolDecision.preprocesar().
  - export_text() equivale a Vergara.ml.arbolDecision.imprimirReglas().

Los 500 pedidos son sintéticos y siguen la misma lógica de riesgo que el histórico de data.js.
"""
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier, export_text

rng = np.random.default_rng(42)
N = 500

# --- 1. Pedidos sintéticos ---
df = pd.DataFrame({
    "monto": rng.uniform(80, 1000, N).round(2),
    "numItems": rng.integers(1, 6, N),
    "distrito": rng.integers(1, 5, N),                       # 1=Comas, 2=Los Olivos, 3=Independencia, 4=SMP
    "clienteHistorial": rng.integers(0, 16, N),
    "clienteCumplimiento": rng.uniform(0.4, 1.0, N).round(2),
})


def riesgo(f):
    """Regla de negocio usada para etiquetar los pedidos sintéticos."""
    if (f.clienteCumplimiento < 0.6 and f.monto >= 300) or (f.monto >= 800 and f.clienteHistorial <= 2):
        return "alto"
    if f.monto >= 400 or f.clienteCumplimiento < 0.8:
        return "medio"
    return "bajo"


df["riesgo"] = df.apply(riesgo, axis=1)

# --- 2. Entrenamiento ---
X, y = df.drop(columns="riesgo"), df["riesgo"]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)

arbol = DecisionTreeClassifier(criterion="entropy", max_depth=5, random_state=42).fit(X_train, y_train)

# --- 3. Resultados ---
pred = arbol.predict(X_test)
etiquetas = ["bajo", "medio", "alto"]
print(f"Accuracy (prueba): {accuracy_score(y_test, pred):.3f}")
print("\nMatriz de confusión (filas = real, columnas = predicho):")
print(pd.DataFrame(confusion_matrix(y_test, pred, labels=etiquetas),
                   index=[f"real_{e}" for e in etiquetas], columns=[f"pred_{e}" for e in etiquetas]))
print("\nReglas del árbol:")
print(export_text(arbol, feature_names=list(X.columns)))

print(">>> Este script corresponde a js/services/ml/arbolDecision.js del prototipo.")
