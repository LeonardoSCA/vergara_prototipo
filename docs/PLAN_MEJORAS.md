# Plan de mejoras

| # | Mejora | Justificación | Prioridad |
|---|--------|---------------|-----------|
| 1 | Migrar a backend Node.js + SQLite | Persistencia real multi-usuario; hoy localStorage es de un solo navegador. | Alta |
| 2 | Regresión con estacionalidad (SARIMA) | La regresión lineal no captura picos de fin de año. | Alta |
| 3 | Deploy multi-servicio (frontend + backend) | Hoy solo se despliega el frontend estático a Vercel. | Alta |
| 4 | SVM con kernel RBF | Comparar contra árbol de decisión para clasificación de riesgo. | Media |
| 5 | Algoritmo Genético para rutas > 15 paradas | A* explota con muchas paradas; GA escala mejor. | Media |
| 6 | Chatbot con LLM (RAG sobre catálogo) | El chatbot actual es basado en reglas y no responde preguntas abiertas. | Baja |
| 7 | Mean-Shift y GMM para segmentación | Comparar contra K-Means en datos con clusters no esféricos. | Baja |
| 8 | Clustering jerárquico con dendrograma | Visualización útil para exploración de segmentos. | Baja |
| 9 | Autenticación real con JWT y contraseñas | Hoy solo se selecciona rol sin verificar identidad. | Media |
| 10 | Escáner de código de barras con cámara | Usar BarcodeDetector API (hoy es input manual). | Baja |
