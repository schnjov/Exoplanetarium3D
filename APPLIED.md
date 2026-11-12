# APPLIED — estado verificado y cambios aplicados

Base de esta bitácora: **Exoplanetarium 3D v0.1.2**. Versiones de aplicación y esquema son independientes: el catálogo usa esquema 0.2.0 desde DAT-005. Si el proyecto local difiere, identifica el diff antes de continuar.

| ID histórico | Entrega | Aplicado | Evidencia disponible |
| --- | --- | --- | --- |
| BASE-001 | 0.1.0 | Pipeline NASA TAP en Python, CSV, índice y JSON por sistema; carga diferida en React. | Dataset validado: 3 sistemas y 17 planetas. |
| BASE-002 | 0.1.0 | Cuatro etapas, órbitas normalizadas, inspector, procedencia y selección de planetas. | Typecheck y build; snapshot con TRAPPIST-1 (7), TOI-700 (4), Kepler-11 (6). |
| BASE-003 | 0.1.0 | Configuración Firebase Hosting para servir el build en dist. | Configuración disponible; publicación no confirmada. |
| CAM-001 | 0.1.1 | Seleccionar centra y sigue al planeta; se puede volver a la estrella. Objetivo de cámara separado del inspector. | Seguimiento y retorno comprobados con fotogramas simulados. |
| ORB-001 | 0.1.1 | Selección y velocidad no reconstruyen la escena. Reloj acumulado, de 0× a 4× con pausa. | Prueba simulada de continuidad y reanudación; build. |
| HOV-001 | 0.1.2 | Tooltip nombre/tipo de planeta o estrella, clic en estrella recentra; arrastre diferenciado de clic. | Raycasting de estrella y planeta comprobado en prueba con renderer simulado. |
| VIS-000 | 0.1.2 | Centella GLSL en Apariencia/Sistema y malla alámbrica en Geometría; nebulosa SVG con intensidad regulable. | Build, validación SVG y empaquetado; etapas y representación visual revisadas en QA-001 con Chrome headless/SwiftShader. |
| MAP-001 | 0.1.2 | Mapa giratorio de estrellas seleccionables, coordenadas en el índice, retorno a la vista de sistema. | Proyección y correspondencia índice/detalle verificadas; rotación, marcadores, apertura y retorno revisados en QA-001. |
| QA-001 | 0.1.2 | 2026-11-09: recorrido RF-01–RF-08 en Chrome local; aceptación funcional satisfecha. | `npm ci --include=optional`, build, validador de datos directo y recorrido WebGL real; defecto no bloqueante QA-DEF-001. |
| DAT-002 | 0.1.2 | 2026-11-11: selección automática por límite de sistemas y pruebas offline con TAP simulado. | `tests/test_fetch_nasa_systems.py`, `scripts/fetch_nasa_systems.py`, `README.md`; validación local `python -m unittest discover -s tests` y `python scripts/validate_data.py` con resultado OK. |

## QA-001 — Validación local en navegador

- **Entorno:** Windows 10 Pro 22H2 (build 19045), Node 24.13.0, npm 11.6.2, Chrome 157.0.8103.38 headless, viewport 1424×905, WebGL ANGLE/SwiftShader. Aplicación local v0.1.2; sin repositorio Git ni commit disponible.
- **Dependencias y datos:** `npm ci --include=optional` terminó correctamente (32 paquetes, 0 vulnerabilidades). `npm run build` pasó typecheck y build; Vite informó el aviso no bloqueante de chunk de 799.24 kB. `python scripts/validate_data.py` pasó (3 sistemas, 17 planetas). `npm run data:validate` no funciona en esta instalación porque invoca `python3`, que resuelve al alias de Microsoft Store; al invocar el intérprete instalado mediante `python`, la validación sí pasó.
- **RF-01–RF-03:** catálogo mostró 7/4/6 planetas al alternar TRAPPIST-1, TOI-700 y Kepler-11; las cuatro etapas se recorrieron y capturaron; TRAPPIST-1 b se identifica como excentricidad asumida circular, Kepler-11 g como reportada y temperatura ausente como «Sin dato».
- **RF-04–RF-06:** hover de planeta y estrella muestra nombre/tipo y se oculta al salir; clic en planeta selecciona y sigue, clic en estrella recentra sin cambiar el inspector; arrastrar no cambia selección. La velocidad recorrió 1×→4×→0×→1×; dos capturas pausadas fueron idénticas y la captura tras reanudar cambió.
- **RF-07–RF-08:** mapa mostró los tres sistemas, giró con arrastre, volvió al sistema activo y abrió Kepler-11 desde su marcador. El fondo llegó a 0 y volvió a 75% tanto en sistema como en mapa, sin cerrar el mapa.
- **Consola:** sin excepciones JavaScript ni errores de WebGL bloqueantes. Chrome solicitó `/favicon.ico` y recibió HTTP 404; es no bloqueante y queda registrado como QA-DEF-001 en APPLY.md.
- **Evidencia visual:** capturas temporales de las cuatro etapas en `%TEMP%\exo-qa001-{datos,geometria,apariencia,sistema}.png`.
- **Límites:** se usó Chrome headless con WebGL por SwiftShader, no GPU física ni una sesión headed; no se midieron FPS/carga ni se hizo evaluación con usuarios. El recorrido usó entradas de ratón mediante Chrome DevTools Protocol y las capturas se inspeccionaron visualmente. No se corrigió QA-DEF-001 ni se avanzó a otro ticket.

## MAP-004 — Implementación pendiente de aceptación visual (2026-11-12)

- **Aplicado:** `src/StarMap.tsx` incorpora selector desde 100 en centenas, con opción final para el total aunque no sea múltiplo de 100. Para muestras menores ofrece el total; sin coordenadas válidas muestra 0 y deshabilita el selector. Filtra coordenadas antes de limitar, conserva orden del catálogo y orientación al cambiar cantidad. El límite inicia en 100 al abrir el mapa. `src/styles.css` usa núcleo de 3 px, halo y destellos CSS decorativos, con área de clic independiente; encabezado permite salto de línea.
- **Contraste local:** QA-001 ya cerrado. Sin repositorio Git. Catálogo fechado 2026-11-12: 2000 sistemas y 3567 planetas, distinto de los 100 sistemas de verificaciones anteriores; no se modificó ni descargó.
- **Verificación:** `npm run build` pasó, incluido typecheck; aviso de chunk grande y Node 22.11.0 inferior al mínimo requerido por Vite (22.12). `python scripts/validate_data.py` pasó: 2000 sistemas y 3567 planetas.
- **Límites:** no se ejecutó navegador ni inspección visual, ni regresión conjunta de reloj/cámara/selección. MAP-004 permanece activo hasta comprobar cantidades, orientación, etiquetas, apertura y retorno en escritorio/móvil. No se avanzó a otro ticket ni se publicó.

