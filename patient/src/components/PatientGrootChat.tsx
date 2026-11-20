import React, { useState } from 'react';
import { 
  Bot, 
  Send, 
  Mic, 
  ShieldCheck, 
  AlertCircle,
  Globe,
  Sparkles
} from 'lucide-react';
import { VitalsSample, RiskScore } from '../types';
import { answerPatientGrootQuery } from '../groot/patientGroot';
import { SUPPORTED_LANGUAGES, translateWithSarvam } from '../services/sarvamAi';

interface PatientGrootChatProps {
  vitals: VitalsSample;
  risk: RiskScore;
}

export const PatientGrootChat: React.FC<PatientGrootChatProps> = ({ vitals, risk }) => {
  const [selectedLang, setSelectedLang] = useState<string>('hi-IN');
  const [messages, setMessages] = useState<{
    sender: 'user' | 'groot';
    text: string;
    ts: number;
  }[]>([
    {
      sender: 'groot',
      text: 'नमस्ते, मैं ग्रूट हूँ, आपका बहुभाषी स्वास्थ्य साथी (Powered by Sarvam AI)। मैं आपके वाइटल्स को सरल भाषा में समझाता हूँ। "निर्णय सहायता, निदान नहीं"। आप कैसा महसूस कर रहे हैं?',
      ts: Date.now() - 30000
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [translating, setTranslating] = useState(false);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    const userMsg = { sender: 'user' as const, text: query, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    setTranslating(true);
    try {
      // 1. Get clinical guardrailed response from local Groot logic
      const rawAnswer = answerPatientGrootQuery(query, vitals, risk);

      // 2. Translate response to selected Indian language via Sarvam AI
      const translatedAnswer = await translateWithSarvam(rawAnswer, selectedLang);

      setMessages(prev => [...prev, {
        sender: 'groot',
        text: translatedAnswer,
        ts: Date.now()
      }]);
    } catch (err) {
      console.error("Groot response error:", err);
    } finally {
      setTranslating(false);
    }
  };

  const handleVoicePush = () => {
    if (!isListening) {
      setIsListening(true);
      setTimeout(() => {
        setIsListening(false);
        handleSend(selectedLang === 'hi-IN' ? "मेरी हृदय गति क्यों बढ़ी हुई है?" : "Why is my heart rate elevated and what should I do?");
      }, 2000);
    } else {
      setIsListening(false);
    }
  };

  const activeLangObj = SUPPORTED_LANGUAGES.find(l => l.code === selectedLang) || SUPPORTED_LANGUAGES[0];

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Header & Language Selector */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            backgroundColor: '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            <Bot size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Groot Multilingual AI Chatbot</h2>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              Sarvam AI Multilingual Engine • Indian Languages • Privacy Guardrails
            </div>
          </div>
        </div>

        {/* Language Picker Dropdown */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#0f172a',
          padding: '4px 10px',
          borderRadius: '8px',
          border: '1px solid #334155'
        }}>
          <Globe size={15} color="#38bdf8" />
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>Language:</span>
          <select
            value={selectedLang}
            onChange={(e) => {
              const newLang = e.target.value;
              setSelectedLang(newLang);
              const langObj = SUPPORTED_LANGUAGES.find(l => l.code === newLang);
              if (langObj) {
                setMessages(prev => [...prev, {
                  sender: 'groot',
                  text: `${langObj.greeting}! I will now converse with you in ${langObj.name} (${langObj.nativeName}). Powered by Sarvam AI. "Decision support, not a diagnosis".`,
                  ts: Date.now()
                }]);
              }
            }}
            style={{
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #475569',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '12px',
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {SUPPORTED_LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>
                {l.nativeName} ({l.name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Privacy Notice Banner */}
      <div style={{
        backgroundColor: '#0f172a',
        borderLeft: '4px solid #10b981',
        padding: '10px 14px',
        borderRadius: '4px',
        fontSize: '12px',
        color: '#6ee7b7',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '6px'
      }}>
        <span>
          🛡️ <strong>Clinical Privacy Sandbox:</strong> Decrypted physiological vitals remain on your device. Multilingual translation is powered by Sarvam AI.
        </span>
        <span style={{ color: '#38bdf8', fontSize: '11px', fontWeight: 'bold' }}>
          Sarvam AI Active
        </span>
      </div>

      {/* Chat Area */}
      <div style={{
        backgroundColor: '#0f172a',
        border: '1px solid #334155',
        borderRadius: '8px',
        height: '420px',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px'
      }}>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
          {messages.map((m, idx) => (
            <div
              key={idx}
              style={{
                alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                backgroundColor: m.sender === 'user' ? '#0284c7' : '#1e293b',
                color: '#fff',
                borderRadius: '8px',
                padding: '10px 14px',
                maxWidth: '82%',
                fontSize: '13px',
                lineHeight: 1.5
              }}
            >
              <div>{m.text}</div>
              <div style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'right', marginTop: '4px' }}>
                {new Date(m.ts).toLocaleTimeString()}
              </div>
            </div>
          ))}
          {translating && (
            <div style={{ alignSelf: 'flex-start', color: '#38bdf8', fontSize: '12px', fontStyle: 'italic' }}>
              Groot is translating via Sarvam AI in {activeLangObj.nativeName}...
            </div>
          )}
        </div>

        {/* Quick Suggestion Pills */}
        <div style={{ display: 'flex', gap: '6px', margin: '8px 0', overflowX: 'auto', paddingBottom: '4px' }}>
          <button
            onClick={() => handleSend("Explain my current SpO2 level")}
            style={{ backgroundColor: '#1e293b', color: '#38bdf8', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', whiteSpace: 'nowrap' }}
          >
            Explain SpO2
          </button>
          <button
            onClick={() => handleSend("What should I do if my heart rate is high?")}
            style={{ backgroundColor: '#1e293b', color: '#38bdf8', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', whiteSpace: 'nowrap' }}
          >
            High Heart Rate Advice
          </button>
          <button
            onClick={() => handleSend("Can you prescribe medicine for fever?")}
            style={{ backgroundColor: '#1e293b', color: '#f87171', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', whiteSpace: 'nowrap' }}
          >
            Test Dosing Guardrail 🛡️
          </button>
        </div>

        {/* Input Bar */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={handleVoicePush}
            style={{
              backgroundColor: isListening ? '#dc2626' : '#1e293b',
              color: '#fff',
              padding: '10px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={isListening ? "Listening..." : "Push to talk ('Hey Groot')"}
          >
            <Mic size={16} />
          </button>

          <input
            type="text"
            placeholder={`Ask Groot in ${activeLangObj.nativeName} or English...`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            style={{
              flex: 1,
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '10px 14px',
              color: '#fff',
              fontSize: '13px',
              outline: 'none'
            }}
          />

          <button
            onClick={() => handleSend()}
            disabled={translating}
            style={{
              backgroundColor: '#0284c7',
              color: '#fff',
              padding: '10px 16px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
