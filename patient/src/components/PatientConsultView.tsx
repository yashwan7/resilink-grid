import React, { useState } from 'react';
import { 
  Video, 
  Send, 
  Clock, 
  CheckCircle2, 
  Lock, 
  Wifi, 
  WifiOff, 
  FileText,
  Share2
} from 'lucide-react';

interface PatientConsultViewProps {
  isOnline: boolean;
}

export const PatientConsultView: React.FC<PatientConsultViewProps> = ({ isOnline }) => {
  const [messages, setMessages] = useState<{
    id: string;
    sender: 'patient' | 'doctor';
    text: string;
    ts: number;
    queued?: boolean;
  }[]>([
    {
      id: 'm1',
      sender: 'doctor' as const,
      text: 'Dr. Harshavardhan here. I am monitoring your telemetry stream. How are you feeling right now?',
      ts: Date.now() - 180000
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [shareVitalsConsented, setShareVitalsConsented] = useState(true);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const newMsg = {
      id: `msg-${Date.now()}`,
      sender: 'patient' as const,
      text: inputText.trim(),
      ts: Date.now(),
      queued: !isOnline
    };

    setMessages(prev => [...prev, newMsg]);
    setInputText('');
  };

  const handleShareVitalsSnapshot = () => {
    const snapshotMsg = {
      id: `snap-${Date.now()}`,
      sender: 'patient' as const,
      text: '📋 [Consented Snapshot]: Shared encrypted 60s vitals timeline and SpO2 delta history.',
      ts: Date.now(),
      queued: !isOnline
    };
    setMessages(prev => [...prev, snapshotMsg]);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Consultation with Dr. Harshavardhan</h2>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>
            Encrypted Channel • Selective clinical data sharing
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: isOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: isOnline ? '#34d399' : '#f87171',
          border: `1px solid ${isOnline ? '#10b981' : '#ef4444'}`,
          padding: '4px 10px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 600
        }}>
          {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
          {isOnline ? 'Online (Direct E2EE Call)' : 'Offline (Messages Queued Locally)'}
        </div>
      </div>

      {/* Share Vitals Banner */}
      <div style={{
        backgroundColor: '#0f172a',
        border: '1px solid #334155',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#e2e8f0' }}>
          <Share2 size={16} color="#38bdf8" />
          <span>Share latest vitals snapshot with doctor?</span>
        </div>
        <button
          onClick={handleShareVitalsSnapshot}
          style={{
            backgroundColor: '#0284c7',
            color: '#fff',
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600
          }}
        >
          Send Encrypted Vitals Snapshot
        </button>
      </div>

      {/* Chat Container */}
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
          {messages.map(m => (
            <div
              key={m.id}
              style={{
                alignSelf: m.sender === 'patient' ? 'flex-end' : 'flex-start',
                backgroundColor: m.sender === 'patient' ? '#0369a1' : '#1e293b',
                border: m.queued ? '1px dashed #f59e0b' : '1px solid transparent',
                borderRadius: '8px',
                padding: '10px 14px',
                maxWidth: '80%',
                fontSize: '13px',
                color: '#f8fafc'
              }}
            >
              <div>{m.text}</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
                {m.queued ? (
                  <span style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Clock size={10} /> Queued (Offline)
                  </span>
                ) : (
                  <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <CheckCircle2 size={10} /> Delivered
                  </span>
                )}
                <span>• {new Date(m.ts).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <input
            type="text"
            placeholder={isOnline ? "Type encrypted message to doctor..." : "Type message (will store & forward when online)..."}
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
            onClick={handleSend}
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
