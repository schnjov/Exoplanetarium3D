# APPLY — backlog hasta la entrega final

Base: v0.1.2. La pauta final no está confirmada: este plan no inventa fechas, límites, rúbrica ni autorización de despliegue. Ordena la cola según dependencias y decisiones del usuario.

Estados activos: **proposed** (por aprobar), **ready** (ejecutable), **in-progress**, **blocked** (falta decisión o dependencia). Prioridades: P0 cierre, P1 incremento funcional, P2 si hay margen. No reutilizar IDs; una regresión recibe otro ID y enlaza al anterior.

## Cola activa

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

- **Origen:** idea del usuario. **Prioridad:** P2. **Estado:** proposed. **Depende de:** alcance ENT-001.
- **Tareas:** elegir recursos procedurales o licenciados; conservar alternativa plana; separar textura decorativa de pintado temático.
- **Aceptación:** cada recurso tiene origen y licencia registrados y se carga localmente. No se presenta como composición observada. Pintado por elementos fuera de alcance salvo datos espectroscópicos y aprobación.

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
