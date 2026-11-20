import React, { useState } from 'react';
import { 
  MessageSquare, 
  Mic, 
  MicOff, 
  X, 
  Send, 
  ShieldCheck, 
  Radio, 
  Bot, 
  AlertCircle,
  Globe,
  Volume2,
  VolumeX,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { HubApi } from '../mock/hubApi';
import { SUPPORTED_LANGUAGES, translateWithSarvam } from '../services/sarvamAi';

interface GrootHubDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GrootHubDrawer: React.FC<GrootHubDrawerProps> = ({ isOpen, onClose }) => {
  const [selectedLang, setSelectedLang] = useState<string>('en-IN');
  const [messages, setMessages] = useState<{
    sender: 'user' | 'groot';
    text: string;
    ts: number;
  }[]>([
    {
      sender: 'groot',
      text: 'I am Groot, Hub Operational Advisor (Powered by Sarvam AI). I provide answers on radio link status, active routes, hash chain validity, and ambulance dispatch. "Decision support, not a diagnosis". How may I assist staff?',
      ts: Date.now() - 30000
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [listening, setListening] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleSpeakText = (text: string, index: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported on this browser.');
      return;
    }
    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectedLang;
    utterance.rate = 0.95;
    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);
    setSpeakingIndex(index);
    window.speechSynthesis.speak(utterance);
  };

  const handleSendQuery = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    const userMsg = { sender: 'user' as const, text: query, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    // Append GROOT_QUERY to Hub audit chain
    HubApi.appendAuditRecord('GROOT_QUERY', {
      query,
      ts: Date.now(),
      scope: 'HUB_AGGREGATES_ONLY',
      language: selectedLang
    });

    setTranslating(true);
    let reply = 'I am Groot. ';
    const lower = query.toLowerCase();

    if (lower.includes('link') || lower.includes('route') || lower.includes('path')) {
      reply += 'Link state is HEALTHY on PORT_A Wi-Fi. PDR is 96.8%, RSSI -62 dBm. Next fallback is PORT_B then MESH nRF24.';
    } else if (lower.includes('ambulance') || lower.includes('free') || lower.includes('dispatch')) {
      reply += 'There are currently 2 ambulances FREE: AMB-1081 (KR Market, 1.2 km away) and AMB-1082 (Chamrajpet, 1.8 km away).';
    } else if (lower.includes('hospital') || lower.includes('bed') || lower.includes('icu') || lower.includes('oxygen')) {
      reply += 'Victoria Hospital has 18 beds and 4 ICU beds free. Manipal HAL has 45 beds and 11 ICU beds free. Oxygen reserves are 95%.';
    } else if (lower.includes('blood') || lower.includes('hemo') || lower.includes('transfusion')) {
      reply += 'Blood Bank status: O- is at 3 units (CRITICAL). A+ is at 34 units (Plentiful). Plasma units: 45 available.';
    } else if (lower.includes('audit') || lower.includes('chain') || lower.includes('tamper')) {
      reply += 'Hub HMAC/SHA-256 audit chain is valid. All records up to sequence #2 are cryptographically intact.';
    } else if (lower.includes('p0') || lower.includes('alert') || lower.includes('patient') || lower.includes('critical')) {
      reply += 'P0 alert recorded on node MCXN-001 (Ward A). Patient in severe hypoxia with compensatory tachycardia. Vitals: SpO2 86%, HR 138 bpm.';
    } else {
      reply += `Acknowledged query: "${query}". All operational systems normal. Nearest free ambulance is AMB-1081. "Decision support, not a diagnosis".`;
    }

    try {
      const translatedReply = await translateWithSarvam(reply, selectedLang);
      setMessages(prev => [...prev, {
        sender: 'groot',
        text: translatedReply,
        ts: Date.now()
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        sender: 'groot',
        text: reply,
        ts: Date.now()
      }]);
    } finally {
      setTranslating(false);
    }
  };

  const quickChips = [
    'Check P0 Critical Patients',
    'Nearest Free Ambulance',
    'Hospital ICU & Oxygen Status',
    'Blood Bank O- Units',
    'Verify Hub Audit Chain'
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: '440px',
      maxWidth: '100vw',
      backgroundColor: '#ffffff',
      boxShadow: '-8px 0 32px rgba(15, 23, 42, 0.2)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      borderLeft: '1px solid #e2e8f0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif'
    }}>
      {/* ResQMesh Tactical Header */}
      <div style={{
        background: 'linear-gradient(135deg, #14284b 0%, #1a3666 50%, #204482 100%)',
        color: '#ffffff',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #06b6d4, #2563eb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <Bot style={{ width: '20px', height: '20px' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0, letterSpacing: '0.5px' }}>
                GROOT AI ADVISOR
              </h3>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px rgba(52, 211, 153, 0.8)' }} />
            </div>
            <span style={{ fontSize: '11px', color: '#93c5fd', fontFamily: 'monospace' }}>
              Sarvam AI Multilingual Voice
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: '8px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            cursor: 'pointer'
          }}
        >
          <X style={{ width: '18px', height: '18px' }} />
        </button>
      </div>

      {/* Language Selector Bar */}
      <div style={{
        padding: '10px 16px',
        backgroundColor: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
          <Globe style={{ width: '14px', height: '14px', color: '#2563eb' }} />
          <span>SARVAM VOICE:</span>
        </div>
        <select
          value={selectedLang}
          onChange={(e) => setSelectedLang(e.target.value)}
          className="nm-btn"
          style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 700 }}
        >
          {SUPPORTED_LANGUAGES.map(lang => (
            <option key={lang.code} value={lang.code}>
              {lang.nativeName} ({lang.name})
            </option>
          ))}
        </select>
      </div>

      {/* Quick Prompt Chips */}
      <div style={{
        padding: '8px 16px',
        backgroundColor: '#f1f5f9',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        gap: '6px',
        overflowX: 'auto',
        whiteSpace: 'nowrap'
      }}>
        {quickChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSendQuery(chip)}
            className="nm-btn"
            style={{ padding: '4px 8px', fontSize: '10px', fontWeight: 600, flexShrink: 0 }}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Messages Stream */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        backgroundColor: '#eef2f7'
      }}>
        {messages.map((msg, idx) => {
          const isGroot = msg.sender === 'groot';

          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isGroot ? 'flex-start' : 'flex-end'
              }}
            >
              <div
                className={isGroot ? 'nm-flat' : 'nm-btn-accent'}
                style={{
                  maxWidth: '85%',
                  padding: '12px 14px',
                  borderRadius: '14px',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  color: isGroot ? '#0f172a' : '#ffffff',
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)'
                }}
              >
                {msg.text}
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '4px',
                padding: '0 4px',
                fontSize: '10px',
                color: '#94a3b8'
              }}>
                <span>{new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                {isGroot && (
                  <button
                    onClick={() => handleSpeakText(msg.text, idx)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: speakingIndex === idx ? '#ef4444' : '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontSize: '10px',
                      fontWeight: 600
                    }}
                  >
                    {speakingIndex === idx ? <VolumeX style={{ width: '12px', height: '12px' }} /> : <Volume2 style={{ width: '12px', height: '12px' }} />}
                    {speakingIndex === idx ? 'Stop' : 'Speak'}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {translating && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '11px', padding: '8px' }}>
            <RefreshCw className="clinical-pulse" style={{ width: '13px', height: '13px', color: '#2563eb' }} />
            <span>Groot is synthesizing response in {selectedLang}...</span>
          </div>
        )}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendQuery();
        }}
        style={{
          padding: '12px 16px',
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask Groot operational questions..."
          className="nm-inset"
          style={{
            flex: 1,
            padding: '10px 14px',
            fontSize: '12px',
            outline: 'none',
            color: '#0f172a'
          }}
        />
        <button
          type="submit"
          className="nm-btn-accent"
          style={{
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '12px'
          }}
        >
          <Send style={{ width: '15px', height: '15px' }} />
        </button>
      </form>
    </div>
  );
};
