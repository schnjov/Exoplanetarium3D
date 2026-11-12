# APPLIED — estado verificado y cambios aplicados

Base de esta bitácora: **Exoplanetarium 3D v0.1.2**. Versiones de aplicación y esquema son independientes: el catálogo conserva esquema 0.1.0. Si el proyecto local difiere, identifica el diff antes de continuar.

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

## Condiciones conocidas

- Snapshot NASA obtenido el 27 de octubre de 2026 UTC, no actualizado en vivo. Los 17 planetas tienen radio, período, semieje mayor e inclinación reportados. Hay 11 excentricidades asumidas, 4 masas ausentes y 17 temperaturas de equilibrio ausentes en esta muestra. El 100% de cobertura de la UI mide solo cuatro atributos utilizables, no completitud científica.
- Hay colores planos por categoría, no texturas ni pintado por temperatura, densidad o composición. La estrella luminosa y la nebulosa son representaciones decorativas.
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