## MAP-005 — Zoom y separación visual, pendiente de aceptación (2026-11-12)

- **Aplicado:** `src/StarMap.tsx` amplía 20% la proyección inicial respecto de la anterior. Zoom visual 50%–400% con rueda (normaliza unidades y evita scroll de página), deslizador y botones accesibles. No cambia datos físicos, cantidad ni orientación al variar zoom. Restablecer recupera orientación y 120%. Marcadores y etiquetas mantienen su tamaño; el filtro de solapamientos se recalcula con zoom y excluye etiquetas fuera del campo. El listener de rueda se elimina al desmontar. `src/styles.css` añade controles compactos con ancho estable.
- **Verificación:** `npm run build` pasó, incluido TypeScript. Persisten avisos de Node 22.11.0 inferior al mínimo 22.12 y chunk mayor que 500 kB. No se modificó catálogo ni dependencias.
- **Límites:** no hay herramienta de navegador disponible en esta sesión; no se verificaron visualmente escritorio/móvil, rueda, giro, selección, retorno ni reloj/cámara. MAP-005 sigue activo para revisión; MAP-004 conserva su aceptación pendiente. No se avanzó a otro ticket.

## DAT-005 — Perfil estelar y esfera luminosa, pendiente de aceptación visual (2026-11-12)

- **Datos y contrato:** esquema 0.2.0. El generador prioriza parámetros estelares de `ps/default_flag=1` y complementa huecos desde `pscomppars` con referencia y transformación explícitas. Exporta tipo espectral, clase de luminosidad derivada solo desde MK, radio, masa, temperatura efectiva, luminosidad, gravedad, edad, densidad, metalicidad/razón, velocidad y período de rotación, y velocidad radial. Estados ausentes permanecen explícitos.
- **Representación:** el color visual se deriva de temperatura efectiva como aproximación de cuerpo negro, usa clase espectral como respaldo y queda asumido neutro si faltan ambas. La escena reemplaza el núcleo invisible por una esfera visible emisiva y conserva halo, picking y wireframe geométrico. Tamaño y brillo continúan normalizados, no físicos.
- **Catálogo actualizado:** consulta NASA TAP autorizada el 2026-11-12; 4.659 sistemas y 6.226 planetas. Hay color derivado para 4.406 estrellas y asumido para 253. Clases derivadas: 887 de secuencia principal, 104 gigantes, 72 subgigantes, 1 gigante luminosa y 1 subenana; además, 43 tipos MK de transición conservan sus dos clases. Las demás quedan ausentes.
- **Verificación:** 18 pruebas offline OK; consulta real aislada para TRAPPIST-1, TOI-700 y Kepler-11; `python3 scripts/validate_data.py` OK; `npm run typecheck` y `npm run build` OK. Vite mantiene el aviso no bloqueante de chunk mayor a 500 kB.
- **Límites:** no hay Chromium/Playwright/Puppeteer disponible en la sesión. No se comprobó visualmente la esfera ni la regresión conjunta de picking, cámara, selección y reloj; DAT-005 permanece activo en APPLY hasta esa evidencia. No se publicó.

## VIS-004 — Superficie estelar procedural, cerrada (2026-11-12)

- **Aplicado:** `src/stellarFlare.ts` añade material de superficie con ruido de valor 3D y FBM, granulación, filamentos, manchas y oscurecimiento de limbo. Usa el color trazable de DAT-005 y una semilla estable por ID; no carga texturas externas ni usa coordenadas UV. `src/ThreeScene.tsx` actualiza el uniforme temporal dentro del bucle Three.js, conserva wireframe en Geometría y mantiene la misma malla para picking.
- **Reloj y recursos:** Apariencia anima la textura; Sistema la anima mientras la velocidad sea mayor que 0×. Pausa congela superficie y halo junto con las órbitas. Selección no reconstruye la escena. La limpieza existente recorre y libera geometría y `ShaderMaterial`; no hay listeners ni texturas adicionales.
- **Verificación:** `npm run typecheck` y `npm run build` OK; `python3 scripts/validate_data.py` OK con 4.659 sistemas y 6.226 planetas; 18 pruebas Python OK. Vite conserva el aviso no bloqueante de chunk mayor a 500 kB. No se modificó catálogo ni se añadieron dependencias.
- **Cierre:** tras las iteraciones VIS-006–VIS-010, el usuario cerró explícitamente la estética estelar. No se publicó.

## VIS-006 — Movimiento estelar perceptible, cerrado mediante VIS-010 (2026-11-12)

- **Diagnóstico:** VIS-004 solo desplazaba lentamente el dominio de ruido y el plano aditivo del halo conservaba un núcleo opaco delante del disco, por lo que la textura quedaba casi inmóvil y cubierta.
- **Aplicado:** `src/stellarFlare.ts` aumenta escala/contraste de granulación y manchas, combina rotación del dominio con convección y añade una modulación luminosa suave. El halo abre una máscara central para revelar la esfera. `src/ThreeScene.tsx` rota coherentemente la malla estelar mientras avanza el reloj visual. Las velocidades son decorativas y no se presentan como período estelar medido.
- **Continuidad:** Apariencia anima siempre; Sistema anima con velocidad mayor que 0× y congela superficie/halo a 0×. No cambian color trazable, radio, picking, cámara, órbitas ni dependencias de creación de escena.
- **Verificación:** `npm run typecheck` y `npm run build` OK; `python3 scripts/validate_data.py` OK con 4.659 sistemas y 6.226 planetas. Vite conserva el aviso no bloqueante de chunk mayor a 500 kB. Sin cambios de catálogo ni dependencias.
- **Cierre:** VIS-009 resolvió la continuidad del plasma y VIS-010 aumentó su desplazamiento; el usuario cerró explícitamente este frente. CAM-002 pasa a ser el siguiente ticket en curso.

