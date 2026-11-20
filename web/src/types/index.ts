// Core Medical and Operational Types for RESILINK GRID v4
// Shared Contract Definitions

export type RiskClass = 'LOW' | 'MED' | 'HIGH' | 'CRITICAL';
export type PriorityClass = 'P0' | 'P1' | 'P2'; // Clear wire priority

export interface VitalsSample {
  ts: number;          // Epoch milliseconds
  hr: number;          // Heart Rate (bpm)
  spo2: number;        // SpO2 percentage (70-100)
  temp: number;        // Body temperature in Celsius (35-42)
  resp?: number;       // Respiration rate (bpm)
  motion?: number;     // Accelerometer/motion magnitude
  sim: boolean;        // Honest simulation flag
}

export interface RiskScore {
  score: number;             // 0 - 100
  class: RiskClass;          // LOW | MED | HIGH | CRITICAL
  top_factors: string[];     // e.g. ["Severe Hypoxia (84%)", "Tachycardia (138 bpm)", "High Fever (39.4°C)"]
  model_ver: string;         // e.g. "tinyml-phys-v4.2-int8"
  rule_disagreement?: boolean; // On-device rule vs ML disagreement flag
}

export interface KeyframeRecord {
  keyframe_id: string;
  seq: number;
  ts: number;
  baseline: VitalsSample;
  risk: RiskScore;
}

export interface DeltaRecord {
  seq: number;
  keyframe_id: string;
  ts_delta: number;   // ms offset from keyframe
  d_hr: number;
  d_spo2: number;
  d_temp: number;
  d_resp?: number;
  risk_score: number;
  risk_class: RiskClass;
}

export interface WireHeader {
  node_id: string;     // 4 bytes or string
  seq: number;
  epoch: number;
  priority: PriorityClass; // P0, P1, P2 in clear
  counter: number;
  ts: number;
}

export interface WireEnvelope {
  header: WireHeader;
  header_bytes_hex: string;     // 26-byte AAD header
  wrapped_keys: {
    recipient_id: string;       // Doctor ID or Patient ID
    ephemeral_pub_hex: string;  // 33-byte compressed or 65-byte uncompressed public key
    wrapped_dek_hex: string;    // Wrapped AES-256 DEK
  }[];
  ciphertext_hex: string;       // AES-256-GCM encrypted payload
  tag_hex: string;              // 16-byte GCM authentication tag
  signature_hex: string;        // 64-byte raw ECDSA signature (r || s)
  sender_pub_compressed_hex: string; // 33-byte compressed ECDSA public key
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

export interface Hospital {
  id: string;
  name: string;
  lat: number;
  lon: number;
  phone: string;
  beds_free: number;
  icu_free: number;
  o2_cylinders: number;
  ventilators: number;
  as_of: string;
  source: 'live' | 'cached' | 'simulated';
}

export interface DrugItem {
  name: string;
  rare: boolean;
  qty: number;
  expiry: string; // YYYY-MM-DD
  as_of: string;
}

export interface Pharmacy {
  id: string;
  name: string;
  lat: number;
  lon: number;
  phone: string;
  drugs: DrugItem[];
  as_of: string;
  source: 'live' | 'cached' | 'simulated';
}

export interface BloodBank {
  id: string;
  name: string;
  lat: number;
  lon: number;
  phone: string;
  units: {
    'A+'?: number;
    'A-'?: number;
    'B+'?: number;
    'B-'?: number;
    'AB+'?: number;
    'AB-'?: number;
    'O+'?: number;
    'O-'?: number;
    [key: string]: number | undefined;
  };
  as_of: string;
  source: 'live' | 'cached' | 'simulated';
}

export interface Ambulance {
  id: string;
  lat: number;
  lon: number;
  status: 'FREE' | 'BUSY';
  contact: string;
  as_of: string;
  source: 'live' | 'cached' | 'simulated';
}

export interface AuditRecord {
  seq: number;
  ts: number;
  event: 'EMERGENCY_TRIGGERED' | 'AMBULANCE_ASSIGNED' | 'HOSPITAL_ALLOCATED' | 'SNAPSHOT_REQUESTED' | 'CONSULT_STARTED' | 'ALERT_ACKED' | 'GROOT_QUERY' | 'ROUTE_CHANGE' | 'ACCESS_REQUEST';
  details: Record<string, any>;
  prev_hash: string;
  hash: string;
}

export interface TriagePatient {
  id: string;
  node_id: string;
  pseudonym: string;
  wire_priority: PriorityClass;
  is_sos: boolean;
  arrival_time: number;
  // Post-decryption fields:
  decrypted: boolean;
  vitals?: VitalsSample;
  risk?: RiskScore;
  eta_minutes?: number; // Time to help
  fine_priority_score?: number; // Computed score
  assigned_ambulance_id?: string;
  allocated_hospital_id?: string;
  last_snapshot_requested_at?: number;
  snapshot_history?: VitalsSample[];
}
