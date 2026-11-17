# APPLY — backlog hasta la entrega final

Base: v0.1.2. La pauta final no está confirmada: este plan no inventa fechas, límites, rúbrica ni autorización de despliegue. Ordena la cola según dependencias y decisiones del usuario.

Estados activos: **proposed** (por aprobar), **ready** (ejecutable), **in-progress**, **blocked** (falta decisión o dependencia). Prioridades: P0 cierre, P1 incremento funcional, P2 si hay margen. No reutilizar IDs; una regresión recibe otro ID y enlaza al anterior.

## Cola activa

### MAP-010 — Estado persistente durante la navegación del mapa

- **Origen:** solicitud explícita del usuario, 2026-11-12. **Prioridad:** P1. **Estado:** in-progress. **Depende de:** MAP-005, MAP-007 y MAP-009 implementados.
- **Requisito:** conservar las elecciones del mapa al entrar a un sistema y volver, y permitir alternar el filtro de destacados desde el propio mapa.
- **Aceptación:** cantidad solicitada, nombres, conexiones, zoom y orientación pertenecen a `App`, no al ciclo de montaje de `StarMap`. Entrar a cualquier sistema y volver restaura exactamente esas elecciones. «Restablecer vista» cambia solo orientación y zoom. «Solo destacados» aparece tanto en catálogo como en mapa y ambos controles comparten el mismo estado; filtrar temporalmente a menos sistemas no reduce permanentemente la cantidad solicitada. El sistema activo no cambia ni se desmarca al filtrar.
- **Evidencia prevista:** typecheck/build y navegador configurando todos los controles, entrada/retorno con sistema actual y distinto, filtro destacado vacío/no vacío, restauración de cantidad y móvil.

### MAP-009 — Sistemas destacados persistentes

- **Origen:** solicitud del usuario, 2026-11-12. **Prioridad:** P1. **Estado:** in-progress. **Depende de:** nada.
- **Requisito:** permitir destacar sistemas y filtrar catálogo/mapa por destacados, manteniendo la elección localmente entre sesiones.
- **Aceptación:** cada tarjeta y el resumen activo permiten alternar destacado con botón accesible independiente de la apertura. Los IDs se guardan en `localStorage` bajo una clave versionada y se restauran tolerando contenido inválido o almacenamiento no disponible. «Solo destacados» filtra lista y mapa sin borrar favoritos ni cambiar por sí mismo el sistema activo. Un estado vacío es explícito y permite desactivar el filtro. No cambia catálogo versionado ni contrato NASA.
- **Evidencia prevista:** typecheck/build y navegador para marcar/desmarcar, recargar, filtro vacío/no vacío, apertura desde lista/mapa, almacenamiento inválido/bloqueado y móvil.

### MAP-008 — Puntos estelares con color trazable

- **Origen:** corrección explícita del usuario sobre NAV-001, 2026-11-12. **Prioridad:** P1. **Estado:** in-progress. **Depende de:** DAT-005.
- **Requisito:** reemplazar la apariencia ornamental de los sistemas del mapa por puntos luminosos simples cuyo color coincida exactamente con la derivación usada por la esfera de cada estrella.
- **Aceptación:** el índice incorpora color visual y estado derivados del detalle sin perder procedencia; generador, TypeScript, catálogo existente, fixtures y validador coinciden. Cada marcador se lee como una fuente puntual intensa: núcleo nítido de 2 px, borde del color exacto y un único resplandor compacto, sin cruces ni mancha difusa. Un destello asincrónico alterna un máximo blanco con una fase tenue donde domina el color; duración/desfase son deterministas y se desactiva con movimiento reducido. Hover, foco, selección, nombres, solapamientos y contraste con el Sol continúan funcionando.
- **Evidencia prevista:** pruebas offline del generador, validación de 4.659 sistemas, typecheck/build y navegador comparando al menos estrellas fría/caliente/neutra entre punto y esfera.

### NAV-003 — Entrada directa desde el mapa

- **Origen:** corrección explícita del usuario, 2026-11-12; cancela NAV-002. **Prioridad:** P1. **Estado:** in-progress. **Depende de:** nada.
- **Requisito:** al seleccionar una estrella, abandonar inmediatamente el mapa y abrir la vista normal del sistema sin centrar/ampliar el marcador ni animar la cámara de sistema.
- **Aceptación:** el clic actualiza el sistema activo y oculta el mapa en la misma interacción. Si debe cargar JSON, aparece el estado de carga sobre la vista; al terminar se muestra la cámara inicial normal con estrella, planetas y órbitas ya creados. No existe temporizador de entrada, estado CSS `opening`, escala estelar transitoria ni bloqueo temporal de controles. Abrir el sistema actual también es inmediato. Errores de carga siguen siendo visibles.
- **Evidencia prevista:** typecheck/build y navegador seleccionando sistema actual, sistema no cargado, clics sucesivos y retorno al mapa; comprobar tiempo de respuesta, estado de carga, consola y limpieza.

