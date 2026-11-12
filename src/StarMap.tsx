import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import * as THREE from 'three';
import type { CatalogEntry, MapNavigationContext } from './types';
import { createCosmicCloud } from './cosmicCloud';
import { createCosmicParticles } from './cosmicParticles';

const radians = Math.PI / 180;
const home = { yaw: -0.42, pitch: 0.46 };
const initialZoom = 1.2;
const clampZoom = (value: number) => Math.max(0.5, Math.min(4, value));

function markerTwinkle(id: string) {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const value = hash >>> 0;
  return {
    duration: `${2.4 + (value % 18) / 10}s`,
    delay: `-${((value >>> 8) % 47) / 10}s`,
  };
}

export function stellarPosition(entry: CatalogEntry) {
  const { rightAscensionDeg: ra, declinationDeg: dec, distancePc: distance } = entry;
  if (ra == null || dec == null || distance == null ||
      ![ra, dec, distance].every(Number.isFinite) || Math.abs(dec) > 90 || distance <= 0) return null;
  const radius = Math.log1p(distance);
  return {
    x: radius * Math.cos(dec * radians) * Math.cos(ra * radians),
    y: radius * Math.sin(dec * radians),
    z: radius * Math.cos(dec * radians) * Math.sin(ra * radians),
  };
}

interface StarMapProps {
  systems: CatalogEntry[];
  activeId?: string;
  backgroundStrength: number;
  onOpen: (entry: CatalogEntry, view: MapNavigationContext) => void;
  onBack: () => void;
}

