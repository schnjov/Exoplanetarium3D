import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadCatalog, loadSystem } from './data';
import { ThreeScene } from './ThreeScene';
import { StarMap } from './StarMap';
import type {
  CatalogEntry,
  CatalogIndex,
  ExoplanetSystem,
  OrbitDisplayMode,
  Planet,
  ProvenanceStatus,
  ScientificAttribute,
  StarMapViewState,
  TextAttribute,
} from './types';

const STAGES = [
  { id: 1, label: 'Datos', description: 'Valores normalizados y procedencia' },
  { id: 2, label: 'Geometría', description: 'Órbitas y cuerpos sin apariencia final' },
  { id: 3, label: 'Apariencia', description: 'Materiales genéricos por categoría' },
  { id: 4, label: 'Sistema', description: 'Escena navegable y animada' },
];

const FAVORITES_STORAGE_KEY = 'exoplanetarium:favorites:v1';
const INITIAL_STAR_MAP_VIEW: StarMapViewState = {
  angle: { yaw: -0.42, pitch: 0.46 },
  zoom: 1.2,
  showNames: true,
  showConnections: true,
  systemLimit: 100,
};

function loadFavoriteSystemIds() {
  if (typeof window === 'undefined') return new Set<string>();
  try {
    const stored = JSON.parse(window.localStorage.getItem(FAVORITES_STORAGE_KEY) ?? '[]');
    if (!Array.isArray(stored)) return new Set<string>();
    return new Set(stored.filter((value): value is string => typeof value === 'string'));
  } catch {
    return new Set<string>();
  }
}

const ATTRIBUTE_LABELS: Record<string, string> = {
  radiusEarth: 'Radio planetario',
  massEarth: 'Masa planetaria',
  periodDays: 'Período orbital',
  semiMajorAu: 'Semieje mayor',
  eccentricity: 'Excentricidad',
  inclinationDeg: 'Inclinación',
  equilibriumTempK: 'Temperatura de equilibrio',
};

const STATUS_LABELS: Record<ProvenanceStatus, string> = {
  reported: 'Reportado',
  derived: 'Derivado',
  assumed: 'Asumido',
  absent: 'Ausente',
};

function formatNumber(value: number) {
  if (Math.abs(value) >= 1000) return value.toLocaleString('es-CL', { maximumFractionDigits: 0 });
  if (Math.abs(value) < 0.01 && value !== 0) return value.toPrecision(3);
  return value.toLocaleString('es-CL', { maximumFractionDigits: 4 });
}

function formatAttribute(attribute: ScientificAttribute) {
  if (attribute.value === null) return 'Sin dato';
  const base = `${formatNumber(attribute.value)}${attribute.unit ? ` ${attribute.unit}` : ''}`;
  const plus = attribute.uncertainty.plus;
  const minus = attribute.uncertainty.minus;
  if (plus === null && minus === null) return base;
  if (plus !== null && minus !== null && Math.abs(plus) === Math.abs(minus)) {
    return `${base} ± ${formatNumber(Math.abs(plus))}`;
  }
  return `${base} (+${plus === null ? '?' : formatNumber(Math.abs(plus))} / −${
    minus === null ? '?' : formatNumber(Math.abs(minus))
  })`;
}

function formatDisplayAttribute(attribute: ScientificAttribute | TextAttribute) {
  if ('unit' in attribute) return formatAttribute(attribute);
  return attribute.value ?? 'Sin dato';
}

function StatusBadge({ status }: { status: ProvenanceStatus }) {
  return <span className={`status-badge status-${status}`}>{STATUS_LABELS[status]}</span>;
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-orbit" />
      <strong>Cargando catálogo normalizado</strong>
      <span>NASA Exoplanet Archive</span>
    </div>
  );
}

