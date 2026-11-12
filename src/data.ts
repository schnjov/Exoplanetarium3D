import type { CatalogIndex, ExoplanetSystem } from './types';

async function readJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`No fue posible cargar ${path} (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export function loadCatalog(): Promise<CatalogIndex> {
  return readJson<CatalogIndex>('/data/catalog-index.json');
}

export function loadSystem(path: string): Promise<ExoplanetSystem> {
  return readJson<ExoplanetSystem>(path);
}