## VIS-007 — Comparador temporal de estéticas estelares, descartado (2026-11-12)

- **Resultado:** se implementaron Cosmos/NASA/Lava con selector, carga local y atribución, pero el usuario rechazó visualmente las tres alternativas y eligió una nueva referencia. El comparador, sus recursos binarios y el selector se retiraron; no forman parte del comportamiento vigente.
- **Trazabilidad:** VIS-008 reemplaza este experimento. El historial registra por qué se descartó, pero la arquitectura y README describen solo la estética actual.

## VIS-008 — Granulación incandescente inspirada en referencia, descartada (2026-11-12)

- **Referencia:** https://discourse.threejs.org/t/three-js-solar-system/63187. La captura muestra una esfera amarilla/naranja de granulación pequeña y densa con halo corto. El repositorio enlazado no presenta licencia en su raíz; se usó únicamente como referencia visual y no se copió código ni recursos.
- **Aplicado:** `src/stellarFlare.ts` genera desde cero celdas de Worley tridimensionales a dos escalas, centros oscilantes para ebullición, turbulencia fina, color de brasa/cuerpo/incandescencia y oscurecimiento suave del limbo. El halo se simplifica a dos caídas radiales aditivas sin brazos ni destellos largos. `src/ThreeScene.tsx` aumenta la esfera a 64×48 segmentos. Se retiraron selector, tipos, video NASA y texturas Lava/Cosmos del experimento anterior.
- **Resultado visual:** el usuario indicó que la animación parecía «un montón de puntos moviéndose». La causa fue la oscilación independiente de centros Worley, que hacía legibles las celdas como partículas. VIS-009 reemplaza ese modelo; se conserva únicamente el halo corto, la silueta y la dirección incandescente.
- **Verificación:** `npm run build` OK, incluido typecheck; el bundle JavaScript bajó de 823,74 kB en el comparador a 814,21 kB y Vite conserva el aviso no bloqueante sobre 500 kB. `npm run data:validate` OK con 4.659 sistemas y 6.226 planetas. `dist/` ya no contiene los recursos temporales.
- **Límites:** el build no compila GLSL en una GPU. Firefox Snap no permite la sesión headless disponible. No se modificó el catálogo ni se publicó.

## VIS-009 — Flujo estelar continuo, aceptado con velocidad insuficiente (2026-11-12)

- **Aplicado:** `src/stellarFlare.ts` elimina por completo Worley y centros animados. Cinco octavas de ruido de valor forman FBM; tres campos de baja frecuencia deforman la esfera y las capas amplia, media y fina comparten una advección lenta. La luminancia usa mezclas continuas, sin chispas ni umbrales puntuales. `src/ThreeScene.tsx` reduce la rotación de malla de 0,16 a 0,035 rad/s.
- **Continuidad:** conserva esfera 64×48, halo radial, color trazable, radio, picking y el reloj visual. Apariencia anima; Sistema se congela a 0× y reanuda sin reconstruir escena.
- **Verificación:** `npm run build` OK, incluido typecheck; Vite conserva el aviso no bloqueante de chunk mayor a 500 kB. `npm run data:validate` OK con 4.659 sistemas y 6.226 planetas.
- **Evidencia visual:** el usuario confirmó «ahora sí se ve bien» y que desapareció la lectura de puntos independientes, pero observó que el plasma se mueve muy poco. VIS-010 conserva el patrón y ajusta solo su dinámica.
- **Límites:** no se repitieron pausa, colores y regresiones completas. No se modificó el catálogo ni se publicó.

## VIS-010 — Movimiento de plasma perceptible, cerrado (2026-11-12)

- **Aplicado:** `src/stellarFlare.ts` agrega una deriva lineal continua de `(0,22; −0,14; 0,09)` unidades/s y acelera la circulación sinusoidal; la rotación interna sube de 0,045 a 0,07 rad/s. `src/ThreeScene.tsx` aumenta la rotación visual de malla de 0,035 a 0,055 rad/s. No cambian el FBM, las mezclas de color, el halo ni la geometría aceptados en VIS-009.
- **Continuidad:** las tres escalas siguen compartiendo el mismo dominio deformado, por lo que la mayor velocidad no reintroduce puntos independientes. 0× continúa deteniendo el único reloj visual.
- **Verificación:** `npm run build` OK, incluido typecheck; `npm run data:validate` OK con 4.659 sistemas y 6.226 planetas. El usuario cerró explícitamente el resultado visual y pidió continuar con los otros cambios.
- **Límites:** no se automatizó RF-14 ni se publicó.

## CAM-002 — Seguimiento estable del planeta, cerrado (2026-11-12)

- **Aplicado:** `src/ThreeScene.tsx` transporta el offset actual de cámara por el incremento angular orbital alrededor de la normal inclinada del planeta. La traslación del objetivo sigue separada del inspector. Al cambiar foco se reinicia solo la referencia angular; OrbitControls se aplica después, de modo que un arrastre manual se conserva y continúa transportándose.
- **Continuidad:** a 0× el incremento es cero. Selección, escala corporal, modos de órbita y retorno al sistema mantienen la escena y el reloj existentes; no se agregan renders React por fotograma ni recursos que limpiar.
- **Verificación:** prueba numérica con Three.js para órbita inclinada confirma que el transporte reproduce el siguiente vector orbital con error `6,25×10⁻17` y conserva exactamente la distancia de cámara. `npm run build` OK, incluido typecheck; `npm run data:validate` OK con 4.659 sistemas y 6.226 planetas. Vite conserva el aviso no bloqueante de chunk mayor a 500 kB.
- **Aceptación:** el usuario aprobó explícitamente el resultado y pidió continuar con el cambio siguiente. La comprobación completa RF-05 sigue pendiente como regresión de entrega; CAM-002 se retiró de la cola activa. No se publicó.

## ORB-003 — Períodos físicos y multiplicadores temporales, pendiente de aceptación visual (2026-11-12)

