import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  Wind, 
  Thermometer, 
  Compass, 
  Radio, 
  AlertCircle, 
  CheckCircle2, 
  ShieldAlert, 
  Zap,
  Activity
} from 'lucide-react';
import { VitalsSample, RiskScore, RiskClass } from '../types';

export const LocalMonitor: React.FC = () => {
  // Scenario presets
  type Scenario = 'NORMAL' | 'TACHYCARDIA' | 'HYPOXIA' | 'SEPSIS';
  const [scenario, setScenario] = useState<Scenario>('NORMAL');

  // Vitals buffer for 60-second sparkline charts
  const [vitalsHistory, setVitalsHistory] = useState<VitalsSample[]>([]);
  const [currentVitals, setCurrentVitals] = useState<VitalsSample>({
    ts: Date.now(),
    hr: 74,
    spo2: 98,
    temp: 36.8,
    resp: 16,
    motion: 0.05,
    sim: true
  });

  // TinyML Risk State
  const [risk, setRisk] = useState<RiskScore>({
    score: 12,
    class: 'LOW',
    top_factors: ['Physiological vitals nominal', 'Good SpO2 perfusion', 'Normal sinus rhythm'],
    model_ver: 'tinyml-phys-v4.2-int8'
  });

  // Link State
  const [linkState, setLinkState] = useState<'HEALTHY' | 'DEGRADING' | 'CRITICAL' | 'SMS_FALLBACK'>('HEALTHY');
  const [gpsFix, setGpsFix] = useState({ lat: 13.1365, lon: 77.5646, satellites: 8, fix: '3D DGPS' });

  // 1 Hz simulation tick
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      let hr = 74;
      let spo2 = 98;
      let temp = 36.8;
      let resp = 16;
      let riskScore = 12;
      let riskClass: RiskClass = 'LOW';
      let factors: string[] = ['Nominal parameters'];

      // Scenario physics generator with small realistic noise
      const noise = (Math.random() - 0.5) * 2;
      const smallNoise = (Math.random() - 0.5) * 0.4;

      if (scenario === 'NORMAL') {
        hr = Math.round(72 + noise * 3);
        spo2 = Math.min(100, Math.round(98 + smallNoise));
        temp = Math.round((36.8 + smallNoise * 0.2) * 10) / 10;
        resp = Math.round(16 + noise);
        riskScore = 10;
        riskClass = 'LOW';
        factors = ['Heart rate stable', 'Oxygen saturation normal', 'Normothermia'];
      } else if (scenario === 'TACHYCARDIA') {
        hr = Math.round(145 + noise * 6);
        spo2 = Math.round(95 + smallNoise);
        temp = 37.1;
        resp = 22;
        riskScore = 68;
        riskClass = 'HIGH';
        factors = ['Supraventricular tachycardia (145 bpm)', 'Elevated rate of change (+24 bpm/10s)', 'Cardiovascular strain'];
      } else if (scenario === 'HYPOXIA') {
        hr = Math.round(112 + noise * 4);
        spo2 = Math.round(83 + noise);
        temp = 37.2;
        resp = 28;
        riskScore = 92;
        riskClass = 'CRITICAL';
        factors = ['Severe Hypoxemia (83% SpO2)', 'Compensatory tachypnea (28 bpm)', 'Cyanosis risk imminent'];
      } else if (scenario === 'SEPSIS') {
        hr = Math.round(132 + noise * 5);
        spo2 = Math.round(88 + noise);
        temp = Math.round((39.4 + smallNoise * 0.3) * 10) / 10;
        resp = 30;
        riskScore = 96;
        riskClass = 'CRITICAL';
        factors = ['High-grade fever (39.4°C)', 'Severe tachycardia (>130 bpm)', 'Hypoperfusion & hypoxia'];
      }

      const sample: VitalsSample = {
        ts: now,
        hr,
        spo2,
        temp,
        resp,
        motion: 0.08,
        sim: true
      };

      setCurrentVitals(sample);
      setRisk({
        score: riskScore,
        class: riskClass,
        top_factors: factors,
        model_ver: 'tinyml-phys-v4.2-int8'
      });

      setVitalsHistory(prev => {
        const next = [...prev, sample];
        // Keep last 60 seconds (60 samples)
        return next.length > 60 ? next.slice(next.length - 60) : next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [scenario]);

  // Helper to render responsive 60s SVG sparklines
  const renderSparkline = (data: number[], color: string, minVal: number, maxVal: number) => {
    if (data.length < 2) return null;
    const width = 280;
    const height = 45;
    const range = maxVal - minVal || 1;
    const points = data.map((val, idx) => {
      const x = (idx / (Math.max(data.length - 1, 1))) * width;
      const clamped = Math.max(minVal, Math.min(maxVal, val));
      const y = height - ((clamped - minVal) / range) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  const getRiskClassColor = (rc: RiskClass) => {
    switch (rc) {
      case 'CRITICAL': return '#ef4444';
      case 'HIGH': return '#f97316';
      case 'MED': return '#eab308';
      case 'LOW': return '#10b981';
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Banner: Local Enclosure Notice */}
      <div style={{
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        border: '1px solid rgba(6, 182, 212, 0.3)',
        borderRadius: '8px',
        padding: '12px 18px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Radio color="#06b6d4" size={20} />
          <div>
            <strong style={{ color: '#06b6d4', fontSize: '14px' }}>
              F1 Local Monitor Enclosure (UART / Localhost Direct)
            </strong>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>
              Strict Privacy Principle: Plaintext stays on this local monitor only and is NEVER sent over the network to the hub.
            </div>
          </div>
        </div>
        <div style={{
          backgroundColor: '#064e3b',
          color: '#6ee7b7',
          padding: '3px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 'bold'
        }}>
          MAX30102 SIMULATED (sim: true)
        </div>
      </div>

      {/* Scenario Controls */}
      <div style={{
        backgroundColor: '#111827',
        border: '1px solid #374151',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '20px'
      }}>
        <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '10px', fontWeight: 600 }}>
          SELECT CLINICAL SIMULATION SCENARIO:
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {(['NORMAL', 'TACHYCARDIA', 'HYPOXIA', 'SEPSIS'] as Scenario[]).map((sc) => (
            <button
              key={sc}
              onClick={() => setScenario(sc)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: scenario === sc ? '#0284c7' : '#1f2937',
                color: scenario === sc ? '#fff' : '#d1d5db',
                border: scenario === sc ? '1px solid #38bdf8' : '1px solid #374151'
              }}
            >
              {sc === 'NORMAL' && '🟢 Normal Baseline'}
              {sc === 'TACHYCARDIA' && '🟠 Tachycardia (145 bpm)'}
              {sc === 'HYPOXIA' && '🔴 Acute Hypoxia (SpO2 83%)'}
              {sc === 'SEPSIS' && '🔥 Severe Sepsis (P0 Alert)'}
            </button>
          ))}
        </div>
      </div>

      {/* Live Vitals Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '20px'
      }}>
        {/* Heart Rate */}
        <div style={{
          backgroundColor: '#111827',
          border: '1px solid #374151',
          borderRadius: '8px',
          padding: '18px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Heart size={16} color="#ef4444" /> Pulse Rate
            </span>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>1 Hz Live</span>
          </div>
          <div style={{ fontSize: '38px', fontWeight: 'bold', color: currentVitals.hr > 120 ? '#ef4444' : '#f9fafb' }}>
            {currentVitals.hr} <span style={{ fontSize: '16px', color: '#9ca3af', fontWeight: 'normal' }}>bpm</span>
          </div>
          <div style={{ marginTop: '12px', height: '45px' }}>
            {renderSparkline(vitalsHistory.map(v => v.hr), '#ef4444', 50, 160)}
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280', textAlign: 'right', marginTop: '4px' }}>60s sparkline</div>
        </div>

        {/* SpO2 */}
        <div style={{
          backgroundColor: '#111827',
          border: '1px solid #374151',
          borderRadius: '8px',
          padding: '18px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Wind size={16} color="#06b6d4" /> Oxygen Saturation
            </span>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>SpO2</span>
          </div>
          <div style={{ fontSize: '38px', fontWeight: 'bold', color: currentVitals.spo2 < 90 ? '#ef4444' : '#06b6d4' }}>
            {currentVitals.spo2} <span style={{ fontSize: '16px', color: '#9ca3af', fontWeight: 'normal' }}>%</span>
          </div>
          <div style={{ marginTop: '12px', height: '45px' }}>
            {renderSparkline(vitalsHistory.map(v => v.spo2), '#06b6d4', 75, 100)}
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280', textAlign: 'right', marginTop: '4px' }}>60s sparkline</div>
        </div>

        {/* Temperature */}
        <div style={{
          backgroundColor: '#111827',
          border: '1px solid #374151',
          borderRadius: '8px',
          padding: '18px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Thermometer size={16} color="#f59e0b" /> Body Temperature
            </span>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>Celsius</span>
          </div>
          <div style={{ fontSize: '38px', fontWeight: 'bold', color: currentVitals.temp > 38.5 ? '#ef4444' : '#f59e0b' }}>
            {currentVitals.temp.toFixed(1)} <span style={{ fontSize: '16px', color: '#9ca3af', fontWeight: 'normal' }}>°C</span>
          </div>
          <div style={{ marginTop: '12px', height: '45px' }}>
            {renderSparkline(vitalsHistory.map(v => v.temp), '#f59e0b', 35.5, 40.5)}
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280', textAlign: 'right', marginTop: '4px' }}>60s sparkline</div>
        </div>

        {/* Respiration */}
        <div style={{
          backgroundColor: '#111827',
          border: '1px solid #374151',
          borderRadius: '8px',
          padding: '18px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={16} color="#a855f7" /> Respiration Rate
            </span>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>1 Hz</span>
          </div>
          <div style={{ fontSize: '38px', fontWeight: 'bold', color: '#a855f7' }}>
            {currentVitals.resp} <span style={{ fontSize: '16px', color: '#9ca3af', fontWeight: 'normal' }}>bpm</span>
          </div>
          <div style={{ marginTop: '12px', height: '45px' }}>
            {renderSparkline(vitalsHistory.map(v => v.resp || 16), '#a855f7', 10, 35)}
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280', textAlign: 'right', marginTop: '4px' }}>60s sparkline</div>
        </div>
      </div>

      {/* TinyML Risk Score & Hardware Link Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px'
      }}>
        {/* TinyML Risk Badge */}
        <div style={{
          backgroundColor: '#111827',
          border: `1px solid ${getRiskClassColor(risk.class)}`,
          borderRadius: '8px',
          padding: '20px',
          boxShadow: risk.class === 'CRITICAL' ? '0 0 20px rgba(239, 68, 68, 0.2)' : 'none'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} color={getRiskClassColor(risk.class)} />
              <strong style={{ fontSize: '15px' }}>TinyML Edge Risk Engine</strong>
            </div>
            <div style={{
              backgroundColor: getRiskClassColor(risk.class),
              color: '#fff',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 'bold',
              letterSpacing: '0.5px'
            }}>
              {risk.class}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '14px' }}>
            <div style={{ fontSize: '48px', fontWeight: 'bold', color: getRiskClassColor(risk.class) }}>
              {risk.score}
            </div>
            <div style={{ fontSize: '14px', color: '#9ca3af' }}>/ 100 Risk Index</div>
          </div>

          <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px', fontWeight: 600 }}>
            TOP PHYSIOLOGICAL RISK FACTORS:
          </div>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {risk.top_factors.map((factor, i) => (
              <li key={i} style={{
                fontSize: '12px',
                color: '#d1d5db',
                padding: '4px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{ color: getRiskClassColor(risk.class) }}>•</span>
                {factor}
              </li>
            ))}
          </ul>

          <div style={{
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid #374151',
            fontSize: '11px',
            color: '#6b7280',
            fontStyle: 'italic'
          }}>
            "Decision support, not a diagnosis" • Model: {risk.model_ver}
          </div>
        </div>

        {/* Radio Link State & GPS Fix */}
        <div style={{
          backgroundColor: '#111827',
          border: '1px solid #374151',
          borderRadius: '8px',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Radio size={18} color="#38bdf8" />
            <strong style={{ fontSize: '15px' }}>NXP FRDM-MCXN236 Link AI & GPS</strong>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div style={{ backgroundColor: '#1f2937', padding: '10px', borderRadius: '6px' }}>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>TinyML Link State</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#34d399', marginTop: '2px' }}>
                {linkState}
              </div>
            </div>

            <div style={{ backgroundColor: '#1f2937', padding: '10px', borderRadius: '6px' }}>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>Active RF Route</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#38bdf8', marginTop: '2px' }}>
                PORT_A (Wi-Fi 2.4G)
              </div>
            </div>

            <div style={{ backgroundColor: '#1f2937', padding: '10px', borderRadius: '6px' }}>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>NEO-6M GPS Fix</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fbbf24', marginTop: '2px' }}>
                {gpsFix.fix} ({gpsFix.satellites} Sats)
              </div>
            </div>

            <div style={{ backgroundColor: '#1f2937', padding: '10px', borderRadius: '6px' }}>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>Coordinates</div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#f3f4f6', marginTop: '2px' }}>
                {gpsFix.lat.toFixed(4)}, {gpsFix.lon.toFixed(4)}
              </div>
            </div>
          </div>

          <div style={{
            fontSize: '11px',
            color: '#9ca3af',
            lineHeight: 1.6,
            backgroundColor: '#1f2937',
            padding: '10px',
            borderRadius: '6px'
          }}>
            <div>• PDR: 96.4% | RSSI: -64 dBm | Jitter: 4.2 ms</div>
            <div>• Stability rule: Escalate Critical 3 windows, Degrading 5</div>
            <div>• SOS override: Broadcast on all routes (Wi-Fi, nRF24, SIM800L)</div>
          </div>
        </div>
      </div>
    </div>
  );
};
