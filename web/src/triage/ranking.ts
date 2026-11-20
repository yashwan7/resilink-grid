// F4 Priority Ranking & Triage Math
// Exact Formula: severity * time_sensitivity / time_to_help
// Conflict resolution engine for concurrent medics

import { TriagePatient, PriorityClass, RiskClass } from '../types';

/**
 * Time sensitivity multiplier per risk class:
 * CRITICAL: 1.0 (immediate life threat)
 * HIGH: 0.7 (urgent)
 * MED: 0.4 (watch closely)
 * LOW: 0.2 (stable)
 */
export function getTimeSensitivity(riskClass: RiskClass): number {
  switch (riskClass) {
    case 'CRITICAL': return 1.0;
    case 'HIGH': return 0.7;
    case 'MED': return 0.4;
    case 'LOW': return 0.2;
    default: return 0.2;
  }
}

/**
 * Exact Doctor Client Ranking Formula:
 * Fine Priority Score = (Severity * Time Sensitivity) / Time to Help (ETA minutes)
 * 
 * Clamped with minimum ETA of 1.0 min to avoid division by zero.
 */
export function calculateFinePriorityScore(
  severityScore: number, // 0 - 100
  riskClass: RiskClass,
  etaMinutes: number = 10
): number {
  const timeSensitivity = getTimeSensitivity(riskClass);
  const clampedEta = Math.max(1.0, etaMinutes);
  const rawScore = (severityScore * timeSensitivity) / clampedEta;
  return Math.round(rawScore * 100) / 100;
}

/**
 * Triage Sort Comparator:
 * 1. SOS flag pinned to top
 * 2. Fine priority score (descending) if decrypted
 * 3. Hub coarse priority (P0 > P1 > P2) if not decrypted
 * 4. Arrival time (FIFO tie breaker)
 */
export function compareTriagePatients(a: TriagePatient, b: TriagePatient): number {
  // 1. SOS is always pinned to the top
  if (a.is_sos && !b.is_sos) return -1;
  if (!a.is_sos && b.is_sos) return 1;

  // 2. If both decrypted, sort by fine priority score descending
  if (a.decrypted && b.decrypted && a.fine_priority_score !== undefined && b.fine_priority_score !== undefined) {
    if (b.fine_priority_score !== a.fine_priority_score) {
      return b.fine_priority_score - a.fine_priority_score;
    }
  }

  // 3. Coarse wire priority comparison (P0 > P1 > P2)
  const priorityRank: Record<PriorityClass, number> = { 'P0': 3, 'P1': 2, 'P2': 1 };
  const rankA = priorityRank[a.wire_priority] || 0;
  const rankB = priorityRank[b.wire_priority] || 0;
  if (rankA !== rankB) {
    return rankB - rankA;
  }

  // 4. Arrival time (earlier arrival gets priority)
  return a.arrival_time - b.arrival_time;
}

/**
 * Conflict Resolution Engine:
 * Detects conflicts when two medics update patient status or notes simultaneously.
 */
export interface MedicBatchUpdate {
  medic_id: string;
  patient_id: string;
  timestamp: number;
  action: 'TRIAGE_UPGRADE' | 'NOTE_APPEND' | 'STATUS_CHANGE';
  value: any;
  version: number;
}

export interface ConflictResult {
  has_conflict: boolean;
  field: string;
  current_val: any;
  incoming_val: any;
  resolved_val: any;
  resolution_type: 'TAKE_LATEST' | 'MERGE_NOTES' | 'ESCALATE_CRITICAL';
}

export function resolveMedicConflict(
  current: MedicBatchUpdate,
  incoming: MedicBatchUpdate
): ConflictResult {
  if (current.patient_id !== incoming.patient_id) {
    return {
      has_conflict: false,
      field: '',
      current_val: current.value,
      incoming_val: incoming.value,
      resolved_val: incoming.value,
      resolution_type: 'TAKE_LATEST'
    };
  }

  // If both medics changed status/triage level concurrently
  if (current.action === incoming.action && current.value !== incoming.value) {
    // Escalate to higher priority if triage grade differs
    if (current.action === 'TRIAGE_UPGRADE' || current.action === 'STATUS_CHANGE') {
      const priorityOrder: Record<string, number> = { 'CRITICAL': 4, 'HIGH': 3, 'MED': 2, 'LOW': 1 };
      const orderCurrent = priorityOrder[String(current.value)] || 0;
      const orderIncoming = priorityOrder[String(incoming.value)] || 0;
      const higherVal = orderIncoming >= orderCurrent ? incoming.value : current.value;

      return {
        has_conflict: true,
        field: current.action,
        current_val: current.value,
        incoming_val: incoming.value,
        resolved_val: higherVal,
        resolution_type: 'ESCALATE_CRITICAL'
      };
    }

    // Merge notes if text note append
    if (current.action === 'NOTE_APPEND') {
      return {
        has_conflict: true,
        field: 'notes',
        current_val: current.value,
        incoming_val: incoming.value,
        resolved_val: `[Dr. ${current.medic_id}]: ${current.value}\n[Dr. ${incoming.medic_id}]: ${incoming.value}`,
        resolution_type: 'MERGE_NOTES'
      };
    }
  }

  // Default take latest timestamp
  const latestVal = incoming.timestamp >= current.timestamp ? incoming.value : current.value;
  return {
    has_conflict: false,
    field: current.action,
    current_val: current.value,
    incoming_val: incoming.value,
    resolved_val: latestVal,
    resolution_type: 'TAKE_LATEST'
  };
}