- **Aplicado:** `src/ThreeScene.tsx`, `src/App.tsx` y `src/styles.css`. El reloj orbital acumula `deltaReal × multiplicador` y cada planeta con período positivo usa `ω = 2π / (periodDays × 86.400)` rad/s. Se eliminó la normalización contra el período más corto y el fallback inventado por índice. Períodos ausentes, no finitos o no positivos quedan inmóviles en su fase determinista.
- **Control:** se reemplazó el rango continuo 0×–4× por botones accesibles Pausa/1×/10×/100×/1000×. Cambiar el multiplicador actualiza la referencia de interacción y no reconstruye la escena ni reinicia el tiempo acumulado.
- **Trazas y continuidad:** las órbitas usan el reloj físico, mientras las colas envejecen con un reloj visual separado; así conservan aproximadamente cuatro segundos reales de historial también a 1000×. Ambos relojes se detienen a 0×. Selección y cámara continúan leyendo el mismo ángulo orbital.
- **Verificación numérica:** 1,510826 días produce 130.535,3664 s por órbita a 1× y 130,5354 s a 1000×; 365,25 días produce 31.557.600 s a 1× y 31.557,6 s a 1000×. Un período ausente entrega velocidad angular cero.
- **Verificación automática:** `npm run build` OK, incluido typecheck; Vite conserva el aviso no bloqueante de chunk mayor a 500 kB (814,80 kB). `npm run data:validate` OK con 4.659 sistemas y 6.226 planetas. No se modificó el catálogo ni se agregaron dependencias.
- **Límites:** falta ejecutar RF-05, RF-06 y RF-12 en navegador/WebGL, incluida continuidad al pausar y reanudar, cámara enfocada y trazas con el selector que posteriormente incorporó ORB-004. ORB-003 permanece activo hasta esa aceptación visual. No se publicó.

## ORB-004 — Selector de escala temporal por exponentes, pendiente de aceptación visual (2026-11-12)

- **Aplicado:** `src/App.tsx` sustituye los cinco botones de ORB-003 por un deslizador de exponente entero de 0 a 8, ajustable de uno en uno. El multiplicador efectivo se deriva como `10 ** timeExponent`, desde 1× hasta 100.000.000×. Un botón separado alterna Pausa/Reanudar, conserva el exponente y evita representar la pausa como una potencia.
- **Límite elegido:** no se ofrece exponente 10. A 10¹⁰× un planeta de un día completaría más de 115.000 órbitas por segundo y miles entre fotogramas; el movimiento observado sería aliasing, no mayor legibilidad. 10⁸× permite que una órbita terrestre dure aproximadamente 0,316 s y ya cubre períodos largos.
- **Continuidad:** cambiar el exponente solo actualiza estado React y la referencia de interacción existente; no recrea Three.js ni reinicia el reloj. En pausa el multiplicador efectivo sigue siendo cero aunque cambie el deslizador, y Reanudar aplica la nueva potencia. Se mantienen el reloj visual separado de las trazas y la inmovilidad de períodos ausentes.
- **Verificación numérica:** para 365,25 días, cada incremento del exponente divide la duración real por diez; los extremos producen 31.557.600 s a 10⁰× y 0,315576 s a 10⁸×. Los nueve multiplicadores calculados son exactamente las potencias enteras de diez entre ambos límites.
- **Verificación automática:** `npm run build` OK, incluido typecheck; bundle JavaScript 815,26 kB y aviso no bloqueante de Vite sobre 500 kB. La comprobación de los exponentes 0–8 produjo exactamente 1×, 10×, 100×, 1.000×, 10.000×, 100.000×, 1.000.000×, 10.000.000× y 100.000.000×. `npm run data:validate` OK con 4.659 sistemas y 6.226 planetas. `git diff --check` OK. No se modificó el catálogo ni se agregaron dependencias.
- **Límites:** falta ejecutar RF-05, RF-06 y RF-12 en navegador/WebGL, especialmente cámara y trazas con exponentes altos. ORB-004 permanece activo hasta la aceptación visual. No se publicó.

## PERF-001 — Contador de FPS de escena y mapa, pendiente de aceptación visual (2026-11-12)

- **Aplicado:** `src/ThreeScene.tsx` añade un `output` superpuesto a la escena. El bucle `requestAnimationFrame` existente cuenta fotogramas y, al completar una ventana mínima de 500 ms, muestra `round(frames × 1.000 / milisegundos) FPS`. `src/StarMap.tsx` aplica el mismo cálculo dentro del bucle WebGL que VIS-011 usa para su fondo cósmico. Las escrituras usan referencias; no producen renders React por fotograma ni existe un observador duplicado.
- **Presentación y limpieza:** `src/styles.css` reutiliza el indicador discreto en la esquina superior derecha de ambas vistas, con cifras tabulares y sin capturar eventos. Al recrear o desmontar una vista vuelve a `-- FPS`; escena y mapa cancelan explícitamente su render.
- **Verificación:** `npm run build` OK, incluido typecheck; bundle JavaScript 815,93 kB y aviso no bloqueante de Vite sobre 500 kB. Casos deterministas del cálculo: 30 fotogramas/500 ms = 60 FPS, 24/800 ms = 30 FPS y 72/1.200 ms = 60 FPS.
- **Límites:** falta RF-15 en navegador/WebGL para contrastar ambas lecturas con una herramienta del navegador, comprobar que el observador del mapa se cancela al volver y registrar hardware, viewport y escenario. PERF-001 permanece activo; no se modificó catálogo, dependencias ni se publicó.

## VIS-011 — Fondo cósmico de partículas, pendiente de aceptación visual (2026-11-12)

