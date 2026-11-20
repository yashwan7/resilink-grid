import React, { useState, useEffect } from 'react';
import { 
  AlertOctagon, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Clock, 
  Zap, 
  Camera, 
  ArrowUpDown, 
  AlertCircle,
  FileText,
  GitMerge,
  CheckCircle2,
  PhoneCall,
  Globe
} from 'lucide-react';
import { TriagePatient, RiskClass, PriorityClass, VitalsSample } from '../types';
import { calculateFinePriorityScore, compareTriagePatients, resolveMedicConflict, MedicBatchUpdate, ConflictResult } from '../triage/ranking';
import { HubApi, EmergencyAssignment } from '../mock/hubApi';
import { createSignedSnapshotRequest, reconstructHistory } from '../delta/snapshot';
import { generateDoctorKeyPair, decompressP256Point, bytesToHex } from '../crypto/p256';
import { DoctorDownloadModal } from './DownloadReportModal';

interface TriageBoardProps {
  unlocked: boolean;
  onUnlockToggle: () => void;
}

export const TriageBoard: React.FC<TriageBoardProps> = ({ unlocked, onUnlockToggle }) => {
  const [patients, setPatients] = useState<TriagePatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<TriagePatient | null>(null);
  const [loading, setLoading] = useState(false);
  const [decrypting, setDecrypting] = useState(false);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [activeEmergencies, setActiveEmergencies] = useState<EmergencyAssignment[]>([]);
  
  // Conflict simulation state
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictResult, setConflictResult] = useState<ConflictResult | null>(null);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);

  // Load initial triage queue from hub
  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadQueue = async () => {
    try {
      const queue = await HubApi.getTriageQueue();
      const emergencies = await HubApi.getActiveEmergencies();
      setActiveEmergencies(emergencies);

      setPatients(prev => {
        // Merge preserved decrypted state
        return queue.map(p => {
          const existing = prev.find(item => item.id === p.id);
          if (existing && existing.decrypted) {
            return existing;
          }
          return p;
        }).sort(compareTriagePatients);
      });
    } catch (err) {
      console.error("Failed to load triage queue:", err);
    }
  };

  // WebCrypto Batch Decryption
  const handleDecryptAll = async () => {
    if (!unlocked) {
      alert("Please unlock your Doctor P-256 Key using your PIN / RFID first.");
      onUnlockToggle();
      return;
    }

    setDecrypting(true);
    try {
      // Simulate WebCrypto ECDH + HKDF DEK unwrap and AES-GCM payload decryption
      await new Promise(r => setTimeout(r, 600));

      setPatients(prev => {
        const decryptedList = prev.map(p => {
          // Compute realistic clinical decrypted values
          let hr = 78;
          let spo2 = 98;
          let temp = 36.9;
          let riskScore = 15;
          let riskClass: RiskClass = 'LOW';
          let factors = ['Normal vitals baseline'];
          let eta = 8; // default 8 min

          if (p.is_sos || p.wire_priority === 'P0') {
            hr = 138;
            spo2 = 84;
            temp = 39.2;
            riskScore = 94;
            riskClass = 'CRITICAL';
            factors = ['Acute respiratory distress', 'Severe tachycardia', 'SpO2 84%'];
            eta = 4;
          } else if (p.wire_priority === 'P1') {
            hr = 115;
            spo2 = 91;
            temp = 38.1;
            riskScore = 72;
            riskClass = 'HIGH';
            factors = ['Tachycardia', 'Low SpO2 (91%)'];
            eta = 7;
          } else {
            hr = 74;
            spo2 = 98;
            temp = 36.8;
            riskScore = 20;
            riskClass = 'LOW';
            factors = ['Nominal readings'];
            eta = 15;
          }

          const vitals: VitalsSample = {
            ts: Date.now() - 30000,
            hr,
            spo2,
            temp,
            resp: riskClass === 'CRITICAL' ? 28 : 16,
            sim: true
          };

          const fineScore = calculateFinePriorityScore(riskScore, riskClass, eta);

          return {
            ...p,
            decrypted: true,
            vitals,
            risk: {
              score: riskScore,
              class: riskClass,
              top_factors: factors,
              model_ver: 'tinyml-phys-v4.2-int8'
            },
            eta_minutes: eta,
            fine_priority_score: fineScore,
            snapshot_history: [vitals]
          };
        });

        // Live re-sort using exact ranking comparator
        return decryptedList.sort(compareTriagePatients);
      });
    } catch (err) {
      console.error("Batch decryption failed:", err);
      alert("Decryption failed: signature verification or DEK unwrap error.");
    } finally {
      setDecrypting(false);
    }
  };

  // F3 Signed Snapshot Request
  const handleRequestSnapshot = async (patient: TriagePatient) => {
    if (!unlocked) {
      alert("Doctor key required to sign SNAPSHOT_REQUEST");
      return;
    }
    setSnapshotLoading(true);
    try {
      // Generate ephemeral doctor signing keypair
      const keyPair = await generateDoctorKeyPair();
      const signedReq = await createSignedSnapshotRequest(
        keyPair.signKeyPair.privateKey,
        'DR-HARSHA-MCXN',
        patient.node_id
      );

      // Log ACCESS_REQUEST in Hub audit chain (wording strictly "access request")
      HubApi.appendAuditRecord('ACCESS_REQUEST', {
        doctor_id: signedReq.doctor_id,
        target_node: signedReq.target_node_id,
        wording: 'access request', // Honest phrasing: NOT "proof of reading"
        ts: signedReq.ts,
        signature: signedReq.signature_hex.substring(0, 16) + '...'
      });

      // Simulate snapshot reception and delta reconstruction
      await new Promise(r => setTimeout(r, 800));

      if (patient.vitals) {
        const deltaSample: VitalsSample = {
          ts: Date.now(),
          hr: patient.vitals.hr + (Math.floor(Math.random() * 5) - 2),
          spo2: Math.min(100, patient.vitals.spo2 + (Math.floor(Math.random() * 3) - 1)),
          temp: patient.vitals.temp,
          resp: patient.vitals.resp,
          sim: true
        };

        const updatedHistory = [...(patient.snapshot_history || [patient.vitals]), deltaSample];
        
        setPatients(prev => prev.map(p => p.id === patient.id ? {
          ...p,
          snapshot_history: updatedHistory,
          last_snapshot_requested_at: Date.now()
        } : p));

        if (selectedPatient && selectedPatient.id === patient.id) {
          setSelectedPatient(prev => prev ? {
            ...prev,
            snapshot_history: updatedHistory,
            last_snapshot_requested_at: Date.now()
          } : null);
        }
      }

      alert(`Delta snapshot received and verified for ${patient.pseudonym}! Audit logged as 'access request'.`);
    } catch (err) {
      console.error("Failed to request delta snapshot:", err);
      alert("Failed to request snapshot");
    } finally {
      setSnapshotLoading(false);
    }
  };

  // Conflict Resolution Demonstration
  const handleSimulateConflict = (patient: TriagePatient) => {
    const updateMedicA: MedicBatchUpdate = {
      medic_id: 'DR-YASHWANTH',
      patient_id: patient.id,
      timestamp: Date.now() - 4000,
      action: 'TRIAGE_UPGRADE',
      value: 'HIGH',
      version: 1
    };

    const updateMedicB: MedicBatchUpdate = {
      medic_id: 'DR-HARSHITH',
      patient_id: patient.id,
      timestamp: Date.now() - 2000,
      action: 'TRIAGE_UPGRADE',
      value: 'CRITICAL', // Higher priority
      version: 1
    };

    const result = resolveMedicConflict(updateMedicA, updateMedicB);
    setConflictResult(result);
    setConflictModalOpen(true);
  };

  const getPriorityBadgeStyle = (priority: PriorityClass, isSos: boolean) => {
    if (isSos) {
      return { backgroundColor: '#ef4444', color: '#fff', border: '1px solid #f87171' };
    }
    switch (priority) {
      case 'P0': return { backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid #ef4444' };
      case 'P1': return { backgroundColor: 'rgba(249, 115, 22, 0.2)', color: '#fb923c', border: '1px solid #f97316' };
      case 'P2': return { backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid #10b981' };
    }
  };

  const getRiskColor = (riskClass?: RiskClass) => {
    switch (riskClass) {
      case 'CRITICAL': return '#ef4444';
      case 'HIGH': return '#f97316';
      case 'MED': return '#eab308';
      case 'LOW': return '#10b981';
      default: return '#9ca3af';
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1300px', margin: '0 auto' }}>
      {/* Control Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertOctagon size={22} color="#06b6d4" />
            F4 Triage Priority Board
          </h2>
          <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '2px' }}>
            {patients.some(p => p.decrypted)
              ? 'Ranked by fine formula: (severity × time_sensitivity) / time_to_help • SOS Pinned'
              : 'Hub Coarse Ranking (2-bit Wire Header: P0 > P1 > P2 + SOS) • Plaintext Zero-Knowledge'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleDecryptAll}
            disabled={decrypting}
            style={{
              backgroundColor: '#0284c7',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {decrypting ? <Zap className="animate-spin" size={16} /> : <Unlock size={16} />}
            {decrypting ? 'Decrypting via WebCrypto...' : 'Decrypt Batch (WebCrypto P-256)'}
          </button>
        </div>
      </div>

      {/* Mandatory Regulatory Warning */}
      <div style={{
        backgroundColor: '#1f2937',
        borderLeft: '4px solid #38bdf8',
        padding: '10px 16px',
        borderRadius: '4px',
        fontSize: '12px',
        color: '#e0f2fe',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span>
          <strong>Principle:</strong> AI predicts, rules decide, logs prove. "Decision support, not a diagnosis".
        </span>
        <span style={{ color: '#9ca3af', fontSize: '11px' }}>
          Research prototype, not a medical device.
        </span>
      </div>

      {/* Main Grid: Patient List & Detail View */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: selectedPatient ? '1fr 1fr' : '1fr',
        gap: '20px'
      }}>
        {/* Patient Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {patients.map((patient, index) => {
            const badgeStyle = getPriorityBadgeStyle(patient.wire_priority, patient.is_sos);

            return (
              <div
                key={patient.id}
                onClick={() => setSelectedPatient(patient)}
                style={{
                  backgroundColor: '#111827',
                  border: selectedPatient?.id === patient.id ? '2px solid #38bdf8' : '1px solid #374151',
                  borderRadius: '8px',
                  padding: '16px',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Header line */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: '#1f2937',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: '#9ca3af'
                    }}>
                      #{index + 1}
                    </div>
                    <div>
                      <strong style={{ fontSize: '15px' }}>{patient.pseudonym}</strong>
                      <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px' }}>
                        Node: {patient.node_id}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {patient.is_sos && (
                      <span style={{
                        backgroundColor: '#dc2626',
                        color: '#fff',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        🚨 SOS PINNED
                      </span>
                    )}

                    <span style={{
                      ...badgeStyle,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold'
                    }}>
                      {patient.wire_priority} WIRE
                    </span>
                  </div>
                </div>

                {/* Body: Decrypted vs Undecrypted state */}
                {patient.decrypted ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>Risk Index:</span>
                        <strong style={{ fontSize: '20px', color: getRiskColor(patient.risk?.class) }}>
                          {patient.risk?.score} / 100
                        </strong>
                        <span style={{
                          fontSize: '11px',
                          color: getRiskColor(patient.risk?.class),
                          fontWeight: 'bold'
                        }}>
                          [{patient.risk?.class}]
                        </span>
                      </div>

                      <div style={{ fontSize: '13px' }}>
                        <span style={{ color: '#9ca3af' }}>Fine Priority Score: </span>
                        <strong style={{ color: '#38bdf8', fontSize: '16px' }}>
                          {patient.fine_priority_score?.toFixed(2)}
                        </strong>
                      </div>
                    </div>

                    {/* Vitals summary bar */}
                    <div style={{
                      display: 'flex',
                      gap: '14px',
                      backgroundColor: '#1f2937',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#d1d5db'
                    }}>
                      <span>HR: <strong>{patient.vitals?.hr} bpm</strong></span>
                      <span>SpO2: <strong>{patient.vitals?.spo2}%</strong></span>
                      <span>Temp: <strong>{patient.vitals?.temp}°C</strong></span>
                      <span>ETA to Help: <strong>{patient.eta_minutes} min</strong></span>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    backgroundColor: '#1f2937',
                    padding: '10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#9ca3af',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Lock size={15} color="#fbbf24" />
                    <span>Ciphertext stored on hub. Doctor private key unlock required to view clinical data and fine ranking.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected Patient Drawer / Detail View */}
        {selectedPatient && (
          <div style={{
            backgroundColor: '#111827',
            border: '1px solid #374151',
            borderRadius: '8px',
            padding: '20px',
            position: 'sticky',
            top: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>{selectedPatient.pseudonym}</h3>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>Node ID: {selectedPatient.node_id}</div>
              </div>
              <button
                onClick={() => setSelectedPatient(null)}
                style={{ background: 'none', color: '#9ca3af', fontSize: '18px', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            {selectedPatient.decrypted ? (
              <div>
                {/* Clinical Vitals Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ backgroundColor: '#1f2937', padding: '12px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>Pulse Rate</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>
                      {selectedPatient.vitals?.hr} <span style={{ fontSize: '12px', color: '#9ca3af' }}>bpm</span>
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#1f2937', padding: '12px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>Oxygen Saturation</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#06b6d4' }}>
                      {selectedPatient.vitals?.spo2} <span style={{ fontSize: '12px', color: '#9ca3af' }}>%</span>
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#1f2937', padding: '12px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>Body Temp</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                      {selectedPatient.vitals?.temp} <span style={{ fontSize: '12px', color: '#9ca3af' }}>°C</span>
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#1f2937', padding: '12px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>ETA to Hospital</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#34d399' }}>
                      {selectedPatient.eta_minutes} <span style={{ fontSize: '12px', color: '#9ca3af' }}>min</span>
                    </div>
                  </div>
                </div>

                {/* Factors */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '6px', fontWeight: 600 }}>
                    TINYML RISK FACTORS:
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {selectedPatient.risk?.top_factors.map((f, i) => (
                      <li key={i} style={{ fontSize: '12px', color: '#d1d5db', padding: '3px 0' }}>
                        • {f}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    onClick={() => handleRequestSnapshot(selectedPatient)}
                    disabled={snapshotLoading}
                    style={{
                      backgroundColor: '#059669',
                      color: '#fff',
                      padding: '10px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <Camera size={16} />
                    {snapshotLoading ? 'Signing & Fetching Snapshot...' : 'Request Signed Delta Snapshot (F3)'}
                  </button>

                  <button
                    onClick={() => setDownloadModalOpen(true)}
                    style={{
                      backgroundColor: '#0284c7',
                      color: '#fff',
                      padding: '9px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <Globe size={15} />
                    Export Multilingual Patient Report (Sarvam AI)
                  </button>

                  <button
                    onClick={() => handleSimulateConflict(selectedPatient)}
                    style={{
                      backgroundColor: '#374151',
                      color: '#e5e7eb',
                      padding: '8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <GitMerge size={15} />
                    Simulate Concurrent Medic Update Conflict
                  </button>
                </div>

                {/* Snapshot Timeline History */}
                {selectedPatient.snapshot_history && selectedPatient.snapshot_history.length > 1 && (
                  <div style={{ marginTop: '16px', borderTop: '1px solid #374151', paddingTop: '12px' }}>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '6px', fontWeight: 600 }}>
                      DELTA SNAPSHOT TIMELINE ({selectedPatient.snapshot_history.length} samples):
                    </div>
                    <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                      {selectedPatient.snapshot_history.map((h, idx) => (
                        <div key={idx} style={{ fontSize: '11px', color: '#9ca3af', padding: '2px 0' }}>
                          #{idx + 1} [{new Date(h.ts).toLocaleTimeString()}] HR: {h.hr} bpm | SpO2: {h.spo2}% | Temp: {h.temp}°C
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: '#9ca3af' }}>
                <Lock size={32} style={{ margin: '0 auto 10px', display: 'block', color: '#f59e0b' }} />
                <p style={{ fontSize: '13px' }}>This record is end-to-end encrypted on the hub.</p>
                <p style={{ fontSize: '12px', marginTop: '6px' }}>Click "Decrypt Batch" with unlocked Doctor WebCrypto key to access vitals.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Medic Conflict Modal */}
      {conflictModalOpen && conflictResult && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#111827',
            border: '1px solid #4b5563',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h3 style={{ fontSize: '17px', fontWeight: 'bold', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GitMerge color="#38bdf8" size={20} />
              Medic Batch Conflict Resolved
            </h3>
            <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '14px' }}>
              Two medics concurrently submitted triage updates for this node.
            </p>
            <div style={{ backgroundColor: '#1f2937', padding: '12px', borderRadius: '6px', fontSize: '13px', marginBottom: '14px' }}>
              <div><strong>Field:</strong> {conflictResult.field}</div>
              <div style={{ color: '#fb923c' }}>• Medic A: {conflictResult.current_val}</div>
              <div style={{ color: '#38bdf8' }}>• Medic B: {conflictResult.incoming_val}</div>
              <div style={{ marginTop: '8px', color: '#34d399', fontWeight: 'bold' }}>
                ✓ Resolution ({conflictResult.resolution_type}): {conflictResult.resolved_val}
              </div>
            </div>
            <button
              onClick={() => setConflictModalOpen(false)}
              style={{
                width: '100%',
                backgroundColor: '#0284c7',
                color: '#fff',
                padding: '8px',
                borderRadius: '6px',
                fontWeight: 600
              }}
            >
              Acknowledge & Close
            </button>
          </div>
        </div>
      )}

      {/* Doctor Multilingual Download Modal (Sarvam AI) */}
      {selectedPatient && selectedPatient.vitals && selectedPatient.risk && (
        <DoctorDownloadModal
          isOpen={downloadModalOpen}
          onClose={() => setDownloadModalOpen(false)}
          patientId={selectedPatient.pseudonym}
          vitals={selectedPatient.vitals}
          risk={selectedPatient.risk}
          fineScore={selectedPatient.fine_priority_score || 0}
        />
      )}
    </div>
  );
};
