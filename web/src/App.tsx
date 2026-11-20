import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { TriageBoard } from './components/TriageBoard';
import { LocalMonitor } from './components/LocalMonitor';
import { FacilityMap } from './components/FacilityMap';
import { AdminAuditView } from './components/AdminAuditView';
import { ConsultationView } from './components/ConsultationView';
import { GrootHubDrawer } from './components/GrootHubDrawer';
import { Lock, KeyRound, ExternalLink } from 'lucide-react';
import { HubApi } from './mock/hubApi';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'triage' | 'local' | 'map' | 'admin' | 'consult'>('triage');
  const [unlocked, setUnlocked] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [epoch, setEpoch] = useState(42);
  const [grootOpen, setGrootOpen] = useState(false);

  // Check URL pathname or hash for direct route (e.g. /local or #local)
  useEffect(() => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    if (path.includes('/local') || hash.includes('local')) {
      setCurrentTab('local');
    } else if (path.includes('/map') || hash.includes('map')) {
      setCurrentTab('map');
    } else if (path.includes('/admin') || hash.includes('admin')) {
      setCurrentTab('admin');
    } else if (path.includes('/consult') || hash.includes('consult')) {
      setCurrentTab('consult');
    }
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
    // Default PIN: 1234 or 4321
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        unlocked={unlocked}
        onUnlockToggle={handleUnlockToggle}
        epoch={epoch}
        onRotateEpoch={handleRotateEpoch}
        onOpenGroot={() => setGrootOpen(true)}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1, paddingBottom: '40px' }}>
        {currentTab === 'triage' && (
          <TriageBoard unlocked={unlocked} onUnlockToggle={handleUnlockToggle} />
        )}
        {currentTab === 'local' && <LocalMonitor />}
        {currentTab === 'map' && <FacilityMap />}
        {currentTab === 'admin' && (
          <AdminAuditView epoch={epoch} onRotateEpoch={handleRotateEpoch} />
        )}
        {currentTab === 'consult' && <ConsultationView />}
      </main>

      {/* Groot Hub Drawer */}
      <GrootHubDrawer isOpen={grootOpen} onClose={() => setGrootOpen(false)} />

      {/* Bottom Bar: Cross-Module Switcher & Status */}
      <footer style={{
        backgroundColor: '#111827',
        borderTop: '1px solid #374151',
        padding: '10px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '12px',
        color: '#9ca3af',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>RESILINK GRID v4.0</span>
          <span>•</span>
          <span>Harshavardhan Module (/web & /patient)</span>
          <span>•</span>
          <span style={{ color: '#34d399' }}>WebCrypto Non-Extractable Key Active</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <a
            href="http://localhost:5174"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#38bdf8',
              textDecoration: 'none',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            Open Patient App (Port 5174) <ExternalLink size={12} />
          </a>
        </div>
      </footer>

      {/* PIN Unlock Modal */}
      {pinModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000
        }}>
          <form
            onSubmit={handlePinSubmit}
            style={{
              backgroundColor: '#111827',
              border: '1px solid #4b5563',
              borderRadius: '8px',
              padding: '24px',
              width: '320px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Lock size={20} color="#06b6d4" />
              <strong style={{ fontSize: '16px' }}>Unlock Doctor Private Key</strong>
            </div>
            <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '14px' }}>
              Enter Doctor PIN or tap simulated RFID smart card (PIN: <strong>1234</strong>)
            </p>

            <input
              type="password"
              autoFocus
              maxLength={6}
              placeholder="Enter PIN (1234)"
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setPinError(false);
              }}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                backgroundColor: '#1f2937',
                border: pinError ? '1px solid #ef4444' : '1px solid #374151',
                color: '#fff',
                fontSize: '18px',
                textAlign: 'center',
                letterSpacing: '6px',
                outline: 'none',
                marginBottom: '14px'
              }}
            />

            {pinError && (
              <div style={{ color: '#ef4444', fontSize: '11px', marginBottom: '10px', textAlign: 'center' }}>
                Incorrect PIN. Please enter 1234.
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setPinModalOpen(false)}
                style={{
                  flex: 1,
                  padding: '8px',
                  backgroundColor: '#374151',
                  color: '#e5e7eb',
                  borderRadius: '6px',
                  fontWeight: 600
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  flex: 1,
                  padding: '8px',
                  backgroundColor: '#0284c7',
                  color: '#fff',
                  borderRadius: '6px',
                  fontWeight: 600
                }}
              >
                Unlock
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
