import React from 'react';
import { 
  Heart, 
  Wind, 
  Thermometer, 
  Zap, 
  Bot, 
  ShieldCheck, 
  AlertTriangle,
  Activity,
  CheckCircle2
} from 'lucide-react';
import { VitalsSample, RiskScore, RiskClass } from '../types';
import { GrootAIReport } from '../groot/patientGroot';

interface PatientVitalsViewProps {
  vitals: VitalsSample;
  risk: RiskScore;
  aiReport: GrootAIReport;
  onSimulateScenario: (scenario: 'NORMAL' | 'TACHYCARDIA' | 'HYPOXIA' | 'SEPSIS') => void;
  currentScenario: string;
}

export const PatientVitalsView: React.FC<PatientVitalsViewProps> = ({
  vitals,
  risk,
  aiReport,
  onSimulateScenario,
  currentScenario
}) => {
  const getRiskClassColor = (rc: RiskClass) => {
    switch (rc) {
      case 'CRITICAL': return '#ef4444';
      case 'HIGH': return '#f97316';
      case 'MED': return '#eab308';
      case 'LOW': return '#10b981';
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Vitals Scenario Selector */}
      <div style={{
        backgroundColor: '#0f172a',
        border: '1px solid #334155',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>
          SIMULATED SENSOR SCENARIOS:
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['NORMAL', 'TACHYCARDIA', 'HYPOXIA', 'SEPSIS'] as const).map(s => (
            <button
              key={s}
              onClick={() => onSimulateScenario(s)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: currentScenario === s ? '#0284c7' : '#1e293b',
                color: currentScenario === s ? '#fff' : '#cbd5e1',
                border: currentScenario === s ? '1px solid #38bdf8' : '1px solid #334155'
              }}
            >
              {s === 'NORMAL' && '🟢 Normal'}
              {s === 'TACHYCARDIA' && '🟠 Tachycardia'}
              {s === 'HYPOXIA' && '🔴 Hypoxia (83%)'}
              {s === 'SEPSIS' && '🔥 Critical Sepsis'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Big Risk Meter & Vitals Hero */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        marginBottom: '24px'
      }}>
        {/* Big Risk Gauge Card */}
        <div style={{
          backgroundColor: '#0f172a',
          border: `2px solid ${getRiskClassColor(risk.class)}`,
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: risk.class === 'CRITICAL' ? '0 0 30px rgba(239, 68, 68, 0.25)' : 'none'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={18} color={getRiskClassColor(risk.class)} />
                Edge AI Risk Index
              </span>
              <span style={{
                backgroundColor: getRiskClassColor(risk.class),
                color: '#fff',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {risk.class}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '14px 0' }}>
              <div style={{ fontSize: '58px', fontWeight: 'bold', color: getRiskClassColor(risk.class) }}>
                {risk.score}
              </div>
              <div style={{ fontSize: '16px', color: '#94a3b8' }}>/ 100</div>
            </div>

            <div style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '8px', fontWeight: 600 }}>
              Primary Drivers:
            </div>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {risk.top_factors.map((f, i) => (
                <li key={i} style={{ fontSize: '12px', color: '#94a3b8', padding: '3px 0' }}>
                  • {f}
                </li>
              ))}
            </ul>
          </div>

          <div style={{
            marginTop: '16px',
            paddingTop: '10px',
            borderTop: '1px solid #334155',
            fontSize: '11px',
            color: '#64748b'
          }}>
            Model: {risk.model_ver} • Decrypted locally on your device
          </div>
        </div>

        {/* 1 Hz Vitals Quad */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          {/* Heart Rate */}
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>
              <Heart size={16} color="#ef4444" /> Pulse Rate
            </div>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: vitals.hr > 120 ? '#ef4444' : '#f8fafc' }}>
              {vitals.hr} <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 'normal' }}>bpm</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>1 Hz live reading</div>
          </div>

          {/* SpO2 */}
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>
              <Wind size={16} color="#38bdf8" /> Oxygen
            </div>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: vitals.spo2 < 90 ? '#ef4444' : '#38bdf8' }}>
              {vitals.spo2} <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 'normal' }}>%</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>SpO2 Perfusion</div>
          </div>

          {/* Temperature */}
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>
              <Thermometer size={16} color="#fbbf24" /> Body Temp
            </div>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: vitals.temp > 38.5 ? '#ef4444' : '#fbbf24' }}>
              {vitals.temp.toFixed(1)} <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 'normal' }}>°C</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Skin Contact Temp</div>
          </div>

          {/* Respiration */}
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>
              <Activity size={16} color="#a855f7" /> Breathing
            </div>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#a855f7' }}>
              {vitals.resp || 16} <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 'normal' }}>bpm</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Respiration rate</div>
          </div>
        </div>
      </div>

      {/* Local Groot AI: "Report For This Moment" */}
      <div style={{
        backgroundColor: '#0f172a',
        border: '1px solid #334155',
        borderRadius: '12px',
        padding: '22px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              <Bot size={18} />
            </div>
            <div>
              <strong style={{ fontSize: '16px' }}>Local Groot: AI Report for this Moment</strong>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                On-Device Offline Natural Language Synthesis • Zero-Cloud Exposure
              </div>
            </div>
          </div>

          <div style={{ fontSize: '11px', color: '#64748b' }}>
            Updated: {new Date(aiReport.timestamp).toLocaleTimeString()}
          </div>
        </div>

        {/* Headline & Summary */}
        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: '8px',
          padding: '14px',
          marginBottom: '16px'
        }}>
          <div style={{ fontWeight: 'bold', fontSize: '14px', color: getRiskClassColor(risk.class), marginBottom: '6px' }}>
            {aiReport.headline}
          </div>
          <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6 }}>
            {aiReport.plainLanguageSummary}
          </p>
        </div>

        {/* Recommended Actions */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '8px' }}>
            SAFE NON-DIAGNOSTIC GUIDANCE:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {aiReport.recommendedActions.map((action, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                color: '#e2e8f0',
                backgroundColor: '#1e293b',
                padding: '8px 12px',
                borderRadius: '6px'
              }}>
                <CheckCircle2 size={16} color="#34d399" />
                {action}
              </div>
            ))}
          </div>
        </div>

        {/* Regulatory Guardrail Footer */}
        <div style={{
          borderTop: '1px solid #334155',
          paddingTop: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          color: '#94a3b8',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <span>{aiReport.disclaimer}</span>
          <strong style={{ color: '#ef4444' }}>{aiReport.emergencyNumber}</strong>
        </div>
      </div>
    </div>
  );
};
