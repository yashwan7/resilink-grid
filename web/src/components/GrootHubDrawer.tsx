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
  AlertCircle 
} from 'lucide-react';
import { HubApi } from '../mock/hubApi';

interface GrootHubDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GrootHubDrawer: React.FC<GrootHubDrawerProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<{
    sender: 'user' | 'groot';
    text: string;
    ts: number;
  }[]>([
    {
      sender: 'groot',
      text: 'I am Groot, Hub Operational Advisor. I provide answers on radio link status, active routes, hash chain validity, and ambulance dispatch. "Decision support, not a diagnosis". How may I assist staff?',
      ts: Date.now() - 30000
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [listening, setListening] = useState(false);

  if (!isOpen) return null;

  const handleSendQuery = (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    const userMsg = { sender: 'user' as const, text: query, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    // Append GROOT_QUERY to Hub audit chain
    HubApi.appendAuditRecord('GROOT_QUERY', {
      query,
      ts: Date.now(),
      scope: 'HUB_AGGREGATES_ONLY'
    });

    // Generate deterministic Groot aggregate response
    setTimeout(() => {
      let reply = 'I am Groot. ';
      const lower = query.toLowerCase();

      if (lower.includes('link') || lower.includes('route') || lower.includes('path')) {
        reply += 'Link state is HEALTHY on PORT_A Wi-Fi. PDR is 96.8%, RSSI -62 dBm. Next fallback is PORT_B then MESH nRF24.';
      } else if (lower.includes('ambulance') || lower.includes('free') || lower.includes('dispatch')) {
        reply += 'There are currently 2 ambulances FREE: AMB-1081 (KR Market, 1.2 km away) and AMB-1082 (Chamrajpet, 1.8 km away).';
      } else if (lower.includes('hospital') || lower.includes('bed') || lower.includes('icu')) {
        reply += 'Victoria Hospital has 18 beds and 4 ICU beds free. Manipal HAL has 32 beds and 11 ICU beds free.';
      } else if (lower.includes('audit') || lower.includes('chain') || lower.includes('tamper')) {
        reply += 'Hub HMAC/SHA-256 audit chain is valid. All events up to sequence #2 are cryptographic proofs.';
      } else if (lower.includes('p0') || lower.includes('alert') || lower.includes('patient')) {
        reply += 'P0 alert recorded: node MCXN-001 (Ward A). Strictly adhering to privacy rules: clinical details remain encrypted on-device. "Decision support, not a diagnosis".';
      } else {
        reply += `Acknowledged query: "${query}". All operational systems normal. Nearest free ambulance is AMB-1081. "Decision support, not a diagnosis".`;
      }

      setMessages(prev => [...prev, {
        sender: 'groot',
        text: reply,
        ts: Date.now()
      }]);
    }, 400);
  };

  const handleToggleVoice = () => {
    if (!listening) {
      setListening(true);
      // Simulate voice capture
      setTimeout(() => {
        setListening(false);
        handleSendQuery("What is the current link status and nearest free ambulance?");
      }, 2000);
    } else {
      setListening(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '380px',
      height: '100vh',
      backgroundColor: '#111827',
      borderLeft: '1px solid #374151',
      boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.5)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 2000
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #374151',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1f2937'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bot size={20} color="#38bdf8" />
          <div>
            <strong style={{ fontSize: '15px' }}>Hub Groot (Voice & Chat)</strong>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>Aggregates Only • Advisory</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', color: '#9ca3af', fontSize: '18px' }}>
          <X size={18} />
        </button>
      </div>

      {/* Strict Privacy Principle Notice */}
      <div style={{
        backgroundColor: 'rgba(2, 132, 199, 0.1)',
        borderBottom: '1px solid rgba(2, 132, 199, 0.2)',
        padding: '8px 14px',
        fontSize: '11px',
        color: '#7dd3fc',
        lineHeight: 1.4
      }}>
        🔒 <strong>Hub Groot Boundary:</strong> Groot never receives ciphertext, plaintext or patient keys. Queries only aggregate health, link states & dispatch metrics.
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {messages.map((m, idx) => (
          <div
            key={idx}
            style={{
              alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
              backgroundColor: m.sender === 'user' ? '#0284c7' : '#1f2937',
              color: '#fff',
              borderRadius: '8px',
              padding: '10px 12px',
              maxWidth: '85%',
              fontSize: '12px',
              lineHeight: 1.5
            }}
          >
            {m.text}
            <div style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'right', marginTop: '4px' }}>
              {new Date(m.ts).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Suggestions */}
      <div style={{ padding: '8px 14px', borderTop: '1px solid #1f2937', display: 'flex', gap: '6px', overflowX: 'auto' }}>
        <button
          onClick={() => handleSendQuery("Check link state")}
          style={{ backgroundColor: '#1f2937', color: '#38bdf8', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', whiteSpace: 'nowrap' }}
        >
          Check Link
        </button>
        <button
          onClick={() => handleSendQuery("Nearest free ambulance")}
          style={{ backgroundColor: '#1f2937', color: '#38bdf8', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', whiteSpace: 'nowrap' }}
        >
          Free Ambulances
        </button>
        <button
          onClick={() => handleSendQuery("Verify audit chain")}
          style={{ backgroundColor: '#1f2937', color: '#38bdf8', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', whiteSpace: 'nowrap' }}
        >
          Audit Chain
        </button>
      </div>

      {/* Input Bar */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid #374151', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          onClick={handleToggleVoice}
          style={{
            backgroundColor: listening ? '#dc2626' : '#1f2937',
            color: '#fff',
            padding: '8px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title={listening ? "Listening... (Push to talk)" : "Push to talk ('Hey Groot')"}
        >
          {listening ? <Mic className="animate-spin" size={16} /> : <Mic size={16} />}
        </button>

        <input
          type="text"
          placeholder="Ask Groot (e.g. 'link state', 'free ambulance')..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendQuery()}
          style={{
            flex: 1,
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '6px',
            padding: '8px 12px',
            color: '#fff',
            fontSize: '12px',
            outline: 'none'
          }}
        />

        <button
          onClick={() => handleSendQuery()}
          style={{
            backgroundColor: '#0284c7',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
};
