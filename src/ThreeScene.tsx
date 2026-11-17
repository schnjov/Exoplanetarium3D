import { useEffect, useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { CatalogEntry, ExoplanetSystem, OrbitDisplayMode, Planet } from './types';
import { createStellarFlare, createStellarSurface } from './stellarFlare';
import { createCosmicParticles } from './cosmicParticles';
import { createCosmicCloud } from './cosmicCloud';
import { createPlanetTextureSet, type PlanetTextureCategory, type PlanetTextureSet } from './planetTextures';

interface ThreeSceneProps {
  system: ExoplanetSystem;
  stage: number;
  selectedPlanetId: string | null;
  focusedPlanetId: string | null;
  playbackRate: number;
  backgroundStrength: number;
  catalogSystems: CatalogEntry[];
  activeCatalogId: string;
  sceneRevision: number;
  bodyScaleMode: 'legible' | 'relative';
  orbitDisplayMode: OrbitDisplayMode;
  onSelectPlanet: (planetId: string) => void;
  onSelectStar: () => void;
  active: boolean;
}

interface OrbitState {
  mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial | THREE.MeshStandardMaterial>;
  pickMesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  line: THREE.LineLoop<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  trail: THREE.Line<THREE.BufferGeometry, THREE.ShaderMaterial>;
  trailSamples: { elapsed: number; position: THREE.Vector3 }[];
  lastTrailElapsed: number | null;
  ring: THREE.Mesh;
  planetId: string;
  semiMajor: number;
  semiMinor: number;
  eccentricity: number;
  phase: number;
  angularSpeed: number;
  inclination: number;
  legibleRadius: number;
  relativeRadius: number;
}

const SOLAR_RADIUS_IN_EARTH_RADII = 109.076;
const TRAIL_CAPACITY = 80;
const TRAIL_DURATION = 4;
const TRAIL_SAMPLE_INTERVAL = 0.045;
const SECONDS_PER_DAY = 86_400;

function orbitalAngularSpeed(periodDays: number | null) {
  if (periodDays === null || !Number.isFinite(periodDays) || periodDays <= 0) return 0;
  return (Math.PI * 2) / (periodDays * SECONDS_PER_DAY);
}

function compressedStellarRadius(radiusSolar: number | null) {
  if (radiusSolar === null || !Number.isFinite(radiusSolar) || radiusSolar <= 0) return 1.45;
  return THREE.MathUtils.clamp(1.45 * Math.pow(radiusSolar, 0.28), 0.72, 4.2);
}

function legiblePlanetRadius(radiusEarth: number) {
  return Math.min(0.72, 0.28 + Math.pow(radiusEarth, 0.42) * 0.16);
}

function stringSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

function catalogPosition(entry: CatalogEntry) {
  const { rightAscensionDeg: ra, declinationDeg: dec, distancePc: distance } = entry;
  if (ra === null || dec === null || distance === null || distance <= 0) return null;
  const raRad = THREE.MathUtils.degToRad(ra);
  const decRad = THREE.MathUtils.degToRad(dec);
  return new THREE.Vector3(
    distance * Math.cos(decRad) * Math.cos(raRad),
    distance * Math.sin(decRad),
    distance * Math.cos(decRad) * Math.sin(raRad),
  );
}

function createNeighborStars(systems: CatalogEntry[], activeId: string) {
  const active = systems.find(entry => entry.id === activeId);
  const origin = active ? catalogPosition(active) : null;
  if (!origin) return null;
  const neighbors = systems.flatMap((entry) => {
    if (entry.id === activeId) return [];
    const position = catalogPosition(entry);
    if (!position) return [];
    const offset = position.sub(origin);
    return [{ entry, offset, distance: offset.length() }];
  }).sort((a, b) => a.distance - b.distance).slice(0, 64);
  const positions = new Float32Array(neighbors.length * 3);
  const colors = new Float32Array(neighbors.length * 3);
  const color = new THREE.Color();
  neighbors.forEach(({ entry, offset, distance }, index) => {
    const visualDistance = Math.min(135, 36 + Math.log1p(distance) * 12);
    offset.normalize().multiplyScalar(visualDistance);
    const positionOffset = index * 3;
    positions[positionOffset] = offset.x;
    positions[positionOffset + 1] = offset.y;
    positions[positionOffset + 2] = offset.z;
    color.set(entry.completeness >= 75 ? '#d8f3ff' : entry.completeness >= 45 ? '#9ccfe8' : '#7894ad');
    colors[positionOffset] = color.r;
    colors[positionOffset + 1] = color.g;
    colors[positionOffset + 2] = color.b;
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 1.05,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.userData.neighborCount = neighbors.length;
  return points;
}

function orbitScale(planets: Planet[]) {
  const values = planets
    .map((planet) => planet.attributes.semiMajorAu.value)
    .filter((value): value is number => typeof value === 'number' && value > 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const minLog = Math.log(min);
  const range = Math.max(0.0001, Math.log(max) - minLog);
  return (value: number) => 5.4 + ((Math.log(value) - minLog) / range) * 12.8;
}

function createOrbitLine(
  semiMajor: number,
  eccentricity: number,
  color: number,
  opacity: number,
) {
  const semiMinor = semiMajor * Math.sqrt(Math.max(0.05, 1 - eccentricity ** 2));
  const points: THREE.Vector3[] = [];
  for (let index = 0; index <= 160; index += 1) {
    const angle = (index / 160) * Math.PI * 2;
    points.push(
      new THREE.Vector3(
        semiMajor * (Math.cos(angle) - eccentricity),
        0,
        semiMinor * Math.sin(angle),
      ),
    );
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  return { line: new THREE.LineLoop(geometry, material), semiMinor };
}

function createTrailLine(color: number) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(TRAIL_CAPACITY * 3), 3).setUsage(THREE.DynamicDrawUsage),
  );
  geometry.setAttribute(
    'trailAlpha',
    new THREE.BufferAttribute(new Float32Array(TRAIL_CAPACITY), 1).setUsage(THREE.DynamicDrawUsage),
  );
  geometry.setDrawRange(0, 0);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color(color) } },
    vertexShader: `
      attribute float trailAlpha;
      varying float vTrailAlpha;
      void main() {
        vTrailAlpha = trailAlpha;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vTrailAlpha;
      void main() {
        gl_FragColor = vec4(uColor, vTrailAlpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const trail = new THREE.Line(geometry, material);
  trail.visible = false;
  trail.frustumCulled = false;
  return trail;
}

function updateTrail(orbit: OrbitState, elapsed: number) {
  if (
    orbit.lastTrailElapsed === null ||
    elapsed < orbit.lastTrailElapsed ||
    elapsed - orbit.lastTrailElapsed >= TRAIL_SAMPLE_INTERVAL
  ) {
    orbit.trailSamples.push({ elapsed, position: orbit.mesh.position.clone() });
    orbit.lastTrailElapsed = elapsed;
  }
  while (
    orbit.trailSamples.length > TRAIL_CAPACITY ||
    (orbit.trailSamples.length > 1 && elapsed - orbit.trailSamples[0].elapsed > TRAIL_DURATION)
  ) {
    orbit.trailSamples.shift();
  }

  const position = orbit.trail.geometry.getAttribute('position') as THREE.BufferAttribute;
  const alpha = orbit.trail.geometry.getAttribute('trailAlpha') as THREE.BufferAttribute;
  orbit.trailSamples.forEach((sample, index) => {
    position.setXYZ(index, sample.position.x, sample.position.y, sample.position.z);
    alpha.setX(index, Math.max(0.04, 1 - (elapsed - sample.elapsed) / TRAIL_DURATION));
  });
  position.needsUpdate = true;
  alpha.needsUpdate = true;
  orbit.trail.geometry.setDrawRange(0, orbit.trailSamples.length);
  orbit.trail.visible = orbit.trailSamples.length > 1;
}

function planetMaterial(planet: Planet, stage: number, selected: boolean, textures: PlanetTextureSet | null) {
  if (stage === 2) {
    return new THREE.MeshBasicMaterial({
      color: selected ? 0x61dcff : 0x7c91a8,
      wireframe: true,
      transparent: true,
      opacity: selected ? 1 : 0.72,
    });
  }
  const category = (planet.visualCategory.value in (textures ?? {})
    ? planet.visualCategory.value
    : 'desconocido') as PlanetTextureCategory;
  const roughness = category === 'rocoso' ? 0.92 : category === 'gigante-gaseoso' ? 0.66 : category === 'sub-neptuno' ? 0.58 : 0.82;
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures?.[category] ?? null,
    roughness,
    metalness: 0.02,
    emissive: selected ? 0x174d5e : 0x000000,
    emissiveIntensity: selected ? 1.15 : 0,
  });
}

export function ThreeScene({ system, stage, selectedPlanetId, focusedPlanetId, playbackRate, backgroundStrength, catalogSystems, activeCatalogId, sceneRevision, bodyScaleMode, orbitDisplayMode, onSelectPlanet, onSelectStar, active }: ThreeSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const fpsRef = useRef<HTMLOutputElement>(null);
  const interaction = useRef({ selectedPlanetId, focusedPlanetId, playbackRate, backgroundStrength, bodyScaleMode, orbitDisplayMode, onSelectPlanet, onSelectStar, active });
  const timeline = useRef({ system, elapsed: 0 });

  useLayoutEffect(() => {
    interaction.current = { selectedPlanetId, focusedPlanetId, playbackRate, backgroundStrength, bodyScaleMode, orbitDisplayMode, onSelectPlanet, onSelectStar, active };
  }, [selectedPlanetId, focusedPlanetId, playbackRate, backgroundStrength, bodyScaleMode, orbitDisplayMode, onSelectPlanet, onSelectStar, active]);

  useEffect(() => {
    const host = hostRef.current;
    const label = labelRef.current;
    const fps = fpsRef.current;
    if (!host || !label || !fps) return;
    if (timeline.current.system !== system) timeline.current = { system, elapsed: 0 };

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020713, 0.012);

    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 500);
    camera.position.set(0, 22, 30);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.domElement.className = 'scene-canvas';
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.dampingFactor = 0.055;
    controls.minDistance = 1;
    controls.maxDistance = 75;
    controls.enabled = true;
    controls.target.set(0, 0, 0);

    const ambient = new THREE.AmbientLight(0x5c7fa5, stage >= 3 ? 0.42 : 0.2);
    scene.add(ambient);
    const detailLight = new THREE.DirectionalLight(0xdcecff, 0);
    scene.add(detailLight, detailLight.target);
    const stellarColor = new THREE.Color(system.star.visual.colorHex.value ?? '#fff4dc');
    const stellarRadiusSolar = system.star.attributes.radiusSolar.value;
    const stellarVisualRadius = compressedStellarRadius(stellarRadiusSolar);
    const starLight = new THREE.PointLight(stellarColor, stage >= 3 ? 180 : 0, 90, 1.7);
    scene.add(starLight);

    const cosmicCloud = createCosmicCloud();
    cosmicCloud.material.uniforms.uOpacity.value = backgroundStrength;
    scene.add(cosmicCloud);
    const cosmicParticles = createCosmicParticles(0xe70f2026, renderer.getPixelRatio());
    cosmicParticles.material.uniforms.uOpacity.value = backgroundStrength;
    scene.add(cosmicParticles);
    const neighborStars = createNeighborStars(catalogSystems, activeCatalogId);
    if (neighborStars) scene.add(neighborStars);

    const orbitStates: OrbitState[] = [];
    const selectableMeshes: THREE.Object3D[] = [];
    const flare = stage >= 3 ? createStellarFlare(stellarColor) : null;
    const stellarSurface = stage >= 3 ? createStellarSurface(stellarColor, stringSeed(system.id) * 97) : null;
    if (flare) {
      flare.scale.setScalar(stellarVisualRadius / 1.45);
      scene.add(flare);
    }

    let starMesh: THREE.Mesh | null = null;
    let planetarySystemBuilt = false;
    let planetTextures: PlanetTextureSet | null = null;
    if (stage >= 2) {
      starMesh = new THREE.Mesh(
        new THREE.SphereGeometry(1, 64, 48),
        stage === 2
          ? new THREE.MeshBasicMaterial({ color: stellarColor, wireframe: true, transparent: true, opacity: 0.8 })
          : stellarSurface!,
      );
      starMesh.scale.setScalar(stellarVisualRadius);
      starMesh.userData.bodyName = system.star.name;
      starMesh.userData.bodyType = 'Estrella';
      scene.add(starMesh);
      selectableMeshes.push(starMesh);
    }

    const buildPlanetarySystem = () => {
      if (planetarySystemBuilt || stage < 2) return;
      planetarySystemBuilt = true;
      if (stage >= 3) planetTextures = createPlanetTextureSet(renderer.capabilities.getMaxAnisotropy());
      const scaleOrbit = orbitScale(system.planets);
      system.planets.forEach((planet) => {
        const rawSemiMajor = planet.attributes.semiMajorAu.value;
        if (rawSemiMajor === null) return;
        const semiMajor = scaleOrbit(rawSemiMajor);
        const eccentricity = Math.min(0.82, Math.max(0, planet.attributes.eccentricity.value ?? 0));
        const { line, semiMinor } = createOrbitLine(
          semiMajor,
          eccentricity,
          0x376682,
          stage === 2 ? 0.46 : 0.32,
        );
        const planeOffset = ((planet.attributes.inclinationDeg.value ?? 90) - 90) * (Math.PI / 180);
        line.rotation.x = planeOffset;
        scene.add(line);
        const trail = createTrailLine(0x4a9bc2);
        scene.add(trail);

        const radiusEarth = planet.attributes.radiusEarth.value ?? 1;
        const readableRadius = legiblePlanetRadius(radiusEarth);
        const relativeRadius = stellarRadiusSolar && stellarRadiusSolar > 0
          ? stellarVisualRadius * radiusEarth / (stellarRadiusSolar * SOLAR_RADIUS_IN_EARTH_RADII)
          : readableRadius;
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(1, 30, 20),
          planetMaterial(planet, stage, false, planetTextures),
        );
        const initialRadius = bodyScaleMode === 'relative' ? relativeRadius : readableRadius;
        mesh.scale.setScalar(initialRadius);
        mesh.userData.planetId = planet.id;
        mesh.userData.bodyName = planet.name;
        mesh.userData.bodyType = 'Planeta';
        scene.add(mesh);

        const pickMesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.34, 12, 8),
          new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
        );
        pickMesh.userData.planetId = planet.id;
        pickMesh.userData.bodyName = planet.name;
        pickMesh.userData.bodyType = 'Planeta';
        scene.add(pickMesh);
        selectableMeshes.push(pickMesh);

        const ring = new THREE.Mesh(
          new THREE.RingGeometry(1.55, 1.73, 64),
          new THREE.MeshBasicMaterial({
            color: 0x5ce4ff,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide,
          }),
        );
        ring.rotation.x = Math.PI / 2;
        ring.visible = false;
        mesh.add(ring);

        const period = planet.attributes.periodDays.value;
        orbitStates.push({
          mesh,
          pickMesh,
          line,
          trail,
          trailSamples: [],
          lastTrailElapsed: null,
          ring,
          planetId: planet.id,
          semiMajor,
          semiMinor,
          eccentricity,
          phase: planet.visualPhase.value,
          angularSpeed: orbitalAngularSpeed(period),
          inclination: planeOffset,
          legibleRadius: readableRadius,
          relativeRadius,
        });
      });
    };
    buildPlanetarySystem();

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let cursor: { x: number; y: number } | null = null;
    let press: { x: number; y: number; id: number } | null = null;
    const hitBody = ({ x, y }: { x: number; y: number }) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      if (!bounds.width || !bounds.height || x < bounds.left || x >= bounds.right ||
          y < bounds.top || y >= bounds.bottom) return undefined;
      pointer.x = ((x - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((y - bounds.top) / bounds.height) * 2 + 1;
      camera.updateMatrixWorld();
      scene.updateMatrixWorld();
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(selectableMeshes, false)[0]?.object.userData;
    };
    const move = (event: PointerEvent) => {
      cursor = event.pointerType !== 'touch' ? { x: event.clientX, y: event.clientY } : null;
    };
    const leave = () => { cursor = null; label.hidden = true; };
    const down = (event: PointerEvent) => {
      if (event.isPrimary && event.button === 0) press = { x: event.clientX, y: event.clientY, id: event.pointerId };
    };
    const up = (event: PointerEvent) => {
      if (!press || press.id !== event.pointerId) return;
      const distance = Math.hypot(event.clientX - press.x, event.clientY - press.y);
      press = null;
      if (distance > 6) return;
      const body = hitBody({ x: event.clientX, y: event.clientY });
      if (body?.planetId) interaction.current.onSelectPlanet(body.planetId as string);
      else if (body?.bodyType === 'Estrella') interaction.current.onSelectStar();
    };
    const cancel = () => { press = null; leave(); };
    renderer.domElement.addEventListener('pointermove', move);
    renderer.domElement.addEventListener('pointerleave', leave);
    renderer.domElement.addEventListener('pointerdown', down);
    renderer.domElement.addEventListener('pointerup', up);
    renderer.domElement.addEventListener('pointercancel', cancel);

    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    const desiredTarget = new THREE.Vector3();
    const cameraShift = new THREE.Vector3();
    const nextTarget = new THREE.Vector3();
    const center = new THREE.Vector3();
    const viewOffset = new THREE.Vector3();
    const focusedOrbitNormal = new THREE.Vector3(0, 1, 0);
    let zoomDistance = camera.position.length();
    let zooming = false;
    let overviewDistance = zoomDistance;
    let lastTime: number | undefined;
    let previousSelected: string | null | undefined;
    let previousFocus: string | null | undefined;
    let previousBodyScaleMode: 'legible' | 'relative' | undefined;
    let previousOrbitDisplayMode: OrbitDisplayMode | undefined;
    let previousFocusedOrbitAngle: number | null = null;
    let followBlend = 1;
    let stellarElapsed = 0;
    let planetRotationElapsed = 0;
    let trailElapsed = 0;
    let fpsWindowStart = performance.now();
    let fpsFrameCount = 0;
    let frame = 0;
    const animate = (now: number) => {
      frame = requestAnimationFrame(animate);
      const delta = lastTime === undefined ? 0 : Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      if (!interaction.current.active) {
        cancel();
        return;
      }
      const { selectedPlanetId, focusedPlanetId, playbackRate, backgroundStrength, bodyScaleMode, orbitDisplayMode } = interaction.current;
      if (stage === 4) timeline.current.elapsed += delta * playbackRate;
      if (stage === 4) planetRotationElapsed += delta;
      if (stage === 4 && playbackRate > 0) trailElapsed += delta;
      const elapsed = timeline.current.elapsed;
      if (stage >= 3 && (stage !== 4 || playbackRate > 0)) stellarElapsed += delta;
      const selectionChanged = selectedPlanetId !== previousSelected;
      const scaleModeChanged = bodyScaleMode !== previousBodyScaleMode;
      const orbitModeChanged = orbitDisplayMode !== previousOrbitDisplayMode;
      if (focusedPlanetId !== previousFocus) {
        if (previousFocus == null && focusedPlanetId) overviewDistance = camera.position.distanceTo(controls.target);
        const focused = orbitStates.find(orbit => orbit.planetId === focusedPlanetId);
        const displayedRadius = focused
          ? (bodyScaleMode === 'relative' ? focused.relativeRadius : focused.legibleRadius)
          : null;
        const focusRadius = displayedRadius ? Math.max(displayedRadius, 0.06) : null;
        zoomDistance = focusRadius ? focusRadius * 3.2 / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.min(1, camera.aspect) : overviewDistance;
        controls.minDistance = focusRadius ? focusRadius * 1.6 : 10;
        zooming = true;
        followBlend = 0;
        previousFocusedOrbitAngle = null;
        previousFocus = focusedPlanetId;
      } else if (scaleModeChanged && focusedPlanetId) {
        const focused = orbitStates.find(orbit => orbit.planetId === focusedPlanetId);
        const displayedRadius = focused
          ? (bodyScaleMode === 'relative' ? focused.relativeRadius : focused.legibleRadius)
          : 0.06;
        const focusRadius = Math.max(displayedRadius, 0.06);
        zoomDistance = focusRadius * 3.2 / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.min(1, camera.aspect);
        controls.minDistance = focusRadius * 1.6;
        zooming = true;
      }
      previousBodyScaleMode = bodyScaleMode;
      desiredTarget.copy(center);
      let focusedOrbitAngle: number | null = null;
      orbitStates.forEach((orbit) => {
        if (orbitModeChanged) {
          orbit.trailSamples.length = 0;
          orbit.lastTrailElapsed = null;
          orbit.trail.geometry.setDrawRange(0, 0);
        }
        orbit.line.visible = orbitDisplayMode === 'complete';
        if (orbitDisplayMode !== 'trail') orbit.trail.visible = false;
        if (selectionChanged) {
          const selected = orbit.planetId === selectedPlanetId;
          orbit.ring.visible = false;
          orbit.line.material.color.setHex(selected ? 0x5ce4ff : 0x376682);
          orbit.line.material.opacity = selected ? 0.95 : stage === 2 ? 0.46 : 0.32;
          orbit.trail.material.uniforms.uColor.value.setHex(selected ? 0x5ce4ff : 0x4a9bc2);
          const material = orbit.mesh.material;
          if (material instanceof THREE.MeshBasicMaterial) {
            material.color.setHex(selected ? 0x61dcff : 0x7c91a8);
            material.opacity = selected ? 1 : 0.72;
          } else {
            material.emissive.setHex(0x000000);
            material.emissiveIntensity = 0;
          }
        }
        const angle = orbit.phase + elapsed * orbit.angularSpeed;
        const x = orbit.semiMajor * (Math.cos(angle) - orbit.eccentricity);
        const z = orbit.semiMinor * Math.sin(angle);
        const targetRadius = bodyScaleMode === 'relative' ? orbit.relativeRadius : orbit.legibleRadius;
        const nextRadius = THREE.MathUtils.lerp(orbit.mesh.scale.x, targetRadius, 1 - Math.exp(-10 * delta));
        orbit.mesh.scale.setScalar(nextRadius);
        orbit.mesh.position.set(x, -Math.sin(orbit.inclination) * z, Math.cos(orbit.inclination) * z);
        orbit.pickMesh.position.copy(orbit.mesh.position);
        if (orbitDisplayMode === 'trail') updateTrail(orbit, trailElapsed);
        orbit.mesh.rotation.y = planetRotationElapsed * 0.18;
        if (orbit.planetId === focusedPlanetId) {
          desiredTarget.copy(orbit.mesh.position);
          focusedOrbitAngle = angle;
          focusedOrbitNormal.set(0, Math.cos(orbit.inclination), Math.sin(orbit.inclination));
        }
      });
      previousSelected = selectedPlanetId;
      previousOrbitDisplayMode = orbitDisplayMode;
      cosmicParticles.rotation.y = stellarElapsed * 0.0025;
      cosmicParticles.material.uniforms.uTime.value = stellarElapsed;
      cosmicParticles.material.uniforms.uOpacity.value = backgroundStrength;
      cosmicCloud.material.uniforms.uOpacity.value = backgroundStrength;
      if (starMesh && stage >= 3) starMesh.rotation.y = stellarElapsed * 0.055;
      // Move the camera and its pivot together to preserve zoom and viewing angle.
      followBlend = Math.min(1, followBlend + delta / 0.42);
      nextTarget.copy(controls.target).lerp(desiredTarget, followBlend === 1 ? 1 : 1 - Math.exp(-12 * delta));
      cameraShift.subVectors(nextTarget, controls.target);
      camera.position.add(cameraShift);
      controls.target.copy(nextTarget);
      if (focusedOrbitAngle !== null && previousFocusedOrbitAngle !== null) {
        viewOffset.subVectors(camera.position, controls.target);
        viewOffset.applyAxisAngle(focusedOrbitNormal, -(focusedOrbitAngle - previousFocusedOrbitAngle));
        camera.position.copy(controls.target).add(viewOffset);
      }
      if (zooming) {
        viewOffset.subVectors(camera.position, controls.target);
        const distance = THREE.MathUtils.lerp(viewOffset.length(), zoomDistance, 1 - Math.exp(-8 * delta));
        viewOffset.setLength(distance);
        camera.position.copy(controls.target).add(viewOffset);
        if (Math.abs(distance - zoomDistance) < 0.01) zooming = false;
      }
      controls.update();
      previousFocusedOrbitAngle = focusedOrbitAngle;
      detailLight.intensity = stage >= 3 && focusedPlanetId ? 1.2 : 0;
      detailLight.position.copy(camera.position);
      detailLight.target.position.copy(controls.target);
      if (flare) {
        flare.quaternion.copy(camera.quaternion);
        flare.material.uniforms.uTime.value = stellarElapsed;
      }
      if (stellarSurface) stellarSurface.uniforms.uTime.value = stellarElapsed;
      const hovered = cursor && !press ? hitBody(cursor) : undefined;
      if (hovered && cursor) {
        const bounds = host.getBoundingClientRect();
        const content = `${hovered.bodyName} · ${hovered.bodyType}`;
        if (label.textContent !== content) label.textContent = content;
        label.hidden = false;
        label.style.left = `${Math.max(4, Math.min(cursor.x - bounds.left + 14, bounds.width - label.offsetWidth - 4))}px`;
        label.style.top = `${Math.max(4, Math.min(cursor.y - bounds.top + 16, bounds.height - label.offsetHeight - 4))}px`;
      } else if (!label.hidden) label.hidden = true;
      renderer.domElement.style.cursor = press ? 'grabbing' : hovered ? 'pointer' : 'grab';
      renderer.render(scene, camera);
      fpsFrameCount += 1;
      const fpsWindowDuration = now - fpsWindowStart;
      if (fpsWindowDuration >= 500) {
        fps.value = `${Math.round(fpsFrameCount * 1000 / fpsWindowDuration)} FPS`;
        fpsFrameCount = 0;
        fpsWindowStart = now;
      }
    };
    animate(performance.now());

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointermove', move);
      renderer.domElement.removeEventListener('pointerleave', leave);
      renderer.domElement.removeEventListener('pointerdown', down);
      renderer.domElement.removeEventListener('pointerup', up);
      renderer.domElement.removeEventListener('pointercancel', cancel);
      label.hidden = true;
      fps.value = '-- FPS';
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      if (planetTextures) Object.values(planetTextures).forEach((texture) => texture.dispose());
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, [system, stage, sceneRevision]);

  return <div className="scene-host" ref={hostRef} aria-label={`Escena 3D del sistema ${system.name}`}>
    <output className="scene-fps" ref={fpsRef} aria-label="Fotogramas por segundo">-- FPS</output>
    <div className="body-tooltip" ref={labelRef} hidden />
  </div>;
}
