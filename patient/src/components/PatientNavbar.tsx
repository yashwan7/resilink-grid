import React from 'react';
import { 
  Heart, 
  ShieldCheck, 
  Wifi, 
  WifiOff, 
  ExternalLink,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';

interface PatientNavbarProps {
  currentTab: 'vitals' | 'consult' | 'chat';
  onSelectTab: (tab: 'vitals' | 'consult' | 'chat') => void;
  isOnline: boolean;
  onTriggerSos: () => void;
  riskClass: string;
}

export const PatientNavbar: React.FC<PatientNavbarProps> = ({
  currentTab,
  onSelectTab,
  isOnline,
  onTriggerSos,
  riskClass
}) => {
  return (
    <header style={{
      backgroundColor: '#0f172a',
      borderBottom: '1px solid #334155',
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '12px'
    }}>
      {/* Brand & Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: '#0284c7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff'
        }}>
          <Heart size={20} color="#fca5a5" />
        </div>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '16px', letterSpacing: '0.5px' }}>
            RESILINK <span style={{ color: '#38bdf8' }}>PATIENT</span>
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
            ID: WARD-A-BED3 • Offline PWA Engine
          </div>
        </div>

        {/* Tab Navigation */}
        <nav style={{ display: 'flex', gap: '6px', marginLeft: '16px' }}>
          <button
            onClick={() => onSelectTab('vitals')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              backgroundColor: currentTab === 'vitals' ? '#1e293b' : 'transparent',
              color: currentTab === 'vitals' ? '#38bdf8' : '#94a3b8',
              fontWeight: 600,
              fontSize: '13px'
            }}
          >
            My Vitals
          </button>
          <button
            onClick={() => onSelectTab('consult')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              backgroundColor: currentTab === 'consult' ? '#1e293b' : 'transparent',
              color: currentTab === 'consult' ? '#f472b6' : '#94a3b8',
              fontWeight: 600,
              fontSize: '13px'
            }}
          >
            Doctor Consult
          </button>
          <button
            onClick={() => onSelectTab('chat')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              backgroundColor: currentTab === 'chat' ? '#1e293b' : 'transparent',
              color: currentTab === 'chat' ? '#34d399' : '#94a3b8',
              fontWeight: 600,
              fontSize: '13px'
            }}
          >
            Local Groot AI
          </button>
        </nav>
      </div>

      {/* Right Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Offline / Online badge */}
        <div style={{
          backgroundColor: isOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: isOnline ? '#34d399' : '#f87171',
          border: `1px solid ${isOnline ? '#10b981' : '#ef4444'}`,
          padding: '4px 10px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
          {isOnline ? 'Hub Connected' : 'Offline Mode (Local PWA)'}
        </div>

        {/* Big One-Tap SOS Button */}
        <button
          onClick={onTriggerSos}
          className="pulse-sos-btn"
          style={{
            backgroundColor: '#dc2626',
            color: '#fff',
            padding: '6px 16px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <AlertTriangle size={15} />
          SOS EMERGENCY
        </button>

        {/* Link to Doctor Dashboard */}
        <a
          href="http://localhost:5173"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            backgroundColor: '#1e293b',
            color: '#94a3b8',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          title="Open Doctor Station"
        >
          Doctor View <ExternalLink size={12} />
        </a>
      </div>
    </header>
  );
};
