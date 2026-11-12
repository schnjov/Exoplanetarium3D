import * as THREE from 'three';

export function createStellarFlare() {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 } },
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
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        float angle = atan(p.y + 0.00001, p.x + 0.00001);
        float flicker = 0.92 + 0.05 * sin(uTime * 2.1) + 0.03 * sin(uTime * 4.7);
        float core = exp(-r * r * 155.0);
        float corona = exp(-r * 8.0) * (0.82 + 0.18 * sin(17.0 * angle + r * 26.0 - uTime));
        float arms = pow(abs(cos(2.0 * (angle - 0.12))), 28.0) * exp(-r * 5.0);
        float diagonals = pow(abs(sin(2.0 * (angle - 0.12))), 36.0) * exp(-r * 9.0);
        float fade = 1.0 - smoothstep(0.66, 1.0, r);
        vec3 light = mix(vec3(1.0, 0.23, 0.035), vec3(1.0, 0.88, 0.62), clamp(core + corona * 0.6, 0.0, 1.0));
        float intensity = (core + corona * 0.85 + arms * 0.55 + diagonals * 0.20) * fade * flicker;
        gl_FragColor = vec4(light * (1.3 + 1.5 * core), clamp(intensity, 0.0, 1.0));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(11, 11), material);
}