### MAP-006 — Geometría distintiva del Sol

- **Origen:** solicitud del usuario, 2026-11-12. **Prioridad:** P1. **Estado:** in-progress. **Depende de:** MAP-004.
- **Requisito:** representar el Sol del origen con una geometría y apariencia inequívocamente distintas de los sistemas exoplanetarios.
- **Aceptación:** el origen muestra un disco esférico aparente con volumen, núcleo cálido, corona y halo propios, de mayor jerarquía que los puntos del catálogo; mantiene la etiqueta de referencia y no se confunde con un sistema seleccionable. Conserva giro, zoom, etiquetas y rendimiento del mapa.
- **Evidencia prevista:** typecheck/build y navegador en varios zooms/orientaciones, con fondo 0%/100%, etiquetas visibles/ocultas y contraste frente a marcadores.

### MAP-007 — Interruptor de conexiones Sol–estrellas

- **Origen:** solicitud del usuario, 2026-11-12. **Prioridad:** P1. **Estado:** in-progress. **Depende de:** MAP-006.
- **Requisito:** permitir ocultar y mostrar las líneas radiales que conectan el Sol con los sistemas, sin ocultar los anillos de referencia.
- **Aceptación:** un interruptor accesible cambia solo las conexiones, conserva giro, zoom, cantidad, nombres y selección, y no reconstruye la capa cósmica ni altera los datos.
- **Evidencia prevista:** build y navegador con ambos estados antes/después de giro, zoom, cambio de cantidad y apertura de sistema.

### PERF-001 — Contador de FPS de escena y mapa

- **Origen:** solicitud del usuario, 2026-11-12. **Prioridad:** P1. **Estado:** in-progress. **Depende de:** nada.
- **Requisito:** mostrar tanto en la escena 3D como en el mapa estelar una lectura de fotogramas por segundo sin provocar renders React por fotograma.
- **Aceptación:** cada vista presenta un indicador discreto y legible calculado desde `requestAnimationFrame`, actualizado como máximo unas pocas veces por segundo mediante una referencia DOM y reiniciado al recrear o desmontar la vista. La escena mide su bucle de render; el mapa mide la cadencia de callbacks del navegador con un observador propio. No altera reloj, cámara, selección, pausa, mapa ni recursos WebGL.
- **Evidencia prevista:** typecheck/build, comprobación del cálculo con intervalos conocidos y navegador para observar ambas vistas, estabilidad y limpieza al cambiar mapa/escena, etapa o sistema.

### VIS-011 — Fondo cósmico de partículas inspirado en la referencia

