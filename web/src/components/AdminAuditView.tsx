import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Users, 
  Key, 
  RefreshCw, 
  UserX, 
  CheckCircle, 
  AlertTriangle, 
  Radio, 
  Truck,
  Activity,
  Zap,
  Lock
} from 'lucide-react';
import { AuditRecord } from '../types';
import { HubApi, verifyAuditChain, EmergencyAssignment } from '../mock/hubApi';

interface AdminAuditViewProps {
  epoch: number;
  onRotateEpoch: () => void;
}

export const AdminAuditView: React.FC<AdminAuditViewProps> = ({ epoch, onRotateEpoch }) => {
  const [activeTab, setActiveTab] = useState<'audit' | 'recipients' | 'link' | 'emergencies'>('audit');
  const [auditChain, setAuditChain] = useState<AuditRecord[]>([]);
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; first_bad_seq?: number; reason?: string } | null>(null);
  const [emergencies, setEmergencies] = useState<EmergencyAssignment[]>([]);

  // Registered Recipients Matrix
  const [recipients, setRecipients] = useState([
    { id: 'DR-SMITH-P256', name: 'Dr. Yashwanth (Lead)', role: 'Doctor Lead', pubKeyHex: '036b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296', status: 'ACTIVE' },
    { id: 'DR-HARSHA-P256', name: 'Dr. Harshavardhan (Triage)', role: 'Triage Specialist', pubKeyHex: '02d5a3...e1b4', status: 'ACTIVE' },
    { id: 'DR-HARSHITH-P256', name: 'Dr. Harshith (Hub Admin)', role: 'Emergency Dispatcher', pubKeyHex: '038f9c...c902', status: 'ACTIVE' },
    { id: 'PATIENT-NODE-MCXN01', name: 'Patient Device 01', role: 'Patient Keypair', pubKeyHex: '025a12...78dd', status: 'ACTIVE' },
    { id: 'DR-ROGUE-007', name: 'Dr. Compromised (Audit Test)', role: 'Revoked Observer', pubKeyHex: '02aa44...11bb', status: 'REVOKED' }
  ]);

  useEffect(() => {
    loadAudit();
    loadEmergencies();
  }, []);

  const loadAudit = async () => {
    const chain = await HubApi.getAuditChain();
    setAuditChain(chain);
    setVerifyResult(verifyAuditChain(chain));
  };

  const loadEmergencies = async () => {
    const ems = await HubApi.getActiveEmergencies();
    setEmergencies(ems);
  };

  const handleSimulateTamper = () => {
    if (auditChain.length >= 2) {
      HubApi.tamperAuditRecord(2);
      loadAudit();
    }
  };

  const handleResetAudit = () => {
    HubApi.resetAuditChain();
    loadAudit();
  };

  const handleRevokeRecipient = (id: string) => {
    setRecipients(prev => prev.map(r => r.id === id ? { ...r, status: r.status === 'ACTIVE' ? 'REVOKED' : 'ACTIVE' } : r));
    HubApi.appendAuditRecord('ACCESS_REQUEST', {
      action: 'RECIPIENT_REVOCATION',
      target: id,
      ts: Date.now()
    });
    loadAudit();
  };

  const handleEmergencyStateAdvance = async (emId: string, currentStatus: EmergencyAssignment['status']) => {
    let nextStatus: EmergencyAssignment['status'] = 'ASSIGNED';
    if (currentStatus === 'ASSIGNED') nextStatus = 'EN_ROUTE';
    else if (currentStatus === 'EN_ROUTE') nextStatus = 'ARRIVED';
    else if (currentStatus === 'ARRIVED') nextStatus = 'ASSIGNED';

    await HubApi.updateEmergencyStatus(emId, nextStatus);
    loadEmergencies();
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={22} color="#a78bfa" />
            Security, Recipient Access & Audit Chain Verification
          </h2>
          <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '2px' }}>
            HMAC/SHA-256 Canonical JSON Chain • Epoch Rotation • Nonce Discipline • Zero-Knowledge Hub
          </div>
        </div>

        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: '6px', backgroundColor: '#111827', padding: '4px', borderRadius: '8px', border: '1px solid #374151' }}>
          <button
            onClick={() => setActiveTab('audit')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: activeTab === 'audit' ? '#7c3aed' : 'transparent',
              color: activeTab === 'audit' ? '#fff' : '#9ca3af',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            Audit Chain & Tamper Demo
          </button>
          <button
            onClick={() => setActiveTab('recipients')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: activeTab === 'recipients' ? '#7c3aed' : 'transparent',
              color: activeTab === 'recipients' ? '#fff' : '#9ca3af',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            Recipients & Epochs
          </button>
          <button
            onClick={() => setActiveTab('link')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: activeTab === 'link' ? '#7c3aed' : 'transparent',
              color: activeTab === 'link' ? '#fff' : '#9ca3af',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            TinyML Link State
          </button>
          <button
            onClick={() => setActiveTab('emergencies')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: activeTab === 'emergencies' ? '#7c3aed' : 'transparent',
              color: activeTab === 'emergencies' ? '#fff' : '#9ca3af',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            Emergency Outbox
          </button>
        </div>
      </div>

      {/* Audit Chain View */}
      {activeTab === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Verification Status Card */}
          <div style={{
            backgroundColor: verifyResult?.valid ? '#064e3b' : '#7f1d1d',
            border: `1px solid ${verifyResult?.valid ? '#059669' : '#dc2626'}`,
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {verifyResult?.valid ? <ShieldCheck size={26} color="#34d399" /> : <ShieldAlert size={26} color="#f87171" />}
              <div>
                <strong style={{ fontSize: '15px', color: verifyResult?.valid ? '#6ee7b7' : '#fca5a5' }}>
                  {verifyResult?.valid ? 'AUDIT HASH CHAIN VALID: ZERO TAMPERING DETECTED' : 'AUDIT TAMPER DETECTED BY CRYPTOGRAPHIC PROOF!'}
                </strong>
                <div style={{ fontSize: '12px', color: '#f3f4f6', marginTop: '2px' }}>
                  {verifyResult?.valid 
                    ? `All ${auditChain.length} canonical records chained via HMAC/SHA-256. Verified by endpoint /v1/audit/verify.` 
                    : `Violation at sequence #${verifyResult?.first_bad_seq}: ${verifyResult?.reason}`}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleSimulateTamper}
                style={{
                  backgroundColor: '#b91c1c',
                  color: '#fff',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                Simulate Tampering (Flip Byte in Seq #2)
              </button>
              <button
                onClick={handleResetAudit}
                style={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #4b5563',
                  color: '#e5e7eb',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                Reset Chain
              </button>
            </div>
          </div>

          {/* Audit Chain Table */}
          <div style={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#1f2937', color: '#9ca3af', borderBottom: '1px solid #374151' }}>
                  <th style={{ padding: '10px 14px' }}>Seq</th>
                  <th style={{ padding: '10px 14px' }}>Timestamp</th>
                  <th style={{ padding: '10px 14px' }}>Event</th>
                  <th style={{ padding: '10px 14px' }}>Details Payload (Canonical JSON)</th>
                  <th style={{ padding: '10px 14px' }}>HMAC Hash / Prev Hash</th>
                </tr>
              </thead>
              <tbody>
                {auditChain.map((rec) => {
                  const isBad = verifyResult && !verifyResult.valid && verifyResult.first_bad_seq === rec.seq;
                  return (
                    <tr
                      key={rec.seq}
                      style={{
                        borderBottom: '1px solid #1f2937',
                        backgroundColor: isBad ? 'rgba(239, 68, 68, 0.2)' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '10px 14px', fontWeight: 'bold', color: isBad ? '#ef4444' : '#e5e7eb' }}>
                        #{rec.seq} {isBad && '⚠️ BAD'}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                        {new Date(rec.ts).toLocaleTimeString()}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          backgroundColor: '#1f2937',
                          color: '#38bdf8',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600
                        }}>
                          {rec.event}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#d1d5db', fontFamily: 'monospace', maxWidth: '300px' }}>
                        {JSON.stringify(rec.details)}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#6b7280', fontFamily: 'monospace', fontSize: '10px' }}>
                        <div>hash: {rec.hash.substring(0, 16)}...</div>
                        <div>prev: {rec.prev_hash.substring(0, 16)}...</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recipients & Epochs View */}
      {activeTab === 'recipients' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Epoch Control */}
          <div style={{
            backgroundColor: '#111827',
            border: '1px solid #374151',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <strong style={{ fontSize: '15px' }}>Current Active Key Epoch: #{epoch}</strong>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                Every epoch derives a fresh DEK. Wrapped DEK keys are distributed to authorized recipients.
              </div>
            </div>
            <button
              onClick={onRotateEpoch}
              style={{
                backgroundColor: '#0284c7',
                color: '#fff',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <RefreshCw size={14} />
              Trigger Epoch Rotation
            </button>
          </div>

          {/* Recipients Table */}
          <div style={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#1f2937', color: '#9ca3af', borderBottom: '1px solid #374151' }}>
                  <th style={{ padding: '10px 14px' }}>Recipient ID</th>
                  <th style={{ padding: '10px 14px' }}>Name / Role</th>
                  <th style={{ padding: '10px 14px' }}>P-256 Public Key (Compressed 33B)</th>
                  <th style={{ padding: '10px 14px' }}>Status</th>
                  <th style={{ padding: '10px 14px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recipients.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #1f2937' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 'bold' }}>{r.id}</td>
                    <td style={{ padding: '10px 14px', color: '#d1d5db' }}>{r.name}</td>
                    <td style={{ padding: '10px 14px', color: '#6b7280', fontFamily: 'monospace' }}>{r.pubKeyHex}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        backgroundColor: r.status === 'ACTIVE' ? '#065f46' : '#7f1d1d',
                        color: r.status === 'ACTIVE' ? '#34d399' : '#f87171',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <button
                        onClick={() => handleRevokeRecipient(r.id)}
                        style={{
                          backgroundColor: r.status === 'ACTIVE' ? '#7f1d1d' : '#065f46',
                          color: '#fff',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '11px'
                        }}
                      >
                        {r.status === 'ACTIVE' ? 'Revoke Key' : 'Re-activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Link State Tab */}
      {activeTab === 'link' && (
        <div style={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Radio size={18} color="#38bdf8" />
            NXP TinyML Link-State Model & Fallback Topology
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            <div style={{ backgroundColor: '#1f2937', padding: '12px', borderRadius: '6px' }}>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>Link Health Classification</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#34d399', marginTop: '4px' }}>HEALTHY</div>
            </div>
            <div style={{ backgroundColor: '#1f2937', padding: '12px', borderRadius: '6px' }}>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>Packet Delivery Ratio (PDR)</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#38bdf8', marginTop: '4px' }}>96.8%</div>
            </div>
            <div style={{ backgroundColor: '#1f2937', padding: '12px', borderRadius: '6px' }}>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>RF Signal (RSSI)</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fbbf24', marginTop: '4px' }}>-62 dBm</div>
            </div>
            <div style={{ backgroundColor: '#1f2937', padding: '12px', borderRadius: '6px' }}>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>Round-Trip Time (RTT)</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#a855f7', marginTop: '4px' }}>38 ms</div>
            </div>
          </div>

          <div style={{ fontSize: '13px', color: '#d1d5db', lineHeight: 1.8 }}>
            <div><strong>Active Routing Priority:</strong> PORT_A Wi-Fi ➔ PORT_B backup Wi-Fi ➔ MESH nRF24 ➔ SMS_FALLBACK (SIM800L)</div>
            <div><strong>Stability Controls:</strong> Escalate Critical: 3 windows, Degrading: 5 windows, min dwell: 60 s, max 1 transition / 30 s.</div>
            <div><strong>Emergency Broadcast Rule:</strong> P0 SOS frames broadcast simultaneously across ALL routes; hub performs deduplication via (device, epoch, counter).</div>
          </div>
        </div>
      )}

      {/* Emergency Outbox Tab */}
      {activeTab === 'emergencies' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {emergencies.length === 0 ? (
            <div style={{ backgroundColor: '#111827', padding: '30px', textAlign: 'center', color: '#9ca3af', borderRadius: '8px' }}>
              No active emergency dispatches currently in outbox.
            </div>
          ) : (
            emergencies.map(em => (
              <div key={em.id} style={{
                backgroundColor: '#111827',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                padding: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <strong style={{ fontSize: '16px', color: '#f87171' }}>
                    🚨 {em.trigger.pseudonym} (P0 Emergency)
                  </strong>
                  <span style={{
                    backgroundColor: '#7f1d1d',
                    color: '#fff',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}>
                    {em.status}
                  </span>
                </div>

                <div style={{ fontSize: '13px', color: '#d1d5db', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>Ambulance: <strong>{em.ambulance.id}</strong> (Driver: {em.ambulance.contact})</div>
                  <div>Hospital: <strong>{em.hospital.name}</strong></div>
                  <div>ETA: <strong>{em.eta_minutes} min</strong></div>
                  <div>Needs: <strong>{em.trigger.need.join(', ')}</strong></div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleEmergencyStateAdvance(em.id, em.status)}
                    style={{
                      backgroundColor: '#0284c7',
                      color: '#fff',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600
                    }}
                  >
                    Advance State ({em.status === 'ASSIGNED' ? 'EN_ROUTE' : em.status === 'EN_ROUTE' ? 'ARRIVED' : 'RESET'})
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