export function StarMap({ systems, activeId, backgroundStrength, onOpen, onBack }: StarMapProps) {
  const [angle, setAngle] = useState(home);
  const [zoom, setZoom] = useState(initialZoom);
  const [showNames, setShowNames] = useState(true);
  const [showConnections, setShowConnections] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [systemLimit, setSystemLimit] = useState(100);
  const fieldRef = useRef<HTMLDivElement>(null);
  const cosmicRef = useRef<HTMLDivElement>(null);
  const fpsRef = useRef<HTMLOutputElement>(null);
  const cosmicView = useRef({ angle, zoom, backgroundStrength });
  const drag = useRef<{ x: number; y: number; id: number } | null>(null);
  const openingTimer = useRef<number | null>(null);
  const available = systems.map((entry) => ({ entry, position: stellarPosition(entry) }))
    .filter((item) => item.position !== null);
  const limits = Array.from({ length: Math.floor(available.length / 100) }, (_, index) => (index + 1) * 100);
  if (available.length % 100 !== 0) limits.push(available.length);
  const visibleLimit = Math.min(systemLimit, available.length);
  const entries = available.slice(0, visibleLimit);
  const maxRadius = Math.max(1, ...entries.map(({ position: p }) => p ? Math.hypot(p.x, p.y, p.z) : 0));
  const project = ({ x, y, z }: NonNullable<ReturnType<typeof stellarPosition>>) => {
    const right = x * Math.cos(angle.yaw) - z * Math.sin(angle.yaw);
    const forward = x * Math.sin(angle.yaw) + z * Math.cos(angle.yaw);
    const up = y * Math.cos(angle.pitch) - forward * Math.sin(angle.pitch);
    const depth = y * Math.sin(angle.pitch) + forward * Math.cos(angle.pitch);
    return { x: 50 + right * 36 * zoom / maxRadius, y: 52 - up * 39 * zoom / maxRadius, depth };
  };
  const points = entries.flatMap(({ entry, position }) => position ? [{ entry, ...project(position) }] : []).sort((a, b) => b.depth - a.depth || a.entry.id.localeCompare(b.entry.id));

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? field.clientHeight : 1);
      setZoom(value => clampZoom(value * Math.exp(-Math.max(-200, Math.min(200, pixels)) * 0.002)));
    };
    field.addEventListener('wheel', onWheel, { passive: false });
    return () => field.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => () => {
    if (openingTimer.current !== null) window.clearTimeout(openingTimer.current);
  }, []);

  const beginOpen = (entry: CatalogEntry) => {
    if (openingId) return;
    setOpeningId(entry.id);
    openingTimer.current = window.setTimeout(() => {
      onOpen(entry, { yaw: angle.yaw, pitch: angle.pitch, zoom });
    }, 650);
  };

  useLayoutEffect(() => {
    cosmicView.current = { angle, zoom, backgroundStrength };
  }, [angle, zoom, backgroundStrength]);

  useEffect(() => {
    const host = cosmicRef.current;
    const fps = fpsRef.current;
    if (!host || !fps) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 500);
    camera.rotation.order = 'YXZ';
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.className = 'star-map-cosmic';
    host.appendChild(renderer.domElement);
    const cloud = createCosmicCloud();
    const particles = createCosmicParticles(0xe70f2026, renderer.getPixelRatio(), 1200);
    scene.add(cloud, particles);

    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    let windowStart = performance.now();
    let lastTime = windowStart;
    let frameCount = 0;
    let frame = 0;
    const measure = (now: number) => {
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      const view = cosmicView.current;
      camera.rotation.x = -view.angle.pitch * 0.72;
      camera.rotation.y = -view.angle.yaw;
      camera.fov = Math.max(28, Math.min(78, 58 / Math.sqrt(view.zoom / initialZoom)));
      camera.updateProjectionMatrix();
      cloud.material.uniforms.uOpacity.value = view.backgroundStrength;
      particles.material.uniforms.uOpacity.value = view.backgroundStrength * 0.62;
      particles.material.uniforms.uTime.value += delta;
      particles.rotation.y += delta * 0.0025;
      renderer.render(scene, camera);
      frameCount += 1;
      const duration = now - windowStart;
      if (duration >= 500) {
        fps.value = `${Math.round(frameCount * 1000 / duration)} FPS`;
        frameCount = 0;
        windowStart = now;
      }
      frame = requestAnimationFrame(measure);
    };
    frame = requestAnimationFrame(measure);
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      fps.value = '-- FPS';
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material => material.dispose());
        }
      });
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, []);

  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    let disposed = false;
    const updateLabels = () => {
      if (disposed) return;
      const occupied: DOMRect[] = [];
      const bounds = field.getBoundingClientRect();
      // DOM order is front to back; measure even labels hidden on the previous pass.
      for (const label of field.querySelectorAll<HTMLSpanElement>('.star-marker span')) {
        const rect = label.getBoundingClientRect();
        if (rect.right < bounds.left || rect.left > bounds.right || rect.bottom < bounds.top || rect.top > bounds.bottom) {
          label.style.visibility = 'hidden';
          continue;
        }
        const overlaps = occupied.some((other) =>
          rect.left < other.right + 2 && rect.right + 2 > other.left &&
          rect.top < other.bottom + 2 && rect.bottom + 2 > other.top);
        label.style.visibility = !showNames || overlaps ? 'hidden' : 'visible';
        if (!overlaps) occupied.push(rect);
      }
    };
    updateLabels();
    const observer = new ResizeObserver(updateLabels);
    observer.observe(field);
    for (const label of field.querySelectorAll('.star-marker span')) observer.observe(label);
    void document.fonts.ready.then(updateLabels);
    return () => { disposed = true; observer.disconnect(); };
  }, [systems, angle, showNames, visibleLimit, zoom]);

  const rings = [0.28, 0.55, 0.82, 1].map((r) => Array.from({ length: 65 }, (_, index) => {
    const phase = index / 64 * Math.PI * 2;
    const p = project({ x: Math.cos(phase) * r * maxRadius, y: 0, z: Math.sin(phase) * r * maxRadius });
    return `${p.x},${p.y}`;
  }).join(' '));
  return (
    <section className={`star-map${openingId ? ' is-opening' : ''}`} aria-label="Mapa estelar de sistemas" aria-busy={openingId !== null}>
      <div className="star-map-header">
        <div><span className="eyebrow">CATÁLOGO ESPACIAL</span><h2>Mapa estelar</h2></div>
        <label className="map-system-limit">Sistemas
          <select value={visibleLimit} disabled={available.length === 0} onChange={event => setSystemLimit(Number(event.currentTarget.value))}>
            {available.length === 0 && <option value={0}>0</option>}
            {limits.map(limit => <option key={limit} value={limit}>{limit.toLocaleString('es-CL')}{limit === available.length ? ' (todos)' : ''}</option>)}
          </select>
        </label>
        <label className="map-names-toggle"><input type="checkbox" role="switch" checked={showNames} onChange={event => setShowNames(event.currentTarget.checked)} />Mostrar nombres</label>
        <label className="map-connections-toggle"><input type="checkbox" role="switch" checked={showConnections} onChange={event => setShowConnections(event.currentTarget.checked)} />Mostrar conexiones</label>
        <div className="map-zoom-control" role="group" aria-label="Zoom del mapa">
          <button type="button" title="Alejar" aria-label="Alejar" disabled={zoom <= 0.5} onClick={() => setZoom(value => clampZoom(value / 1.2))}>-</button>
          <input type="range" aria-label="Zoom del mapa" aria-valuetext={`${Math.round(zoom * 100)}%`} min="0.5" max="4" step="0.01" value={zoom} onChange={event => setZoom(Number(event.currentTarget.value))} />
          <button type="button" title="Acercar" aria-label="Acercar" disabled={zoom >= 4} onClick={() => setZoom(value => clampZoom(value * 1.2))}>+</button>
          <output>{Math.round(zoom * 100)}%</output>
        </div>
        <button type="button" className="space-button" onClick={onBack}>Volver al sistema</button>
      </div>
      <div
        className="star-map-field"
        ref={fieldRef}
        onPointerDown={(event) => {
          if (openingId || !event.isPrimary || event.button !== 0 || (event.target as Element).closest('button')) return;
          drag.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const previous = drag.current;
          if (!previous || previous.id !== event.pointerId) return;
          const dx = event.clientX - previous.x;
          const dy = event.clientY - previous.y;
          drag.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
          setAngle((value) => ({ yaw: value.yaw + dx * 0.009, pitch: Math.max(-1.45, Math.min(1.45, value.pitch + dy * 0.009)) }));
        }}
        onLostPointerCapture={() => { drag.current = null; }}
      >
        <div className="star-map-cosmic-host" ref={cosmicRef} aria-hidden="true" />
        <output className="scene-fps" ref={fpsRef} aria-label="Fotogramas por segundo del mapa estelar">-- FPS</output>
        <svg className="star-map-grid" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {rings.map((ring, index) => <polyline key={index} points={ring} />)}
          {showConnections && points.map((point) => <line key={point.entry.id} x1="50" y1="52" x2={point.x} y2={point.y} />)}
        </svg>
        <div className="star-map-sun" role="img" aria-label="Sol, referencia del mapa">
          <i aria-hidden="true" />
          <span>Sol<small>REFERENCIA · ORIGEN</small></span>
        </div>
        {points.map(({ entry, x, y }, index) => {
          const opening = entry.id === openingId;
          const twinkle = markerTwinkle(entry.id);
          return (
          <button
            type="button"
            className={`star-marker${entry.id === activeId ? ' active' : ''}${opening ? ' opening' : ''}`}
            key={entry.id}
            style={{
              left: `${opening ? 50 : x}%`,
              top: `${opening ? 52 : y}%`,
              zIndex: opening ? 20000 : 10 + points.length - index,
              '--star-color': entry.starColorHex,
              '--twinkle-duration': twinkle.duration,
              '--twinkle-delay': twinkle.delay,
            } as CSSProperties}
            aria-label={`Abrir ${entry.name}, estrella`}
            title={`${entry.name} · Estrella`}
            disabled={openingId !== null}
            onClick={() => beginOpen(entry)}
          >
            <i aria-hidden="true" /><span>{entry.name}<small>ESTRELLA · {entry.distancePc?.toLocaleString('es-CL', { maximumFractionDigits: 1 })} pc</small></span>
          </button>
          );
        })}
      </div>
      <div className="star-map-footer">
        <p>Arrastra para girar · selecciona una estrella para entrar.<br />Coordenadas del catálogo; distancias comprimidas a escala logarítmica.
          <br />{points.length.toLocaleString('es-CL')} de {available.length.toLocaleString('es-CL')} sistemas con coordenadas.
          {available.length < systems.length && <><br />Los sistemas sin coordenadas completas siguen disponibles en la lista.</>}
        </p>
        <button type="button" className="space-button" onClick={() => { setAngle(home); setZoom(initialZoom); }}>Restablecer vista</button>
      </div>
    </section>
  );
}
