import React, { useState } from 'react';
import { Droplet, AlertCircle, ArrowUpRight, Check, RefreshCw } from 'lucide-react';

interface BloodStock {
  group: string;
  units: number;
  criticalThreshold: number;
  status: 'PLENTIFUL' | 'ADEQUATE' | 'CRITICAL';
}

export const BloodBankView: React.FC = () => {
  const [stocks, setStocks] = useState<BloodStock[]>([
    { group: 'O-', units: 3, criticalThreshold: 5, status: 'CRITICAL' },
    { group: 'O+', units: 28, criticalThreshold: 10, status: 'PLENTIFUL' },
    { group: 'A-', units: 6, criticalThreshold: 4, status: 'ADEQUATE' },
    { group: 'A+', units: 34, criticalThreshold: 12, status: 'PLENTIFUL' },
    { group: 'B-', units: 4, criticalThreshold: 5, status: 'CRITICAL' },
    { group: 'B+', units: 42, criticalThreshold: 15, status: 'PLENTIFUL' },
    { group: 'AB-', units: 2, criticalThreshold: 3, status: 'CRITICAL' },
    { group: 'AB+', units: 19, criticalThreshold: 8, status: 'PLENTIFUL' },
    { group: 'Plasma (FFP)', units: 45, criticalThreshold: 20, status: 'PLENTIFUL' },
    { group: 'Platelets (RDP)', units: 12, criticalThreshold: 10, status: 'ADEQUATE' },
  ]);

  const [dispatched, setDispatched] = useState<string | null>(null);

  const handleRequestHemo = (group: string) => {
    setDispatched(group);
    setTimeout(() => {
      setStocks(prev => prev.map(s => s.group === group ? { ...s, units: s.units + 6, status: 'ADEQUATE' } : s));
      setDispatched(null);
    }, 1500);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div className="nm-flat" style={{ padding: '20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
            <Droplet style={{ width: '22px', height: '22px' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              REGIONAL BLOOD BANK &amp; HEMO LOGISTICS
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              Cross-facility transfusion inventory &bull; Universal donor (O-) emergency resupply
            </p>
          </div>
        </div>

        <div className="nm-badge" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#b91c1c' }}>
          <AlertCircle style={{ width: '14px', height: '14px' }} />
          3 GROUPS BELOW CRITICAL THRESHOLD
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
        {stocks.map(item => {
          const isCritical = item.status === 'CRITICAL';
          const isAdequate = item.status === 'ADEQUATE';

          return (
            <div 
              key={item.group} 
              className="nm-flat" 
              style={{ 
                padding: '16px',
                borderLeft: isCritical ? '4px solid #ef4444' : isAdequate ? '4px solid #f59e0b' : '4px solid #10b981'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>
                  {item.group}
                </span>
                <span className={isCritical ? 'stale-badge' : 'nm-badge'} style={{
                  backgroundColor: isCritical ? '#fef2f2' : isAdequate ? '#fffbeb' : '#ecfdf5',
                  color: isCritical ? '#b91c1c' : isAdequate ? '#b45309' : '#047857'
                }}>
                  {item.status}
                </span>
              </div>

              <div className="nm-inset" style={{ padding: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>STORED UNITS</span>
                <strong style={{ fontSize: '24px', color: isCritical ? '#ef4444' : '#0f172a' }}>
                  {item.units} <span style={{ fontSize: '12px', color: '#94a3b8' }}>units</span>
                </strong>
                <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>
                  Min Threshold: {item.criticalThreshold} units
                </span>
              </div>

              <button
                disabled={dispatched === item.group}
                onClick={() => handleRequestHemo(item.group)}
                className="nm-btn"
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  color: isCritical ? '#b91c1c' : '#2563eb'
                }}
              >
                {dispatched === item.group ? (
                  <>
                    <RefreshCw className="clinical-pulse" style={{ width: '13px', height: '13px' }} />
                    DISPATCHING UAV...
                  </>
                ) : (
                  <>
                    <ArrowUpRight style={{ width: '13px', height: '13px' }} />
                    REQUEST TRANSFER
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
