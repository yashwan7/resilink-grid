import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Download, 
  Key, 
  X, 
  Check, 
  FileText, 
  Printer, 
  Sparkles,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { VitalsSample, RiskScore } from '../types';
import { GrootAIReport } from '../groot/patientGroot';
import { 
  SUPPORTED_LANGUAGES, 
  SupportedLanguage, 
  generateMultilingualReportText, 
  triggerFileDownload, 
  getSarvamApiKey, 
  setSarvamApiKey 
} from '../services/sarvamAi';

interface DownloadReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  vitals: VitalsSample;
  risk: RiskScore;
  aiReport: GrootAIReport;
}

export const DownloadReportModal: React.FC<DownloadReportModalProps> = ({
  isOpen,
  onClose,
  vitals,
  risk,
  aiReport
}) => {
  const [selectedLang, setSelectedLang] = useState<string>('hi-IN');
  const [apiKey, setApiKey] = useState<string>('');
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);
  const [previewText, setPreviewText] = useState<string>('');
  const [downloadFilename, setDownloadFilename] = useState<string>('');

  useEffect(() => {
    setApiKey(getSarvamApiKey());
  }, [isOpen]);

  // Update preview whenever selected language changes
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setGenerating(true);

    generateMultilingualReportText(vitals, risk, aiReport, selectedLang)
      .then(result => {
        if (isMounted) {
          setPreviewText(result.text);
          setDownloadFilename(result.filename);
          setGenerating(false);
        }
      })
      .catch(err => {
        console.error("Report generation error:", err);
        if (isMounted) setGenerating(false);
      });

    return () => { isMounted = false; };
  }, [isOpen, selectedLang, vitals, risk, aiReport]);

  if (!isOpen) return null;

  const handleSaveApiKey = () => {
    setSarvamApiKey(apiKey);
    setShowKeyInput(false);
    // Regenerate report with new key
    setGenerating(true);
    generateMultilingualReportText(vitals, risk, aiReport, selectedLang)
      .then(res => {
        setPreviewText(res.text);
        setDownloadFilename(res.filename);
        setGenerating(false);
      });
  };

  const handleDownload = () => {
    if (!previewText) return;
    triggerFileDownload(previewText, downloadFilename || `RESILINK_Report_${selectedLang}.txt`);
    onClose();
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${downloadFilename}</title>
            <style>
              body { font-family: monospace; white-space: pre-wrap; padding: 20px; font-size: 13px; color: #111; }
            </style>
          </head>
          <body>${previewText}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const activeLangObj = SUPPORTED_LANGUAGES.find(l => l.code === selectedLang) || SUPPORTED_LANGUAGES[0];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(3, 7, 18, 0.88)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 6000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#0f172a',
        border: '1px solid #334155',
        borderRadius: '12px',
        maxWidth: '720px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #334155',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              <Globe size={18} />
            </div>
            <div>
              <strong style={{ fontSize: '16px', color: '#f8fafc' }}>
                Download Multilingual Medical Report
              </strong>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                Powered by <strong>Sarvam AI</strong> Multilingual Engine
              </div>
            </div>
          </div>

          <button onClick={onClose} style={{ background: 'none', color: '#94a3b8', fontSize: '18px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Step 1: Language Selector Grid */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} color="#38bdf8" />
              1. Choose Report Language (Indian Languages via Sarvam AI):
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: '8px'
            }}>
              {SUPPORTED_LANGUAGES.map(lang => {
                const isSelected = selectedLang === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => setSelectedLang(lang.code)}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      backgroundColor: isSelected ? '#0369a1' : '#1e293b',
                      border: isSelected ? '2px solid #38bdf8' : '1px solid #334155',
                      color: isSelected ? '#fff' : '#cbd5e1',
                      textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{lang.nativeName}</div>
                    <div style={{ fontSize: '11px', color: isSelected ? '#e0f2fe' : '#94a3b8' }}>
                      {lang.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sarvam AI Key Configuration Toggle */}
          <div style={{
            backgroundColor: '#1e293b',
            borderRadius: '8px',
            padding: '10px 14px',
            border: '1px solid #334155'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Key size={13} color="#fbbf24" />
                Sarvam AI API Key: {apiKey ? '••••••••' + apiKey.slice(-4) : '(Using Built-in High-Fidelity Engine)'}
              </span>
              <button
                onClick={() => setShowKeyInput(!showKeyInput)}
                style={{
                  background: 'none',
                  color: '#38bdf8',
                  fontSize: '11px',
                  fontWeight: 600,
                  textDecoration: 'underline'
                }}
              >
                {showKeyInput ? 'Hide' : 'Configure API Key'}
              </button>
            </div>

            {showKeyInput && (
              <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                <input
                  type="password"
                  placeholder="Paste your api-subscription-key from api.sarvam.ai..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  style={{
                    flex: 1,
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <button
                  onClick={handleSaveApiKey}
                  style={{
                    backgroundColor: '#0284c7',
                    color: '#fff',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600
                  }}
                >
                  Save
                </button>
              </div>
            )}
          </div>

          {/* Step 2: Live Translation Preview */}
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px',
              fontSize: '12px',
              color: '#94a3b8'
            }}>
              <span>2. Live Report Preview ({activeLangObj.name} - {activeLangObj.nativeName}):</span>
              {generating && <span style={{ color: '#38bdf8' }}>Translating with Sarvam AI...</span>}
            </div>

            <pre style={{
              backgroundColor: '#030712',
              border: '1px solid #1e293b',
              borderRadius: '8px',
              padding: '14px',
              color: '#34d399',
              fontSize: '12px',
              lineHeight: 1.5,
              maxHeight: '220px',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace'
            }}>
              {previewText}
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid #334155',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#0f172a',
          borderBottomLeftRadius: '12px',
          borderBottomRightRadius: '12px'
        }}>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            "Decision support, not a diagnosis"
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handlePrint}
              style={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                color: '#e2e8f0',
                padding: '8px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Printer size={14} /> Print
            </button>

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
              <Download size={15} />
              Download Report in {activeLangObj.nativeName}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