- **Referencia y alcance:** se revisaron la demo y el repositorio público enlazados desde el foro de Three.js. No se copió código, shader, textura ni recurso externo: `src/cosmicParticles.ts` es una implementación procedural original inspirada solo en la lectura visual de partículas luminosas con profundidad. La capa es decorativa, no representa estrellas observadas ni altera los marcadores del mapa.
- **Aplicado:** el campo uniforme anterior de 900 puntos se reemplaza por un solo `THREE.Points` con 1.800 partículas deterministas. Posición esférica, tamaño, fase de centelleo y temperatura cromática se almacenan en buffers. Un `ShaderMaterial` calcula tamaño perspectivo, núcleo y halo con `gl_PointCoord`, mezcla aditiva y desplazamiento muy lento. `src/cosmicCloud.ts` agrega una esfera invertida de radio 300 con FBM direccional para formar una banda galáctica, concentraciones cromáticas y carriles de polvo. La esfera permanece fija mientras la cámara navega dentro de ella.
- **Reemplazo del fondo anterior:** se eliminaron el nodo `.cosmic-background`, sus reglas CSS y `public/cosmic-nebula.svg`. Nube y partículas son ahora geometría global de la escena, sin textura ni dependencia nueva. El radio de la nube cuadruplica `controls.maxDistance=75`, evitando exponer su borde durante la navegación prevista.
- **Mapa estelar:** `src/StarMap.tsx` crea un renderer transparente dentro del campo, detrás de grilla, marcadores y etiquetas. Reutiliza la nube y 1.200 partículas al 62% de la intensidad de sistema para preservar la distinción con estrellas de catálogo. Yaw/pitch orientan la cámara decorativa y el zoom modifica su FOV. El mismo bucle actualiza el contador FPS; al volver al sistema se cancelan `requestAnimationFrame` y `ResizeObserver`, se liberan geometrías/materiales/renderer y se retira el canvas.
- **Control y continuidad:** `backgroundStrength` se incorpora a la referencia de interacción de `ThreeScene` y alimenta ambos shaders por fotograma sin recrear la escena. El 0% descarta la nube y apaga las partículas. El tiempo visual existente gobierna centelleo y deriva, por lo que pausa los congela; selección, cámara y reloj orbital no cambian. Geometrías y materiales se liberan en el recorrido de limpieza existente.
- **Verificación:** `npm run build` OK, incluido typecheck y transformación de ambos shaders en escena y mapa; 25 módulos, bundle JavaScript 821,74 kB y aviso no bloqueante de Vite sobre 500 kB. No se modificó catálogo ni dependencias.
- **Límites:** el build no compila el GLSL en una GPU ni mide FPS. Falta RF-08/RF-16 en navegador para revisar fulgor, paralaje, 0% y rendimiento antes/después bajo el mismo escenario. VIS-011 permanece activo y no se publicó.

## MAP-006 — Geometría distintiva del Sol, pendiente de aceptación visual (2026-11-12)

- **Aplicado:** `src/StarMap.tsx` reemplaza el glifo textual `⊙` por un elemento solar dedicado en el origen. `src/styles.css` forma un disco circular con sombreado radial desplazado, borde luminoso, corona cónica, rayos, halo en tres escalas y una etiqueta cálida «Sol · Referencia · Origen».
- **Semántica e interacción:** se expone como imagen accesible «Sol, referencia del mapa», no como botón. Tiene `pointer-events: none`, jerarquía superior a las líneas y no participa en la lista, selección ni filtro de colisiones de sistemas. La apariencia es decorativa y no codifica radio, temperatura o brillo observados.
- **Verificación:** `npm run build` OK, incluido typecheck; 25 módulos, bundle JavaScript 821,90 kB y aviso no bloqueante de Vite sobre 500 kB. No se modificó catálogo, contrato ni dependencias.
- **Límites:** falta RF-17 en navegador para revisar contraste, oclusión de marcadores cercanos y respuesta en todos los zooms/fondos. MAP-006 permanece activo. MAP-007 y NAV-001 se aplicaron después como incrementos separados. No se publicó.

## MAP-007 — Interruptor de conexiones Sol–estrellas, pendiente de aceptación visual (2026-11-12)

- **Aplicado:** `src/StarMap.tsx` añade el estado local `showConnections` y un interruptor accesible «Mostrar conexiones», activado inicialmente. Los segmentos SVG radiales se emiten solo cuando está activo; los cuatro anillos de referencia se mantienen en ambos estados.
- **Continuidad:** el estado no participa en la proyección, el renderer cósmico ni los efectos. Alternarlo conserva yaw/pitch, zoom, cantidad visible, nombres y marcadores; no recrea WebGL ni modifica catálogo. `src/styles.css` comparte la presentación y color de acento del interruptor de nombres.
- **Verificación:** `npm run build` OK, incluido typecheck; 25 módulos, bundle JavaScript 822,12 kB y aviso no bloqueante de Vite sobre 500 kB. No se modificaron datos, contrato ni dependencias.
- **Límites:** falta RF-18 en navegador para comprobar los estados con giro, zoom, cantidad y apertura de sistema. MAP-007 permanece activo. NAV-001 se aplicó después como incremento separado y no se publicó.

## NAV-001 — Transición coordinada mapa–sistema con LOD, supersedida (2026-11-12)

- **Decisión:** se conservaron la proyección, etiquetas accesibles y colisiones DOM del mapa, coordinándolas con Three.js en lugar de migrar todo a una única escena en este incremento. Ambas vistas comparten nube/partículas y se transfieren yaw/pitch; la carga del sistema ocurre mientras el mapa mantiene el marcador ampliado.
- **Entrada:** `StarMap` marca la vista como ocupada, bloquea interacciones, desvanece contexto y anima durante 650 ms el destino hacia `(50%, 52%)` con escala 18. `App` recibe el contexto, evita recargar el sistema activo, mantiene el mapa mientras carga uno nuevo y usa una revisión monotónica para recrear exactamente un bucle Three.js al entrar o regresar.
- **Cámara y transformación:** `ThreeScene` hereda el ángulo y convierte el zoom del mapa en distancia inicial entre 95 y 180; al zoom inicial 120% comienza en 145. Estrella/halo parten a 8× y los controles quedan bloqueados. La convergencia exponencial a distancia 37 reduce la estrella a su escala normal y habilita controles. Para 145 unidades a 60 Hz, la simulación cruza el umbral LOD 70 en 27 fotogramas (0,45 s) y completa la tolerancia de 0,08 en 161 fotogramas (2,68 s).
- **LOD planetario:** en una entrada desde mapa, mallas, proxies, órbitas, trazas y materiales planetarios no se crean al montar. `buildPlanetarySystem` se ejecuta una sola vez al llegar a distancia 70. Entradas directas y reconstrucciones de etapa conservan el comportamiento inmediato anterior.
- **Vecindario:** se convierten AR/DEC/distancia del catálogo a Cartesianas, se calcula separación respecto del sistema activo y se conservan los 64 vecinos más cercanos con posición comprimida entre 36 y 135 unidades. Se renderizan en un solo `THREE.Points` con color por cobertura y se liberan por el recorrido general.
- **Verificación:** `npm run build` OK, incluido typecheck; 25 módulos, bundle JavaScript 824,98 kB y aviso no bloqueante de Vite sobre 500 kB. La simulación numérica confirmó umbral y duración. `git diff --check` OK. No se modificaron datos ni dependencias.
- **Resultado:** el usuario rechazó el cambio de escena coordinado como sustituto de un zoom real. NAV-001 se retira de la cola: NAV-002 exige una cámara y renderer persistentes, transformación del mismo punto en esfera y LOD reversible. La implementación queda como evidencia intermedia, no como aceptación. No se publicó.