- **Origen:** solicitud del usuario y referencia visual [Three.js Solar System](https://discourse.threejs.org/t/three-js-solar-system/63187), 2026-11-12. **Prioridad:** P1. **Estado:** in-progress. **Depende de:** PERF-001 para medir el impacto.
- **Requisito:** reemplazar el fondo SVG anterior por partículas inspiradas en la demo y una nube celeste global semejante a la Vía Láctea vista desde tierra, mayor que el volumen navegable para que el encuadre cambie al mover la cámara.
- **Aceptación:** implementación local y original con `THREE.Points` para estrellas y una esfera procedural invertida para banda galáctica, nubes luminosas y carriles de polvo. La nube permanece fija en el mundo, envuelve todo el rango de la cámara de sistema y aparece también detrás del mapa, donde acompaña giro y zoom sin confundirse con los marcadores NASA. Ambas vistas responden al control Fondo cósmico; 0% recupera el fondo simple. Conserva cámara/selección/reloj y libera renderers, geometrías/materiales al desmontar. El SVG anterior y su capa CSS quedan eliminados. Medir FPS antes y después bajo el mismo escenario.
- **Evidencia prevista:** inspección de la demo y su repositorio público, revisión de licencia antes de copiar cualquier código o recurso, build y navegador/WebGL con fondo 0%/100%, movimiento de cámara, cambio de sistema y medición reproducible. Si no hay licencia compatible identificable, reproducir el efecto sin copiar código ni recursos externos.

### ORB-004 — Selector de escala temporal por exponentes

- **Origen:** solicitud del usuario, 2026-11-12. **Prioridad:** P1. **Estado:** in-progress. **Depende de:** ORB-003.
- **Requisito:** sustituir los multiplicadores discretos bajos por una escala elegida como potencia de diez, con exponentes enteros consecutivos y pausa independiente.
- **Aceptación:** el usuario puede elegir cualquier exponente entero entre 0 y 8, equivalente a multiplicadores desde 1× hasta 100.000.000×. Cambiar exponente no reinicia reloj, selección, cámara ni trazas; Pausa conserva el exponente elegido y Reanudar recupera exactamente su multiplicador. La UI explica el exponente y el valor resultante. El máximo se limita a 10⁸× para reducir vueltas subfotograma y pérdida de lectura que produciría 10¹⁰× en períodos cortos.
- **Evidencia prevista:** typecheck/build, comprobación numérica de los nueve exponentes y navegador con cambio de escala, pausa/reanudación, cámara enfocada y trazas.

### ORB-005 — Rotación axial independiente de la escala temporal

- **Origen:** corrección explícita del usuario, 2026-11-12. **Prioridad:** P1. **Estado:** in-progress. **Depende de:** ORB-004.
- **Requisito:** la rotación visual de cada planeta no debe acelerarse al cambiar el exponente temporal.
- **Aceptación:** en Sistema, las mallas planetarias rotan a una velocidad visual fija de 0,18 rad/s basada en tiempo real. 10⁰× y 10⁸× producen el mismo giro axial durante el mismo intervalo; pausar detiene la traslación orbital pero no cambia ni detiene esa rotación visual. Cambiar exponente, selección, foco o modo de órbita no reinicia el ángulo dentro de la escena existente. No se presenta como período de rotación observado.
- **Evidencia prevista:** typecheck/build, comprobación numérica a 10⁰×/10⁴×/10⁸×/pausa y navegador con planeta enfocado y textura visible.

### ORB-003 — Períodos físicos y multiplicadores temporales

- **Origen:** solicitud del usuario, 2026-11-12. **Prioridad:** P1. **Estado:** in-progress. **Depende de:** ORB-001 y ORB-002.
- **Requisito:** calcular cada velocidad angular desde `periodDays` sin normalización relativa al planeta más rápido. ORB-004 sustituye la primera propuesta de multiplicadores discretos 1×/10×/100×/1000× por exponentes pares.
- **Aceptación:** 1× usa tiempo literal: una órbita completa consume `periodDays × 86.400` segundos reales y cualquier multiplicador afecta el reloj linealmente. Pausa, trazas, selección y cámara continúan sin saltos. Un período ausente o no positivo queda inmóvil en su fase determinista, sin fallback inventado. Las trazas conservan aproximadamente cuatro segundos de historial visual incluso a multiplicadores altos.
- **Evidencia prevista:** casos numéricos con períodos corto y largo, continuidad pausa/reanudación, planeta sin período y navegador con trazas/cámara usando el selector de ORB-004.

### UI-003 — Datos del sistema visibles en etapa Datos

- **Origen:** solicitud del usuario, 2026-11-12. **Prioridad:** P1. **Estado:** in-progress. **Depende de:** DAT-005.
- **Requisito:** al entrar en Datos sin planeta seleccionado debe mostrarse la fila normalizada del sistema, en lugar de una escena vacía.
- **Aceptación:** Datos muestra nombre, cantidad de planetas, distancia, tipo espectral, clase de luminosidad, radio, masa y temperatura estelar con valor y estado; cero válido no aparece como ausencia. Si hay planeta seleccionado conserva su fila planetaria. Cambiar etapa o sistema no altera selección, foco ni reloj y no crea geometrías en Datos.
- **Evidencia prevista:** typecheck/build; navegador para sistema sin selección, planeta seleccionado, cambio de sistema y retorno a etapas 2–4. No modificar catálogo ni contrato.

### ORB-002 — Órbita completa, traza y ocultar

- **Origen:** solicitud del usuario, 2026-11-12. **Prioridad:** P1. **Estado:** in-progress. **Depende de:** ORB-001.
- **Requisito:** ofrecer tres modos de representación orbital: Completa conserva las elipses actuales; Traza dibuja detrás de cada planeta una cola que se desvanece; Ocultar no dibuja líneas orbitales.
- **Aceptación:** un control accesible alterna Completa/Traza/Ocultar sin reconstruir escena, reiniciar reloj, cambiar selección o mover cámara. Traza sigue posición, inclinación y excentricidad, crece con el movimiento, desvanece por antigüedad y permanece inmóvil a 0×; no deja saltos al reanudar. Ocultar elimina elipses y trazas. Cambiar sistema/etapa libera buffers y materiales.
- **Evidencia prevista:** typecheck/build y navegador en 10⁰×/10⁶×/pausa con selección, foco, cambio de modo, etapa y sistema; revisar consola/memoria. No modificar catálogo ni dependencias.

### VIS-005 — Escala comparativa estrella–planetas

- **Origen:** solicitud del usuario, 2026-11-12. **Prioridad:** P1. **Estado:** in-progress. **Depende de:** DAT-005 y VIS-004 implementados.
- **Requisito:** hacer perceptible la variación de tamaño estelar y ofrecer una lectura de la relación real de radios entre estrella y planetas sin volver inutilizable la escena.
- **Aceptación:** el radio estelar reportado modifica su esfera mediante una compresión visual documentada; si falta, usa tamaño neutro asumido sin presentarlo como dato. Un control Legible/Relación física no reinicia reloj, selección ni cámara. En Relación física, cada radio planetario dibujado cumple `Rplaneta/(Restrella×109,1)` sin mínimo visual; si falta radio estelar, el modo queda indisponible. Un proxy invisible conserva hover/clic de planetas diminutos. Órbitas no cambian, Geometría/Apariencia/Sistema conservan contratos y la UI explica qué escala está activa.
- **Evidencia prevista:** caso numérico reproducible Tierra/Sol y gigante gaseoso; typecheck/build; navegador para alternancia, estrella enana/solar/gigante, planetas diminutos, picking, foco, pausa/reanudación y ausencia de reinicios. No modificar catálogo ni dependencias.

### DAT-005 — Perfil estelar NASA y esfera luminosa trazable

- **Origen:** solicitud del usuario, 2026-11-12. **Prioridad:** P1. **Estado:** in-progress. **Depende de:** nada.
- **Requisito:** incorporar los parámetros estelares disponibles en NASA `ps`, mostrarlos con procedencia y representar la estrella como una esfera luminosa con color respaldado por temperatura o tipo espectral.
- **Aceptación:** el contrato conserva tipo espectral, radio, masa, temperatura efectiva, luminosidad, gravedad, edad, densidad, metalicidad y razón, velocidad/período de rotación y velocidad radial con estados reportado/ausente; una clase de luminosidad solo se deriva de una clase MK explícita. El color visual se deriva primero de temperatura, luego de tipo espectral, y queda asumido si ambos faltan. La escena usa una esfera visible y luminosa en Apariencia/Sistema, wireframe en Geometría, mantiene picking, cámara, selección y reloj, y libera recursos al desmontar. Inspector, tipos, fixtures y validador coinciden con el JSON.
- **Evidencia prevista:** pruebas offline del generador para datos presentes/ausentes y derivaciones, validación del catálogo, typecheck/build y revisión en navegador de esfera, color, picking y regresiones de reloj/cámara/selección. El refresco no debe mezclar contratos ni sobrescribir datos si falla NASA.

### MAP-005 — Mayor separación visual y zoom del mapa

- **Origen:** solicitud del usuario, 2026-11-12. **Prioridad:** P1. **Estado:** in-progress. **Depende de:** nada.
- **Requisito:** ampliar visualmente el mapa y permitir acercar/alejar sin modificar distancias físicas.
- **Aceptación:** escala inicial 120% de la proyección anterior; zoom de 50% a 400% mediante rueda, deslizador y botones accesibles. Conservar orientación, cantidad y nombres al variar zoom; recalcular solapamientos. Restablecer recupera orientación y zoom inicial. Mantener selección y retorno.
- **Evidencia prevista:** build y navegador en escritorio/móvil para controles, límites, etiquetas, giro, selección y retorno. No modificar catálogo.

### MAP-004 — Cantidad visible y puntos luminosos en el mapa

- **Origen:** solicitud del usuario, 2026-11-12. **Prioridad:** P1. **Estado:** in-progress. **Depende de:** nada.
- **Requisito:** seleccionar sistemas visibles en centenas desde 100 hasta el total disponible; representar estrellas como puntos luminosos con fulgor, no esferas.
- **Aceptación:** inicio en 100, opciones 100/200/.../máximo; incluir el máximo aunque no sea múltiplo de 100 y admitir catálogos menores. Contar solo sistemas con coordenadas válidas y conservar orden del catálogo. Cambiar cantidad no altera orientación; nombres, selección y retorno siguen funcionando. Núcleo puntual con halo y destellos decorativos, sin geometría esférica visible.
- **Evidencia prevista:** build, validación offline del catálogo y recorrido de navegador para cantidad, giro, etiquetas, selección y retorno en escritorio/móvil. No refrescar datos.

### ENT-001 — Confirmar alcance y formato final

- **Origen:** planificación académica. **Prioridad:** P0. **Estado:** blocked hasta obtener pauta final o confirmación del profesor. **Depende de:** nada.
- **Tareas:** mapear pauta y observaciones a IDs; confirmar fechas, formato, tiempo, mediciones, forma de demo y qué mejoras se incluyen.
- **Aceptación:** cada criterio confirmado tiene una fuente y evidencia prevista; ambigüedades se registran como preguntas. No extrapolar límites de EV3.

### DAT-001 — Reforzar integridad y semántica de datos

- **Origen:** límites del prototipo. **Prioridad:** P1. **Estado:** proposed. **Depende de:** QA-001.
- **Requisito:** un dato incompleto no debe falsear su procedencia ni generar geometría inválida.
- **Tareas:** añadir fixtures offline para nulos, cero válido, no finitos y valores derivados/asumidos; revisar AR/DEC faltantes y la etiqueta de cobertura; mejorar el aviso al fallar la carga de un sistema.
- **Aceptación:** snapshot válido sigue pasando; entradas inválidas fallan con diagnóstico; AR/DEC ausentes no se muestran como 0°; cobertura no se confunde con completitud total. No refrescar NASA para probar.

### VIS-001 — Pintado por densidad

- **Origen:** idea del usuario. **Prioridad:** P1. **Estado:** proposed. **Depende de:** QA-001 y acuerdo sobre método y escala.
- **Requisito:** alternar Categoría/Densidad sin reiniciar reloj, cámara ni selección.
- **Tareas:** definir unidad, fórmula y procedencia; comprobar que la masa y radio se puedan usar para la derivación; no usar un radio estimado solo para dibujar como si fuera observación; añadir leyenda, dato en inspector y color neutro si falta información.
- **Aceptación:** un caso numérico reproducible concuerda con la leyenda; un planeta de TOI-700 sin masa queda «Sin dato»; Categoría recupera el aspecto base.

### VIS-002 — Pintado por temperatura

- **Origen:** idea del usuario. **Prioridad:** P1. **Estado:** blocked: el snapshot actual no trae temperatura de equilibrio para sus 17 planetas. **Depende de:** decidir y verificar una fuente o sistema alternativo; VIS-001 si comparten control.
- **Requisito:** representar temperatura de equilibrio en K, sin presentarla como temperatura superficial.
- **Tareas:** decidir si ampliar la muestra, complementar con fuente explícita o posponer; incorporar al pipeline solo tras aprobación.
- **Aceptación:** hay un valor demostrable y trazable y un caso «Sin dato»; no se fabrican temperaturas ni se confunde color con procedencia.

### VIS-003 — Texturas genéricas por clase visual

- **Origen:** solicitud explícita del usuario, 2026-11-12. **Prioridad:** P1. **Estado:** in-progress. **Depende de:** nada.
- **Requisito:** aplicar una textura procedural orgánica común con una paleta monocromática neutral diferente para rocosos, sub-Neptunos, gigantes gaseosos y cuerpos de clase desconocida. La referencia visual es [colordodge/ProceduralPlanet](https://github.com/colordodge/ProceduralPlanet), simplificada a un solo mapa; no copiar su pipeline de altura, humedad, normales o biomas.
- **Aceptación:** las texturas son procedurales/locales, reutilizadas por categoría y visibles en Apariencia/Sistema; Geometría conserva wireframe. Las cuatro clases comparten el mismo lenguaje de manchas continuas y detalle multiescala, sin bandas, tormentas ni cráteres semánticos. Cada paleta mantiene una familia de matiz reconocible y queda separada del patrón para futuros pintados por composición, temperatura o densidad. No se presentan como composición observada. Selección, escala, picking y reloj no cambian; todas las texturas se liberan al desmontar y no se crean por planeta.
- **Evidencia prevista:** typecheck/build, revisión WebGL de las cuatro clases y comparación FPS/memoria; comprobar entrada directa, escala relativa, foco, cambio de etapa/sistema y limpieza.

### DAT-002 — Selección automática por límite de sistemas

- **Origen:** solicitud del usuario, 2026-11-11. **Prioridad:** P1. **Estado:** ready. **Depende de:** QA-001.
- **Requisito funcional:** permitir `--limit-systems N`, mantener `--hosts` y el valor por defecto, y hacer que `--hosts` y `--limit-systems` sean mutuamente excluyentes. Debe rechazar cero, negativos y valores no enteros con mensaje claro.
- **Tareas:**
  1. Añadir validación de argumentos y control de exclusividad.
  2. Consultar NASA TAP para seleccionar anfitriones por `ra`, `dec`, distancia y número de planetas.
  3. Ordenar la selección explícitamente por preferencia y desempate por nombre.
  4. Descargar todas las filas de la selección final y no truncar planetas.
  5. Excluir sistemas inválidos completos si rompen el contrato de exportación actual.
  6. Informar conteos y errores sin sobrescribir el catálogo cuando no haya resultados.
- **Aceptación:** `python scripts/fetch_nasa_systems.py --limit-systems 20` devuelve hasta 20 sistemas distintos; `--hosts` sigue funcionando igual; sin opciones conserva los sistemas predeterminados; valores inválidos fallan con un mensaje claro; menor cantidad de elegibles informa los conteos; y si no hay ninguno, el script termina con error sin tocar el catálogo.
- **Evidencia prevista:** pruebas offline con TAP simulado en `tests/test_fetch_nasa_systems.py`; ejecución de `python -m unittest discover -s tests`; validación del catálogo base con `python scripts/validate_data.py`.

### QA-DEF-001 — Resolver solicitud de favicon inexistente

- **Origen:** defecto no bloqueante reproducible durante QA-001, 2026-11-09. **Prioridad:** P2. **Estado:** proposed. **Depende de:** nada.
- **Requisito:** el arranque local no debe solicitar un favicon que responda 404.
- **Tareas:** agregar un favicon local apropiado o eliminar la referencia/solicitud.
- **Aceptación:** en una sesión limpia, la carga no produce 404 para `/favicon.ico` ni un error de recurso en consola.

### QA-002 — Medir y cerrar regresiones

- **Origen:** objetivos académicos. **Prioridad:** P0. **Estado:** proposed. **Depende de:** QA-001, ENT-001 y alcance funcional aceptado.
- **Tareas:** ejecutar [VERIFICATION.md](VERIFICATION.md); medir carga y rendimiento bajo escenario reproducible; si corresponde, acordar protocolo de comprensión antes de aplicarlo.
- **Aceptación:** resultados fechados, comparados contra criterios confirmados. Si no se pudo medir o no se alcanzó una meta, explicitarlo; no inventar cifras.

### REL-001 — Preparar candidato y publicar si se autoriza

- **Origen:** frontend previsto en la nube. **Prioridad:** P0. **Estado:** proposed. **Depende de:** QA-002 y confirmación del proyecto Firebase para publicar.
- **Tareas:** reproducir instalación y build; probar artefacto local; confirmar permisos y destino; comprobar la URL si se publica.
- **Aceptación:** versión candidata reproducible y demo local. Si se publica, verificar URL, escena y JSON. Si no, registrar «listo localmente, no publicado».

### ENT-002 — Cerrar informe, presentación y demo

- **Origen:** entrega académica. **Prioridad:** P0. **Estado:** proposed. **Depende de:** ENT-001; para resultados definitivos, QA-002 y candidato de REL-001.
- **Tareas:** actualizar informe LaTeX con arquitectura, trazabilidad, aproximaciones, resultados y límites; alinear presentación y guion con la versión real; preparar demo local o video si corresponde.
- **Aceptación:** cada afirmación tiene respaldo; el guion demuestra dato → escena → procedencia y respeta la pauta. No describir propuestas como implementadas.



## Plantilla de observación

```markdown
### AREA-### — Resultado observable
- Origen: usuario/profesor/pauta + fecha o referencia.
- Requisito funcional: quién hace qué y qué debe ocurrir.
- Prioridad: P0/P1/P2. Estado: proposed/ready/in-progress/blocked.
- Depende de: IDs o decisión requerida.
- Tareas: cambios pequeños en orden.
- Aceptación: Dado ... / Cuando ... / Entonces ...; incluir un caso límite.
- Evidencia prevista: comando, prueba manual, archivo o medición.
- Fuera de alcance / bloqueos: si aplica.
```