function App() {
  const [catalog, setCatalog] = useState<CatalogIndex | null>(null);
  const [activeEntry, setActiveEntry] = useState<CatalogEntry | null>(null);
  const [system, setSystem] = useState<ExoplanetSystem | null>(null);
  const [selectedPlanetId, setSelectedPlanetId] = useState<string | null>(null);
  const [focusedPlanetId, setFocusedPlanetId] = useState<string | null>(null);
  const [timeExponent, setTimeExponent] = useState(0);
  const [playbackPaused, setPlaybackPaused] = useState(false);
  const [bodyScaleMode, setBodyScaleMode] = useState<'legible' | 'relative'>('legible');
  const [orbitDisplayMode, setOrbitDisplayMode] = useState<OrbitDisplayMode>('complete');
  const [backgroundStrength, setBackgroundStrength] = useState(0.75);
  const [favoriteSystemIds, setFavoriteSystemIds] = useState(loadFavoriteSystemIds);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [starMapView, setStarMapView] = useState<StarMapViewState>(INITIAL_STAR_MAP_VIEW);
  const [showMap, setShowMap] = useState(false);
  const [sceneRevision, setSceneRevision] = useState(0);
  const [stage, setStage] = useState(4);
  const timeMultiplier = 10 ** timeExponent;
  const playbackRate = playbackPaused ? 0 : timeMultiplier;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCatalog()
      .then((nextCatalog) => {
        setCatalog(nextCatalog);
        setActiveEntry(nextCatalog.systems[0] ?? null);
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'No fue posible cargar el catálogo.');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...favoriteSystemIds].sort()));
    } catch {
      // La aplicación sigue funcionando si el navegador bloquea el almacenamiento local.
    }
  }, [favoriteSystemIds]);

  useEffect(() => {
    if (!activeEntry) return;
    let current = true;
    setLoading(true);
    loadSystem(activeEntry.path)
      .then((nextSystem) => {
        if (!current) return;
        setSystem(nextSystem);
        setSelectedPlanetId(null);
        setFocusedPlanetId(null);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!current) return;
        setError(cause instanceof Error ? cause.message : 'No fue posible cargar el sistema.');
      })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [activeEntry]);

  const selectedPlanet = useMemo(
    () => system?.planets.find((planet) => planet.id === selectedPlanetId) ?? null,
    [system, selectedPlanetId],
  );
  const visibleCatalogSystems = useMemo(
    () => favoritesOnly ? (catalog?.systems ?? []).filter(entry => favoriteSystemIds.has(entry.id)) : (catalog?.systems ?? []),
    [catalog, favoriteSystemIds, favoritesOnly],
  );
  const hasStellarRadius = (system?.star.attributes.radiusSolar.value ?? 0) > 0;
  const effectiveBodyScaleMode = bodyScaleMode === 'relative' && hasStellarRadius ? 'relative' : 'legible';

  const handlePlanetSelect = useCallback((planetId: string) => {
    setSelectedPlanetId(planetId);
    setFocusedPlanetId(planetId);
  }, []);
  const centerStar = useCallback(() => setFocusedPlanetId(null), []);
  const toggleFavoriteSystem = useCallback((systemId: string) => {
    setFavoriteSystemIds(current => {
      const next = new Set(current);
      if (next.has(systemId)) next.delete(systemId);
      else next.add(systemId);
      return next;
    });
  }, []);
  const showSystem = () => { setSelectedPlanetId(null); setFocusedPlanetId(null); };
  const openSystem = (entry: CatalogEntry) => {
    setActiveEntry(entry);
    setShowMap(false);
  };
  const closeMap = () => {
    setSceneRevision(value => value + 1);
    setShowMap(false);
  };

  if (!catalog && loading) return <LoadingScreen />;
  if (error && !system) {
    return (
      <main className="fatal-error">
        <strong>No se pudo iniciar Exoplanetarium 3D</strong>
        <span>{error}</span>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-orbit"><span /></div>
          <div>
            <strong>EXOPLANETARIUM <em>3D</em></strong>
          </div>
        </div>
        <div className="source-state">
          <span className="live-dot" />
          <div>
            <strong>DATOS VERSIONADOS</strong>
            <span>{catalog ? new Date(catalog.retrievedAt).toLocaleDateString('es-CL') : '—'} · NASA PS</span>
          </div>
        </div>
      </header>

      <aside className="catalog-panel panel">
        <div className="panel-heading">
          <span className="eyebrow">CATÁLOGO</span>
          <h1>Sistemas</h1>
          <button className="space-button map-launch" type="button" onClick={() => showMap ? closeMap() : setShowMap(true)}>
            {showMap ? 'Volver al sistema' : 'Abrir mapa estelar'}
          </button>
          <label className="favorites-filter">
            <input type="checkbox" role="switch" checked={favoritesOnly} onChange={event => setFavoritesOnly(event.currentTarget.checked)} />
            Solo destacados <span>{favoriteSystemIds.size.toLocaleString('es-CL')}</span>
          </label>
        </div>

        <div className="system-list">
          {visibleCatalogSystems.map((entry) => (
            <div key={entry.id} className={`system-card ${activeEntry?.id === entry.id ? 'active' : ''}${favoriteSystemIds.has(entry.id) ? ' favorite' : ''}`}>
              <button className="system-card-open" onClick={() => openSystem(entry)} type="button">
                <span className="system-dot" />
                <span className="system-copy">
                  <strong>{entry.name}</strong>
                  <span>{entry.planetCount} planetas · {entry.distancePc ? `${formatNumber(entry.distancePc)} pc` : 'distancia ausente'}</span>
                </span>
                <span className="coverage">{entry.completeness}%</span>
              </button>
              <button className="favorite-system" type="button"
                aria-label={favoriteSystemIds.has(entry.id) ? `Quitar ${entry.name} de destacados` : `Destacar ${entry.name}`}
                aria-pressed={favoriteSystemIds.has(entry.id)}
                title={favoriteSystemIds.has(entry.id) ? 'Quitar de destacados' : 'Destacar sistema'}
                onClick={() => toggleFavoriteSystem(entry.id)}>★</button>
            </div>
          ))}
          {favoritesOnly && visibleCatalogSystems.length === 0 && (
            <div className="favorites-empty"><strong>Sin sistemas destacados</strong><span>Desactiva el filtro o marca una estrella.</span></div>
          )}
        </div>

        {system && (
          <div className="system-summary">
            <span className="eyebrow">SISTEMA ACTIVO</span>
            <strong>{system.name}</strong>
            <span>{system.planets.length} cuerpos renderizables</span>
            <button className="summary-favorite" type="button"
              aria-pressed={favoriteSystemIds.has(system.id)}
              onClick={() => toggleFavoriteSystem(system.id)}>
              {favoriteSystemIds.has(system.id) ? '★ Destacado' : '☆ Destacar sistema'}
            </button>
            <div className="summary-grid">
              <div><small>AR</small><b>{formatNumber(system.coordinates.rightAscensionDeg.value ?? 0)}°</b></div>
              <div><small>DEC</small><b>{formatNumber(system.coordinates.declinationDeg.value ?? 0)}°</b></div>
            </div>
          </div>
        )}
      </aside>

      <main className="viewport">
        {showMap && catalog && <StarMap systems={visibleCatalogSystems} activeId={activeEntry?.id} backgroundStrength={backgroundStrength}
          view={starMapView} onViewChange={setStarMapView}
          favoritesOnly={favoritesOnly} favoriteCount={favoriteSystemIds.size}
          onFavoritesOnlyChange={setFavoritesOnly} onOpen={openSystem} onBack={closeMap} />}
        <div className="system-view" hidden={showMap}>
        <div className="stage-selector" role="tablist" aria-label="Etapas de construcción visual">
          {STAGES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={stage === item.id ? 'active' : ''}
              onClick={() => setStage(item.id)}
              role="tab"
              aria-selected={stage === item.id}
            >
              <span>{item.id}</span>
              {item.label}
            </button>
          ))}
        </div>

        {system && (
          <>
            <ThreeScene
              system={system}
              stage={stage}
              selectedPlanetId={selectedPlanet?.id ?? null}
              focusedPlanetId={focusedPlanetId}
              playbackRate={playbackRate}
              backgroundStrength={backgroundStrength}
              catalogSystems={catalog?.systems ?? []}
              activeCatalogId={activeEntry?.id ?? system.id}
              sceneRevision={sceneRevision}
              bodyScaleMode={effectiveBodyScaleMode}
              orbitDisplayMode={orbitDisplayMode}
              onSelectPlanet={handlePlanetSelect}
              onSelectStar={centerStar}
              active={!showMap}
            />
            <div className="scene-heading">
              <span className="eyebrow">{STAGES[stage - 1].description}</span>
              <h2>{selectedPlanet?.name ?? system.name}</h2>
              <span className="scale-warning">
                {effectiveBodyScaleMode === 'relative' ? 'PROPORCIÓN DE RADIOS FÍSICA' : 'TAMAÑOS VISUALES COMPRIMIDOS'}
              </span>
            </div>
            {stage === 1 && <DataStage system={system} planet={selectedPlanet} />}
            {stage >= 2 && (
              <div className="scene-controls">
                {selectedPlanet && (
                  <button type="button" onClick={showSystem}>Ver sistema completo</button>
                )}
                <div className="body-scale-control" role="group" aria-label="Escala visual de los cuerpos">
                  <span>Escala</span>
                  <button type="button" className={effectiveBodyScaleMode === 'legible' ? 'active' : ''}
                    aria-pressed={effectiveBodyScaleMode === 'legible'} onClick={() => setBodyScaleMode('legible')}>
                    Legible
                  </button>
                  <button type="button" className={effectiveBodyScaleMode === 'relative' ? 'active' : ''}
                    aria-pressed={effectiveBodyScaleMode === 'relative'} disabled={!hasStellarRadius}
                    title={hasStellarRadius ? 'Radios planeta/estrella en proporción física' : 'Sin radio estelar reportado'}
                    onClick={() => setBodyScaleMode('relative')}>
                    Relación física
                  </button>
                </div>
                <div className="body-scale-control orbit-mode-control" role="group" aria-label="Visualización de órbitas">
                  <span>Órbitas</span>
                  {([
                    ['complete', 'Completa'],
                    ['trail', 'Traza'],
                    ['hidden', 'Ocultar'],
                  ] as [OrbitDisplayMode, string][]).map(([mode, label]) => (
                    <button key={mode} type="button" className={orbitDisplayMode === mode ? 'active' : ''}
                      aria-pressed={orbitDisplayMode === mode}
                      title={mode === 'trail' ? 'La cola se forma mientras los planetas avanzan' : undefined}
                      onClick={() => setOrbitDisplayMode(mode)}>
                      {label}
                    </button>
                  ))}
                </div>
                {stage === 4 && (
                  <div className="body-scale-control playback-rate-control" role="group"
                    aria-label="Multiplicador de tiempo orbital"
                    title="El exponente n aplica 10ⁿ× al período NASA literal">
                    <span>Tiempo</span>
                    <button type="button" className={playbackPaused ? 'active' : ''}
                      aria-pressed={playbackPaused}
                      onClick={() => setPlaybackPaused(paused => !paused)}>
                      {playbackPaused ? 'Reanudar' : 'Pausa'}
                    </button>
                    <label className="time-exponent-control" htmlFor="time-exponent">
                      <span>Exponente</span>
                      <input id="time-exponent" type="range" min="0" max="8" step="1"
                        value={timeExponent}
                        aria-valuetext={`10 elevado a ${timeExponent}, ${timeMultiplier.toLocaleString('es-CL')} veces`}
                        onChange={(event) => setTimeExponent(Number(event.target.value))} />
                    </label>
                    <output htmlFor="time-exponent">
                      10<sup>{timeExponent}</sup> = {timeMultiplier.toLocaleString('es-CL')}×
                    </output>
                  </div>
                )}
              </div>
            )}
            <div className="scene-help">
              {effectiveBodyScaleMode === 'relative'
                ? 'Radios en proporción física · los planetas pequeños pueden verse como puntos'
                : 'Arrastra para orbitar · rueda para acercar · selecciona un planeta'}
            </div>
          </>
        )}
        {loading && <div className="viewport-loading">Cargando sistema…</div>}
        </div>
        <label className="background-control playback-control">
          <span>Fondo cósmico</span>
          <input type="range" min="0" max="1" step="0.05" value={backgroundStrength}
            aria-valuetext={backgroundStrength === 0 ? 'Apagado' : `${Math.round(backgroundStrength * 100)} por ciento`}
            onChange={(event) => setBackgroundStrength(event.currentTarget.valueAsNumber)} />
          <output>{backgroundStrength === 0 ? 'Off' : `${Math.round(backgroundStrength * 100)}%`}</output>
        </label>
      </main>

      <aside className="inspector-panel panel">
        <div className="panel-heading inspector-heading">
          <span className="eyebrow">INSPECTOR DE TRAZABILIDAD</span>
          <h2>{selectedPlanet?.name ?? system?.name ?? 'Cargando sistema'}</h2>
          <p>{selectedPlanet ? 'Detalle del planeta' : 'Resumen del sistema'}</p>
          {selectedPlanet && <button type="button" className="space-button" onClick={showSystem}>Ver datos del sistema</button>}
          {selectedPlanet && (
            <div className="planet-meta">
              <span>{selectedPlanet.visualCategory.value}</span>
              <StatusBadge status={selectedPlanet.visualCategory.status} />
            </div>
          )}
        </div>

        {selectedPlanet ? (
          <div className="attribute-list">
            {Object.entries(selectedPlanet.attributes).map(([key, attribute]) => (
              <article className="attribute-card" key={key}>
                <div className="attribute-title">
                  <span>{ATTRIBUTE_LABELS[key] ?? key}</span>
                  <StatusBadge status={attribute.status} />
                </div>
                <strong>{formatAttribute(attribute)}</strong>
                {attribute.transform && <p>{attribute.transform}</p>}
                <footer>
                  {attribute.source.url ? (
                    <a href={attribute.source.url} target="_blank" rel="noreferrer">{attribute.source.label}</a>
                  ) : (
                    <span>{attribute.source.label}</span>
                  )}
                </footer>
              </article>
            ))}
          </div>
        ) : system ? <SystemSummary system={system} onSelect={handlePlanetSelect} /> : null}

        <div className="provenance-legend">
          {(Object.keys(STATUS_LABELS) as ProvenanceStatus[]).map((status) => (
            <div key={status}><i className={`legend-dot status-${status}`} /><span>{STATUS_LABELS[status]}</span></div>
          ))}
          <p>Los colores describen procedencia, no probabilidad ni exactitud.</p>
        </div>
      </aside>
    </div>
  );
}