## MAP-008 — Puntos estelares con color trazable, pendiente de aceptación visual (2026-11-12)

- **Contrato:** `scripts/fetch_nasa_systems.py` incorpora a cada entrada `starColorHex` y `starColorStatus` desde `star.visual.colorHex`. `src/types.ts` y `scripts/validate_data.py` exigen hexadecimal, estado derivado/asumido e igualdad índice–detalle. Se completó mecánicamente el índice local desde los JSON versionados existentes, sin consultar NASA ni modificar detalles/raw.
- **Apariencia:** `src/StarMap.tsx` expone el hexadecimal como propiedad CSS. La captura del usuario mostró que el núcleo seguía en 7 px y que la combinación de dos sombras más pseudo-halo producía discos borrosos. La revisión puntual usa núcleo de 2 px, borde cromático de 1 px y resplandor corto. La revisión siguiente agrega destello por ID: en el máximo aumenta blanco/escala; en el mínimo baja opacidad y domina el color. Duraciones 2,4–4,1 s y desfases estables evitan pulsación sincronizada; `prefers-reduced-motion` lo desactiva. La hit area sigue en 38 px.
- **Trazabilidad:** el punto y `ThreeScene` consumen la misma derivación persistida. Una estrella con temperatura/tipo usa color derivado; si ambos faltan, punto y esfera comparten el neutro asumido. El índice conserva el estado para que la presentación futura pueda explicarlo.
- **Verificación:** `python3 -m unittest discover -s tests`: 18 pruebas OK, incluyendo igualdad de color/estado en exportaciones simuladas de 1.000 sistemas. `npm run data:validate`: 4.659 sistemas y 6.226 planetas válidos. `npm run build`: OK, incluido typecheck; 25 módulos, bundle JavaScript 825,01 kB y aviso no bloqueante de Vite sobre 500 kB.
- **Límites:** falta RF-20 en navegador para comparar punto/esfera y contraste. Los marcadores siguen siendo DOM en este ticket; NAV-002 debe convertirlos en el LOD lejano de una escena WebGL persistente. MAP-008 permanece activo y no se publicó.

## VIS-005 — Escala comparativa de cuerpos, pendiente de aceptación visual (2026-11-12)

- **Aplicado:** `src/ThreeScene.tsx`, `src/App.tsx` y `src/styles.css`. La esfera estelar deja el radio fijo: usa el radio NASA con compresión `clamp(1,45 × R☉^0,28; 0,72; 4,2)` o 1,45 neutro si está ausente. El control Legible/Relación física conserva escena; el modo relativo calcula cada planeta con `Rplaneta/Restrella = R⊕/(R☉×109,076)` y no impone mínimo visible. Las órbitas mantienen su escala independiente.
- **Interacción:** planetas usan geometría unitaria escalable y un proxy transparente de radio 0,34 para raycasting. El proxy sigue la órbita, pero no se renderiza; hover/clic no falsean el radio. Al alternar con planeta enfocado, la cámara adapta distancia sin cambiar objetivo, selección ni reloj. Relación física queda deshabilitada si falta radio estelar positivo.
- **Caso reproducible:** para `R★=1 R☉`, una Tierra dibuja `Rplaneta/Restrella=1/109,076≈0,00917`; un planeta de `11,2 R⊕`, ≈0,10268. La compresión solo cambia el tamaño de la estrella entre sistemas, no esos cocientes internos.
- **Verificación:** `npm run typecheck` y `npm run build` OK; Vite conserva el aviso no bloqueante de chunk mayor a 500 kB. No se modificó catálogo ni dependencias.
- **Límites:** sin navegador disponible no se verificaron visualmente diferencias entre enana/solar/gigante, planetas subpíxel, proxy, transición de cámara, pausa o continuidad conjunta. VIS-005 permanece activo en APPLY y no se publicó.

## UI-003 — Datos del sistema en etapa Datos, pendiente de aceptación visual (2026-11-12)

- **Aplicado:** `src/App.tsx` elimina la condición que exigía planeta seleccionado para renderizar la tarjeta de Datos. Sin selección muestra fila normalizada del sistema con conteo derivado, distancia, tipo/clase estelar, radio, masa y temperatura, todos con su estado. Con planeta seleccionado conserva radio, período, semieje y excentricidad. `src/styles.css` limita altura y habilita desplazamiento interno para muestras estrechas.
- **Verificación:** `npm run typecheck` y `npm run build` OK; `python3 scripts/validate_data.py` OK con 4.659 sistemas y 6.226 planetas. Vite conserva el aviso no bloqueante de chunk mayor a 500 kB. No se modificó catálogo, contrato ni dependencias.
- **Límites:** sin navegador disponible no se comprobó visualmente el estado inicial, cambio de sistema, selección planetaria, scroll móvil ni retorno a otras etapas. UI-003 permanece activo en APPLY hasta esa evidencia. ORB-002 se aplicó después como incremento separado.

## ORB-002 — Modos de órbita, pendiente de aceptación visual (2026-11-12)

