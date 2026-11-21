// Simulated Hub API & Offline Dispatch Engine for RESILINK GRID v4
// Conforms strictly to contract endpoints and offline allocation rules

import { Hospital, Pharmacy, BloodBank, Ambulance, EmergencyTrigger, AuditRecord, TriagePatient } from '../types';

// Demo coordinates: Victoria Hospital / Central Bangalore area
const DEMO_LAT = 12.902092;
const DEMO_LON = 77.504736;

export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 1. Initial Mock Facilities
let mockHospitals: Hospital[] = [
  {
    id: 'hosp-001',
    name: 'Victoria Hospital & Trauma Centre',
    lat: 12.902092,
    lon: 77.504736,
    phone: '+91-80-26701150',
    beds_free: 18,
    icu_free: 4,
    o2_cylinders: 45,
    ventilators: 6,
    as_of: new Date(Date.now() - 4 * 60000).toISOString(),
    source: 'simulated'
  },
  {
    id: 'hosp-002',
    name: 'Bowring & Lady Curzon Hospital',
    lat: 12.919592,
    lon: 77.532536,
    phone: '+91-80-25591325',
    beds_free: 9,
    icu_free: 2,
    o2_cylinders: 22,
    ventilators: 3,
    as_of: new Date(Date.now() - 11 * 60000).toISOString(),
    source: 'simulated'
  },
  {
    id: 'hosp-003',
    name: "St. John's Medical College Hospital",
    lat: 12.871792,
    lon: 77.547136,
    phone: '+91-80-22065000',
    beds_free: 24,
    icu_free: 8,
    o2_cylinders: 60,
    ventilators: 12,
    as_of: new Date(Date.now() - 25 * 60000).toISOString(), // >15m = STALE!
    source: 'cached'
  },
  {
    id: 'hosp-004',
    name: 'Manipal Hospital HAL Airport Road',
    lat: 12.895792,
    lon: 77.576836,
    phone: '+91-80-25024444',
    beds_free: 32,
    icu_free: 11,
    o2_cylinders: 85,
    ventilators: 15,
    as_of: new Date(Date.now() - 2 * 60000).toISOString(),
    source: 'live'
  }
];

let mockPharmacies: Pharmacy[] = [
  {
    id: 'pharm-001',
    name: 'Apollo Pharmacy - KR Market',
    lat: 12.900592,
    lon: 77.502936,
    phone: '+91-80-26705541',
    as_of: new Date(Date.now() - 5 * 60000).toISOString(),
    source: 'simulated',
    drugs: [
      { name: 'Adrenaline 1mg/ml Ampoule', rare: false, qty: 35, expiry: '2027-06-30', as_of: new Date().toISOString() },
      { name: 'Naloxone 0.4mg/ml', rare: true, qty: 8, expiry: '2027-01-15', as_of: new Date().toISOString() },
      { name: 'Remdesivir 100mg Vial', rare: true, qty: 12, expiry: '2026-12-05', as_of: new Date().toISOString() }, // Near-expiry!
      { name: 'Amiodarone 150mg/3ml', rare: true, qty: 4, expiry: '2026-11-25', as_of: new Date().toISOString() }, // Critical Near-expiry!
      { name: 'Atropine Sulfate 0.6mg', rare: false, qty: 50, expiry: '2028-03-31', as_of: new Date().toISOString() },
      { name: 'Heparin Sodium 5000 IU', rare: false, qty: 22, expiry: '2027-09-20', as_of: new Date().toISOString() }
    ]
  },
  {
    id: 'pharm-002',
    name: 'MedPlus - Richmond Town',
    lat: 12.905192,
    lon: 77.529436,
    phone: '+91-80-22241199',
    as_of: new Date(Date.now() - 18 * 60000).toISOString(), // STALE
    source: 'cached',
    drugs: [
      { name: 'Dopamine HCl 200mg', rare: true, qty: 6, expiry: '2027-04-10', as_of: new Date().toISOString() },
      { name: 'Sodium Bicarbonate 8.4%', rare: false, qty: 18, expiry: '2027-11-12', as_of: new Date().toISOString() },
      { name: 'Tranexamic Acid 500mg', rare: false, qty: 40, expiry: '2028-01-01', as_of: new Date().toISOString() },
      { name: 'Cefotaxime 1g Vial', rare: false, qty: 25, expiry: '2026-10-15', as_of: new Date().toISOString() } // Expired!
    ]
  },
  {
    id: 'pharm-003',
    name: 'Pradhan Mantri Jan Aushadhi Kendra',
    lat: 12.912392,
    lon: 77.512936,
    phone: '+91-80-22879900',
    as_of: new Date(Date.now() - 2 * 60000).toISOString(),
    source: 'live',
    drugs: [
      { name: 'Paracetamol IV 100ml', rare: false, qty: 120, expiry: '2028-08-30', as_of: new Date().toISOString() },
      { name: 'Furosemide 20mg/2ml', rare: false, qty: 60, expiry: '2027-10-10', as_of: new Date().toISOString() },
      { name: 'Hydrocortisone 100mg', rare: false, qty: 45, expiry: '2027-12-31', as_of: new Date().toISOString() }
    ]
  }
];

