import * as THREE from 'three';

export type PlanetTextureCategory = 'rocoso' | 'sub-neptuno' | 'gigante-gaseoso' | 'desconocido';
export type PlanetTextureSet = Record<PlanetTextureCategory, THREE.DataTexture>;

type Rgb = readonly [number, number, number];
type MonochromePalette = readonly [Rgb, Rgb, Rgb, Rgb];

const WIDTH = 256;
const HEIGHT = 128;

// Estas son paletas neutrales de la clasificación visual. Los futuros pintados
// por composición, temperatura o densidad podrán reemplazarlas sin cambiar el patrón.
export const PLANET_NEUTRAL_PALETTES: Record<PlanetTextureCategory, MonochromePalette> = {
  rocoso: [
    [48, 30, 26],
    [91, 53, 42],
    [145, 91, 65],
    [205, 157, 116],
  ],
  'sub-neptuno': [
    [17, 49, 61],
    [30, 83, 99],
    [62, 129, 143],
    [132, 188, 194],
  ],
  'gigante-gaseoso': [
    [54, 39, 27],
    [101, 73, 45],
    [163, 121, 73],
    [218, 185, 135],
  ],
  desconocido: [
    [31, 39, 48],
    [55, 68, 80],
    [91, 108, 121],
    [145, 159, 169],
  ],
};

const CATEGORY_PATTERN: Record<PlanetTextureCategory, { seed: number; scale: number }> = {
  rocoso: { seed: 11.3, scale: 2.15 },
  'sub-neptuno': { seed: 29.7, scale: 1.85 },
  'gigante-gaseoso': { seed: 47.1, scale: 1.65 },
  desconocido: { seed: 71.9, scale: 2.0 },
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function smooth(value: number) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, amount: number) {
  return a + (b - a) * amount;
}

function hash3(x: number, y: number, z: number, seed: number) {
  const value = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 19.19) * 43758.5453;
  return value - Math.floor(value);
}

function valueNoise(x: number, y: number, z: number, seed: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = smooth(x - ix);
  const fy = smooth(y - iy);
  const fz = smooth(z - iz);

  const x00 = lerp(hash3(ix, iy, iz, seed), hash3(ix + 1, iy, iz, seed), fx);
  const x10 = lerp(hash3(ix, iy + 1, iz, seed), hash3(ix + 1, iy + 1, iz, seed), fx);
  const x01 = lerp(hash3(ix, iy, iz + 1, seed), hash3(ix + 1, iy, iz + 1, seed), fx);
  const x11 = lerp(hash3(ix, iy + 1, iz + 1, seed), hash3(ix + 1, iy + 1, iz + 1, seed), fx);
  return lerp(lerp(x00, x10, fy), lerp(x01, x11, fy), fz);
}

function fbm(x: number, y: number, z: number, seed: number) {
  let value = 0;
  let amplitude = 0.54;
  let frequency = 1;
  let normalization = 0;

  for (let octave = 0; octave < 5; octave += 1) {
    value += valueNoise(x * frequency, y * frequency, z * frequency, seed + octave * 13.7) * amplitude;
    normalization += amplitude;
    amplitude *= 0.5;
    frequency *= 2.03;
  }

  return value / normalization;
}

function surfaceValue(x: number, y: number, z: number, seed: number, scale: number) {
  const broad = fbm(x * scale + seed, y * scale - seed * 0.37, z * scale + seed * 0.19, seed);
  const detail = fbm(x * scale * 3.2, y * scale * 3.2, z * scale * 3.2, seed + 101.3);
  return smooth((broad * 0.82 + detail * 0.18 - 0.16) / 0.68);
}

function paletteColor(palette: MonochromePalette, value: number): Rgb {
  const position = clamp01(value) * (palette.length - 1);
  const index = Math.min(palette.length - 2, Math.floor(position));
  const amount = smooth(position - index);
  const from = palette[index];
  const to = palette[index + 1];
  return [
    lerp(from[0], to[0], amount),
    lerp(from[1], to[1], amount),
    lerp(from[2], to[2], amount),
  ];
}

function createTexture(category: PlanetTextureCategory, anisotropy: number) {
  const pixels = new Uint8Array(WIDTH * HEIGHT * 4);
  const palette = PLANET_NEUTRAL_PALETTES[category];
  const pattern = CATEGORY_PATTERN[category];

  for (let row = 0; row < HEIGHT; row += 1) {
    const v = (row + 0.5) / HEIGHT;
    const phi = v * Math.PI;
    const sinPhi = Math.sin(phi);

    for (let column = 0; column < WIDTH; column += 1) {
      const u = (column + 0.5) / WIDTH;
      const theta = u * Math.PI * 2;
      const x = sinPhi * Math.cos(theta);
      const y = Math.cos(phi);
      const z = sinPhi * Math.sin(theta);
      const color = paletteColor(
        palette,
        surfaceValue(x, y, z, pattern.seed, pattern.scale),
      );
      const offset = (row * WIDTH + column) * 4;
      pixels[offset] = Math.round(color[0]);
      pixels[offset + 1] = Math.round(color[1]);
      pixels[offset + 2] = Math.round(color[2]);
      pixels[offset + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(pixels, WIDTH, HEIGHT, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.name = `planet-neutral-${category}`;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = anisotropy;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

export function createPlanetTextureSet(anisotropy: number): PlanetTextureSet {
  return {
    rocoso: createTexture('rocoso', anisotropy),
    'sub-neptuno': createTexture('sub-neptuno', anisotropy),
    'gigante-gaseoso': createTexture('gigante-gaseoso', anisotropy),
    desconocido: createTexture('desconocido', anisotropy),
  };
}