function SystemSummary({ system, onSelect }: { system: ExoplanetSystem; onSelect: (id: string) => void }) {
  const counts = system.planets.reduce<Record<string, number>>((result, planet) => {
    const category = planet.visualCategory.value;
    result[category] = (result[category] ?? 0) + 1;
    return result;
  }, {});
  const attributes: [string, ScientificAttribute | TextAttribute][] = [
    ['Distancia al Sistema Solar', system.coordinates.distancePc],
    ['Tipo espectral', system.star.attributes.spectralType],
    ['Clase de luminosidad', system.star.attributes.luminosityClass],
    ['Radio de la estrella', system.star.attributes.radiusSolar],
    ['Masa de la estrella', system.star.attributes.massSolar],
    ['Temperatura efectiva', system.star.attributes.temperatureK],
    ['Luminosidad', system.star.attributes.luminosityLogSolar],
    ['Gravedad superficial', system.star.attributes.surfaceGravityLogCgs],
    ['Edad', system.star.attributes.ageGyr],
    ['Densidad', system.star.attributes.densityGcm3],
    ['Metalicidad', system.star.attributes.metallicityDex],
    ['Razón de metalicidad', system.star.attributes.metallicityRatio],
    ['Velocidad de rotación proyectada', system.star.attributes.rotationalVelocityKms],
    ['Período de rotación', system.star.attributes.rotationPeriodDays],
    ['Velocidad radial sistémica', system.star.attributes.radialVelocityKms],
    ['Color visual de la estrella', system.star.visual.colorHex],
    ['Ascensión recta', system.coordinates.rightAscensionDeg],
    ['Declinación', system.coordinates.declinationDeg],
  ];
  return <div className="attribute-list system-details">
    <article className="attribute-card">
      <div className="attribute-title">Planetas en el catálogo</div><strong>{system.planets.length}</strong>
      {Object.entries(counts).map(([category, count]) => <p key={category}>{category}: {count}</p>)}
      <p>Categorías visuales heurísticas según radio; no describen una composición observada.</p>
    </article>
    {attributes.map(([label, attribute]) => <article className="attribute-card" key={label}>
      <div className="attribute-title"><span>{label}</span><StatusBadge status={attribute.status} /></div>
      <strong>
        {label === 'Color visual de la estrella' && attribute.value && (
          <i className="stellar-color-swatch" style={{ backgroundColor: String(attribute.value) }} aria-hidden="true" />
        )}
        {formatDisplayAttribute(attribute)}
      </strong>
      {attribute.transform && <p>{attribute.transform}</p>}
      <footer>{attribute.source.url ? <a href={attribute.source.url} target="_blank" rel="noreferrer">{attribute.source.label}</a> : <span>{attribute.source.label}</span>}</footer>
    </article>)}
    <article className="attribute-card">
      <div className="attribute-title">Explorar planetas</div>
      <div className="planet-directory">{system.planets.map(planet => <button className="space-button" type="button" key={planet.id} onClick={() => onSelect(planet.id)}>{planet.name} · {planet.visualCategory.value}</button>)}</div>
    </article>
  </div>;
}

