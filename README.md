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
- Selección de planetas mediante la lista o directamente sobre la escena.
- Acercamiento y seguimiento del planeta seleccionado sin reiniciar las órbitas;
  «Ver sistema completo» recupera el resumen y la vista de conjunto.
- Sin selección se muestran conteos por categoría visual, distancia al Sistema
  Solar, radio, masa y temperatura estelar, y coordenadas con procedencia.
- Velocidad orbital regulable de 0× (pausa) a 4× en la etapa animada.
- Nombre y tipo de cuerpo al pasar el cursor por una estrella o planeta.
- Centella estelar procedural en las etapas de apariencia y animación.
- Mapa estelar giratorio con marcadores seleccionables basados en AR, DEC y
  distancia al Sol, comprimida logarítmicamente para la visualización.
- Interruptor «Mostrar nombres» en el mapa; las etiquetas visibles evitan
  solapamientos priorizando las estrellas delante.
- Fondo de nebulosa decorativo con intensidad regulable; 0% recupera el fondo simple.
- Inspector de radio, masa, período, semieje mayor, excentricidad, inclinación y
  temperatura de equilibrio.
- Procedencia explícita: reportado, derivado, asumido o ausente.
- Órbitas elípticas calculadas desde semieje mayor y excentricidad.
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
- Si falta el semieje mayor, se deriva con el período y la masa estelar mediante
  la tercera ley de Kepler.
- Si falta el radio planetario, se usa una aproximación masa-radio solo como
  fallback visual y queda marcada como derivada.
- Si falta la excentricidad, se asume cero y se muestra una órbita circular.
- La fase inicial es determinista, pero asumida: no representa la posición
  observada del planeta en una fecha específica.
- El material de color es genérico por categoría, sin texturas. Los pintados por
  temperatura y densidad corresponden al siguiente incremento.

## Próximo incremento propuesto

1. Pintados temáticos por temperatura y densidad.
2. Leyendas continuas separadas de la procedencia categórica.
3. Pruebas de rendimiento y medición de tiempos de carga.
