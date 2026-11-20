import React, { useState, useEffect } from 'react';
import { PatientNavbar } from './components/PatientNavbar';
import { PatientVitalsView } from './components/PatientVitalsView';
import { PatientConsultView } from './components/PatientConsultView';
import { PatientGrootChat } from './components/PatientGrootChat';
import { EmergencyAlertModal } from './components/EmergencyAlertModal';
import { VitalsSample, RiskScore, RiskClass, EmergencyStatus } from './types';
import { generateMomentReport } from './groot/patientGroot';
import { AlarmService } from './audio/siren';
import { getOrCreatePatientKeys } from './crypto/patientCrypto';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'vitals' | 'consult' | 'chat'>('vitals');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentScenario, setCurrentScenario] = useState<'NORMAL' | 'TACHYCARDIA' | 'HYPOXIA' | 'SEPSIS'>('NORMAL');

  // Vitals State
  const [vitals, setVitals] = useState<VitalsSample>({
    ts: Date.now(),
    hr: 74,
    spo2: 98,
    temp: 36.8,
    resp: 16,
    sim: true
  });

  const [risk, setRisk] = useState<RiskScore>({
    score: 12,
    class: 'LOW',
    top_factors: ['Physiological vitals nominal'],
    model_ver: 'tinyml-phys-v4.2-int8'
  });

  // Emergency Alert Modal & Alarm State
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [emergencyStatus, setEmergencyStatus] = useState<EmergencyStatus | null>(null);

  // Initialize Patient WebCrypto keys
  useEffect(() => {
    getOrCreatePatientKeys('PATIENT-NODE-MCXN01').catch(console.error);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 1 Hz simulation tick
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const noise = (Math.random() - 0.5) * 2;

      let hr = 74;
      let spo2 = 98;
      let temp = 36.8;
      let resp = 16;
      let score = 12;
      let rClass: RiskClass = 'LOW';
      let factors = ['Normal vitals baseline'];

      if (currentScenario === 'NORMAL') {
        hr = Math.round(72 + noise * 3);
        spo2 = Math.min(100, Math.round(98 + (noise * 0.2)));
        temp = 36.8;
        resp = 16;
        score = 12;
        rClass = 'LOW';
        factors = ['Heart rate stable', 'SpO2 normal'];
      } else if (currentScenario === 'TACHYCARDIA') {
        hr = Math.round(145 + noise * 4);
        spo2 = 96;
        temp = 37.1;
        resp = 22;
        score = 68;
        rClass = 'HIGH';
        factors = ['Elevated pulse rate (145 bpm)', 'Tachyarrhythmia strain'];
      } else if (currentScenario === 'HYPOXIA') {
        hr = Math.round(112 + noise * 3);
        spo2 = Math.round(83 + noise);
        temp = 37.3;
        resp = 28;
        score = 92;
        rClass = 'CRITICAL';
        factors = ['Severe Hypoxia (83% SpO2)', 'Compensatory tachypnea'];
      } else if (currentScenario === 'SEPSIS') {
        hr = Math.round(135 + noise * 4);
        spo2 = 88;
        temp = 39.4;
        resp = 30;
        score = 96;
        rClass = 'CRITICAL';
        factors = ['High-grade fever (39.4°C)', 'Severe tachycardia (>130 bpm)', 'Hypoperfusion'];
      }

      setVitals({ ts: now, hr, spo2, temp, resp, sim: true });
      setRisk({ score, class: rClass, top_factors: factors, model_ver: 'tinyml-phys-v4.2-int8' });

      // Automatically trigger repeating siren and modal on CRITICAL
      if (rClass === 'CRITICAL' && !alertModalOpen && !emergencyStatus) {
        setAlertModalOpen(true);
        AlarmService.startAlarm();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentScenario, alertModalOpen, emergencyStatus]);

  const handleSimulateScenario = (s: 'NORMAL' | 'TACHYCARDIA' | 'HYPOXIA' | 'SEPSIS') => {
    setCurrentScenario(s);
    if (s === 'HYPOXIA' || s === 'SEPSIS') {
      setAlertModalOpen(true);
      AlarmService.startAlarm();
    } else {
      AlarmService.stopAlarm();
    }
  };

  const handleAcknowledgeAlert = () => {
    AlarmService.stopAlarm();
    setAlertModalOpen(false);
  };

  const handleTriggerSos = (consent: boolean) => {
    if (!consent) return;
    AlarmService.stopAlarm();

    // Trigger simulated emergency allocation
    const assigned: EmergencyStatus = {
      id: `EM-${Date.now()}`,
      status: 'ASSIGNED',
      ambulanceId: 'AMB-1081',
      ambulanceContact: '+91-98801-08101',
      hospitalName: 'Victoria Hospital Trauma Centre',
      etaMinutes: 4
    };

    setEmergencyStatus(assigned);
    setAlertModalOpen(true);
  };

  const aiReport = generateMomentReport(vitals, risk);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PatientNavbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isOnline={isOnline}
        onTriggerSos={() => {
          setAlertModalOpen(true);
          AlarmService.startAlarm();
        }}
        riskClass={risk.class}
      />

      <main style={{ flex: 1, paddingBottom: '30px' }}>
        {currentTab === 'vitals' && (
          <PatientVitalsView
            vitals={vitals}
            risk={risk}
            aiReport={aiReport}
            onSimulateScenario={handleSimulateScenario}
            currentScenario={currentScenario}
          />
        )}
        {currentTab === 'consult' && <PatientConsultView isOnline={isOnline} />}
        {currentTab === 'chat' && <PatientGrootChat vitals={vitals} risk={risk} />}
      </main>

      {/* Emergency Full-Screen Modal with Siren */}
      <EmergencyAlertModal
        isOpen={alertModalOpen}
        onAcknowledge={handleAcknowledgeAlert}
        onTriggerSos={handleTriggerSos}
        status={emergencyStatus}
        riskScore={risk.score}
      />
    </div>
  );
};
