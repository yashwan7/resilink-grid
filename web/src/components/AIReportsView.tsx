import React, { useState } from 'react';
import { 
  FileText, 
  BrainCircuit, 
  Volume2, 
  VolumeX, 
  Copy, 
  Check, 
  Download, 
  Sparkles, 
  ShieldCheck, 
  AlertTriangle 
} from 'lucide-react';
import { SUPPORTED_LANGUAGES, translateWithSarvam } from '../services/sarvamAi';

interface AIReportsViewProps {
  onOpenDownloadModal?: () => void;
}

export const AIReportsView: React.FC<AIReportsViewProps> = ({ onOpenDownloadModal }) => {
  const [selectedLang, setSelectedLang] = useState('hi-IN');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const reportText = `[CLINICAL TRIAGE REPORT - PT-101 (WARD A)]
Triage Category: IMMEDIATE (RED - P0)
Priority Score: 94.2 / 100
NEWS2 Clinical Score: 8 (HIGH RISK)
Physiological State: Severe Hypoxia with Compensatory Tachycardia.
Heart Rate: 138 bpm | SpO2: 86% | Systolic BP: 88 mmHg | Resp: 30 bpm

[TACTICAL INTERVENTION PROTOCOL]
1. High-flow oxygen supplementation immediately via non-rebreather mask (15 L/min).
2. IV Tranexamic Acid (TXA) 1g infusion over 10 minutes if internal hemorrhage suspected.
3. Prepare for rapid sequence intubation if SpO2 remains < 88% after 5 minutes.
4. Notify Trauma Receiving Team at Victoria Central Hospital (Ambulance AMB-1081 dispatched).

"Decision support, not a diagnosis. AI predicts, rules decide, logs prove."`;

  const handlePlayAudio = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported on this browser.');
      return;
    }
    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(reportText);
    utterance.lang = selectedLang;
    utterance.rate = 0.95;
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);
    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopy = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div className="nm-flat" style={{ padding: '20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
            <BrainCircuit style={{ width: '22px', height: '22px' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              AI CLINICAL REPORTS &amp; SOVEREIGN SARVAM VOICE
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              Nirantara Edge SLM &bull; Delay-Aware Triage Synthesis &bull; 10 Indic Dialects
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select
            value={selectedLang}
            onChange={(e) => setSelectedLang(e.target.value)}
            className="nm-btn"
            style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 700 }}
          >
            {SUPPORTED_LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.nativeName} ({lang.name})
              </option>
            ))}
          </select>

          <button
            onClick={handlePlayAudio}
            className="nm-btn-accent"
            style={{ padding: '8px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {isPlayingAudio ? (
              <>
                <VolumeX style={{ width: '15px', height: '15px' }} />
                STOP VOICE
              </>
            ) : (
              <>
                <Volume2 style={{ width: '15px', height: '15px' }} />
                SPEAK (SARVAM)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Report Card */}
      <div className="nm-flat" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText style={{ width: '18px', height: '18px', color: '#2563eb' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Synthesized Clinical Dossier
            </h3>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleCopy}
              className="nm-btn"
              style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              {copied ? <Check style={{ width: '13px', height: '13px', color: '#10b981' }} /> : <Copy style={{ width: '13px', height: '13px' }} />}
              {copied ? 'COPIED' : 'COPY REPORT'}
            </button>
            {onOpenDownloadModal && (
              <button
                onClick={onOpenDownloadModal}
                className="nm-btn"
                style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Download style={{ width: '13px', height: '13px' }} />
                EXPORT FILE
              </button>
            )}
          </div>
        </div>

        {/* Content Box */}
        <div className="nm-inset" style={{ padding: '16px', fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap', color: '#1e293b' }}>
          {reportText}
        </div>

        {/* Clinical Disclaimer */}
        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#64748b' }}>
          <ShieldCheck style={{ width: '15px', height: '15px', color: '#10b981' }} />
          <span>Research prototype, not a medical device. All patient telemetry simulated. NEWS2 &amp; ML outputs represent decision support, not a clinical diagnosis.</span>
        </div>
      </div>
    </div>
  );
};
