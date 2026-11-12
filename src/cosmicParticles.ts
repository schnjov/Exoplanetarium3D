import * as THREE from 'three';

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  uniform float uPixelRatio;
  uniform float uTime;
  varying vec3 vColor;

  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    float twinkle = 0.88 + 0.12 * sin(uTime * 0.9 + aPhase);
    float perspective = 105.0 / max(12.0, -viewPosition.z);
    gl_PointSize = clamp(aSize * uPixelRatio * perspective * twinkle, 1.0, 11.0);
    gl_Position = projectionMatrix * viewPosition;
    vColor = aColor;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;

  void main() {
    float distanceToCenter = length(gl_PointCoord - vec2(0.5));
    float glow = 1.0 - smoothstep(0.08, 0.5, distanceToCenter);
    float core = 1.0 - smoothstep(0.0, 0.13, distanceToCenter);
    float alpha = (glow * 0.7 + core * 0.8) * uOpacity;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(vColor * (0.78 + core * 0.62), alpha);
  }
`;

function randomGenerator(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function createCosmicParticles(seed: number, pixelRatio: number, count = 1800) {
  const random = randomGenerator(seed);
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const colors = new Float32Array(count * 3);
  const cold = new THREE.Color('#b9ddff');
  const neutral = new THREE.Color('#f8fbff');
  const warm = new THREE.Color('#ffd7a8');
  const color = new THREE.Color();

  for (let index = 0; index < count; index += 1) {
    const radius = 72 + Math.pow(random(), 0.58) * 185;
    const azimuth = random() * Math.PI * 2;
    const cosine = random() * 2 - 1;
    const sine = Math.sqrt(1 - cosine * cosine);
    const offset = index * 3;
    positions[offset] = radius * sine * Math.cos(azimuth);
    positions[offset + 1] = radius * cosine;
    positions[offset + 2] = radius * sine * Math.sin(azimuth);

    const bright = random();
    sizes[index] = bright > 0.975 ? 5.2 + random() * 2.8 : 1.25 + Math.pow(random(), 3) * 3.2;
    phases[index] = random() * Math.PI * 2;
    const tint = random();
    color.copy(tint < 0.2 ? warm : tint > 0.72 ? cold : neutral);
    color.multiplyScalar(0.72 + bright * 0.38);
    colors[offset] = color.r;
    colors[offset + 1] = color.g;
    colors[offset + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uPixelRatio: { value: pixelRatio },
      uTime: { value: 0 },
      uOpacity: { value: 0.75 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });

  const particles = new THREE.Points(geometry, material);
  particles.frustumCulled = false;
  particles.renderOrder = -10;
  return particles;
}
