# NEXT_STEP

## Hecho (2026-07-18, 3ª tanda)
- **Pregunta + respuestas a media pantalla**: `.dialog-bar` gana
  `min-height: 46vh` (sigue anclada abajo y creciendo hacia arriba, con
  scroll interno solo a partir de 70vh). Antes quedaba pegada al fondo y en
  pantallas bajas obligaba a hacer scroll. Verificado sin scroll en
  1440×900, 1280×650 y 390×844.
- **Cache-busting**: el .htaccess cachea css/js 1 día, así que los
  navegadores seguían viendo el CSS viejo tras el deploy. `index.html`
  ahora versiona los assets (`?v=20260718c`). Al cambiar styles.css o
  componentes, **subir la versión** del sufijo y redeploy.

## Hecho (2026-07-18, 2ª tanda)
- **Rueda más grande y letra mayor** (feedback del usuario tras la 1ª tanda):
  plano `min(90vmin, 1100px)` (antes 82vmin/1000px) y subida de fuentes en
  `mandala.jsx`: etiquetas de itinerario 0.022→0.026, sector 0.022→0.025
  (foco 0.027→0.031), sub 0.014→0.016, anillo 0.013→0.0145, nº de vértice
  0.015→0.017.
- **Punto vs sector sombreado coherentes**: el vértice usaba el ángulo
  centroide puro y podía caer en la cuña vecina (p.ej. punto en PLS-SEM con
  Regression sombreado). Ahora `vertexAngleForScores()` (module-level,
  expuesta como `window.__vertexAngleForScores`) clampa el centroide dentro
  de la cuña del líder (argmax, mismo criterio que `focusSector` en app.jsx)
  con 4° de margen. **Comprobación recursiva** sobre el árbol de preguntas
  (exhaustiva 4 niveles + muestreo hasta 8): 24.556 estados, 0 violaciones,
  desviación máx 18,5° < 22,5° (media cuña).
- Reproducido y verificado el caso reportado (Q1-A + Q2-E): PLS-SEM lidera,
  se sombrea PLS-SEM y el punto 2 queda dentro; el punto 1 se queda en
  Regression (líder en aquel paso). Verificado en 1440×900, 1024×768 y
  390×844.

## Hecho (2026-07-18)
- **Rueda grande legible** (`components/mandala.jsx`):
  - El SVG interno ahora usa `width/height="100%"`: antes tenía 1100px fijos
    mientras el CSS capaba el plano a `min(82vmin,1000px)`, así que el disco
    quedaba descentrado y "orbitaba" al rotar (rotateZ pivotaba sobre el centro
    del div, no del dibujo) → el nombre del método del norte acababa cortado
    bajo la cabecera (bug de `encabezado.png` / "sombreado").
  - `overflow: visible` en el SVG: los nombres en el borde ya no se recortan
    ("GROUP CONTRASTS" perdía la mitad superior; en la mini-rueda se veía
    "EURAL NETWORK", origen del falso typo "erural network").
  - Etiquetas de sector y de anillo **contra-rotadas** (-rotZ) → siempre
    horizontales, con **halo** (paintOrder stroke, color por tema) para leerse
    sobre cualquier fondo. La del sector líder va en negrita y más grande.
  - Etiquetas de anillo (Analytic goal / Data structure / Assumptions)
    ancladas a una posición FIJA de pantalla (diagonal superior-izquierda),
    fuera del norte y del diálogo.
  - La etiqueta del ÚLTIMO vértice del itinerario se dibuja HACIA ABAJO
    (hacia el centro), nunca sobre el nombre del método del norte; el resto
    de vértices etiquetan hacia fuera en coordenadas de pantalla.
  - `shortAnswer` ya no corta en guiones internos ("Test a pre-specified…"
    quedaba "Test a pre") ni deja "/" colgantes.
- **Mini-rueda completa** (`components/mini-map.jsx`): viewBox con margen
  (PAD_X/PAD_Y) para que nada se recorte + nombres completos desde la
  taxonomía, partidos en ≤2 líneas equilibradas (fsQCA conserva su grafía).
- **Enlace "Applied case" eliminado** de la cabecera (`app.jsx` + CSS muerto
  purgado). Los ficheros applied-case.html/pdf siguen accesibles por URL
  directa con su Basic Auth.
- **HUD "Current leaning" solo-móvil**: en desktop chocaba con la etiqueta
  del itinerario (el método ya se lee en el norte + mini-rueda); en móvil
  (<760px) se muestra compacto bajo la cabecera desde la 1ª respuesta y es
  el indicador legible del método (aparecía antes solo tras 3 respuestas).
- **Móvil arreglado**: `.overlay-mid` vuelve a actuar de espaciador flex
  (con `visibility:hidden`, no `display:none`) → el diálogo vuelve al fondo
  y la esfera + itinerario quedan siempre visibles.
- **Verificación visual recursiva** (Puppeteer, local): las 7 opciones de Q1
  (cada sector/rotación), recorrido completo hasta la recomendación (Neural
  Network y Regression/GLM), en 1440×900, 1024×768, 800×1100, 390×844 y
  844×390. En todos: método legible, mini-rueda completa, trazado visible.

## Siguiente paso (pendiente)
- Commit + push a GitHub y deploy con
  `python deploy_site.py entrepreneuratlas.eu` y
  `python deploy_site.py atlasentrepreneur.eu`, y verificación visual en vivo.
  (Si esta sesión terminó, ese deploy ya debería estar hecho — comprobar los
  dominios en el navegador.)
