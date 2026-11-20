// Patient App Types for RESILINK GRID v4

export type RiskClass = 'LOW' | 'MED' | 'HIGH' | 'CRITICAL';

export interface VitalsSample {
  ts: number;
  hr: number;
  spo2: number;
  temp: number;
  resp?: number;
  motion?: number;
  sim: boolean;
}

export interface RiskScore {
  score: number;
  class: RiskClass;
  top_factors: string[];
  model_ver: string;
}

export interface EmergencyTrigger {
  pseudonym: string;
  lat: number;
  lon: number;
  ts: number;
  class: 'P0';
  need: ('ICU' | 'O2' | 'BLOOD' | 'GENERAL')[];
  signature_hex?: string;
}

export interface EmergencyStatus {
  id: string;
  status: 'REQUESTED' | 'ASSIGNED' | 'EN_ROUTE' | 'ARRIVED';
  ambulanceId: string;
  ambulanceContact: string;
  hospitalName: string;
  etaMinutes: number;
}
