import React, { useState, useEffect } from 'react';
import { Globe, Download, X, Key, Printer, Sparkles } from 'lucide-react';
import { VitalsSample, RiskScore } from '../types';
import { 
  SUPPORTED_LANGUAGES, 
  generateDoctorReportText, 
  triggerFileDownload, 
  getSarvamApiKey, 
  setSarvamApiKey 
} from '../services/sarvamAi';

interface DoctorDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  vitals: VitalsSample;
  risk: RiskScore;
  fineScore: number;
}

export const DoctorDownloadModal: React.FC<DoctorDownloadModalProps> = ({
  isOpen,
  onClose,
  patientId,
  vitals,
  risk,
  fineScore
}) => {
  const [selectedLang, setSelectedLang] = useState<string>('hi-IN');
  const [apiKey, setApiKey] = useState<string>('');
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);
  const [previewText, setPreviewText] = useState<string>('');
  const [downloadFilename, setDownloadFilename] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setApiKey(getSarvamApiKey());
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    generateDoctorReportText(patientId, vitals, risk, fineScore, selectedLang)
      .then(res => {
        setPreviewText(res.text);
        setDownloadFilename(res.filename);
        setLoading(false);
      });
  }, [isOpen, selectedLang, patientId, vitals, risk, fineScore]);

  if (!isOpen) return null;

  const handleSaveKey = () => {
    setSarvamApiKey(apiKey);
    setShowKeyInput(false);
    generateDoctorReportText(patientId, vitals, risk, fineScore, selectedLang)
      .then(res => {
        setPreviewText(res.text);
        setDownloadFilename(res.filename);
      });
  };

  const handleDownload = () => {
    triggerFileDownload(previewText, downloadFilename);
    onClose();
  };

  const activeLangObj = SUPPORTED_LANGUAGES.find(l => l.code === selectedLang) || SUPPORTED_LANGUAGES[0];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 5000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#111827',
        border: '1px solid #374151',
        borderRadius: '12px',
        maxWidth: '700px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #374151',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Globe size={20} color="#06b6d4" />
            <div>
              <strong style={{ fontSize: '16px' }}>Export Clinical Triage Report (Sarvam AI)</strong>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>Multilingual Indian Language Generation</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', color: '#9ca3af' }}><X size={18} /></button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', marginBottom: '8px' }}>
              Select Language:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
              {SUPPORTED_LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => setSelectedLang(lang.code)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: selectedLang === lang.code ? '#0284c7' : '#1f2937',
                    border: selectedLang === lang.code ? '2px solid #38bdf8' : '1px solid #374151',
                    color: '#fff',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{lang.nativeName}</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>{lang.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Key toggle */}
          <div style={{ backgroundColor: '#1f2937', padding: '10px', borderRadius: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Key size={13} color="#fbbf24" />
                Sarvam AI API Key: {apiKey ? '••••••••' + apiKey.slice(-4) : '(Using Built-in High-Fidelity Engine)'}
              </span>
              <button
                onClick={() => setShowKeyInput(!showKeyInput)}
                style={{ background: 'none', color: '#38bdf8', fontSize: '11px', fontWeight: 600, textDecoration: 'underline' }}
              >
                {showKeyInput ? 'Hide' : 'Configure API Key'}
              </button>
            </div>
            {showKeyInput && (
              <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
                <input
                  type="password"
                  placeholder="Paste api-subscription-key..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  style={{ flex: 1, backgroundColor: '#111827', border: '1px solid #374151', padding: '6px', borderRadius: '4px', color: '#fff', fontSize: '12px' }}
                />
                <button
                  onClick={handleSaveKey}
                  style={{ backgroundColor: '#0284c7', color: '#fff', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}
                >
                  Save
                </button>
              </div>
            )}
          </div>

          {/* Live Preview */}
          <div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>
              Live Report Preview in {activeLangObj.name} ({activeLangObj.nativeName}):
            </div>
            <pre style={{
              backgroundColor: '#0a0e17',
              border: '1px solid #1f2937',
              borderRadius: '6px',
              padding: '12px',
              color: '#34d399',
              fontSize: '11px',
              maxHeight: '200px',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace'
            }}>
              {previewText}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid #374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#6b7280' }}>"Decision support, not a diagnosis"</span>
          <button
            onClick={handleDownload}
            style={{
              backgroundColor: '#0284c7',
              color: '#fff',
              padding: '8px 18px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Download size={14} /> Download Report in {activeLangObj.nativeName}
          </button>
        </div>
      </div>
    </div>
  );
};
