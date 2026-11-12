export type ProvenanceStatus = 'reported' | 'derived' | 'assumed' | 'absent';
export type OrbitDisplayMode = 'complete' | 'trail' | 'hidden';

export interface MapNavigationContext {
  yaw: number;
  pitch: number;
  zoom: number;
}

export interface SystemEntryTransition extends MapNavigationContext {
  entryId: string;
  token: number;
}

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

export interface TextAttribute {
  value: string | null;
  status: ProvenanceStatus;
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
      spectralType: TextAttribute;
      luminosityClass: TextAttribute;
      radiusSolar: ScientificAttribute;
      massSolar: ScientificAttribute;
      temperatureK: ScientificAttribute;
      luminosityLogSolar: ScientificAttribute;
      surfaceGravityLogCgs: ScientificAttribute;
      ageGyr: ScientificAttribute;
      densityGcm3: ScientificAttribute;
      metallicityDex: ScientificAttribute;
      metallicityRatio: TextAttribute;
      rotationalVelocityKms: ScientificAttribute;
      rotationPeriodDays: ScientificAttribute;
      radialVelocityKms: ScientificAttribute;
    };
    visual: {
      colorHex: TextAttribute;
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
  starColorHex: string;
  starColorStatus: 'derived' | 'assumed';
  completeness: number;
  path: string;
}

export interface CatalogIndex {
  schemaVersion: string;
  retrievedAt: string;
  profile: string;
  systems: CatalogEntry[];
}