function DataStage({ system, planet }: { system: ExoplanetSystem; planet: Planet | null }) {
  const attributeRow = (label: string, attribute: ScientificAttribute | TextAttribute) => ({
    label,
    value: formatDisplayAttribute(attribute),
    status: attribute.status,
  });
  const rows: { label: string; value: string; status: ProvenanceStatus }[] = planet
    ? ['radiusEarth', 'periodDays', 'semiMajorAu', 'eccentricity'].map((key) => {
        const attribute = planet.attributes[key as keyof Planet['attributes']];
        return { label: ATTRIBUTE_LABELS[key], value: formatAttribute(attribute), status: attribute.status };
      })
    : [
        { label: 'Planetas en el sistema', value: String(system.planets.length), status: 'derived' },
        attributeRow('Distancia al Sistema Solar', system.coordinates.distancePc),
        attributeRow('Tipo espectral', system.star.attributes.spectralType),
        attributeRow('Clase de luminosidad', system.star.attributes.luminosityClass),
        attributeRow('Radio de la estrella', system.star.attributes.radiusSolar),
        attributeRow('Masa de la estrella', system.star.attributes.massSolar),
        attributeRow('Temperatura efectiva', system.star.attributes.temperatureK),
      ];
  return (
    <section className="data-stage-card">
      <span className="eyebrow">FILA NORMALIZADA · {planet?.name ?? system.name}</span>
      <div className="data-table">
        {rows.map((row) => (
          <div key={row.label}>
            <span>{row.label}</span>
            <strong>{row.value}</strong>
            <StatusBadge status={row.status} />
          </div>
        ))}
      </div>
      <p>{planet
        ? 'Fila planetaria normalizada. El inspector conserva fuente, incertidumbre y transformación.'
        : 'Resumen normalizado del sistema. El inspector conserva el perfil estelar completo y sus fuentes.'}</p>
    </section>
  );
}

export default App;
