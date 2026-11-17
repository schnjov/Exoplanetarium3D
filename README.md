# Exoplanetarium 3D — prototipo funcional EV3

Primer incremento ejecutable del proyecto de Computación Gráfica. El prototipo
demuestra el recorrido principal entre datos astronómicos normalizados y una
escena tridimensional trazable.

## Funcionalidad incluida

- Catálogo estático con carga diferida del sistema seleccionado.
- Datos reales obtenidos desde la tabla `ps` del NASA Exoplanet Archive con
  `default_flag=1`.
- Conservación de la respuesta tabular original en CSV antes de normalizar.
- Visualización 3D implementada directamente con Three.js.
- Cuatro etapas: datos, geometría, apariencia y sistema animado.
- La etapa Datos muestra la fila normalizada del sistema cuando no hay planeta
  seleccionado y cambia a la fila planetaria al seleccionar uno.
- Selección de planetas mediante la lista o directamente sobre la escena.
- Indicador de FPS en la escena y el mapa estelar, calculado desde sus callbacks
  de animación y actualizado cada medio segundo sin renders React por fotograma.
- Acercamiento y seguimiento del planeta seleccionado sin reiniciar las órbitas.
  La cámara transporta su orientación con el plano orbital para mantener una cara
  estable; el arrastre manual redefine esa orientación. «Ver sistema completo»
  recupera el resumen y la vista de conjunto.
- Sin selección se muestran conteos por categoría visual, distancia y coordenadas,
  más el perfil estelar NASA: tipo espectral y clase de luminosidad cuando existe,
  radio, masa, temperatura efectiva, luminosidad, gravedad, edad, densidad,
  metalicidad, rotación y velocidad radial, todos con procedencia.
- Tiempo orbital regulable mediante exponentes enteros de 0 a 8: desde 10⁰×
  hasta 10⁸×, con pausa independiente. 1× conserva el período NASA literalmente;
  sin período utilizable, el planeta queda inmóvil en su fase inicial.
- Nombre y tipo de cuerpo al pasar el cursor por una estrella o planeta.
- Esfera estelar luminosa con plasma procedural continuo, núcleo incandescente y
  halo suave en Apariencia y Sistema. La deformación de dominio produce regiones
  conectadas que fluyen sin partículas independientes. Se tiñe con el color
  derivado de temperatura o tipo espectral. Es una estética decorativa inspirada
  en visualizaciones solares, no una observación de la estrella seleccionada.
- Escala de cuerpos con dos lecturas: «Legible» mantiene planetas visibles y
  comprime el radio estelar; «Relación física» conserva el cociente de radios
  planeta/estrella usando `1 R☉ = 109,076 R⊕`. El área de clic no altera la
  esfera dibujada.
- Mapa estelar giratorio con marcadores seleccionables basados en AR, DEC y
  distancia al Sol, comprimida logarítmicamente para la visualización.
- Los sistemas del mapa son puntos luminosos simples teñidos con el mismo color
  visual trazable que usa su esfera; sin cruces ni destellos direccionales.
- Los sistemas pueden marcarse como destacados desde el catálogo o el resumen
  activo. «Solo destacados» filtra conjuntamente lista y mapa; la selección se
  conserva localmente en el navegador mediante `localStorage`.
- El mapa ofrece también el control «Solo destacados». Cantidad solicitada,
  nombres, conexiones, zoom y orientación se conservan al entrar a un sistema
  y volver al mapa; no se guardan entre recargas del navegador.
- El origen solar se distingue mediante un disco volumétrico cálido, corona,
  rayos y halo propios; es una referencia visual y no un sistema seleccionable.
- Interruptor «Mostrar nombres» en el mapa; las etiquetas visibles evitan
  solapamientos priorizando las estrellas delante.
- Interruptor «Mostrar conexiones» para ocultar solo las líneas entre el Sol y
  los sistemas; los anillos de referencia y marcadores permanecen visibles.
- Al abrir una estrella desde el mapa, su marcador se centra y amplía mientras
  carga el sistema. La cámara continúa el acercamiento con la orientación del
  mapa; planetas y órbitas se activan al entrar en el umbral de detalle y hasta
  64 estrellas vecinas del catálogo permanecen visibles como contexto.
- Fondo decorativo tridimensional con una esfera celeste procedural semejante a
  la banda de la Vía Láctea y 1.800 partículas de profundidad, color y fulgor
  variables. La nube permanece fija al mover la cámara y acompaña giro/zoom en
  el mapa estelar, siempre detrás de los marcadores; 0% apaga ambas capas.
- Inspector de radio, masa, período, semieje mayor, excentricidad, inclinación y
  temperatura de equilibrio.
- Procedencia explícita: reportado, derivado, asumido o ausente.
- Órbitas elípticas calculadas desde semieje mayor y excentricidad.
- Tres representaciones orbitales sin reiniciar la simulación: Completa dibuja la
  elipse, Traza conserva una cola reciente con desvanecimiento y Ocultar elimina
  ambas líneas. La pausa congela también la traza.
- Configuración lista para compilar y publicar en Firebase Hosting.

## Ejecución local

Requiere Node.js 22.12 o superior (se recomienda una versión LTS) y Python 3.10
o superior para los scripts de datos.

```bash
npm ci --include=optional
npm run data:validate
npm run dev
```

Vite mostrará la dirección local de la aplicación, normalmente
`http://localhost:5173`.

## Actualizar los datos NASA

```bash
npm run data:refresh
npm run data:validate
```

También pueden elegirse sistemas específicos:

```bash
python scripts/fetch_nasa_systems.py --hosts TRAPPIST-1 TOI-700 Kepler-11
```

