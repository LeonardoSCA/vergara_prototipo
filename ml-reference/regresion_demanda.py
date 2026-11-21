"""
Regresión lineal múltiple para predecir la demanda semanal (referencia con scikit-learn).

Equivale a js/services/ml/regresionLineal.js del prototipo:
  - El prototipo entrena por gradiente descendente con variables normalizadas (min-max);
    scikit-learn resuelve el mismo problema de mínimos cuadrados con la solución analítica.
  - Variables: semana, mes, promo (0/1). Variable objetivo: unidades vendidas.
  - Métricas: MAE y R² (en el prototipo: ECM, RMSE y R²).

Los datos son sintéticos: tendencia creciente + efecto de promoción + ruido.
"""
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, r2_score

rng = np.random.default_rng(42)

# --- 1. Datos sintéticos: 52 semanas de ventas de un producto ---
semanas = np.arange(1, 53)
mes = ((semanas - 1) // 4.35).astype(int) % 12 + 1          # número de mes (1-12)
promo = (rng.random(52) < 0.15).astype(int)                  # ~15 % de semanas con promoción
unidades = 30 + 0.6 * semanas + 8 * promo + rng.normal(0, 3, 52)

df = pd.DataFrame({"semana": semanas, "mes": mes, "promo": promo, "unidades": unidades})

# --- 2. Entrenamiento (usa las primeras 40 semanas; las 12 restantes son de prueba) ---
X, y = df[["semana", "mes", "promo"]], df["unidades"]
X_train, X_test, y_train, y_test = X.iloc[:40], X.iloc[40:], y.iloc[:40], y.iloc[40:]

modelo = LinearRegression().fit(X_train, y_train)

# --- 3. Resultados ---
print("Coeficientes:")
for nombre, coef in zip(X.columns, modelo.coef_):
    print(f"  {nombre:>7}: {coef:+.3f}")
print(f"  intercepto: {modelo.intercept_:+.3f}")

pred = modelo.predict(X_test)
print(f"\nMAE (prueba): {mean_absolute_error(y_test, pred):.3f} unidades")
print(f"R²  (prueba): {r2_score(y_test, pred):.3f}")
print(f"R²  (entrenamiento): {modelo.score(X_train, y_train):.3f}")

# Pronóstico de las próximas 4 semanas (≈ 30 días), sin promoción
futuro = pd.DataFrame({"semana": [53, 54, 55, 56], "mes": [12, 12, 12, 1], "promo": [0, 0, 0, 0]})
print("\nDemanda proyectada a 30 días:", round(float(modelo.predict(futuro).sum())), "unidades")

print("\n>>> Este script corresponde a js/services/ml/regresionLineal.js del prototipo.")
