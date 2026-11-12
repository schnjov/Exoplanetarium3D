import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadCatalog, loadSystem } from './data';
import { ThreeScene } from './ThreeScene';
import { StarMap } from './StarMap';
import type {
  CatalogEntry,
  CatalogIndex,
  ExoplanetSystem,
  Planet,
  ProvenanceStatus,
  ScientificAttribute,
} from './types';

const STAGES = [
  { id: 1, label: 'Datos', description: 'Valores normalizados y procedencia' },
  { id: 2, label: 'Geometría', description: 'Órbitas y cuerpos sin apariencia final' },
  { id: 3, label: 'Apariencia', description: 'Materiales genéricos por categoría' },
  { id: 4, label: 'Sistema', description: 'Escena navegable y animada' },
];

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
  const [playbackRate, setPlaybackRate] = useState(1);
  const [backgroundStrength, setBackgroundStrength] = useState(0.75);
  const [showMap, setShowMap] = useState(false);
  const [stage, setStage] = useState(4);
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

  const handlePlanetSelect = useCallback((planetId: string) => {
    setSelectedPlanetId(planetId);
    setFocusedPlanetId(planetId);
  }, []);
  const centerStar = useCallback(() => setFocusedPlanetId(null), []);
  const showSystem = () => { setSelectedPlanetId(null); setFocusedPlanetId(null); };
  const openSystem = (entry: CatalogEntry) => {
    setActiveEntry(entry);
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
          <button className="space-button map-launch" type="button" onClick={() => setShowMap(!showMap)}>
            {showMap ? 'Volver al sistema' : 'Abrir mapa estelar'}
          </button>
        </div>

        <div className="system-list">
          {catalog?.systems.map((entry) => (
            <button
              key={entry.id}
              className={`system-card ${activeEntry?.id === entry.id ? 'active' : ''}`}
              onClick={() => openSystem(entry)}
              type="button"
            >
              <span className="system-dot" />
              <span className="system-copy">
                <strong>{entry.name}</strong>
                <span>{entry.planetCount} planetas · {entry.distancePc ? `${formatNumber(entry.distancePc)} pc` : 'distancia ausente'}</span>
              </span>
              <span className="coverage">{entry.completeness}%</span>
            </button>
          ))}
        </div>

        {system && (
          <div className="system-summary">
            <span className="eyebrow">SISTEMA ACTIVO</span>
            <strong>{system.name}</strong>
            <span>{system.planets.length} cuerpos renderizables</span>
            <div className="summary-grid">
              <div><small>AR</small><b>{formatNumber(system.coordinates.rightAscensionDeg.value ?? 0)}°</b></div>
              <div><small>DEC</small><b>{formatNumber(system.coordinates.declinationDeg.value ?? 0)}°</b></div>
            </div>
          </div>
        )}
      </aside>

      <main className="viewport">
        <div className="cosmic-background" style={{ opacity: backgroundStrength }} aria-hidden="true" />
        {showMap && catalog && <StarMap systems={catalog.systems} activeId={activeEntry?.id}
          onOpen={openSystem} onBack={() => setShowMap(false)} />}
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
              onSelectPlanet={handlePlanetSelect}
              onSelectStar={centerStar}
              active={!showMap}
            />
            <div className="scene-heading">
              <span className="eyebrow">{STAGES[stage - 1].description}</span>
              <h2>{selectedPlanet?.name ?? system.name}</h2>
              <span className="scale-warning">ESCALA VISUAL NORMALIZADA</span>
            </div>
            {stage === 1 && selectedPlanet && <DataStage planet={selectedPlanet} />}
            {stage >= 2 && (
              <div className="scene-controls">
                {selectedPlanet && (
                  <button type="button" onClick={showSystem}>Ver sistema completo</button>
                )}
                {stage === 4 && (
                  <label className="playback-control">
                    <span>Velocidad orbital</span>
                    <input
                      type="range"
                      min="0"
                      max="4"
                      step="0.25"
                      value={playbackRate}
                      aria-valuetext={playbackRate === 0 ? 'En pausa' : `${playbackRate} veces`}
                      onChange={(event) => setPlaybackRate(event.currentTarget.valueAsNumber)}
                    />
                    <output>{playbackRate === 0 ? 'Pausa' : `${playbackRate.toLocaleString('es-CL')}×`}</output>
                  </label>
                )}
              </div>
            )}
            <div className="scene-help">Arrastra para orbitar · rueda para acercar · selecciona un planeta</div>
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
  const attributes: [string, ScientificAttribute][] = [
    ['Distancia al Sistema Solar', system.coordinates.distancePc],
    ['Radio de la estrella', system.star.attributes.radiusSolar],
    ['Masa de la estrella', system.star.attributes.massSolar],
    ['Temperatura de la estrella', system.star.attributes.temperatureK],
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
      <strong>{formatAttribute(attribute)}</strong>
      {attribute.transform && <p>{attribute.transform}</p>}
      <footer>{attribute.source.url ? <a href={attribute.source.url} target="_blank" rel="noreferrer">{attribute.source.label}</a> : <span>{attribute.source.label}</span>}</footer>
    </article>)}
    <article className="attribute-card">
      <div className="attribute-title">Explorar planetas</div>
      <div className="planet-directory">{system.planets.map(planet => <button className="space-button" type="button" key={planet.id} onClick={() => onSelect(planet.id)}>{planet.name} · {planet.visualCategory.value}</button>)}</div>
    </article>
  </div>;
}

function DataStage({ planet }: { planet: Planet }) {
  const visibleKeys = ['radiusEarth', 'periodDays', 'semiMajorAu', 'eccentricity'];
  return (
    <section className="data-stage-card">
      <span className="eyebrow">FILA NORMALIZADA · {planet.name}</span>
      <div className="data-table">
        {visibleKeys.map((key) => {
          const attribute = planet.attributes[key as keyof Planet['attributes']];
          return (
            <div key={key}>
              <span>{ATTRIBUTE_LABELS[key]}</span>
              <strong>{formatAttribute(attribute)}</strong>
              <StatusBadge status={attribute.status} />
            </div>
          );
        })}
      </div>
      <p>En esta etapa todavía no se construyen geometrías. Primero se inspeccionan los valores y su procedencia.</p>
    </section>
  );
}

export default App;
