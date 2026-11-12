import { useEffect, useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { ExoplanetSystem, Planet } from './types';
import { createStellarFlare } from './stellarFlare';

interface ThreeSceneProps {
  system: ExoplanetSystem;
  stage: number;
  selectedPlanetId: string | null;
  focusedPlanetId: string | null;
  playbackRate: number;
  onSelectPlanet: (planetId: string) => void;
  onSelectStar: () => void;
  active: boolean;
}

interface OrbitState {
  mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial | THREE.MeshStandardMaterial>;
  line: THREE.LineLoop<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  ring: THREE.Mesh;
  planetId: string;
  semiMajor: number;
  semiMinor: number;
  eccentricity: number;
  phase: number;
  angularSpeed: number;
  inclination: number;
}

const CATEGORY_COLORS: Record<string, number> = {
  rocoso: 0xc96f45,
  'sub-neptuno': 0x57bed9,
  'gigante-gaseoso': 0xd3a665,
  desconocido: 0x8294a9,
};

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
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

function planetMaterial(planet: Planet, stage: number, selected: boolean) {
  if (stage === 2) {
    return new THREE.MeshBasicMaterial({
      color: selected ? 0x61dcff : 0x7c91a8,
      wireframe: true,
      transparent: true,
      opacity: selected ? 1 : 0.72,
    });
  }
  const color = CATEGORY_COLORS[planet.visualCategory.value] ?? CATEGORY_COLORS.desconocido;
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.78,
    metalness: 0.04,
    emissive: selected ? 0x174d5e : 0x000000,
    emissiveIntensity: selected ? 1.15 : 0,
  });
}

