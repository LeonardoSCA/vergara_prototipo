# UAT — Pruebas de Usuario (Avance 3)

> **Estado: plantilla lista, resultados pendientes.** Las pruebas con usuarios reales aún no se han realizado, así que las casillas y la encuesta están vacías a propósito. Un UAT con resultados inventados no tiene valor. Procedimiento: pedir a 2–3 personas que prueben el prototipo durante unos 5 minutos cada una, siguiendo el checklist, y llenar las tablas con lo que realmente ocurra.

## 1. Perfiles de usuario de prueba
| Usuario | Perfil | Dispositivo |
|---------|--------|-------------|
| A | Estudiante de ingeniería, 22 años, técnico | Laptop Chrome |
| B | Persona sin formación técnica, 45 años | Celular Chrome |
| C | Compañero de clase, 21 años | Laptop Chrome |

(Ajustar los perfiles a las personas que realmente participen.)

## 2. Checklist de 10 tareas clave
Marcar: ✅ lo hizo sin ayuda · ⚠️ lo hizo con dudas o ayuda · ❌ no pudo.

| # | Tarea | A | B | C | Observaciones |
|---|-------|---|---|---|---------------|
| 1 | Login como cliente y crear pedido | | | | |
| 2 | Intentar pedir más stock del disponible | | | | |
| 3 | Ver clasificación de riesgo del pedido | | | | |
| 4 | Comparar clasificadores (Árbol/KNN/SVM) | | | | |
| 5 | Almacén: inventario y alertas EOQ | | | | |
| 6 | Distribución: escenario 8 paradas | | | | |
| 7 | Escanear código con cámara | | | | Requiere permiso de cámara y navegador con `BarcodeDetector` |
| 8 | Dashboard: predicción de demanda | | | | |
| 9 | Dashboard: K-Means y DBSCAN | | | | |
| 10 | Chatbot: "¿hay arroz?" | | | | |

## 3. Encuesta SUS simplificada (1-5)
1 = muy en desacuerdo, 5 = muy de acuerdo. El promedio por pregunta es la media de A, B y C.

| Pregunta | A | B | C | Promedio |
|----------|---|---|---|----------|
| ¿El sistema es fácil de usar? | | | | |
| ¿Las funciones están bien integradas? | | | | |
| ¿El sistema responde rápido? | | | | |
| ¿Los resultados de ML son comprensibles? | | | | |
| ¿Recomendarías el sistema? | | | | |
| **Promedio general** | | | | **— / 5** |

Al terminar, copiar el promedio general a la fila "SUS simplificado" de `docs/PRUEBAS.md`.

## 4. Hallazgos y acciones
### Hallazgos de usuarios
(Pendiente: se llena con las observaciones reales de la sección 2.)

### Puntos a vigilar durante las pruebas (detectados en la verificación técnica, no por usuarios)
Son riesgos conocidos de usabilidad; confirmar si los usuarios reales los notan.

| Punto | Estado / acción |
|-------|-----------------|
| Términos como "riesgo", R² o "vectores de soporte" pueden no ser claros para un usuario sin formación técnica | El dashboard solo avisa "Modelo con baja confianza" cuando R² < 0.5; no explica qué es R². Si los usuarios no lo entienden, añadir textos explicativos (plan de mejoras) |
| El escáner de código de barras necesita permiso de cámara y un navegador con `BarcodeDetector` (Chrome en Android, macOS o ChromeOS; Edge) | Si no está disponible, la app muestra un mensaje explicando el motivo. La lectura de un código físico no se ha probado en hardware real |
| En el escenario de 8 paradas, Hill Climbing recorre más que A* y que el vecino más cercano | Es el comportamiento esperado de un óptimo local; está explicado en `docs/PRUEBAS.md` |
