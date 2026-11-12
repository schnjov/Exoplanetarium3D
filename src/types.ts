export type ProvenanceStatus = 'reported' | 'derived' | 'assumed' | 'absent';

export interface Uncertainty {
  plus: number | null;
  minus: number | null;
}

export interface SourceReference {
  label: string;
  url: string | null;
}

export interface ScientificAttribute {
  value: number | null;
  unit: string;
  status: ProvenanceStatus;
  uncertainty: Uncertainty;
  source: SourceReference;
  transform: string | null;
}

export interface Planet {
  id: string;
  name: string;
  letter: string;
  discoveryYear: number | null;
  visualCategory: {
    value: string;
    status: ProvenanceStatus;
    rule: string;
  };
  visualPhase: {
    value: number;
    status: ProvenanceStatus;
    rule: string;
  };
  attributes: {
    radiusEarth: ScientificAttribute;
    massEarth: ScientificAttribute;
    periodDays: ScientificAttribute;
    semiMajorAu: ScientificAttribute;
    eccentricity: ScientificAttribute;
    inclinationDeg: ScientificAttribute;
    equilibriumTempK: ScientificAttribute;
  };
}

export interface ExoplanetSystem {
  schemaVersion: string;
  id: string;
  name: string;
  retrievedAt: string;
  source: {
    name: string;
    table: string;
    filter: string;
    tapEndpoint: string;
    query: string;
  };
  coordinates: {
    rightAscensionDeg: ScientificAttribute;
    declinationDeg: ScientificAttribute;
    distancePc: ScientificAttribute;
  };
  star: {
    name: string;
    attributes: {
      radiusSolar: ScientificAttribute;
      massSolar: ScientificAttribute;
      temperatureK: ScientificAttribute;
    };
  };
  planets: Planet[];
  notes: string[];
}

export interface CatalogEntry {
  id: string;
  name: string;
  planetCount: number;
  distancePc: number | null;
  rightAscensionDeg: number | null;
  declinationDeg: number | null;
  completeness: number;
  path: string;
}

export interface CatalogIndex {
  schemaVersion: string;
  retrievedAt: string;
  profile: string;
  systems: CatalogEntry[];
}