let mockBloodBanks: BloodBank[] = [
  {
    id: 'bb-001',
    name: 'Indian Red Cross Society Blood Centre',
    lat: 12.916392,
    lon: 77.518936,
    phone: '+91-80-22268435',
    as_of: new Date(Date.now() - 3 * 60000).toISOString(),
    source: 'live',
    units: {
      'A+': 18,
      'A-': 4,
      'B+': 26,
      'B-': 6,
      'AB+': 8,
      'AB-': 2,
      'O+': 34,
      'O-': 5
    }
  },
  {
    id: 'bb-002',
    name: 'Rashtrotthana Blood Centre - Chamrajpet',
    lat: 12.893392,
    lon: 77.495936,
    phone: '+91-80-26612730',
    as_of: new Date(Date.now() - 8 * 60000).toISOString(),
    source: 'simulated',
    units: {
      'A+': 12,
      'A-': 2,
      'B+': 15,
      'B-': 3,
      'AB+': 5,
      'AB-': 1,
      'O+': 20,
      'O-': 3
    }
  },
  {
    id: 'bb-003',
    name: 'Rotary Bangalore TTK Blood Centre',
    lat: 12.923392,
    lon: 77.552936,
    phone: '+91-80-25287903',
    as_of: new Date(Date.now() - 22 * 60000).toISOString(), // STALE
    source: 'cached',
    units: {
      'A+': 22,
      'A-': 5,
      'B+': 30,
      'B-': 7,
      'AB+': 12,
      'AB-': 4,
      'O+': 45,
      'O-': 9
    }
  }
];

let mockAmbulances: Ambulance[] = [
  {
    id: 'AMB-1081',
    lat: 12.905392,
    lon: 77.508936,
    status: 'FREE',
    contact: '+91-98801-08101',
    as_of: new Date().toISOString(),
    source: 'live'
  },
  {
    id: 'AMB-1082',
    lat: 12.896392,
    lon: 77.499936,
    status: 'FREE',
    contact: '+91-98801-08102',
    as_of: new Date().toISOString(),
    source: 'live'
  },
  {
    id: 'AMB-1083',
    lat: 12.910392,
    lon: 77.537936,
    status: 'BUSY',
    contact: '+91-98801-08103',
    as_of: new Date().toISOString(),
    source: 'simulated'
  }
];

// Active Emergencies & State Machine
export interface EmergencyAssignment {
  id: string;
  trigger: EmergencyTrigger;
  status: 'REQUESTED' | 'ASSIGNED' | 'EN_ROUTE' | 'ARRIVED';
  ambulance: Ambulance;
  hospital: Hospital;
  eta_minutes: number;
  route_coords: [number, number][]; // [lat, lon]
  created_at: number;
  updated_at: number;
}

let activeEmergencies: Map<string, EmergencyAssignment> = new Map();

// Triage Queue Metadata (Hub has only metadata before decryption)
let mockTriageQueue: TriagePatient[] = [
  {
    id: 'P-101',
    node_id: 'MCXN-001',
    pseudonym: 'WARD-A-BED3',
    wire_priority: 'P0',
    is_sos: true,
    arrival_time: Date.now() - 120000,
    decrypted: false
  },
  {
    id: 'P-102',
    node_id: 'MCXN-002',
    pseudonym: 'WARD-B-BED7',
    wire_priority: 'P1',
    is_sos: false,
    arrival_time: Date.now() - 95000,
    decrypted: false
  },
  {
    id: 'P-103',
    node_id: 'MCXN-003',
    pseudonym: 'TRIAGE-EXT-01',
    wire_priority: 'P2',
    is_sos: false,
    arrival_time: Date.now() - 40000,
    decrypted: false
  }
];

