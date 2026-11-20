import React, { useState } from 'react';
import { 
  Bot, 
  Send, 
  Mic, 
  ShieldCheck, 
  AlertCircle 
} from 'lucide-react';
import { VitalsSample, RiskScore } from '../types';
import { answerPatientGrootQuery } from '../groot/patientGroot';

interface PatientGrootChatProps {
  vitals: VitalsSample;
  risk: RiskScore;
}

export const PatientGrootChat: React.FC<PatientGrootChatProps> = ({ vitals, risk }) => {
  const [messages, setMessages] = useState<{
    sender: 'user' | 'groot';
    text: string;
    ts: number;
  }[]>([
    {
      sender: 'groot',
      text: 'Hello, I am Groot, your on-device health companion. I explain your live vitals in simple terms and offer safe, non-diagnostic guidance. "Decision support, not a diagnosis". How are you feeling?',
      ts: Date.now() - 30000
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);

  const handleSend = (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    const userMsg = { sender: 'user' as const, text: query, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    // Local Guardrailed Response Synthesis
    setTimeout(() => {
      const answer = answerPatientGrootQuery(query, vitals, risk);
      setMessages(prev => [...prev, {
        sender: 'groot',
        text: answer,
        ts: Date.now()
      }]);
    }, 300);
  };

  const handleVoicePush = () => {
    if (!isListening) {
      setIsListening(true);
      setTimeout(() => {
        setIsListening(false);
        handleSend("Why is my heart rate elevated and what should I do?");
      }, 2000);
    } else {
      setIsListening(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '16px'
      }}>
        <div style={{
          width: '36px',
          height: '36px',
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
          <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Local Patient Groot AI</h2>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            On-Device Privacy Sandbox • Strict Non-Diagnostic Guardrails
          </div>
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
        marginBottom: '16px'
      }}>
        🛡️ <strong>Zero-Leak Guarantee:</strong> This conversation and your decrypted vitals are processed locally on your phone/browser. No plaintext is ever transmitted to the hub or external servers.
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
        </div>

        {/* Quick Suggestion Pills */}
        <div style={{ display: 'flex', gap: '6px', margin: '8px 0', overflowX: 'auto', paddingBottom: '4px' }}>
          <button
            onClick={() => handleSend("Explain my current SpO2 level")}
            style={{ backgroundColor: '#1e293b', color: '#38bdf8', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', whiteSpace: 'nowrap' }}
          >
            Explain my SpO2
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
            placeholder="Ask Groot about your health readings..."
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
