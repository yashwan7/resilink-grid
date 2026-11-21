import React, { useState } from 'react';
import { 
  Clock, ShieldAlert, HeartPulse, FileText, 
  CheckCircle2, AlertTriangle, Key, Unlock, 
  ShieldCheck, Download, ChevronRight, Activity, 
  Zap, Droplet, Building2, UserCheck, Eye, Sparkles, Copy, Check
} from 'lucide-react';

export const GoldenHourHandoffView: React.FC = () => {
  const [selectedShares, setSelectedShares] = useState<string[]>(['SHARE-1-PARAMEDIC-7F89C2A', 'SHARE-2-ERNURSE-9B43D1E']);
  const [breakGlassState, setBreakGlassState] = useState<{
    unlocked: boolean;
    auditSeq: number | null;
    token: string | null;
    timestamp: string | null;
  }>({ unlocked: false, auditSeq: null, token: null, timestamp: null });
  const [showFhirModal, setShowFhirModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const vitalsTrend = [
    { t: '-10m', hr: 98, spo2: 95, sbp: 122, shockIndex: 0.80, status: 'Compensating' },
    { t: '-8m', hr: 108, spo2: 93, sbp: 114, shockIndex: 0.95, status: 'Tachycardia' },
    { t: '-6m', hr: 120, spo2: 90, sbp: 106, shockIndex: 1.13, status: 'Hypoxemia' },
    { t: '-4m', hr: 132, spo2: 88, sbp: 96, shockIndex: 1.38, status: 'Decompensating' },
    { t: '-2m', hr: 140, spo2: 85, sbp: 86, shockIndex: 1.63, status: 'Critical Shock' },
    { t: 'Now', hr: 142, spo2: 84, sbp: 82, shockIndex: 1.73, status: 'P0 Triggered' }
  ];

  const shamirShareOptions = [
    { id: 'SHARE-1-PARAMEDIC-7F89C2A', role: 'Paramedic (EMS Unit Lead)', badge: 'FIELD EMS', holder: 'Unit 102 - Paramedic Roy' },
    { id: 'SHARE-2-ERNURSE-9B43D1E', role: 'Receiving ER Triage Nurse', badge: 'ER TRAUMA', holder: 'Sister Mary - Bay 4 Lead' },
    { id: 'SHARE-3-CMO-5E21F8A', role: 'Chief Medical Officer / Consultant', badge: 'HOSPITAL CMO', holder: 'Dr. K. Srinivas, On-Call' }
  ];

  const toggleShare = (id: string) => {
    setSelectedShares(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleExecuteBreakGlass = () => {
    if (selectedShares.length < 2) return;
    const randomSeq = Math.floor(Math.random() * 80) + 120;
    const ephToken = 'EPH-KEY-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    setBreakGlassState({
      unlocked: true,
      auditSeq: randomSeq,
      token: ephToken,
      timestamp: new Date().toLocaleTimeString()
    });
  };

  const sampleFhirBundle = {
    resourceType: "Bundle",
    id: "resilink-abdm-emg-8924b1",
    meta: {
      versionId: "1",
      lastUpdated: new Date().toISOString(),
      profile: ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/EmergencyDischargeSummary"]
    },
    identifier: {
      system: "https://abdm.gov.in/emergency-records",
      value: "ABDM-EMG-8924B1"
    },
    type: "document",
    entry: [
      {
        resource: {
          resourceType: "Patient",
          id: "PT-101",
          identifier: [{ system: "https://healthid.ndhm.gov.in", value: "91-8273-1928-3482@abdm" }],
          name: [{ text: "Marcus Vance" }],
          gender: "male",
          birthDate: "1990-04-12"
        }
      },
      {
        resource: {
          resourceType: "AllergyIntolerance",
          substance: { text: "Penicillin" },
          reaction: [{ manifestation: [{ text: "Anaphylaxis and Angioedema" }], severity: "severe" }]
        }
      },
      {
        resource: {
          resourceType: "Condition",
          code: { coding: [{ system: "http://hl7.org/fhir/sid/icd-10", code: "I25.2", display: "Old myocardial infarction" }] }
        }
      },
      {
        resource: {
          resourceType: "Observation",
          code: { text: "Shock Index" },
          valueQuantity: { value: 1.73, unit: "HR/SBP" }
        }
      }
    ]
  };

  const handleCopyFhir = () => {
    navigator.clipboard.writeText(JSON.stringify(sampleFhirBundle, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Banner / Hero Metric */}
      <div style={{
        background: 'linear-gradient(135deg, #14284b 0%, #1a3869 50%, #0f4c81 100%)',
        borderRadius: '20px',
        padding: '24px',
        color: '#ffffff',
        border: '1px solid rgba(147, 197, 253, 0.25)',
        boxShadow: '0 10px 25px rgba(15, 23, 42, 0.15)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ maxWidth: '750px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 700, padding: '3px 8px', borderRadius: '9999px', background: 'rgba(251, 191, 36, 0.2)', color: '#fde68a', border: '1px solid rgba(251, 191, 36, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Clock style={{ width: '12px', height: '12px' }} />
              GOLDEN HOUR HANDOFF
            </span>
            <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 700, padding: '3px 8px', borderRadius: '9999px', background: 'rgba(52, 211, 153, 0.2)', color: '#6ee7b7', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
              ABDM / FHIR R4 NATIVE
            </span>
            <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 700, padding: '3px 8px', borderRadius: '9999px', background: 'rgba(192, 132, 252, 0.2)', color: '#d8b4fe', border: '1px solid rgba(192, 132, 252, 0.3)' }}>
              OFFLINE ENCRYPTED PUSH
            </span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 900, margin: '0 0 6px 0', letterSpacing: '-0.02em', color: '#ffffff' }}>
            Pre-Arrival "Golden Hour" Medical Context Handoff
          </h1>
          <p style={{ fontSize: '13px', color: '#bfdbfe', margin: 0, lineHeight: 1.5 }}>
            Eliminates the blind 18-minute ER rediscovery gap. The patient's end-to-end encrypted medical record, allergies, and 10-minute vitals delta stream arrive at the receiving trauma bay before the ambulance does.
          </p>
        </div>

        {/* Headline Metric Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(8px)',
          padding: '16px 20px',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(251, 191, 36, 0.2)', color: '#fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap style={{ width: '22px', height: '22px' }} />
          </div>
          <div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', fontFamily: 'monospace', color: '#93c5fd', fontWeight: 700 }}>Time Saved in Golden Hour</div>
            <div style={{ fontSize: '22px', fontWeight: 900, fontFamily: 'monospace', color: '#fde68a' }}>18.2 MINUTES</div>
            <div style={{ fontSize: '10px', color: '#bfdbfe', fontFamily: 'monospace' }}>Alert-to-Treatment: 18.5m → 0.3m</div>
          </div>
        </div>
      </div>

      {/* Grid: Pre-Arrival Triage Card + Shamir Break-Glass */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px' }}>

        {/* ================= PRE-ARRIVAL TRIAGE CARD ================= */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldAlert style={{ width: '22px', height: '22px' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>PT-101 (MARCUS VANCE)</span>
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#fee2e2', color: '#ef4444', fontFamily: 'monospace' }}>CODE RED P0</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace', marginTop: '2px' }}>
                    ABHA ID: <strong style={{ color: '#0284c7' }}>91-8273-1928-3482@abdm</strong> | Male, 34 yrs | O-Negative
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontFamily: 'monospace' }}>AMBULANCE ETA</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#0284c7', fontFamily: 'monospace' }}>6.8 MINS</div>
                <div style={{ fontSize: '10px', color: '#10b981', fontFamily: 'monospace', fontWeight: 700 }}>BAY #4 RESERVED</div>
              </div>
            </div>

            {/* Receiving Facility & Reservation */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', margin: '16px 0' }}>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Building2 style={{ width: '12px', height: '12px', color: '#0284c7' }} />
                  Allocated Hospital
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>St. John's Medical College</div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>Trauma Bay #4 Ready</div>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <HeartPulse style={{ width: '12px', height: '12px', color: '#ef4444' }} />
                  Pre-Alerted Resources
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#b91c1c', marginTop: '4px' }}>ICU Bed #2 + Ventilator</div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>High-Flow O2 Pre-Connected</div>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Droplet style={{ width: '12px', height: '12px', color: '#ef4444' }} />
                  Blood Bank Cross-Match
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>4 Units O-Neg PRBC</div>
                <div style={{ fontSize: '10px', color: '#10b981', fontWeight: 600 }}>Unmatched Pack Thawing</div>
              </div>
            </div>

            {/* Clinical Details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginTop: '16px' }}>
              
              {/* Allergies */}
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#b91c1c', textTransform: 'uppercase', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <AlertTriangle style={{ width: '14px', height: '14px', color: '#ef4444' }} />
                  Critical Allergies
                </div>
                <ul style={{ margin: 0, paddingLeft: '14px', fontSize: '11px', color: '#334155', lineHeight: 1.6 }}>
                  <li><strong>Penicillin:</strong> Anaphylaxis & Angioedema</li>
                  <li><strong>NSAIDs / Aspirin:</strong> Severe Bronchospasm</li>
                  <li><strong>Sulfa Drugs:</strong> Cutaneous Rash</li>
                </ul>
              </div>

              {/* Current Meds */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <FileText style={{ width: '14px', height: '14px', color: '#3b82f6' }} />
                  Active Medications
                </div>
                <ul style={{ margin: 0, paddingLeft: '14px', fontSize: '11px', color: '#334155', lineHeight: 1.6 }}>
                  <li><strong>Metformin:</strong> 500mg BID (Diabetes)</li>
                  <li><strong>Atorvastatin:</strong> 20mg QHS (CAD)</li>
                  <li><strong>Amlodipine:</strong> 5mg OD (Hypertension)</li>
                </ul>
              </div>

              {/* Past History */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#7e22ce', textTransform: 'uppercase', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Activity style={{ width: '14px', height: '14px', color: '#a855f7' }} />
                  Past Medical History
                </div>
                <ul style={{ margin: 0, paddingLeft: '14px', fontSize: '11px', color: '#334155', lineHeight: 1.6 }}>
                  <li><strong>Prior MI (2021):</strong> Stent to RCA</li>
                  <li><strong>Type 2 Diabetes:</strong> 10+ yrs history</li>
                  <li><strong>Hypertension:</strong> Stage 2 Essential</li>
                </ul>
              </div>

            </div>

            {/* 10-Minute Delta Stream */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, fontFamily: 'monospace', color: '#334155', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Activity style={{ width: '14px', height: '14px', color: '#0284c7' }} />
                  10-Minute Delta Telemetry Stream (Acute Decompensation)
                </span>
                <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#b91c1c', background: '#fee2e2', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                  Shock Index Worsening: 0.80 → 1.73
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                {vitalsTrend.map((v, i) => (
                  <div key={i} style={{
                    padding: '10px',
                    borderRadius: '8px',
                    fontFamily: 'monospace',
                    textAlign: 'center',
                    background: i === vitalsTrend.length - 1 ? '#fee2e2' : '#f8fafc',
                    border: i === vitalsTrend.length - 1 ? '1px solid #f87171' : '1px solid #e2e8f0'
                  }}>
                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>{v.t}</div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>{v.hr} <span style={{ fontSize: '8px', color: '#64748b' }}>bpm</span></div>
                    <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600 }}>{v.spo2}% SpO2</div>
                    <div style={{ fontSize: '10px', color: '#334155' }}>{v.sbp} SBP</div>
                    <div style={{ fontSize: '10px', color: '#b45309', fontWeight: 700 }}>SI {v.shockIndex}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <button
                onClick={() => setShowFhirModal(true)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 700,
                  borderRadius: '8px',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <FileText style={{ width: '14px', height: '14px' }} />
                Export ABDM FHIR R4 Bundle
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                <ShieldCheck style={{ width: '16px', height: '16px', color: '#10b981' }} />
                <span>Zero Plaintext on Hub | WebCrypto In-Browser Decrypt</span>
              </div>
            </div>

          </div>

        </div>

        {/* ================= SHAMIR 2-OF-3 BREAK-GLASS ================= */}
        <div>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #fed7aa', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#ffedd5', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Key style={{ width: '18px', height: '18px' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: '#0f172a' }}>Shamir Break-Glass (2 of 3)</h3>
                <span style={{ fontSize: '10px', color: '#9a3412', fontFamily: 'monospace' }}>Unconscious Patient Override</span>
              </div>
            </div>

            <p style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5, marginBottom: '14px' }}>
              When a trauma patient is unconscious, emergency decryption requires a cryptographic quorum of <strong>any 2 out of 3 authorized roles</strong>.
            </p>

            {/* Checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {shamirShareOptions.map(share => {
                const isSelected = selectedShares.includes(share.id);
                return (
                  <div
                    key={share.id}
                    onClick={() => toggleShare(share.id)}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: isSelected ? '1px solid #f97316' : '1px solid #e2e8f0',
                      background: isSelected ? '#fff7ed' : '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '4px',
                          border: isSelected ? '1px solid #f97316' : '1px solid #94a3b8',
                          background: isSelected ? '#f97316' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff'
                        }}>
                          {isSelected && <Check style={{ width: '12px', height: '12px', strokeWidth: 3 }} />}
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{share.role}</span>
                      </div>
                      <span style={{ fontSize: '9px', fontFamily: 'monospace', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#c2410c' }}>
                        {share.badge}
                      </span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px', paddingLeft: '24px', fontFamily: 'monospace' }}>
                      {share.holder}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quorum Progress */}
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'monospace', marginBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Quorum:</span>
                <span style={{ fontWeight: 800, color: selectedShares.length >= 2 ? '#10b981' : '#f97316' }}>
                  {selectedShares.length} / 2 SHARES ACTIVE
                </span>
              </div>
              <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  background: selectedShares.length >= 2 ? '#10b981' : '#f97316',
                  width: `${Math.min(100, (selectedShares.length / 2) * 100)}%`,
                  transition: 'width 0.3s'
                }} />
              </div>
            </div>

            {/* Trigger Button */}
            <button
              onClick={handleExecuteBreakGlass}
              disabled={selectedShares.length < 2 || breakGlassState.unlocked}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 800,
                fontFamily: 'monospace',
                textTransform: 'uppercase',
                border: 'none',
                cursor: selectedShares.length >= 2 && !breakGlassState.unlocked ? 'pointer' : 'default',
                background: breakGlassState.unlocked 
                  ? '#ecfdf5' 
                  : selectedShares.length >= 2 
                    ? '#f97316' 
                    : '#e2e8f0',
                color: breakGlassState.unlocked 
                  ? '#047857' 
                  : selectedShares.length >= 2 
                    ? '#ffffff' 
                    : '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {breakGlassState.unlocked ? (
                <>
                  <Unlock style={{ width: '16px', height: '16px', color: '#10b981' }} />
                  Quorum Satisfied (Decrypted)
                </>
              ) : (
                <>
                  <Key style={{ width: '16px', height: '16px' }} />
                  Execute 2-of-3 Break-Glass
                </>
              )}
            </button>

            {/* Audit Log Card */}
            {breakGlassState.unlocked && (
              <div style={{ marginTop: '14px', padding: '12px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', fontSize: '11px', color: '#065f46', fontFamily: 'monospace' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, marginBottom: '6px' }}>
                  <CheckCircle2 style={{ width: '14px', height: '14px', color: '#10b981' }} />
                  BREAK_GLASS_UNLOCKED
                </div>
                <div>Audit Seq: <strong>Seq #{breakGlassState.auditSeq}</strong></div>
                <div>Ephemeral Key: <span style={{ color: '#b45309' }}>{breakGlassState.token}</span></div>
                <div>Logged: {breakGlassState.timestamp}</div>
                <div style={{ fontSize: '9px', color: '#047857', marginTop: '6px', fontStyle: 'italic', borderTop: '1px solid #a7f3d0', paddingTop: '4px' }}>
                  Audited into HMAC-SHA256 hash chain in SQLite WAL.
                </div>
              </div>
            )}

            <div style={{ marginTop: '16px', fontSize: '10px', color: '#64748b', lineHeight: 1.4 }}>
              <strong>CDSCO Notice:</strong> "Decision support, not a diagnosis. Alerting and handoff support only. CDSCO Class A/B Software Under Clinical Trial Protocol."
            </div>

          </div>
        </div>

      </div>

      {/* FHIR Modal */}
      {showFhirModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
          <div style={{ background: '#0f172a', border: '1px solid #0284c7', borderRadius: '16px', maxWidth: '650px', width: '100%', padding: '24px', color: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0, fontFamily: 'monospace' }}>ABDM FHIR R4 Bundle Export</h3>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>NRCeS EmergencyDischargeSummary</span>
              </div>
              <button onClick={() => setShowFhirModal(false)} style={{ background: '#1e293b', border: 'none', color: '#ffffff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ background: '#020617', padding: '14px', borderRadius: '10px', maxHeight: '350px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '11px', color: '#34d399' }}>
              <pre style={{ margin: 0 }}>{JSON.stringify(sampleFhirBundle, null, 2)}</pre>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>Profile: v4.0.1 (ABDM Native)</span>
              <button
                onClick={handleCopyFhir}
                style={{ padding: '8px 16px', background: '#0284c7', border: 'none', color: '#ffffff', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {copied ? <Check style={{ width: '14px', height: '14px' }} /> : <Copy style={{ width: '14px', height: '14px' }} />}
                {copied ? 'Copied' : 'Copy FHIR JSON'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