// Audit Hash Chain
let mockAuditChain: AuditRecord[] = [
  {
    seq: 1,
    ts: Date.now() - 600000,
    event: 'ROUTE_CHANGE',
    details: { from: 'PORT_A', to: 'PORT_B', reason: 'PDR degradation below 80%' },
    prev_hash: '0000000000000000000000000000000000000000000000000000000000000000',
    hash: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0'
  },
  {
    seq: 2,
    ts: Date.now() - 300000,
    event: 'ACCESS_REQUEST',
    details: { doctor_id: 'DR-SMITH-P256', target_node: 'MCXN-001', wording: 'access request' },
    prev_hash: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
    hash: 'b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef01a'
  }
];

/**
 * Deterministic Emergency Dispatch Algorithm (F8 Offline Engine):
 * 1. Find nearest FREE ambulance (Haversine).
 * 2. Find best Hospital: weighted score = Distance + Capability Match (ICU/O2/Blood) + Beds Available.
 * 3. Stale data penalty: if as_of > 15m, add heavy penalty.
 */
export function allocateEmergencyOffline(trigger: EmergencyTrigger): EmergencyAssignment {
  // 1. Pick nearest free ambulance
  const freeAmbulances = mockAmbulances.filter(a => a.status === 'FREE');
  if (freeAmbulances.length === 0) {
    throw new Error("No free ambulances available for dispatch");
  }

  let bestAmb = freeAmbulances[0];
  let minAmbDist = Infinity;
  for (const amb of freeAmbulances) {
    const d = haversineDistanceKm(trigger.lat, trigger.lon, amb.lat, amb.lon);
    if (d < minAmbDist) {
      minAmbDist = d;
      bestAmb = amb;
    }
  }

  // 2. Pick best hospital
  let bestHosp = mockHospitals[0];
  let bestScore = -Infinity;

  for (const h of mockHospitals) {
    const dist = haversineDistanceKm(trigger.lat, trigger.lon, h.lat, h.lon);
    let score = 100 - (dist * 5); // Base distance score

    // Capabilities matching
    if (trigger.need.includes('ICU')) score += h.icu_free * 4;
    if (trigger.need.includes('O2')) score += (h.o2_cylinders > 10 ? 20 : 5);
    score += Math.min(20, h.beds_free);

    // Stale penalty
    const ageMinutes = (Date.now() - new Date(h.as_of).getTime()) / 60000;
    if (ageMinutes > 15) {
      score -= 50; // Heavy penalty for stale data
    }

    if (score > bestScore) {
      bestScore = score;
      bestHosp = h;
    }
  }

  // Mark ambulance as busy
  bestAmb.status = 'BUSY';

  // ETA: assume average city speed 30 km/h (0.5 km/min)
  const totalDist = minAmbDist + haversineDistanceKm(trigger.lat, trigger.lon, bestHosp.lat, bestHosp.lon);
  const etaMinutes = Math.max(2, Math.round(totalDist / 0.5));

  const id = `EMERGENCY-${Date.now()}`;
  const assignment: EmergencyAssignment = {
    id,
    trigger,
    status: 'ASSIGNED',
    ambulance: { ...bestAmb },
    hospital: { ...bestHosp },
    eta_minutes: etaMinutes,
    route_coords: [
      [bestAmb.lat, bestAmb.lon],
      [trigger.lat, trigger.lon],
      [bestHosp.lat, bestHosp.lon]
    ],
    created_at: Date.now(),
    updated_at: Date.now()
  };

  activeEmergencies.set(id, assignment);

  // Append Audit Record
  appendAuditRecord('EMERGENCY_TRIGGERED', {
    emergency_id: id,
    pseudonym: trigger.pseudonym,
    ambulance_id: bestAmb.id,
    hospital_id: bestHosp.id,
    eta: etaMinutes
  });
  appendAuditRecord('AMBULANCE_ASSIGNED', { ambulance_id: bestAmb.id, eta: etaMinutes });
  appendAuditRecord('HOSPITAL_ALLOCATED', { hospital_id: bestHosp.id });

  return assignment;
}

