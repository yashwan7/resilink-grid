import React, { useState, useEffect } from 'react';
import { Sidebar, TabType } from './components/Sidebar';
import { TriageBoard } from './components/TriageBoard';
import { LocalMonitor } from './components/LocalMonitor';
import { FacilityMap } from './components/FacilityMap';
import { AdminAuditView } from './components/AdminAuditView';
import { ConsultationView } from './components/ConsultationView';
import { HospitalCapacityView } from './components/HospitalCapacityView';
import { BloodBankView } from './components/BloodBankView';
import { PharmacyView } from './components/PharmacyView';
import { FailoverTinyMLView } from './components/FailoverTinyMLView';
import { AIReportsView } from './components/AIReportsView';
import { GrootHubDrawer } from './components/GrootHubDrawer';
import { DoctorDownloadModal } from './components/DownloadReportModal';
import { GoldenHourHandoffView } from './components/GoldenHourHandoffView';
import { Lock, KeyRound, ExternalLink, Bot, Sparkles, ShieldCheck } from 'lucide-react';
import { HubApi } from './mock/hubApi';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabType>('triage');
  const [unlocked, setUnlocked] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [epoch, setEpoch] = useState(42);
  const [grootOpen, setGrootOpen] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);

  // URL hash / route detection
  useEffect(() => {
    const hash = window.location.hash.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/local') || hash.includes('local')) setCurrentTab('local');
    else if (path.includes('/golden') || hash.includes('golden')) setCurrentTab('golden-hour');
    else if (path.includes('/map') || hash.includes('map')) setCurrentTab('map');
    else if (path.includes('/capacity') || hash.includes('capacity')) setCurrentTab('capacity');
    else if (path.includes('/bloodbank') || hash.includes('bloodbank')) setCurrentTab('bloodbank');
    else if (path.includes('/pharmacy') || hash.includes('pharmacy')) setCurrentTab('pharmacy');
    else if (path.includes('/failover') || hash.includes('failover')) setCurrentTab('failover');
    else if (path.includes('/reports') || hash.includes('reports')) setCurrentTab('reports');
    else if (path.includes('/admin') || hash.includes('admin')) setCurrentTab('admin');
    else if (path.includes('/consult') || hash.includes('consult')) setCurrentTab('consult');
  }, []);

  const handleUnlockToggle = () => {
    if (unlocked) {
      setUnlocked(false);
    } else {
      setPinModalOpen(true);
      setPinInput('');
      setPinError(false);
    }
  };

  const handlePinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pinInput === '1234' || pinInput.length >= 4) {
      setUnlocked(true);
      setPinModalOpen(false);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const handleRotateEpoch = () => {
    const nextEpoch = epoch + 1;
    setEpoch(nextEpoch);
    HubApi.appendAuditRecord('ACCESS_REQUEST', {
      action: 'EPOCH_ROTATION',
      new_epoch: nextEpoch,
      ts: Date.now()
    });
    alert(`Epoch rotated successfully to #${nextEpoch}. New DEK derived; wrapped keys distributed.`);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#eef2f7' }}>
      {/* ResQMesh Left Tactical Sidebar */}
      <Sidebar
        activeTab={currentTab}
        onSelectTab={setCurrentTab}
        unlocked={unlocked}
        onUnlockToggle={handleUnlockToggle}
        epoch={epoch}
        onRotateEpoch={handleRotateEpoch}
        onOpenGroot={() => setGrootOpen(true)}
      />

      {/* Main Tactical Screen Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, maxHeight: '100vh', overflowY: 'auto' }}>
        
        {/* Top Tactical Status Bar */}
        <header style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="nm-badge" style={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', color: '#047857' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
              MESH ACTIVE (150 MHz)
            </span>
            <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
              NXP MCXN236 &bull; ESP32 BRIDGE (460.8K BAUD)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Quick Groot Launch Button */}
            <button
              onClick={() => setGrootOpen(true)}
              className="nm-btn-accent"
              style={{
                padding: '6px 14px',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Bot style={{ width: '14px', height: '14px' }} />
              <span>GROOT AI CHATBOT</span>
              <Sparkles style={{ width: '12px', height: '12px', color: '#67e8f9' }} />
            </button>

            {/* Patient Portal Switcher */}
            <a
              href="http://localhost:5174"
              target="_blank"
              rel="noreferrer"
              className="nm-btn"
              style={{
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                textDecoration: 'none'
              }}
            >
              <span>PATIENT APP</span>
              <ExternalLink style={{ width: '12px', height: '12px' }} />
            </a>
          </div>
        </header>

        {/* Active Tab View */}
        <main style={{ flex: 1, paddingBottom: '60px' }}>
          {currentTab === 'triage' && (
            <TriageBoard unlocked={unlocked} onUnlockToggle={handleUnlockToggle} />
          )}
          {currentTab === 'golden-hour' && <GoldenHourHandoffView />}
          {currentTab === 'capacity' && <HospitalCapacityView />}
          {currentTab === 'bloodbank' && <BloodBankView />}
          {currentTab === 'pharmacy' && <PharmacyView />}
          {currentTab === 'map' && <FacilityMap />}
          {currentTab === 'local' && <LocalMonitor />}
          {currentTab === 'failover' && <FailoverTinyMLView />}
          {currentTab === 'consult' && <ConsultationView />}
          {currentTab === 'reports' && (
            <AIReportsView onOpenDownloadModal={() => setDownloadModalOpen(true)} />
          )}
          {currentTab === 'admin' && (
            <AdminAuditView epoch={epoch} onRotateEpoch={handleRotateEpoch} />
          )}
        </main>
      </div>

      {/* Floating Tactical Groot Chatbot Trigger */}
      <button
        onClick={() => setGrootOpen(true)}
        className="clinical-pulse"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #06b6d4, #2563eb)',
          border: '2px solid #ffffff',
          boxShadow: '0 8px 24px rgba(37, 99, 235, 0.4)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 900
        }}
        title="Open Groot AI Tactical Advisor"
      >
        <Bot style={{ width: '28px', height: '28px' }} />
      </button>

      {/* Groot AI Hub Drawer */}
      <GrootHubDrawer isOpen={grootOpen} onClose={() => setGrootOpen(false)} />

      {/* Download Report Modal */}
      {downloadModalOpen && (
        <DoctorDownloadModal
          isOpen={downloadModalOpen}
          onClose={() => setDownloadModalOpen(false)}
          patientId="PT-101"
          vitals={{
            ts: Date.now(),
            hr: 138,
            spo2: 86,
            temp: 36.8,
            resp: 30,
            sim: true
          }}
          risk={{
            score: 94.2,
            class: 'CRITICAL',
            top_factors: ['Severe Hypoxia (86%)', 'Compensatory Tachycardia (138 bpm)', 'Tachypnea (30 bpm)'],
            model_ver: 'tinyml-phys-v4.2-int8'
          }}
          fineScore={94.2}
        />
      )}

      {/* PIN Unlock Modal */}
      {pinModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div className="nm-flat" style={{ width: '340px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                <KeyRound style={{ width: '20px', height: '20px' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#0f172a' }}>ENTER ADMIN PIN</h3>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Default authorization PIN: 1234</span>
              </div>
            </div>

            <form onSubmit={handlePinSubmit}>
              <input
                type="password"
                maxLength={8}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="PIN (e.g. 1234)"
                autoFocus
                className="nm-inset"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '18px',
                  textAlign: 'center',
                  letterSpacing: '6px',
                  outline: 'none',
                  color: '#0f172a',
                  marginBottom: '16px'
                }}
              />

              {pinError && (
                <div style={{ color: '#ef4444', fontSize: '11px', marginBottom: '12px', textAlign: 'center', fontWeight: 600 }}>
                  Invalid PIN. Try "1234".
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setPinModalOpen(false)}
                  className="nm-btn"
                  style={{ flex: 1, padding: '10px', fontSize: '12px', fontWeight: 600 }}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="nm-btn-accent"
                  style={{ flex: 1, padding: '10px', fontSize: '12px', fontWeight: 700 }}
                >
                  UNLOCK
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
