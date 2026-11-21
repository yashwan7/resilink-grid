import React from 'react';
import { 
  LayoutGrid, 
  Activity, 
  MapPin, 
  Cpu, 
  Zap, 
  Stethoscope, 
  ShieldCheck, 
  FileText, 
  Building2, 
  Droplet, 
  Pill, 
  Bot, 
  Lock, 
  KeyRound,
  Sparkles,
  Clock
} from 'lucide-react';

export type TabType = 
  | 'overview' 
  | 'triage' 
  | 'golden-hour'
  | 'capacity' 
  | 'bloodbank' 
  | 'pharmacy' 
  | 'map' 
  | 'local' 
  | 'failover' 
  | 'consult' 
  | 'reports' 
  | 'admin';

interface SidebarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  unlocked: boolean;
  onUnlockToggle: () => void;
  epoch: number;
  onRotateEpoch: () => void;
  onOpenGroot: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  unlocked,
  onUnlockToggle,
  epoch,
  onRotateEpoch,
  onOpenGroot
}) => {
  const sections = [
    {
      heading: 'CLINICAL COMMAND',
      items: [
        { id: 'triage' as TabType, label: 'Triage Queue', icon: Activity, badge: 'F8' },
        { id: 'golden-hour' as TabType, label: 'Golden Hour Handoff', icon: Clock, badge: '18m SAVED' },
        { id: 'capacity' as TabType, label: 'Hospital Capacity', icon: Building2, badge: 'SURGE' },
        { id: 'bloodbank' as TabType, label: 'Blood Bank Network', icon: Droplet, badge: 'HEMO' },
        { id: 'pharmacy' as TabType, label: 'Field Pharmacy', icon: Pill, badge: 'RX' },
        { id: 'map' as TabType, label: 'GPS Radar & Mesh', icon: MapPin, badge: 'RADAR' },
      ]
    },
    {
      heading: 'HARDWARE & TELEMETRY',
      items: [
        { id: 'local' as TabType, label: 'Local Telemetry (F1)', icon: Cpu, badge: 'UART' },
        { id: 'failover' as TabType, label: 'Failover & TinyML', icon: Zap, badge: '420µs' },
      ]
    },
    {
      heading: 'INTELLIGENCE & AUDIT',
      items: [
        { id: 'consult' as TabType, label: 'Doctor Station', icon: Stethoscope },
        { id: 'reports' as TabType, label: 'AI Decision Reports', icon: FileText, badge: 'SARVAM' },
        { id: 'admin' as TabType, label: 'Audit Chain & Security', icon: ShieldCheck, badge: `E#${epoch}` },
      ]
    }
  ];

  return (
    <aside style={{
      width: '260px',
      background: 'linear-gradient(180deg, #14284b 0%, #1a3666 50%, #204482 100%)',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '16px',
      flexShrink: 0,
      minHeight: '100vh',
      maxHeight: '100vh',
      overflowY: 'auto',
      position: 'sticky',
      top: 0,
      userSelect: 'none',
      borderRight: '1px solid rgba(30, 58, 138, 0.4)',
      boxShadow: '4px 0 24px rgba(15, 23, 42, 0.15)'
    }}>
      {/* Brand Header */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
          padding: '10px 12px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(8px)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.15)'
        }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #06b6d4, #2563eb)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              color: '#ffffff',
              fontSize: '13px',
              fontFamily: 'monospace'
            }}>
              RG
            </div>
            <span style={{
              width: '10px',
              height: '10px',
              backgroundColor: '#34d399',
              borderRadius: '50%',
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
              border: '2px solid #14284b',
              boxShadow: '0 0 8px rgba(52, 211, 153, 0.8)'
            }} />
          </div>
          <div>
            <h1 style={{
              fontSize: '13px',
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: '1px',
              margin: 0,
              fontFamily: 'monospace'
            }}>
              RESILINK GRID
            </h1>
            <p style={{
              fontSize: '10px',
              color: 'rgba(191, 219, 254, 0.85)',
              margin: 0,
              fontFamily: 'monospace',
              fontWeight: 600
            }}>
              TACTICAL BIO-CAPSULE OS
            </p>
          </div>
        </div>

        {/* Grouped Menu */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {sections.map((sec, sIdx) => (
            <div key={sIdx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{
                padding: '0 10px',
                fontSize: '10px',
                fontFamily: 'monospace',
                letterSpacing: '1px',
                color: 'rgba(147, 197, 253, 0.65)',
                fontWeight: 700,
                textTransform: 'uppercase'
              }}>
                {sec.heading}
              </div>

              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: isActive ? 700 : 500,
                      transition: 'all 0.15s ease',
                      textAlign: 'left',
                      background: isActive 
                        ? 'linear-gradient(90deg, #2563eb, #4f46e5)' 
                        : 'transparent',
                      color: isActive ? '#ffffff' : 'rgba(219, 234, 254, 0.8)',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: isActive ? '0 4px 12px rgba(30, 58, 138, 0.4)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Icon style={{
                        width: '16px',
                        height: '16px',
                        flexShrink: 0,
                        color: isActive ? '#ffffff' : 'rgba(147, 197, 253, 0.75)'
                      }} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.label}
                      </span>
                    </div>

                    {item.badge && (
                      <span style={{
                        fontSize: '9px',
                        fontFamily: 'monospace',
                        padding: '2px 6px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        flexShrink: 0,
                        background: isActive ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                        color: isActive ? '#ffffff' : 'rgba(191, 219, 254, 0.9)'
                      }}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Assistant & Security Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
        {/* Groot AI Persistent Assistant Trigger */}
        <button
          onClick={onOpenGroot}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(37, 99, 235, 0.3))',
            border: '1px solid rgba(6, 182, 212, 0.4)',
            color: '#ffffff',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 14px rgba(6, 182, 212, 0.2)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              backgroundColor: '#06b6d4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0f172a'
            }}>
              <Bot style={{ width: '16px', height: '16px' }} />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#ffffff' }}>GROOT AI AGENT</div>
              <div style={{ fontSize: '9px', color: '#67e8f9', fontFamily: 'monospace' }}>SARVAM INDIC VOICE</div>
            </div>
          </div>
          <Sparkles style={{ width: '14px', height: '14px', color: '#67e8f9' }} />
        </button>

        {/* Security Unlock Toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '10px',
          fontSize: '11px'
        }}>
          <button
            onClick={onUnlockToggle}
            style={{
              background: 'none',
              border: 'none',
              color: unlocked ? '#34d399' : '#f87171',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '11px'
            }}
          >
            {unlocked ? <KeyRound style={{ width: '13px', height: '13px' }} /> : <Lock style={{ width: '13px', height: '13px' }} />}
            {unlocked ? 'ADMIN UNLOCKED' : 'LOCKED (PIN: 1234)'}
          </button>
          
          <button
            onClick={onRotateEpoch}
            title="Rotate Security Epoch & Wrap DEK"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              padding: '2px 6px',
              color: '#93c5fd',
              fontSize: '9px',
              fontFamily: 'monospace',
              cursor: 'pointer',
              fontWeight: 700
            }}
          >
            EPOCH++
          </button>
        </div>
      </div>
    </aside>
  );
};