export function ThreeScene({ system, stage, selectedPlanetId, focusedPlanetId, playbackRate, onSelectPlanet, onSelectStar, active }: ThreeSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const interaction = useRef({ selectedPlanetId, focusedPlanetId, playbackRate, onSelectPlanet, onSelectStar, active });
  const timeline = useRef({ system, elapsed: 0 });

  useLayoutEffect(() => {
    interaction.current = { selectedPlanetId, focusedPlanetId, playbackRate, onSelectPlanet, onSelectStar, active };
  }, [selectedPlanetId, focusedPlanetId, playbackRate, onSelectPlanet, onSelectStar, active]);

  useEffect(() => {
    const host = hostRef.current;
    const label = labelRef.current;
    if (!host || !label) return;
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
    controls.target.set(0, 0, 0);

    const ambient = new THREE.AmbientLight(0x5c7fa5, stage >= 3 ? 0.42 : 0.2);
    scene.add(ambient);
    const detailLight = new THREE.DirectionalLight(0xdcecff, 0);
    scene.add(detailLight, detailLight.target);
    const starLight = new THREE.PointLight(0xffd6a1, stage >= 3 ? 180 : 0, 90, 1.7);
    scene.add(starLight);

    const random = seededRandom(731 + system.planets.length * 97);
    const starPositions: number[] = [];
    for (let index = 0; index < 900; index += 1) {
      const radius = 85 + random() * 155;
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);
      starPositions.push(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta),
      );
    }
    const starFieldGeometry = new THREE.BufferGeometry();
    starFieldGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    const starField = new THREE.Points(
      starFieldGeometry,
      new THREE.PointsMaterial({ color: 0xb9dcff, size: 0.33, transparent: true, opacity: 0.72 }),
    );
    scene.add(starField);

    const orbitStates: OrbitState[] = [];
    const selectableMeshes: THREE.Object3D[] = [];
    const flare = stage >= 3 ? createStellarFlare() : null;
    if (flare) scene.add(flare);

    if (stage >= 2) {
      const star = new THREE.Mesh(
        new THREE.SphereGeometry(1.45, 32, 24),
        new THREE.MeshBasicMaterial({
          color: 0xf1b46a, wireframe: true, transparent: true, opacity: 0.8, visible: stage === 2,
        }),
      );
      star.userData.bodyName = system.star.name;
      star.userData.bodyType = 'Estrella';
      scene.add(star);
      selectableMeshes.push(star);

      const scaleOrbit = orbitScale(system.planets);
      const minPeriod = Math.min(
        ...system.planets
          .map((planet) => planet.attributes.periodDays.value)
          .filter((value): value is number => typeof value === 'number' && value > 0),
      );

      system.planets.forEach((planet, index) => {
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

        const radiusEarth = planet.attributes.radiusEarth.value ?? 1;
        const visualRadius = Math.min(0.72, 0.28 + Math.pow(radiusEarth, 0.42) * 0.16);
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(visualRadius, 30, 20),
          planetMaterial(planet, stage, false),
        );
        mesh.userData.planetId = planet.id;
        mesh.userData.bodyName = planet.name;
        mesh.userData.bodyType = 'Planeta';
        scene.add(mesh);
        selectableMeshes.push(mesh);

        const ring = new THREE.Mesh(
          new THREE.RingGeometry(visualRadius * 1.55, visualRadius * 1.73, 64),
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

        const period = planet.attributes.periodDays.value ?? minPeriod * (index + 1);
        orbitStates.push({
          mesh,
          line,
          ring,
          planetId: planet.id,
          semiMajor,
          semiMinor,
          eccentricity,
          phase: planet.visualPhase.value,
          angularSpeed: 0.62 * Math.sqrt(minPeriod / Math.max(minPeriod, period)),
          inclination: planeOffset,
        });
      });
    }

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
    let zoomDistance = camera.position.length();
    let zooming = false;
    let overviewDistance = zoomDistance;
    let lastTime: number | undefined;
    let previousSelected: string | null | undefined;
    let previousFocus: string | null | undefined;
    let followBlend = 1;
    let frame = 0;
    const animate = (now: number) => {
      frame = requestAnimationFrame(animate);
      const delta = lastTime === undefined ? 0 : Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      if (!interaction.current.active) { cancel(); return; }
      const { selectedPlanetId, focusedPlanetId, playbackRate } = interaction.current;
      if (stage === 4) timeline.current.elapsed += delta * playbackRate;
      const elapsed = timeline.current.elapsed;
      const selectionChanged = selectedPlanetId !== previousSelected;
      if (focusedPlanetId !== previousFocus) {
        if (previousFocus == null && focusedPlanetId) overviewDistance = camera.position.distanceTo(controls.target);
        const focused = orbitStates.find(orbit => orbit.planetId === focusedPlanetId);
        const radius = focused?.mesh.geometry.parameters.radius;
        zoomDistance = radius ? radius * 3.2 / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.min(1, camera.aspect) : overviewDistance;
        controls.minDistance = radius ? radius * 1.6 : 10;
        zooming = true;
        followBlend = 0;
        previousFocus = focusedPlanetId;
      }
      desiredTarget.copy(center);
      orbitStates.forEach((orbit) => {
        if (selectionChanged) {
          const selected = orbit.planetId === selectedPlanetId;
          orbit.ring.visible = false;
          orbit.line.material.color.setHex(selected ? 0x5ce4ff : 0x376682);
          orbit.line.material.opacity = selected ? 0.95 : stage === 2 ? 0.46 : 0.32;
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
        orbit.mesh.position.set(x, -Math.sin(orbit.inclination) * z, Math.cos(orbit.inclination) * z);
        orbit.mesh.rotation.y = elapsed * 0.18;
        if (orbit.planetId === focusedPlanetId) desiredTarget.copy(orbit.mesh.position);
      });
      previousSelected = selectedPlanetId;
      starField.rotation.y = elapsed * 0.004;
      // Move the camera and its pivot together to preserve zoom and viewing angle.
      followBlend = Math.min(1, followBlend + delta / 0.42);
      nextTarget.copy(controls.target).lerp(desiredTarget, followBlend === 1 ? 1 : 1 - Math.exp(-12 * delta));
      cameraShift.subVectors(nextTarget, controls.target);
      camera.position.add(cameraShift);
      controls.target.copy(nextTarget);
      if (zooming) {
        viewOffset.subVectors(camera.position, controls.target);
        const distance = THREE.MathUtils.lerp(viewOffset.length(), zoomDistance, 1 - Math.exp(-8 * delta));
        viewOffset.setLength(distance);
        camera.position.copy(controls.target).add(viewOffset);
        if (Math.abs(distance - zoomDistance) < 0.01) zooming = false;
      }
      controls.update();
      detailLight.intensity = stage >= 3 && focusedPlanetId ? 1.2 : 0;
      detailLight.position.copy(camera.position);
      detailLight.target.position.copy(controls.target);
      if (flare) {
        flare.quaternion.copy(camera.quaternion);
        flare.material.uniforms.uTime.value = elapsed;
      }
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
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, [system, stage]);

  return <div className="scene-host" ref={hostRef} aria-label={`Escena 3D del sistema ${system.name}`}>
    <div className="body-tooltip" ref={labelRef} hidden />
  </div>;
}
