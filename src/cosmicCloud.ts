import * as THREE from 'three';

const vertexShader = /* glsl */ `
  varying vec3 vDirection;

  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vDirection;

  float hash(vec3 point) {
    return fract(sin(dot(point, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
  }

  float noise(vec3 point) {
    vec3 cell = floor(point);
    vec3 local = fract(point);
    local = local * local * (3.0 - 2.0 * local);
    return mix(
      mix(mix(hash(cell), hash(cell + vec3(1.0, 0.0, 0.0)), local.x),
          mix(hash(cell + vec3(0.0, 1.0, 0.0)), hash(cell + vec3(1.0, 1.0, 0.0)), local.x), local.y),
      mix(mix(hash(cell + vec3(0.0, 0.0, 1.0)), hash(cell + vec3(1.0, 0.0, 1.0)), local.x),
          mix(hash(cell + vec3(0.0, 1.0, 1.0)), hash(cell + vec3(1.0, 1.0, 1.0)), local.x), local.y),
      local.z
    );
  }

  float fbm(vec3 point) {
    float value = 0.0;
    float amplitude = 0.52;
    for (int octave = 0; octave < 5; octave++) {
      value += amplitude * noise(point);
      point = point * 2.03 + vec3(7.1, 13.7, 19.3);
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    if (uOpacity <= 0.001) discard;
    vec3 direction = normalize(vDirection);
    vec3 galacticNormal = normalize(vec3(0.18, 0.92, 0.35));
    float latitude = dot(direction, galacticNormal);
    float broadBand = exp(-abs(latitude) * 5.2);
    float brightBand = exp(-abs(latitude) * 11.5);
    float largeClouds = fbm(direction * 3.4 + vec3(2.7, 8.1, 1.3));
    float fineClouds = fbm(direction * 10.5 + vec3(11.0, 3.0, 17.0));
    float density = broadBand * smoothstep(0.28, 0.9, largeClouds * 0.82 + fineClouds * 0.42);
    float dust = brightBand * smoothstep(0.48, 0.72, fbm(direction * 16.0 + vec3(23.0, 4.0, 9.0)));
    float longitude = atan(direction.z, direction.x);
    float galacticCore = exp(-longitude * longitude * 0.55) * brightBand;

    vec3 deepSpace = vec3(0.004, 0.009, 0.027);
    vec3 blueCloud = vec3(0.12, 0.24, 0.43);
    vec3 warmCloud = vec3(0.52, 0.34, 0.24);
    vec3 cloudColor = mix(blueCloud, warmCloud, galacticCore * 0.85);
    vec3 color = deepSpace + cloudColor * density * (0.42 + brightBand * 0.8);
    color += vec3(0.48, 0.38, 0.31) * galacticCore * largeClouds * 0.34;
    color *= 1.0 - dust * 0.72;
    color += vec3(0.012, 0.02, 0.04) * broadBand;
    gl_FragColor = vec4(color * uOpacity, 1.0);
  }
`;

export function createCosmicCloud() {
  const geometry = new THREE.SphereGeometry(300, 64, 40);
  const material = new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 0.75 } },
    vertexShader,
    fragmentShader,
    side: THREE.BackSide,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const cloud = new THREE.Mesh(geometry, material);
  cloud.rotation.set(0.12, -0.68, -0.18);
  cloud.renderOrder = -20;
  return cloud;
}
