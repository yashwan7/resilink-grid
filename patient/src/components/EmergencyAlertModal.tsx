import React, { useState } from 'react';
import { 
  AlertOctagon, 
  BellOff, 
  Truck, 
  Building2, 
  Clock, 
  PhoneCall, 
  ShieldCheck, 
  CheckSquare 
} from 'lucide-react';
import { EmergencyStatus } from '../types';

interface EmergencyAlertModalProps {
  isOpen: boolean;
  onAcknowledge: () => void;
  onTriggerSos: (consent: boolean) => void;
  status: EmergencyStatus | null;
  riskScore: number;
}

export const EmergencyAlertModal: React.FC<EmergencyAlertModalProps> = ({
  isOpen,
  onAcknowledge,
  onTriggerSos,
  status,
  riskScore
}) => {
  const [consentGiven, setConsentGiven] = useState(true);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.92)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 5000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#1e1b4b',
        border: '2px solid #ef4444',
        borderRadius: '12px',
        padding: '28px',
        maxWidth: '560px',
        width: '100%',
        boxShadow: '0 0 40px rgba(239, 68, 68, 0.5)'
      }}>
        {/* Pulsing Alarm Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#dc2626',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px'
          }} className="pulse-sos-btn">
            <AlertOctagon size={36} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f87171' }}>
            CRITICAL HEALTH ALERT (P0)
          </h2>
          <div style={{ fontSize: '14px', color: '#fca5a5', marginTop: '4px' }}>
            Severe physiological distress detected • Edge Risk Score: <strong>{riskScore}/100</strong>
          </div>
        </div>

        {/* Active Dispatch Status if already triggered */}
        {status ? (
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #22c55e',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4ade80', fontWeight: 'bold', fontSize: '15px', marginBottom: '10px' }}>
              <Truck size={20} />
              AMBULANCE DISPATCHED ({status.status})
            </div>
            <div style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: 1.8 }}>
              <div>Assigned Vehicle: <strong>{status.ambulanceId}</strong></div>
              <div>Destination Hospital: <strong>{status.hospitalName}</strong></div>
              <div>Estimated Arrival Time: <strong style={{ color: '#38bdf8' }}>{status.etaMinutes} minutes</strong></div>
              <div>Driver Direct Contact: <strong>{status.ambulanceContact}</strong></div>
            </div>
            <a
              href={`tel:${status.ambulanceContact}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '12px',
                backgroundColor: '#0284c7',
                color: '#fff',
                padding: '6px 14px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              <PhoneCall size={14} /> Call Ambulance Driver
            </a>
          </div>
        ) : (
          <div style={{ marginBottom: '20px' }}>
            {/* Consent Box */}
            <div style={{
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px'
            }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  style={{ marginTop: '3px' }}
                />
                <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
                  <strong>Patient Consent for Emergency Dispatch:</strong> Authorize minimal plaintext broadcast of location (GPS) and priority (P0) to allocate nearest ambulance and hospital. All medical vitals remain encrypted.
                </span>
              </label>
            </div>

            <button
              onClick={() => onTriggerSos(consentGiven)}
              disabled={!consentGiven}
              style={{
                width: '100%',
                backgroundColor: consentGiven ? '#dc2626' : '#6b7280',
                color: '#fff',
                padding: '14px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '10px'
              }}
            >
              <Truck size={20} />
              DISPATCH AMBULANCE & ALLOCATE HOSPITAL NOW
            </button>
          </div>
        )}

        {/* Alarm Silence / Acknowledge Button */}
        <button
          onClick={onAcknowledge}
          style={{
            width: '100%',
            backgroundColor: '#1e293b',
            border: '1px solid #475569',
            color: '#e2e8f0',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <BellOff size={16} />
          Silence Siren & Acknowledge
        </button>

        <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '11px', color: '#94a3b8' }}>
          Emergency Helpline: <strong>108 / 112</strong> • "Decision support, not a diagnosis"
        </div>
      </div>
    </div>
  );
};
