import React, { useState, useEffect } from 'react';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Send, 
  ShieldCheck, 
  FileText, 
  Wifi, 
  WifiOff, 
  Clock, 
  Lock,
  CheckCircle2
} from 'lucide-react';
import { HubApi } from '../mock/hubApi';

export const ConsultationView: React.FC = () => {
  const [inCall, setInCall] = useState(false);
  const [cameraActive, setCameraActive] = useState(true);
  const [micActive, setMicActive] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [consultMessages, setConsultMessages] = useState<{
    id: string;
    sender: 'doctor' | 'patient';
    text: string;
    ts: number;
    queued?: boolean;
    encrypted: boolean;
  }[]>([
    {
      id: 'm1',
      sender: 'patient',
      text: '[Encrypted Clinical Share]: Patient consented to share SpO2 and Pulse waveform history.',
      ts: Date.now() - 120000,
      encrypted: true
    },
    {
      id: 'm2',
      sender: 'doctor',
      text: 'Dr. Harshavardhan here. I see your heart rate has peaked at 138 bpm. Please remain seated and calm while ambulance AMB-1081 approaches.',
      ts: Date.now() - 60000,
      encrypted: true
    }
  ]);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Flush queued messages when reconnecting
      setConsultMessages(prev => prev.map(m => m.queued ? { ...m, queued: false } : m));
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleStartConsultation = () => {
    setInCall(true);
    HubApi.appendAuditRecord('CONSULT_STARTED', {
      doctor: 'DR-HARSHAVARDHAN',
      patient: 'WARD-A-BED3',
      channel: isOnline ? 'WEBRTC_P2P' : 'OFFLINE_STORE_AND_FORWARD',
      ts: Date.now()
    });
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const newMsg = {
      id: `msg-${Date.now()}`,
      sender: 'doctor' as const,
      text: inputText.trim(),
      ts: Date.now(),
      queued: !isOnline,
      encrypted: true
    };

    setConsultMessages(prev => [...prev, newMsg]);
    setInputText('');
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Title & Online/Offline Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Video size={22} color="#f472b6" />
            Tele-Consultation & Encrypted Channel
          </h2>
          <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '2px' }}>
            WebRTC Peer-to-Peer when online • Store-and-forward encrypted queue when offline
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: isOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${isOnline ? '#10b981' : '#ef4444'}`,
          padding: '4px 10px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 600,
          color: isOnline ? '#34d399' : '#f87171'
        }}>
          {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
          {isOnline ? 'Online (WebRTC Direct Signaling)' : 'Offline (Store-and-Forward Sync Active)'}
        </div>
      </div>

      {/* Main Grid: Video Stream / Call Canvas + Encrypted Chat */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        {/* Video Canvas / Call Container */}
        <div style={{
          backgroundColor: '#111827',
          border: '1px solid #374151',
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '450px'
        }}>
          <div style={{
            flex: 1,
            backgroundColor: '#0a0e17',
            borderRadius: '6px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
            {inCall ? (
              <div style={{ textAlign: 'center', width: '100%', height: '100%', position: 'relative' }}>
                {/* Simulated Doctor Video Canvas */}
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column'
                }}>
                  <div style={{
                    width: '90px',
                    height: '90px',
                    borderRadius: '50%',
                    backgroundColor: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                    color: '#fff',
                    marginBottom: '12px'
                  }}>
                    👨‍⚕️
                  </div>
                  <strong style={{ fontSize: '15px' }}>Dr. Harshavardhan (You)</strong>
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>Connected to: WARD-A-BED3 (Patient)</div>
                  <div style={{ fontSize: '11px', color: '#34d399', marginTop: '4px' }}>
                    WebCrypto End-to-End Encrypted Call
                  </div>
                </div>

                {/* Patient PiP Preview */}
                <div style={{
                  position: 'absolute',
                  bottom: '16px',
                  right: '16px',
                  width: '120px',
                  height: '80px',
                  backgroundColor: '#374151',
                  borderRadius: '6px',
                  border: '2px solid #38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px'
                }}>
                  🤒
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>
                <Video size={48} color="#6b7280" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: '14px', fontWeight: 600 }}>No Active Consultation Session</p>
                <p style={{ fontSize: '12px', marginTop: '4px' }}>
                  Click below to start an end-to-end encrypted session with the patient.
                </p>
                <button
                  onClick={handleStartConsultation}
                  style={{
                    marginTop: '16px',
                    backgroundColor: '#0284c7',
                    color: '#fff',
                    padding: '8px 18px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600
                  }}
                >
                  Start WebRTC / Offline Session
                </button>
              </div>
            )}
          </div>

          {/* Media Controls */}
          {inCall && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '14px' }}>
              <button
                onClick={() => setCameraActive(!cameraActive)}
                style={{
                  backgroundColor: cameraActive ? '#1f2937' : '#dc2626',
                  color: '#fff',
                  padding: '10px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {cameraActive ? <Video size={18} /> : <VideoOff size={18} />}
              </button>

              <button
                onClick={() => setMicActive(!micActive)}
                style={{
                  backgroundColor: micActive ? '#1f2937' : '#dc2626',
                  color: '#fff',
                  padding: '10px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {micActive ? <Mic size={18} /> : <MicOff size={18} />}
              </button>

              <button
                onClick={() => setInCall(false)}
                style={{
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  padding: '10px 18px',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: 600
                }}
              >
                <PhoneOff size={16} /> End Call
              </button>
            </div>
          )}
        </div>

        {/* Encrypted Messaging Queue */}
        <div style={{
          backgroundColor: '#111827',
          border: '1px solid #374151',
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          height: '450px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            borderBottom: '1px solid #374151',
            paddingBottom: '8px'
          }}>
            <strong style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={14} color="#34d399" />
              E2EE Consultation Notes
            </strong>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>WebCrypto Wrapped</span>
          </div>

          {/* Messages list */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
            {consultMessages.map(msg => (
              <div
                key={msg.id}
                style={{
                  alignSelf: msg.sender === 'doctor' ? 'flex-end' : 'flex-start',
                  backgroundColor: msg.sender === 'doctor' ? '#1e3a8a' : '#1f2937',
                  border: msg.queued ? '1px dashed #f59e0b' : '1px solid transparent',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  maxWidth: '85%'
                }}
              >
                <div style={{ fontSize: '12px', color: '#f3f4f6' }}>{msg.text}</div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '10px',
                  color: '#9ca3af',
                  marginTop: '4px'
                }}>
                  {msg.queued ? (
                    <span style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Clock size={10} /> Queued (Offline)
                    </span>
                  ) : (
                    <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <CheckCircle2 size={10} /> Sent
                    </span>
                  )}
                  <span>• {new Date(msg.ts).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <input
              type="text"
              placeholder={isOnline ? "Type encrypted message..." : "Type message (will queue offline)..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              style={{
                flex: 1,
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '6px',
                padding: '8px 12px',
                color: '#f9fafb',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <button
              onClick={handleSendMessage}
              style={{
                backgroundColor: '#0284c7',
                color: '#fff',
                padding: '8px 14px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
