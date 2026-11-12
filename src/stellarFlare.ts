import * as THREE from 'three';

export function createStellarSurface(color: THREE.ColorRepresentation, seed: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uSeed: { value: seed },
    },
    vertexShader: `
      varying vec3 vObjectPosition;
      varying vec3 vNormalView;
      varying vec3 vViewDirection;

      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vObjectPosition = normalize(position);
        vNormalView = normalize(normalMatrix * normal);
        vViewDirection = normalize(-viewPosition.xyz);
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uSeed;
      uniform vec3 uColor;
      varying vec3 vObjectPosition;
      varying vec3 vNormalView;
      varying vec3 vViewDirection;

      vec3 hash33(vec3 p) {
        p = vec3(
          dot(p, vec3(127.1, 311.7, 74.7)),
          dot(p, vec3(269.5, 183.3, 246.1)),
          dot(p, vec3(113.5, 271.9, 124.6))
        );
        return fract(sin(p) * 43758.5453123);
      }

      float valueNoise(vec3 p) {
        vec3 cell = floor(p);
        vec3 local = fract(p);
        vec3 curve = local * local * (3.0 - 2.0 * local);
        float n000 = hash33(cell).x;
        float n100 = hash33(cell + vec3(1.0, 0.0, 0.0)).x;
        float n010 = hash33(cell + vec3(0.0, 1.0, 0.0)).x;
        float n110 = hash33(cell + vec3(1.0, 1.0, 0.0)).x;
        float n001 = hash33(cell + vec3(0.0, 0.0, 1.0)).x;
        float n101 = hash33(cell + vec3(1.0, 0.0, 1.0)).x;
        float n011 = hash33(cell + vec3(0.0, 1.0, 1.0)).x;
        float n111 = hash33(cell + vec3(1.0, 1.0, 1.0)).x;
        float lower = mix(mix(n000, n100, curve.x), mix(n010, n110, curve.x), curve.y);
        float upper = mix(mix(n001, n101, curve.x), mix(n011, n111, curve.x), curve.y);
        return mix(lower, upper, curve.z);
      }

      float fbm(vec3 p) {
        float value = 0.0;
        float amplitude = 0.54;
        for (int octave = 0; octave < 5; octave++) {
          value += amplitude * valueNoise(p);
          p = p * 2.03 + vec3(7.1, 11.7, 5.3);
          amplitude *= 0.49;
        }
        return value;
      }

      void main() {
        vec3 sphere = vObjectPosition;
        float rotation = uTime * 0.07;
        mat2 spin = mat2(cos(rotation), -sin(rotation), sin(rotation), cos(rotation));
        sphere.xz = spin * sphere.xz;

        vec3 seedOffset = vec3(uSeed * 3.7, uSeed * 7.9, uSeed * 5.1);
        vec3 drift = vec3(uTime * 0.22, -uTime * 0.14, uTime * 0.09);
        vec3 circulation = vec3(
          sin(uTime * 0.37),
          cos(uTime * 0.29),
          sin(uTime * 0.31 + 1.7)
        ) * 0.3;
        vec3 flow = drift + circulation;
        float warpX = fbm(sphere * 3.4 + flow + seedOffset);
        float warpY = fbm(sphere * 3.4 - flow * 0.83 + seedOffset + vec3(9.2, 3.1, 5.7));
        float warpZ = fbm(sphere * 3.4 + flow * 0.61 + seedOffset + vec3(2.4, 8.3, 1.6));
        vec3 warpedSphere = normalize(sphere + (vec3(warpX, warpY, warpZ) - 0.5) * 0.26);

        float convection = fbm(warpedSphere * 10.5 + flow * 1.7 + seedOffset * 0.37);
        float granulation = fbm(warpedSphere * 22.0 - flow * 1.15 + seedOffset * 0.73);
        float broadFlow = fbm(warpedSphere * 4.8 + flow * 0.54 + seedOffset * 0.19);
        float heat = smoothstep(0.22, 0.82, convection * 0.68 + granulation * 0.24 + broadFlow * 0.18);
        float filaments = 1.0 - abs(convection * 2.0 - 1.0);

        vec3 ember = uColor * 0.2;
        vec3 body = uColor * (0.82 + broadFlow * 0.42);
        vec3 incandescent = mix(uColor, vec3(1.0), 0.62) * 1.95;
        vec3 surface = mix(ember, body, smoothstep(0.05, 0.48, heat));
        surface = mix(surface, incandescent, smoothstep(0.42, 0.93, heat) * 0.76);
        surface += mix(uColor, vec3(1.0), 0.42) * pow(filaments, 5.0) * 0.18;

        float facing = max(0.0, dot(normalize(vNormalView), normalize(vViewDirection)));
        float limb = pow(facing, 0.34);
        surface *= 0.62 + 0.52 * limb;
        surface += uColor * pow(1.0 - facing, 2.5) * 0.12;

        gl_FragColor = vec4(surface, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

export function createStellarFlare(color: THREE.ColorRepresentation) {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform vec3 uColor;

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float radius = length(p);
        float pulse = 0.96 + 0.025 * sin(uTime * 1.7) + 0.015 * sin(uTime * 3.1);
        float innerEdge = smoothstep(0.19, 0.31, radius);
        float closeGlow = exp(-max(0.0, radius - 0.22) * 12.0);
        float wideGlow = exp(-max(0.0, radius - 0.24) * 5.6);
        float outerFade = 1.0 - smoothstep(0.72, 1.0, radius);
        float alpha = (closeGlow * 0.5 + wideGlow * 0.26) * innerEdge * outerFade * pulse;
        vec3 hot = mix(uColor, vec3(1.0), 0.38);
        vec3 glow = mix(uColor * 0.72, hot, closeGlow * 0.58);
        gl_FragColor = vec4(glow * (1.15 + closeGlow * 0.72), alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });

  return new THREE.Mesh(new THREE.PlaneGeometry(8.2, 8.2), material);
}
