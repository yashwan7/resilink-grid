// Unit Tests for F4 Priority Ranking & Triage Math
// Tests exact formula: severity * time_sensitivity / time_to_help
// Tests SOS pinning, coarse ranking vs fine ranking, and medic conflict resolution

import { describe, it, expect } from 'vitest';
import { calculateFinePriorityScore, compareTriagePatients, resolveMedicConflict, MedicBatchUpdate } from './ranking';
import { TriagePatient } from '../types';

describe('F4 Priority Ranking Formula & Triage', () => {
  it('computes exact fine priority score: (severity * time_sensitivity) / time_to_help', () => {
    // CRITICAL: sensitivity = 1.0, score = 90, ETA = 5 min
    // Expected: (90 * 1.0) / 5 = 18.00
    const scoreCritical = calculateFinePriorityScore(90, 'CRITICAL', 5);
    expect(scoreCritical).toBe(18);

    // HIGH: sensitivity = 0.7, score = 80, ETA = 4 min
    // Expected: (80 * 0.7) / 4 = 56 / 4 = 14.00
    const scoreHigh = calculateFinePriorityScore(80, 'HIGH', 4);
    expect(scoreHigh).toBe(14);

    // MED: sensitivity = 0.4, score = 50, ETA = 10 min
    // Expected: (50 * 0.4) / 10 = 20 / 10 = 2.00
    const scoreMed = calculateFinePriorityScore(50, 'MED', 10);
    expect(scoreMed).toBe(2);

    // LOW: sensitivity = 0.2, score = 20, ETA = 20 min
    // Expected: (20 * 0.2) / 20 = 4 / 20 = 0.20
    const scoreLow = calculateFinePriorityScore(20, 'LOW', 20);
    expect(scoreLow).toBe(0.2);
  });

  it('clamps ETA to minimum 1.0 minute to prevent division by zero', () => {
    const scoreZeroEta = calculateFinePriorityScore(90, 'CRITICAL', 0);
    expect(scoreZeroEta).toBe(90);
  });

  it('pins SOS patient to top regardless of score', () => {
    const patientA: TriagePatient = {
      id: 'p-1',
      node_id: 'n-1',
      pseudonym: 'BED-1',
      wire_priority: 'P1',
      is_sos: false,
      arrival_time: 1000,
      decrypted: true,
      fine_priority_score: 95
    };

    const patientB: TriagePatient = {
      id: 'p-2',
      node_id: 'n-2',
      pseudonym: 'BED-2',
      wire_priority: 'P2',
      is_sos: true, // SOS!
      arrival_time: 2000,
      decrypted: true,
      fine_priority_score: 10
    };

    const list = [patientA, patientB];
    list.sort(compareTriagePatients);

    expect(list[0].id).toBe('p-2'); // SOS pinned top!
  });

  it('sorts decrypted patients by fine priority score descending', () => {
    const p1: TriagePatient = {
      id: 'p-1',
      node_id: 'n-1',
      pseudonym: 'PATIENT-1',
      wire_priority: 'P0',
      is_sos: false,
      arrival_time: 1000,
      decrypted: true,
      fine_priority_score: 12.5
    };

    const p2: TriagePatient = {
      id: 'p-2',
      node_id: 'n-2',
      pseudonym: 'PATIENT-2',
      wire_priority: 'P0',
      is_sos: false,
      arrival_time: 1500,
      decrypted: true,
      fine_priority_score: 28.0
    };

    const list = [p1, p2];
    list.sort(compareTriagePatients);

    expect(list[0].id).toBe('p-2'); // higher fine score first
  });

  it('resolves concurrent medic triage conflicts by escalating to higher priority level', () => {
    const update1: MedicBatchUpdate = {
      medic_id: 'DR-A',
      patient_id: 'p-1',
      timestamp: 1000,
      action: 'TRIAGE_UPGRADE',
      value: 'HIGH',
      version: 1
    };

    const update2: MedicBatchUpdate = {
      medic_id: 'DR-B',
      patient_id: 'p-1',
      timestamp: 1002,
      action: 'TRIAGE_UPGRADE',
      value: 'CRITICAL',
      version: 1
    };

    const conflict = resolveMedicConflict(update1, update2);
    expect(conflict.has_conflict).toBe(true);
    expect(conflict.resolved_val).toBe('CRITICAL'); // Escalated to CRITICAL
    expect(conflict.resolution_type).toBe('ESCALATE_CRITICAL');
  });
});
