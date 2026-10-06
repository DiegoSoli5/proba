# Semana 5 · Pruebas de hipótesis t y Z

Web educativa en español basada en **T_y_Z.ipynb** y **GRAPROES_JAL_LOC.csv**. Incluye todos los pasos 0–6 del notebook, comparación de t y Z, supuestos, hipótesis, significancia, valores críticos, decisiones y errores tipos I y II.

**Sitio:** https://proba-semana-5-t-z.solisdg-4.chatgpt.site (acceso privado de Sites).

## Explorar

- Explorador de 6,334 registros: filtros por municipio y localidad, histograma, media, mediana y tabla paginada.
- Ejercicios originales con las mismas muestras de Pandas: t, n=15, semilla 42; Z, n=45, semilla 101.
- Laboratorio de contrastes: prueba, dirección de H₁, μ₀, α, tamaño y semilla; gráfica, p-valor, error estándar, diagnóstico y descarga de la muestra.
- TLC: distribución de 1,000 medias muestrales extraídas del CSV.
- Potencia y errores: 500 contrastes simulados bajo un modelo normal, diferenciados de los datos reales.
- Descargas de los originales, explicación de librerías y equivalencias con Excel.

## Ejecutar la web

No requiere compilación ni paquetes de frontend. Sirve `dist` por HTTP; abrir `index.html` mediante `file://` no permite cargar el JSON en todos los navegadores.

```sh
cd dist
python -m http.server 4173 --bind 127.0.0.1
```

Visita http://127.0.0.1:4173. Todas las fuentes y recursos están incluidos localmente; las interacciones no envían información a terceros. El único acceso externo necesario para el visitante es abrir GitHub.

## Reproducir el análisis

Desde esta carpeta:

```sh
pip install -r requirements.txt
python scripts/preparar_datos.py
node scripts/verificar_numerica.mjs
```

`preparar_datos.py` genera `referencia.json` y `dist/datos.json` desde el CSV. Los resultados se verifican frente a SciPy:

| Ejercicio | Media | Desviación usada | EE | Estadístico | Valor crítico | p | Decisión a α=.05 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| t bilateral, 14 gl | 6.3727 | s=0.8789 | 0.2269 | −1.3984 | ±2.1448 | 0.1838 | No rechazar H₀ |
| Z derecha | 6.5649 | σ=1.9088 | 0.2846 | 1.9852 | 1.6449 | 0.0236 | Rechazar H₀ |

Los archivos proporcionados permanecen intactos. El notebook original carga `GRAPROES_JAL_LOC.csv.xlsx` con `pd.read_excel`; el script de reproducción utiliza `pd.read_csv` sobre el CSV entregado. Para ejecutar el notebook original, cambia esa línea al lector CSV o proporciona el Excel que espera.

## Precisiones estadísticas

- μ=6.6900015788 y σ=1.9088418609 corresponden a todos los registros sin ponderación por población. No son estimaciones del promedio de escolaridad por persona. El archivo incluye 222 agrupaciones de localidades, LOC=9998/9999; se conservan para reproducir el notebook.
- Los contrastes son ejercicios de muestreo sobre un marco completo conocido. No demuestran cambios en el tiempo, diferencias de una zona determinada ni causalidad.
- σ desconocida conduce a t también con muestras grandes. n=30 es una orientación para el TLC, no un criterio universal de selección t/Z.
- La normalidad no se verifica únicamente con histograma, KDE o similitud de media y mediana. Se asumen aleatoriedad e independencia.
- No rechazar H₀ no equivale a probarla. α no es una probabilidad posterior de error, y p no es P(H₀ verdadera).
- El laboratorio muestra un intervalo **bilateral** de confianza aunque la prueba elegida sea unilateral.
- En el TLC se utiliza la corrección de población finita para comparar el EE teórico. Los contrastes originales y el laboratorio usan el EE del notebook sin esa corrección (fracción de muestreo pequeña).
- La simulación de potencia usa la distribución normal del estadístico Z con σ conocida; no extrae nuevos registros del CSV.
- Las nuevas muestras web usan Mulberry32 y muestreo sin reemplazo. Son reproducibles dentro de la web, pero las semillas no equivalen a las de Pandas. Los presets originales sí cargan las muestras exactas de Pandas.

## Validación de interfaz

`scripts/verificar_interfaz.py` usa Playwright y el Chromium instalado. Con el servidor anterior activo, ejecuta:

```sh
pip install playwright
python scripts/verificar_interfaz.py
```

El ejecutable de Chromium se configura en el script (`/usr/bin/chromium` en el entorno de desarrollo). Las capturas y resultados están en `verificacion/`. Se comprobaron escritorio, tableta y móvil (1440, 768 y 390 px), controles, filtros, paginación, simulaciones y descargas, sin errores JavaScript, recursos fallidos ni desbordamiento horizontal.

## Archivos

- `T_y_Z.ipynb`, `GRAPROES_JAL_LOC.csv`: originales.
- `dist/`: aplicación, datos derivados, fuentes y copias descargables de los originales.
- `scripts/`: preparación de datos y verificaciones.
- `referencia.json`: cálculos de referencia completos.
- `.openai/hosting.json`: identidad y directorio estático de Sites.
- `verificacion/`: evidencia de las comprobaciones realizadas.

La web usa HTML semántico, CSS con liquid glass y animaciones, módulos JavaScript y SVG. Respeta `prefers-reduced-motion`, admite navegación por teclado y utiliza estados accesibles para los resultados interactivos. DM Sans y Newsreader se distribuyen bajo SIL Open Font License; sus licencias están en `dist/fonts/`.