O pedir una selección automática por cantidad:

```bash
python scripts/fetch_nasa_systems.py --limit-systems 20
```

Las consultas se envían mediante HTTP POST, con el ADQL en el cuerpo, para
evitar URLs demasiado largas (HTTP 414) con selecciones como `--limit-systems 1000`.
Los avisos «Se excluye…» indican sistemas que no cumplen el contrato de datos;
la selección continúa buscando otros anfitriones elegibles.

La selección automática descarga candidatos en lotes de 50 y reutiliza sus
datos al exportar. Muestra progreso por lote. Para 1000 candidatos válidos son
42 peticiones (dos iniciales y dos por lote), sin contar exclusiones o reintentos.
Ante HTTP 429/500/502/503/504 o fallos de conexión/timeout hace hasta tres
intentos por petición, con esperas de 2 y 4 segundos; `Retry-After` numérico
puede ampliar la espera hasta 30 segundos. Cada intento conserva timeout de 90 s.
Si sigue fallando, termina con un mensaje y conserva el catálogo previo.
Los datos se reutilizan en memoria durante esa ejecución; no hay reanudación
persistente al volver a lanzar el comando. El tiempo real depende de NASA.

Las dos opciones son mutuamente excluyentes. Si no se indica ninguna, se
mantienen los tres sistemas actuales como predeterminados:

```bash
python scripts/fetch_nasa_systems.py
```

Criterio de selección automática:
- Filtro obligatorio: el sistema debe tener `ra`, `dec` y `sy_dist` disponibles
  para el mapa; la distancia puede venir de `ps` o de `pscomppars`.
- Filtro obligatorio: solo se consideran anfitriones con `default_flag=1`.
- Preferencia: primero los sistemas multiplanetarios.
- Desempate explícito: por nombre del anfitrión para que la selección sea
  reproducible.

Si hay menos sistemas elegibles que los solicitados, el script informa cuántos
se pidieron, cuántos se obtuvieron y qué criterios se aplicaron. Si no hay
ninguno, termina con un error claro y no sobrescribe el catálogo exportado.

La salida se guarda en:

```text
public/data/catalog-index.json
public/data/systems/<sistema>.json
public/data/raw/nasa-ps.csv
public/data/raw/nasa-pscomppars-supplement.csv
```

Los parámetros estelares priorizan la solución `ps` con `default_flag=1`. Cuando
un atributo falta allí, el generador puede completarlo desde `pscomppars` y lo
declara en `transform`; no mezcla silenciosamente ambas tablas. Una etiqueta como
«gigante» solo se deriva cuando el tipo espectral reporta esa clase de luminosidad
Morgan–Keenan explícitamente; las clases de transición conservan ambas etiquetas.
Los valores ausentes permanecen ausentes.

## Construcción de producción

```bash
npm run build
npm run preview
```

El resultado se genera en `dist/`.

## Despliegue posterior en Firebase

El archivo `firebase.json` ya apunta a `dist/`. Para publicar será necesario
crear o seleccionar un proyecto Firebase, copiar `.firebaserc.example` como
`.firebaserc`, reemplazar el identificador y ejecutar:

```bash
npm run build
firebase deploy --only hosting
```

El despliegue no se ejecuta automáticamente para evitar publicar en un proyecto
equivocado.

## Decisiones del prototipo

- Las escalas de radios y órbitas están normalizadas; no son simultáneamente
  proporcionales.
- El radio y la luminosidad estelares se inspeccionan como datos, pero el tamaño y
  brillo de la esfera son visuales y normalizados para mantener legible la escena.
- En modo legible, el radio estelar usa `clamp(1,45 × R☉^0,28; 0,72; 4,2)` y los
  planetas conservan la ampliación visual histórica. En relación física, el radio
  planetario se calcula con la misma escala de la estrella y no recibe un mínimo
  visible; puede reducirse a un punto o desaparecer a la resolución de pantalla.
- Las órbitas mantienen su normalización logarítmica independiente: el modo de
  cuerpos compara radios, no distancias orbitales.
- La superficie estelar combina FBM tridimensional a varias escalas, deformación
  de dominio, deriva sostenida y circulación, sin texturas ni costuras UV. La geometría usa
  64×48 segmentos para una silueta suave; flujo, rotación y halo se congelan a 0×.
- Si falta el semieje mayor, se deriva con el período y la masa estelar mediante
  la tercera ley de Kepler.
- Si falta el radio planetario, se usa una aproximación masa-radio solo como
  fallback visual y queda marcada como derivada.
- Si falta la excentricidad, se asume cero y se muestra una órbita circular.
- La fase inicial es determinista, pero asumida: no representa la posición
  observada del planeta en una fecha específica.
- La rotación axial planetaria es decorativa y mantiene 0,18 rad/s de tiempo
  real; el exponente y la pausa orbital no la aceleran ni la detienen.
- Seleccionar una estrella en el mapa abre directamente la vista del sistema,
  sin animación intermedia de marcador o cámara.
- Los planetas usan un patrón procedural orgánico compartido y una paleta
  monocromática neutral por categoría: tierra para rocosos, azul verdoso para
  sub-Neptunos, ocre para gigantes gaseosos y gris azulado para desconocidos.
  El patrón y la paleta están separados para permitir futuros pintados temáticos.
  No representan superficies observadas ni composición medida.
- Los pintados por temperatura y densidad corresponden a incrementos separados.

## Próximo incremento propuesto

1. Pintados temáticos por temperatura y densidad.
2. Leyendas continuas separadas de la procedencia categórica.
3. Pruebas de rendimiento y medición de tiempos de carga.
