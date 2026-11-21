# Despliegue en Vercel

El prototipo es estático (HTML, CSS y JS), por lo que no necesita build ni servidor.

## Pasos
1. **Subir el proyecto a GitHub**
   ```bash
   git init
   git add .
   git commit -m "Vergara Intelligent Logistics – Avance 3"
   git branch -M main
   git remote add origin https://github.com/<usuario>/<repositorio>.git
   git push -u origin main
   ```
2. **Crear una cuenta en Vercel** en <https://vercel.com/signup> (lo más cómodo es *Continue with GitHub*).
3. **Importar el repositorio**: en el panel pulsar **Add New… → Project**, buscar el repositorio y pulsar **Import**.
4. **Configurar el proyecto**
   - **Framework Preset**: `Other`
   - **Build Command**: dejar vacío
   - **Output Directory**: `./`
   - **Install Command**: dejar vacío
5. Pulsar **Deploy**.
6. Al terminar Vercel muestra una **URL pública** (`https://<proyecto>.vercel.app`) con el prototipo. Los tests están en `https://<proyecto>.vercel.app/tests.html`.

## Notas
- Cada `git push` a `main` genera un nuevo despliegue automático.
- Los datos viven en el `localStorage` de cada navegador; cada visitante ve sus propios pedidos. Para datos compartidos haría falta un backend (ver `docs/PLAN_MEJORAS.md`, puntos 1 y 3).
- `ml-reference/` (Python) se sube al repositorio pero no se ejecuta en Vercel.
- Alternativa sin cuenta: `python3 -m http.server 8000` y abrir <http://localhost:8000>.
