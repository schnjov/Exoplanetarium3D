# Verificación y aceptación

## Arranque y controles automáticos existentes

Para cambios del descargador ejecutar `python -m unittest discover -s tests`
y `python scripts/validate_data.py`. DAT-004 incluye selección/exportación de
1000 sistemas simulados con 42 peticiones, preservación de planetas y ADQL,
rechazo de respuestas incompletas y conservación del catálogo ante errores.
Los reintentos se prueban con reloj de espera simulado; no consulta NASA.

```powershell
node -v
npm ci --include=optional
npm run data:validate
npm run build
npm run dev
```

Ejecutar desde la raíz. Para cambios solo documentales basta comprobar referencias y no tocar el build. El build incluye typecheck; el validador comprueba estructura mínima, IDs/conteos, estados y coordenadas índice/detalle, no todos los rangos físicos. No hay un comando de E2E en el baseline. No refrescar NASA para ejecutar estas comprobaciones.

## Recorrido en navegador real

| ID | Acción | Resultado esperado |
| --- | --- | --- |
| RF-01 | Abrir la app y alternar TRAPPIST-1 → TOI-700 → Kepler-11. | Se ven 7, 4 y 6 planetas respectivamente; datos e interfaz corresponden al sistema activo. |
| RF-02 | Recorrer Datos → Geometría → Apariencia → Sistema. | Se separan atributos, alambre, materiales y animación. Ver centella solo en Apariencia/Sistema y comprobar consola WebGL. |
| RF-03 | Inspeccionar excentricidad de TRAPPIST-1 y de Kepler-11 g; mirar temperatura ausente. | Se distinguen supuesto circular, dato reportado y «Sin dato»; no se confunden con exactitud. |
| RF-04 | Pasar el cursor sobre un planeta y la estrella, retirarlo, arrastrar y hacer clic. | Tooltip muestra nombre y tipo y se oculta al salir; arrastrar no selecciona; planeta y estrella responden al clic. |
| RF-05 | Seleccionar planetas desde lista y escena a 1× y desde pausa; recentrar en estrella. | Cámara sigue al elegido; las órbitas no saltan; recentrar conserva el planeta del inspector. |
| RF-06 | Variar 1× → 4× → 0× → 1×. | La rapidez cambia, pausa conserva posiciones y cámara navegable, reanudación continúa sin reinicio. |
| RF-07 | Abrir mapa, rotarlo, volver sin cambiar sistema y luego abrir otra estrella. | Marcadores tienen nombre, abren su sistema y el retorno al mismo mantiene el estado de la escena. Distancia comprimida está indicada. |
| RF-08 | Llevar el fondo a 0% y volver a aumentarlo. | En sistema, vuelve el fondo oscuro con puntos; reaparece la nebulosa sin afectar foco ni reloj. En mapa, cambia la intensidad sin perder la vista. |

Para cada prueba registra versión/commit, fecha, SO, navegador y resultado: pasa/falla/no ejecutada. En un fallo, añade pasos, esperado, observado y consola o captura si aporta. Comienza en Windows con el navegador que se usará en la demo; añade otra plataforma solo si se necesita.

## Evidencia para la entrega

- MAP-005: comprobar escala inicial 120%, rueda, botones y deslizador hasta límites 50%/400%; variar cantidad y nombres conservando zoom y giro. Revisar etiquetas, apertura de estrella y retorno, y restablecer a giro inicial/120%. Repetir en móvil con deslizador/botones. Comprobar junto con pausa, selección y cámara de sistema.

- UI-002: abrir/cambiar sistema sin selección, comprobar resumen, conteos por categoría y atributos estelares con ausencias/unidades/procedencia. Seleccionar planeta desde lista y escena: zoom, seguimiento sin aro, atributos a la derecha y retorno al resumen. Recorrer cuatro etapas y comprobar pausa/reanudación después de estabilizar cámara; selección, velocidad y fondo conservan escena y reloj.
- MAP-003: alternar «Mostrar nombres», comprobar orientación inalterada, ocultamiento total y restauración sin solapamientos; abrir un marcador con nombres ocultos.
- **Carga:** separar carga inicial y cambio de sistema, declarar qué inicia y termina cada medición, si la caché está fría o caliente, red y número de repeticiones.
- **Rendimiento:** declarar sistema, etapa, viewport, resolución, GPU, navegador y ventana de medición. Reportar FPS o tiempos de fotograma observados. No extrapolar desde un test con renderer simulado.
- **Comprensión, si se requiere:** acordar protocolo y tamaño de muestra antes de evaluar; pedir distinguir reportado/asumido/ausente y vincular un atributo con la escena. Reportar denominadores y límites, sin inventar datos.
- **Demo:** ensayo local con candidato final; si se publica, verificar URL, recursos, JSON y consola en una sesión limpia. La URL o el video no sustituyen el registro de pruebas.

## Regresi?n de cat?logo y etiquetas (UI-001 / MAP-002)

- Con m?s sistemas que altura disponible, desplazar la lista con rueda y seleccionar el ?ltimo; comprobar encabezado/resumen visibles. En m?vil comprobar desplazamiento horizontal.
- Abrir mapa con etiquetas superpuestas: conservar la delantera, ocultar las que colisionan y mantener marcadores seleccionables. Girar, restablecer y redimensionar: las etiquetas visibles no se superponen y las separadas reaparecen. Comprobar tambi?n despu?s de cargar fuentes.
- Evidencia ejecutada el 2026-11-11 y l?mites en APPLIED.md; prueba CDP temporal en `%TEMP%/exo-ui-check.mjs`.
