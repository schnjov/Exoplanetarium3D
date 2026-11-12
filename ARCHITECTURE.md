# Arquitectura y decisiones de Exoplanetarium 3D

## Flujo y responsabilidades

1. **Extracción offline:** `scripts/fetch_nasa_systems.py` consulta NASA TAP. Usa `ps` con `default_flag=1`, hosts configurables y suplemento explícito de distancia desde `pscomppars`. Guarda CSV de entrada y resultados normalizados. No necesita consultar NASA al ejecutar la interfaz.
2. **Contrato estático:** `public/data/catalog-index.json` tiene metadatos y rutas; `public/data/systems/` contiene el detalle. El índice incluye AR, DEC y distancia, y el validador compara esos campos con el detalle. `src/types.ts` declara los tipos; `src/data.ts` comprueba HTTP y decodifica JSON, pero no valida todo el esquema en ejecución.
3. **Interacción:** `src/App.tsx` maneja sistema, etapa, selección, foco, velocidad y fondo. `src/StarMap.tsx` proyecta coordenadas cartesianas derivadas de AR/DEC y distancia comprimida con log1p. Si falta posición, el sistema no se inventa en el mapa: sigue accesible en el catálogo.
4. **Render:** `src/ThreeScene.tsx` administra la escena Three.js, OrbitControls, raycasting y reloj. Actualiza interacción por referencias; cambiar etapa reconstruye la escena, pero conserva el reloj del mismo sistema. El mapa oculta la escena del sistema sin avanzar su reloj. `src/stellarFlare.ts` aporta el shader procedural; `public/cosmic-nebula.svg` es una capa decorativa independiente.
5. **Distribución:** Vite compila a `dist/`. Firebase Hosting puede servir el artefacto estático. No se necesita backend en runtime. Verificar autorización, destino y acceso antes de publicar.

## Contratos de datos y presentación

- MAP-005 (pendiente de aceptación visual): proyección del mapa inicialmente al 120%, zoom visual limitado a 50%–400% mediante rueda y controles accesibles. Escala posiciones y cuadrícula, no distancias físicas ni tamaño de marcadores/etiquetas. Cambiar zoom conserva giro; restablecer recupera giro y zoom inicial. Etiquetas recalculadas por zoom.

- MAP-004 (pendiente de aceptación visual): el mapa limita los sistemas con coordenadas válidas en orden del catálogo, inicialmente 100, con opciones por centenas y el total. El límite no modifica la orientación ni el catálogo. Los marcadores son puntos CSS con halo y destellos decorativos, no esferas.

- DAT-004: selección automática en lotes secuenciales de 50 hosts. Las filas y suplementos de sistemas aceptados se conservan en memoria y se exportan sin volver a consultar; cada JSON registra el ADQL real de su lote. Se exige el conteo completo anunciado por el resumen y se conserva orden de preferencia. Reintentos limitados a tres intentos para HTTP transitorios y fallos de red, con progreso y salida CLI legible. No hay caché persistente ni concurrencia de peticiones. La descarga completa precede a la escritura.
- DAT-003: `fetch_json` envía las consultas a TAP mediante POST codificado como formulario; el ADQL queda en el cuerpo en lugar de la URL para evitar HTTP 414 con selecciones grandes. Se mantienen filtros, consultas registradas, timeout y contrato JSON. Ambas descargas finales terminan antes de escribir salidas.
- UI-002: cada sistema abre sin planeta seleccionado. El inspector presenta conteos por categoría visual y atributos estelares/coordenadas con procedencia e incertidumbre. La selección desde escena o lista acerca suavemente la cámara y sigue al planeta, sin reconstruir la escena ni reiniciar el reloj; el retorno explícito al sistema limpia selección y foco. Centrar en la estrella conserva el inspector como acción independiente. La luz de detalle es decorativa y facilita ver el planeta, no representa iluminación observada.
- MAP-003: el interruptor de nombres conserva orientación y marcadores del mapa; al volver a mostrar etiquetas se aplica el filtro de solapamientos por profundidad de MAP-002.
- Cada atributo numérico registra valor o nulo, unidad, incertidumbre, fuente, procedencia y explicación de transformación cuando corresponde. La incertidumbre de valores derivados no se propaga automáticamente.
- Si falta semieje mayor se puede estimar con período y masa estelar positivos. El radio faltante puede estimarse de la masa **solo como recurso visual**. Excentricidad faltante se asume 0; inclinación faltante se asume 90°. La fase inicial es asumida y determinista.
- El mapa representa posiciones relativas al Sol a escala comprimida. La vista de sistema usa otra escala: normalización logarítmica de órbitas y escala separada de radios. La estrella de escena no representa fielmente su tamaño o luminosidad.
- La elipse usa a y e; el semieje menor se calcula como b = a√(1−e²). La inclinación se representa respecto de un plano de referencia. Se usa un parámetro angular visual dependiente del período, no propagación kepleriana ni una simulación N-cuerpos.
- La etapa geométrica usa wireframe. Los planetas sólidos usan materiales estándar iluminados, con color heurístico según radio. La estrella luminosa usa un plano orientado a cámara, un shader con núcleo/corona/destellos y una esfera invisible para picking. La nebulosa se mezcla por opacidad CSS; a 0% se conserva el fondo oscuro con puntos de la escena de sistema.

Si una decisión nueva cambia un contrato, documenta motivo, alternativa descartada y compatibilidad; enlaza el ticket. No conviertas propuestas de APPLY en descripciones del estado actual.