- **Aplicado:** `src/App.tsx`, `src/ThreeScene.tsx` y `src/types.ts`. Control accesible Completa/Traza/Ocultar disponible desde Geometría. El modo vive en la referencia de interacción y no reconstruye la escena. Completa conserva las elipses; Ocultar apaga elipses y colas.
- **Traza:** cada planeta conserva hasta 80 muestras de posición mundial ya inclinada. ORB-003 separó después el envejecimiento visual del reloj orbital: el historial dura aproximadamente cuatro segundos reales aun con multiplicadores altos. Un `ShaderMaterial` interpola opacidad por antigüedad; la cola se forma desde que se activa, se limpia al cambiar modo y no avanza ni desvanece a 0×. Buffer fijo, sin asignaciones de geometría por fotograma; frustum culling desactivado solo para estas líneas dinámicas.
- **Continuidad y limpieza:** selección actualiza también el color de la traza. Foco, cámara, escala de cuerpos y reloj permanecen en la escena existente. Al cambiar sistema o etapa, el recorrido de limpieza libera geometría y material de cada cola junto con el resto de la escena.
- **Verificación:** `npm run typecheck` y `npm run build` OK; `python3 scripts/validate_data.py` OK con 4.659 sistemas y 6.226 planetas. Vite conserva el aviso no bloqueante de chunk mayor a 500 kB. No se modificó catálogo ni dependencias.
- **Límites:** no hay navegador/WebGL disponible para inspeccionar crecimiento, degradado, pausa, continuidad, selección ni consola. ORB-002 permanece activo en APPLY hasta completar RF-12. No se publicó.

## Condiciones conocidas

- Snapshot NASA obtenido el 12 de noviembre de 2026 UTC, no actualizado en vivo: 4.659 sistemas y 6.226 planetas. El porcentaje de cobertura del catálogo mide cuatro atributos planetarios utilizables, no completitud científica ni estelar.
- Hay colores planos por categoría planetaria, no texturas ni pintado planetario por temperatura, densidad o composición. El color de la esfera estelar es una derivación visual trazable de temperatura/tipo espectral; tamaño, brillo, halo y nebulosa siguen siendo representaciones normalizadas o decorativas.
- En v0.1.2 pasaron build, validación de datos e integridad del ZIP. Las pruebas históricas de proyección/selección fueron comprobaciones con fotogramas simulados, no una suite E2E persistida; QA-001 añade un recorrido de navegador real automatizado mediante DevTools.
- No se verificó una sesión headed con GPU física; tampoco se midieron FPS/carga, se evaluó con usuarios ni se desplegó. Ver [APPLY.md](APPLY.md).

## Cómo registrar un cierre

Añade ID, fecha, versión o commit **si existe**, criterio satisfecho, archivos afectados y pruebas ejecutadas con resultado. Distingue evidencia técnica, visual y académica. Si una condición no se verificó, declárala; conserva en APPLY cualquier aceptación indispensable pendiente.

## DAT-004 — Selección por lotes y reintentos de red (2026-11-11)

- **Origen:** usuario: ejecución de 1000 sistemas tarda y aborta con HTTP 503 durante selección, después de DAT-003. Antes se realizaban dos peticiones por candidato más dos iniciales y dos finales; no había reintentos.
- **Aplicado:** `scripts/fetch_nasa_systems.py`, `tests/test_fetch_nasa_systems.py`, README, arquitectura y verificación. Selección en lotes secuenciales de 50, misma prioridad y desempate. Se conserva en memoria cada host aceptado con todas sus filas, suplemento y ADQL real del lote; exportar la selección automática no vuelve a consultar NASA. Progreso por lote. Si el número de planetas difiere del resumen se aborta sin exportar para evitar truncamiento silencioso.
- **Red:** máximo tres intentos por petición ante HTTP 429/500/502/503/504, URLError, timeout o conexión interrumpida. Esperas de 2 y 4 s; `Retry-After` numérico puede ampliar hasta 30 s. Se mantiene POST y timeout de 90 s por intento. Otros HTTP no se reintentan. Error CLI legible si persiste el problema, sin traceback habitual; las descargas preceden a toda escritura.
- **Verificación:** `python -m unittest discover -s tests`: 15 pruebas OK. Simulación completa de CLI para 1000 sistemas, 2000 planetas y orden de entrada invertido: exactamente 42 peticiones HTTP, orden final correcto, todos los planetas y procedencia por lote conservados. Antes requería 2004 peticiones para 1000 candidatos válidos; exclusiones/reintentos aumentan ambos conteos. Se comprueban exclusión de host completo inválido, límite sin extras, respuesta incompleta, recuperación de 503, `Retry-After`, límite de reintentos en timeout/503 y HTTP 400 sin reintento. Fallo en lote posterior no exporta los anteriores ni modifica catálogo previo.
- **Datos locales:** `python scripts/validate_data.py` pasó: 100 sistemas, 459 planetas, sin refrescar ni modificar catálogo.
- **Límites:** todas las respuestas HTTP y esperas se simularon; no se midió duración contra NASA ni se garantiza disponibilidad del servicio. No hay caché persistente: una nueva ejecución empieza desde cero. No se ejecutó descarga real, build ni navegador (cambio exclusivamente Python/documentación). Sin dependencias nuevas.

## DAT-003 — Consultas grandes sin HTTP 414 (2026-11-11)

- **Origen:** traceback del usuario al ejecutar `--limit-systems 1000`; regresión de DAT-002. La selección conseguía 1000 hosts, pero la descarga final construía una URL con todos sus nombres y recibía HTTP 414. Los avisos de exclusión previos son filtros esperados.
- **Aplicado:** `scripts/fetch_nasa_systems.py`, `tests/test_fetch_nasa_systems.py`, README y arquitectura. `fetch_json` usa POST con formulario UTF-8: consulta y formato JSON en el cuerpo, endpoint sin parámetros en la URL. Conserva timeout de 90 segundos, consultas ADQL y contrato de salida. No cambia `src/App.tsx`.
- **Verificación:** `python -m unittest discover -s tests`: 7 pruebas OK. Prueba en la frontera `urlopen` verifica POST, endpoint, Content-Type, formato, los 1000 nombres completos y escape de apóstrofes; exporta 1000 sistemas con 2 planetas cada uno en un directorio temporal y comprueba que se conserva la consulta de procedencia. Fallos simulados en primera o segunda consulta final preservan el catálogo previo y no crean salidas parciales. Siguen pasando pruebas CLI y selección existentes.
- **Catálogo local:** `python scripts/validate_data.py`: 100 sistemas y 459 planetas válidos, sin modificaciones.
- **Límites:** no se ejecutó `--limit-systems 1000` contra NASA ni se refrescó el catálogo; la evidencia de transporte y exportación es offline. No se evaluaron límites externos de tiempo/carga del servidor. Sin nuevas dependencias ni cambios de frontend; build/navegador no necesarios para este ticket.

