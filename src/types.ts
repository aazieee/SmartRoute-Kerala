export type TrafficLevel = 'low' | 'medium' | 'high';
export type ScenarioMode = 'normal' | 'heavy-traffic' | 'rain' | 'emergency';

export interface RouteSegment {
  coordinates: [number, number][];
  traffic: TrafficLevel;
}

export interface Route {
  id: string;
  name: string;
  type: 'fastest' | 'least-traffic' | 'safest';
  time: string;
  distance: string;
  traffic: TrafficLevel;
  predictedTraffic: TrafficLevel;
  riskLevel: 'low' | 'medium' | 'high';
  safetyScore: number;
  color: string;
  path: string;
  coordinates: [number, number][];
  segments?: RouteSegment[];
  description?: string;
  alerts?: string[];
}

export interface Location {
  name: string;
  lat: number;
  lng: number;
}

export interface LiveConditions {
  weather: string;
  trafficDensity: number;
  roadRisk: 'low' | 'moderate' | 'high' | 'critical';
}

export interface MapLayers {
  traffic: boolean;
  safety: boolean;
}

export type AppSection = 'home' | 'planner' | 'live' | 'ai' | 'layers' | 'settings';