export function appendAuditRecord(event: AuditRecord['event'], details: Record<string, any>): AuditRecord {
  const lastRecord = mockAuditChain[mockAuditChain.length - 1];
  const seq = (lastRecord ? lastRecord.seq : 0) + 1;
  const prev_hash = lastRecord ? lastRecord.hash : '0000000000000000000000000000000000000000000000000000000000000000';
  const ts = Date.now();

  // Pseudo-hash for audit chain
  const raw = `${seq}|${ts}|${event}|${JSON.stringify(details)}|${prev_hash}`;
  let hashVal = 0;
  for (let i = 0; i < raw.length; i++) {
    hashVal = ((hashVal << 5) - hashVal) + raw.charCodeAt(i);
    hashVal |= 0;
  }
  const hash = Math.abs(hashVal).toString(16).padStart(64, 'a');

  const rec: AuditRecord = {
    seq,
    ts,
    event,
    details,
    prev_hash,
    hash
  };
  mockAuditChain.push(rec);
  return rec;
}

/**
 * Audit Chain Verifier:
 * Validates HMAC hash chain continuity and identifies first tampered record.
 */
export function verifyAuditChain(chain: AuditRecord[]): { valid: boolean; first_bad_seq?: number; reason?: string } {
  for (let i = 1; i < chain.length; i++) {
    const prev = chain[i - 1];
    const curr = chain[i];
    if (curr.prev_hash !== prev.hash) {
      return {
        valid: false,
        first_bad_seq: curr.seq,
        reason: `Hash mismatch at sequence ${curr.seq}: prev_hash does not match sequence ${prev.seq} hash`
      };
    }
  }
  return { valid: true };
}

// Hub API Client
export const HubApi = {
  getHospitals: async (lat = DEMO_LAT, lon = DEMO_LON, radiusKm = 15): Promise<Hospital[]> => {
    return mockHospitals.filter(h => haversineDistanceKm(lat, lon, h.lat, h.lon) <= radiusKm);
  },

  getPharmacies: async (lat = DEMO_LAT, lon = DEMO_LON, radiusKm = 15): Promise<Pharmacy[]> => {
    return mockPharmacies.filter(p => haversineDistanceKm(lat, lon, p.lat, p.lon) <= radiusKm);
  },

  getBloodBanks: async (lat = DEMO_LAT, lon = DEMO_LON, radiusKm = 15): Promise<BloodBank[]> => {
    return mockBloodBanks.filter(b => haversineDistanceKm(lat, lon, b.lat, b.lon) <= radiusKm);
  },

  getAmbulances: async (lat = DEMO_LAT, lon = DEMO_LON, radiusKm = 15): Promise<Ambulance[]> => {
    return mockAmbulances.filter(a => haversineDistanceKm(lat, lon, a.lat, a.lon) <= radiusKm);
  },

  getTriageQueue: async (): Promise<TriagePatient[]> => {
    return [...mockTriageQueue];
  },

  triggerEmergency: async (trigger: EmergencyTrigger): Promise<EmergencyAssignment> => {
    return allocateEmergencyOffline(trigger);
  },

  getEmergency: async (id: string): Promise<EmergencyAssignment | undefined> => {
    return activeEmergencies.get(id);
  },

  getActiveEmergencies: async (): Promise<EmergencyAssignment[]> => {
    return Array.from(activeEmergencies.values());
  },

  updateEmergencyStatus: async (id: string, status: EmergencyAssignment['status']): Promise<EmergencyAssignment> => {
    const em = activeEmergencies.get(id);
    if (!em) throw new Error("Emergency not found");
    em.status = status;
    em.updated_at = Date.now();
    if (status === 'ARRIVED') {
      const amb = mockAmbulances.find(a => a.id === em.ambulance.id);
      if (amb) amb.status = 'FREE';
    }
    return em;
  },

  getAuditChain: async (): Promise<AuditRecord[]> => {
    return [...mockAuditChain];
  },

  appendAuditRecord: (event: AuditRecord['event'], details: Record<string, any>): AuditRecord => {
    return appendAuditRecord(event, details);
  },

  tamperAuditRecord: (seq: number) => {
    const rec = mockAuditChain.find(r => r.seq === seq);
    if (rec) {
      rec.details = { ...rec.details, TAMPERED: true, unauthorized_edit: "modified audit payload" };
    }
  },

  resetAuditChain: () => {
    mockAuditChain = mockAuditChain.filter(r => !r.details.TAMPERED);
  }
};