## UI-002 — Resumen del sistema y acercamiento planetario (2026-11-11)

- **Origen:** solicitud del usuario. Inicio y cambio de sistema sin selección automática. El inspector muestra cantidad de planetas y conteos por categoría heurística, distancia al Sistema Solar, radio/masa/temperatura estelar y AR/DEC; conserva unidades, incertidumbres, estado y fuente. El radio se identifica como estelar, no como radio del sistema.
- **Aplicado:** `src/App.tsx`, `src/ThreeScene.tsx`, `src/styles.css`. La lista de nombres completos reemplaza el selector de letras. Seleccionar en lista o escena acerca suavemente la cámara y sigue el planeta, con sus datos a la derecha y sin aro ni brillo de selección. Luz decorativa de detalle para legibilidad. «Ver sistema completo» limpia selección y foco y recupera distancia de cámara y resumen. Foco e inspector siguen siendo estados separados; centrar en la estrella mantiene el inspector.
- **Verificación:** `npm run build` pasó (incluye typecheck; aviso de tamaño de bundle). `python scripts/validate_data.py` pasó: 100 sistemas y 459 planetas, sin refrescar catálogo. Chrome headless local, 1424×905, entradas CDP: resumen inicial y distancia, selección por lista y clic sobre planeta, mismo canvas al seleccionar, retorno, cuatro etapas y cambio a TRAPPIST-1. Captura del zoom inspeccionada: planeta ampliado a la izquierda del inspector. Dos capturas pausadas idénticas tras estabilizar cámara; capturas diferentes al reanudar.
- **Evidencia:** procedimiento temporal `%TEMP%/exo-detail-check.mjs` y captura `%TEMP%/exo-planet-detail.png`. La primera comparación en pausa ocurrió antes de estabilizar cámara y difirió; al esperar su estabilización pasó. No implica un salto del reloj.
- **Límites:** navegador headless con render por software, sin sesión manual/GPU física ni evaluación con usuarios. No se instrumentaron numéricamente fases orbitales ni todos los casos de ausencia; el formateador existente conserva «Sin dato» y cero válido. No se cambiaron datos, dependencias ni se publicó.

## MAP-003 — Interruptor de nombres estelares (2026-11-11)

- **Origen:** solicitud del usuario. **Aplicado:** `src/StarMap.tsx` y `src/styles.css`: interruptor accesible «Mostrar nombres», activado inicialmente, integrado con el filtro de solapamientos MAP-002. Oculta etiquetas completas, conserva botones, nombres accesibles y tooltip. Al desmontar el mapa vuelve al valor inicial.
- **Verificación:** build y Chrome local: ocultamiento de todas las etiquetas, posiciones de marcadores idénticas tras alternar, restauración de nombres y apertura de sistema desde marcador con etiquetas ocultas. MAP-002 mantiene su cálculo por giro/resize; la prueba nueva no repitió todos sus ángulos.
- **Límites:** misma sesión headless y procedimiento temporal de UI-002; sin evaluación con usuarios ni publicación.

## UI-001 ? Desplazamiento de sistemas (2026-11-11)

- **Origen:** solicitud expl?cita del usuario. **Requisito y aceptaci?n:** alcanzar y seleccionar todos los sistemas de la lista lateral sin comprimir tarjetas; conservar encabezado y resumen en escritorio y scroll horizontal en m?vil.
- **Aplicado:** `src/styles.css` limita el ?rea flexible de la lista con `min-height: 0` y `overflow-y: auto`; tarjetas, encabezado y resumen conservan su tama?o. En m?vil se conserva la fila con desplazamiento horizontal.
- **Verificaci?n:** Chrome headless local, viewport 1424?905, cat?logo local de 100 sistemas sin modificar: lista con 638 px disponibles y 7495 px de contenido; entrada de rueda mediante CDP desplaz? la lista y la ?ltima tarjeta pudo seleccionarse. A 720?900 se comprob? desplazamiento horizontal. `npm run build` pas?, incluido TypeScript.
- **L?mites:** comprobaciones DOM y entradas automatizadas en navegador real; sin sesi?n manual ni evaluaci?n con usuarios. No se refresc? el cat?logo.

## MAP-002 ? Nombres visibles sin solapamientos (2026-11-11)

- **Origen:** solicitud expl?cita del usuario. **Requisito y aceptaci?n:** ocultar etiquetas tapadas por otras, priorizando la estrella delante seg?n profundidad proyectada; recalcular al girar, restablecer y redimensionar.
- **Aplicado:** `src/StarMap.tsx` ordena marcadores por profundidad de delante hacia atr?s y usa rect?ngulos DOM reales de las etiquetas para ocultar las que colisionan con etiquetas delanteras ya visibles. El orden usa ID como desempate estable. Los marcadores conservan nombre accesible, tooltip y acci?n de apertura. La visibilidad se recalcula tras rotaci?n, resize y carga de fuentes; los observadores se desconectan al limpiar. `src/styles.css` conserva el orden de profundidad tambi?n para selecci?n/hover/foco.
- **Verificaci?n:** `npm run build` pas?. Chrome headless local con los 100 sistemas actuales: vista inicial 12 etiquetas visibles y 88 ocultas; tras arrastre 11 visibles y 89 ocultas; a 720?900, 46 visibles y 54 ocultas. Cero pares de etiquetas visibles solapadas en los tres escenarios y tras restablecer vista. Se comprob? selecci?n de sistema y retorno al mapa.
- **L?mites:** comprobaci?n geom?trica DOM y entradas CDP en navegador real, sin inspecci?n visual manual ni GPU f?sica/evaluaci?n con usuarios. No se ejecut? toda la regresi?n de reloj/c?mara/etapas; no se modificaron esos controles. No se refresc? el cat?logo ni se public?.
