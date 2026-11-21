import React, { useState } from 'react';
import { 
  Clock, ShieldAlert, HeartPulse, FileText, 
  CheckCircle2, AlertTriangle, Key, Unlock, 
  ShieldCheck, Download, ChevronRight, Activity, 
  Zap, Droplet, Building2, UserCheck, Eye, Sparkles, Copy, Check
} from 'lucide-react';

export default function GoldenHourHandoff({ onNavigateTab }) {
  const [selectedShares, setSelectedShares] = useState(['SHARE-1-PARAMEDIC-7F89C2A', 'SHARE-2-ERNURSE-9B43D1E']);
  const [breakGlassState, setBreakGlassState] = useState({ unlocked: false, auditSeq: null, token: null });
  const [showFhirModal, setShowFhirModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // 10-minute delta telemetry tracking acute decompensation
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

  const toggleShare = (id) => {
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
    <div className="space-y-6 pb-12">
      
      {/* Top Banner / Hero Metric */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#14284b] via-[#1a3869] to-[#0f4c81] rounded-3xl p-6 text-white border border-blue-400/20 shadow-2xl">
        <div className="absolute -right-8 -bottom-8 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                GOLDEN HOUR HANDOFF
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                ABDM / FHIR R4 NATIVE
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-400/20 text-purple-300 border border-purple-400/30">
                OFFLINE PUSH
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white m-0">
              Pre-Arrival "Golden Hour" Medical Context Handoff
            </h1>
            <p className="text-xs text-blue-200/90 mt-1 max-w-2xl font-medium leading-relaxed">
              Eliminates the blind 18-minute ER rediscovery gap. The patient's end-to-end encrypted medical record, allergies, and 10-minute vitals delta stream arrive at the receiving trauma bay before the ambulance does.
            </p>
          </div>

          {/* Headline Metric Pill */}
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-white/20 shrink-0">
            <div className="w-12 h-12 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center font-black">
              <Zap className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono tracking-wider text-blue-200 font-bold">Time Saved in Golden Hour</div>
              <div className="text-2xl font-black font-mono text-amber-300 tracking-tight">18.2 MINUTES</div>
              <div className="text-[9px] text-blue-200/80 font-mono">Alert-to-Treatment Delay: 18.5m → 0.3m</div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Triage Card + Shamir Break-Glass */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ================= COLUMN 1 & 2: PRE-ARRIVAL TRIAGE CARD ================= */}
        <div className="lg:col-span-2 space-y-6">

          {/* ER Pre-Arrival Summary Card */}
          <div className="bg-[#182334] rounded-2xl border border-slate-700/60 p-5 shadow-lg">
            <div className="flex justify-between items-center pb-4 border-b border-slate-700/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center font-bold">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white font-mono">PT-101 (MARCUS VANCE)</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">CODE RED P0</span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    ABHA ID: <span className="text-cyan-400 font-semibold">91-8273-1928-3482@abdm</span> | Male, 34 yrs | Blood: O-Negative
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] uppercase font-mono text-slate-400">AMBULANCE ETA</div>
                <div className="text-lg font-black font-mono text-cyan-400 tracking-tight">6.8 MINS</div>
                <div className="text-[10px] text-emerald-400 font-mono flex items-center justify-end gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  BAY #4 RESERVED
                </div>
              </div>
            </div>

            {/* Receiving Facility & Reservation */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-4">
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-mono flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-cyan-400" />
                  Allocated Hospital
                </div>
                <div className="text-xs font-bold text-white mt-1">St. John's Medical College</div>
                <div className="text-[10px] text-slate-400">Trauma Resus Bay #4 Ready</div>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-mono flex items-center gap-1">
                  <HeartPulse className="w-3 h-3 text-rose-400" />
                  Pre-Alerted Resources
                </div>
                <div className="text-xs font-bold text-rose-300 mt-1">ICU Bed #2 + Ventilator</div>
                <div className="text-[10px] text-slate-400">High-Flow O2 Pre-Connected</div>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-mono flex items-center gap-1">
                  <Droplet className="w-3 h-3 text-red-400" />
                  Blood Bank Cross-Match
                </div>
                <div className="text-xs font-bold text-white mt-1">4 Units O-Neg PRBC</div>
                <div className="text-[10px] text-emerald-400">Unmatched Pack Thawing</div>
              </div>
            </div>

            {/* Clinical Context Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              
              {/* Critical Allergies */}
              <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-3.5">
                <div className="text-xs font-bold text-rose-300 uppercase tracking-wider font-mono flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  Critical Allergies
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  <li className="flex items-start gap-1.5">
                    <span className="text-rose-400 font-bold">•</span>
                    <div>
                      <strong className="text-white">Penicillin:</strong> Anaphylaxis & Angioedema
                    </div>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-rose-400 font-bold">•</span>
                    <div>
                      <strong className="text-white">NSAIDs / Aspirin:</strong> Severe Bronchospasm
                    </div>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-rose-400 font-bold">•</span>
                    <div>
                      <strong className="text-white">Sulfa Drugs:</strong> Cutaneous Reaction
                    </div>
                  </li>
                </ul>
              </div>

              {/* Current Active Medications */}
              <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-3.5">
                <div className="text-xs font-bold text-blue-300 uppercase tracking-wider font-mono flex items-center gap-1.5 mb-2">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  Active Medications
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  <li className="flex items-start gap-1.5">
                    <span className="text-blue-400 font-bold">•</span>
                    <div>
                      <strong className="text-white">Metformin:</strong> 500mg BID (T2DM)
                    </div>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-blue-400 font-bold">•</span>
                    <div>
                      <strong className="text-white">Atorvastatin:</strong> 20mg QHS (CAD)
                    </div>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-blue-400 font-bold">•</span>
                    <div>
                      <strong className="text-white">Amlodipine:</strong> 5mg OD (HTN)
                    </div>
                  </li>
                </ul>
              </div>

              {/* Past Medical History */}
              <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-3.5">
                <div className="text-xs font-bold text-purple-300 uppercase tracking-wider font-mono flex items-center gap-1.5 mb-2">
                  <Activity className="w-3.5 h-3.5 text-purple-400" />
                  Past Medical History
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  <li className="flex items-start gap-1.5">
                    <span className="text-purple-400 font-bold">•</span>
                    <div>
                      <strong className="text-white">Prior MI (2021):</strong> DES Stent to RCA
                    </div>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-purple-400 font-bold">•</span>
                    <div>
                      <strong className="text-white">Type 2 Diabetes:</strong> 10+ yrs history
                    </div>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-purple-400 font-bold">•</span>
                    <div>
                      <strong className="text-white">Hypertension:</strong> Stage 2 Essential
                    </div>
                  </li>
                </ul>
              </div>

            </div>

            {/* 10-Minute Acute Vitals Delta Trend */}
            <div className="mt-5 pt-4 border-t border-slate-700/60">
              <div className="flex justify-between items-center mb-3">
                <div className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  10-Minute Delta Snapshot Stream (Acute Decompensation)
                </div>
                <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                  Shock Index Worsening: 0.80 → 1.73
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                {vitalsTrend.map((v, i) => (
                  <div key={i} className={`p-2.5 rounded-xl border font-mono text-center transition-all ${
                    i === vitalsTrend.length - 1 
                      ? 'bg-rose-500/20 border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.3)]' 
                      : 'bg-slate-900/50 border-slate-800'
                  }`}>
                    <div className="text-[10px] text-slate-400 font-bold">{v.t}</div>
                    <div className="text-sm font-black text-white mt-0.5">{v.hr} <span className="text-[8px] font-normal text-slate-400">bpm</span></div>
                    <div className="text-xs font-semibold text-rose-400">{v.spo2}% SpO2</div>
                    <div className="text-[10px] text-slate-300 mt-1">{v.sbp} SBP</div>
                    <div className="text-[9px] font-bold text-amber-400 mt-0.5">SI {v.shockIndex}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Bar */}
            <div className="mt-5 flex flex-wrap justify-between items-center gap-3 pt-3 border-t border-slate-700/60">
              <button 
                onClick={() => setShowFhirModal(true)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold rounded-xl border border-cyan-500/30 flex items-center gap-2 transition-all"
              >
                <FileText className="w-3.5 h-3.5" />
                Export ABDM FHIR R4 Bundle
              </button>

              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Zero Plaintext on Hub | WebCrypto In-Browser Decrypt</span>
              </div>
            </div>

          </div>

          {/* India Health Commercialization Pitch Card */}
          <div className="bg-[#182334] rounded-2xl border border-slate-700/60 p-5 shadow-lg">
            <h2 className="text-xs font-black uppercase tracking-wider text-amber-400 font-mono mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Why Fleets & District Hospitals Pay for This (Indian Health Stack)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                <div className="font-bold text-white mb-1">1. Zero-Knowledge Handoff</div>
                Ambulance arrival is currently blind in 90% of rural and tier-2 trauma centers. Pre-arrival handoff frees up the first 15 critical minutes of resus.
              </div>
              <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                <div className="font-bold text-white mb-1">2. ABHA / ABDM Native</div>
                Uses standard 14-digit ABHA numbers and FHIR R4 document bundles, plugging directly into India's national health stack without vendor lock-in.
              </div>
              <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                <div className="font-bold text-white mb-1">3. Offline-First Hardware Moat</div>
                Works even when cellular networks fail through LoRa/mesh key exchange and patient-held offline cryptographic credentials.
              </div>
            </div>
          </div>

        </div>

        {/* ================= COLUMN 3: SHAMIR 2-OF-3 BREAK-GLASS ================= */}
        <div className="space-y-6">

          <div className="bg-[#182334] rounded-2xl border border-amber-500/30 p-5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl" />

            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white m-0">Shamir Break-Glass (2 of 3)</h3>
                <p className="text-[10px] text-amber-200/80 font-mono">Unconscious Trauma Override Protocol</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              When a trauma patient is unconscious and unable to provide biometric or PIN consent, access requires a cryptographic quorum of <strong>any 2 out of 3 authorized roles</strong>.
            </p>

            {/* Share Selection Checklist */}
            <div className="space-y-2 mb-4">
              {shamirShareOptions.map(share => {
                const isSelected = selectedShares.includes(share.id);
                return (
                  <div 
                    key={share.id}
                    onClick={() => toggleShare(share.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-amber-500/10 border-amber-500/60 text-white' 
                        : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          isSelected ? 'bg-amber-400 border-amber-400 text-slate-900' : 'border-slate-600'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="text-xs font-bold">{share.role}</span>
                      </div>
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-amber-400/20">
                        {share.badge}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 pl-6 font-mono">
                      {share.holder}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quorum Progress Indicator */}
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 mb-4">
              <div className="flex justify-between text-xs font-mono mb-1.5">
                <span className="text-slate-400">Cryptographic Quorum:</span>
                <span className={`font-bold ${selectedShares.length >= 2 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {selectedShares.length} / 2 SHARES ACTIVE
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    selectedShares.length >= 2 ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                  style={{ width: `${Math.min(100, (selectedShares.length / 2) * 100)}%` }}
                />
              </div>
            </div>

            {/* Trigger Button */}
            <button
              onClick={handleExecuteBreakGlass}
              disabled={selectedShares.length < 2 || breakGlassState.unlocked}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                breakGlassState.unlocked
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                  : selectedShares.length >= 2
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/20 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              {breakGlassState.unlocked ? (
                <>
                  <Unlock className="w-4 h-4 text-emerald-400" />
                  Quorum Satisfied (Decrypted)
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  Execute 2-of-3 Break-Glass
                </>
              )}
            </button>

            {/* Break-Glass Audit Evidence Log */}
            {breakGlassState.unlocked && (
              <div className="mt-4 p-3.5 bg-emerald-950/30 border border-emerald-500/40 rounded-xl space-y-2 animate-fadeIn">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  BREAK_GLASS_UNLOCKED
                </div>
                <div className="text-[10px] font-mono text-slate-300 space-y-1">
                  <div>Audit Sequence: <strong className="text-white">Seq #{breakGlassState.auditSeq}</strong></div>
                  <div>HMAC Hash: <span className="text-cyan-300">a8671f...4b5</span></div>
                  <div>Ephemeral Key Token: <span className="text-amber-300">{breakGlassState.token}</span></div>
                  <div>Timestamp: <span className="text-slate-400">{breakGlassState.timestamp}</span></div>
                </div>
                <div className="text-[9px] text-emerald-400/90 italic pt-1 border-t border-emerald-500/20">
                  Permanent audit record appended to SQLite WAL audit.db hash chain. Regulators & hospital compliance verified.
                </div>
              </div>
            )}

            {/* CDSCO / Clinical Disclaimer */}
            <div className="mt-4 p-2.5 bg-slate-900/50 rounded-lg border border-slate-800 text-[10px] text-slate-400 leading-normal">
              <strong className="text-amber-300">Regulatory Disclaimer:</strong> "Decision support, not a diagnosis. Alerting and handoff support only. CDSCO Class A/B Software Under Clinical Trial Protocol."
            </div>

          </div>

        </div>

      </div>

      {/* ================= FHIR R4 / ABDM EXPORT MODAL ================= */}
      {showFhirModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141f32] border border-cyan-500/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-700">
              <div>
                <h3 className="text-sm font-black text-white font-mono flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  ABDM FHIR R4 Pre-Arrival Bundle Export
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">National NRCeS Emergency Record Specification</p>
              </div>
              <button 
                onClick={() => setShowFhirModal(false)}
                className="text-slate-400 hover:text-white text-xs font-mono px-2 py-1 bg-slate-800 rounded"
              >
                ✕ Close
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 max-h-96 overflow-y-auto font-mono text-xs text-emerald-400 leading-relaxed">
              <pre>{JSON.stringify(sampleFhirBundle, null, 2)}</pre>
            </div>

            <div className="mt-4 flex justify-between items-center">
              <div className="text-[11px] text-slate-400 font-mono">
                Profile: EmergencyDischargeSummary (v4.0.1)
              </div>
              <button
                onClick={handleCopyFhir}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-2 transition-all font-mono"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied to Clipboard' : 'Copy FHIR JSON'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
