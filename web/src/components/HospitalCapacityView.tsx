import React, { useState } from 'react';
import { Building2, Bed, Activity, CheckCircle2, AlertTriangle, ArrowRight, ShieldAlert, RefreshCw } from 'lucide-react';

interface Hospital {
  id: string;
  name: string;
  totalBeds: number;
  availableBeds: number;
  totalIcu: number;
  availableIcu: number;
  oxygenPct: number;
  traumaLevel: 'LEVEL_1' | 'LEVEL_2' | 'COMMUNITY';
  surgeStatus: 'NORMAL' | 'SURGE_WARNING' | 'CRITICAL_DIVERT';
  distanceKm: number;
}

export const HospitalCapacityView: React.FC = () => {
  const [hospitals, setHospitals] = useState<Hospital[]>([
    {
      id: 'HOSP-01',
      name: 'Victoria Central Hospital',
      totalBeds: 250,
      availableBeds: 18,
      totalIcu: 30,
      availableIcu: 4,
      oxygenPct: 92,
      traumaLevel: 'LEVEL_1',
      surgeStatus: 'SURGE_WARNING',
      distanceKm: 2.4
    },
    {
      id: 'HOSP-02',
      name: 'Manipal HAL Multi-Speciality',
      totalBeds: 320,
      availableBeds: 45,
      totalIcu: 40,
      availableIcu: 11,
      oxygenPct: 98,
      traumaLevel: 'LEVEL_1',
      surgeStatus: 'NORMAL',
      distanceKm: 5.1
    },
    {
      id: 'HOSP-03',
      name: 'Bowring & Lady Curzon Hospital',
      totalBeds: 180,
      availableBeds: 8,
      totalIcu: 20,
      availableIcu: 1,
      oxygenPct: 78,
      traumaLevel: 'LEVEL_2',
      surgeStatus: 'CRITICAL_DIVERT',
      distanceKm: 3.8
    },
    {
      id: 'HOSP-04',
      name: 'Command Field Emergency Station',
      totalBeds: 80,
      availableBeds: 24,
      totalIcu: 12,
      availableIcu: 6,
      oxygenPct: 95,
      traumaLevel: 'COMMUNITY',
      surgeStatus: 'NORMAL',
      distanceKm: 1.2
    }
  ]);

  const [reallocating, setReallocating] = useState<string | null>(null);

  const handleSurgeReallocate = (hospId: string) => {
    setReallocating(hospId);
    setTimeout(() => {
      setHospitals(prev => prev.map(h => {
        if (h.id === hospId) {
          return {
            ...h,
            availableBeds: h.availableBeds + 10,
            availableIcu: h.availableIcu + 2,
            surgeStatus: 'NORMAL'
          };
        }
        return h;
      }));
      setReallocating(null);
    }, 1200);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div className="nm-flat" style={{ padding: '20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
              <Building2 style={{ width: '22px', height: '22px' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                HOSPITAL CAPACITY &amp; SURGE RADAR
              </h2>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                Autonomous Regional Resource Balancer &bull; Real-time ICU &amp; Oxygen Monitoring
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="nm-inset" style={{ padding: '8px 16px', display: 'flex', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>TOTAL FREE BEDS</span>
              <strong style={{ fontSize: '16px', color: '#2563eb' }}>
                {hospitals.reduce((acc, h) => acc + h.availableBeds, 0)}
              </strong>
            </div>
            <div style={{ width: '1px', background: '#cbd5e1' }} />
            <div>
              <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>TOTAL ICU UNITS</span>
              <strong style={{ fontSize: '16px', color: '#0284c7' }}>
                {hospitals.reduce((acc, h) => acc + h.availableIcu, 0)}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Hospitals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {hospitals.map(hosp => {
          const isCritical = hosp.surgeStatus === 'CRITICAL_DIVERT';
          const isWarning = hosp.surgeStatus === 'SURGE_WARNING';

          return (
            <div 
              key={hosp.id} 
              className="nm-flat" 
              style={{ 
                padding: '20px', 
                borderLeft: isCritical ? '4px solid #ef4444' : isWarning ? '4px solid #f59e0b' : '4px solid #10b981',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{hosp.name}</h3>
                    <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                      {hosp.id} &bull; {hosp.traumaLevel} &bull; {hosp.distanceKm} km
                    </span>
                  </div>

                  <span className={isCritical ? 'stale-badge' : 'nm-badge'} style={{
                    backgroundColor: isCritical ? '#fef2f2' : isWarning ? '#fffbeb' : '#ecfdf5',
                    color: isCritical ? '#b91c1c' : isWarning ? '#b45309' : '#047857',
                    border: `1px solid ${isCritical ? '#fecaca' : isWarning ? '#fde68a' : '#a7f3d0'}`
                  }}>
                    {hosp.surgeStatus}
                  </span>
                </div>

                {/* Stats Wells */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                  <div className="nm-inset" style={{ padding: '10px' }}>
                    <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>AVAILABLE BEDS</span>
                    <strong style={{ fontSize: '18px', color: hosp.availableBeds <= 10 ? '#ef4444' : '#0f172a' }}>
                      {hosp.availableBeds} <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>/ {hosp.totalBeds}</span>
                    </strong>
                  </div>

                  <div className="nm-inset" style={{ padding: '10px' }}>
                    <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>ICU OCCUPANCY</span>
                    <strong style={{ fontSize: '18px', color: hosp.availableIcu <= 2 ? '#ef4444' : '#0284c7' }}>
                      {hosp.availableIcu} <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>/ {hosp.totalIcu}</span>
                    </strong>
                  </div>
                </div>

                {/* Oxygen Meter */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                    <span style={{ color: '#64748b' }}>Oxygen Supply Reserves</span>
                    <strong style={{ color: hosp.oxygenPct < 85 ? '#ef4444' : '#10b981' }}>{hosp.oxygenPct}%</strong>
                  </div>
                  <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${hosp.oxygenPct}%`,
                      height: '100%',
                      background: hosp.oxygenPct < 85 ? '#ef4444' : 'linear-gradient(90deg, #06b6d4, #2563eb)'
                    }} />
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                disabled={reallocating === hosp.id}
                onClick={() => handleSurgeReallocate(hosp.id)}
                className="nm-btn"
                style={{
                  width: '100%',
                  padding: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontWeight: 700,
                  fontSize: '12px',
                  color: isCritical ? '#b91c1c' : '#2563eb'
                }}
              >
                {reallocating === hosp.id ? (
                  <>
                    <RefreshCw className="clinical-pulse" style={{ width: '14px', height: '14px' }} />
                    REALLOCATING SURGE...
                  </>
                ) : (
                  <>
                    <Activity style={{ width: '14px', height: '14px' }} />
                    DEPLOY SURGE CAPACITY
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
