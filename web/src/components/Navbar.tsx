import React, { useState } from 'react';
import { 
  Activity, 
  ShieldCheck, 
  Lock, 
  Radio, 
  KeyRound, 
  MapPin, 
  MessageSquare, 
  AlertTriangle,
  UserCheck,
  RefreshCw
} from 'lucide-react';

interface NavbarProps {
  currentTab: 'triage' | 'local' | 'map' | 'admin' | 'consult';
  onSelectTab: (tab: 'triage' | 'local' | 'map' | 'admin' | 'consult') => void;
  unlocked: boolean;
  onUnlockToggle: () => void;
  epoch: number;
  onRotateEpoch: () => void;
  onOpenGroot: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  unlocked,
  onUnlockToggle,
  epoch,
  onRotateEpoch,
  onOpenGroot
}) => {
  const [rfidActive, setRfidActive] = useState(false);

  const simulateRfidTap = () => {
    setRfidActive(true);
    setTimeout(() => {
      setRfidActive(false);
      if (!unlocked) onUnlockToggle();
    }, 900);
  };

  return (
    <header style={{
      backgroundColor: '#111827',
      borderBottom: '1px solid #374151',
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '12px'
    }}>
      {/* Brand & Mode */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 'bold'
          }}>
            <Activity size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '16px', letterSpacing: '0.5px' }}>
              RESILINK <span style={{ color: '#06b6d4' }}>GRID</span>
            </div>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>
              Doctor Station • WebCrypto P-256
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', gap: '4px', marginLeft: '12px' }}>
          <button
            onClick={() => onSelectTab('triage')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: currentTab === 'triage' ? '#1f2937' : 'transparent',
              color: currentTab === 'triage' ? '#38bdf8' : '#9ca3af',
              fontWeight: 600,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Activity size={15} />
            Triage Priority
          </button>

          <button
            onClick={() => onSelectTab('local')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: currentTab === 'local' ? '#1f2937' : 'transparent',
              color: currentTab === 'local' ? '#34d399' : '#9ca3af',
              fontWeight: 600,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Radio size={15} />
            F1 Local Monitor
          </button>

          <button
            onClick={() => onSelectTab('map')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: currentTab === 'map' ? '#1f2937' : 'transparent',
              color: currentTab === 'map' ? '#fbbf24' : '#9ca3af',
              fontWeight: 600,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <MapPin size={15} />
            F5-F7 Tactical Map
          </button>

          <button
            onClick={() => onSelectTab('admin')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: currentTab === 'admin' ? '#1f2937' : 'transparent',
              color: currentTab === 'admin' ? '#a78bfa' : '#9ca3af',
              fontWeight: 600,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ShieldCheck size={15} />
            Admin & Audit
          </button>

          <button
            onClick={() => onSelectTab('consult')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: currentTab === 'consult' ? '#1f2937' : 'transparent',
              color: currentTab === 'consult' ? '#f472b6' : '#9ca3af',
              fontWeight: 600,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <UserCheck size={15} />
            Consultation
          </button>
        </nav>
      </div>

      {/* Security, Epoch, RFID & Groot status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Epoch badge */}
        <div style={{
          backgroundColor: '#1f2937',
          border: '1px solid #374151',
          padding: '4px 8px',
          borderRadius: '6px',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span style={{ color: '#9ca3af' }}>Epoch:</span>
          <strong style={{ color: '#38bdf8' }}>#{epoch}</strong>
          <button 
            onClick={onRotateEpoch} 
            title="Rotate Epoch"
            style={{ background: 'none', color: '#9ca3af', display: 'flex', alignItems: 'center' }}
          >
            <RefreshCw size={12} />
          </button>
        </div>

        {/* RFID 2FA Simulated Hook */}
        <button
          onClick={simulateRfidTap}
          style={{
            backgroundColor: rfidActive ? '#059669' : '#1f2937',
            border: '1px solid #374151',
            color: rfidActive ? '#fff' : '#9ca3af',
            padding: '5px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          title="Simulate Doctor RFID Smart Card Tap"
        >
          <KeyRound size={13} />
          {rfidActive ? 'RFID Tapped (UID: 04:A1:B2:C3)' : 'RFID 2FA Tap'}
        </button>

        {/* Key Unlock State (PIN Protected non-extractable key) */}
        <button
          onClick={onUnlockToggle}
          style={{
            backgroundColor: unlocked ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${unlocked ? '#10b981' : '#ef4444'}`,
            color: unlocked ? '#34d399' : '#f87171',
            padding: '5px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {unlocked ? <ShieldCheck size={14} /> : <Lock size={14} />}
          {unlocked ? 'Key Unlocked (Dr. P-256)' : 'Key Locked (PIN Req)'}
        </button>

        {/* Hub Groot Trigger */}
        <button
          onClick={onOpenGroot}
          style={{
            background: 'linear-gradient(135deg, #0284c7, #2563eb)',
            color: '#fff',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <MessageSquare size={14} />
          Hub Groot
        </button>
      </div>
    </header>
  );
};
