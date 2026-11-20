import React, { useState } from 'react';
import { Pill, AlertTriangle, ShieldCheck, Plus, Package } from 'lucide-react';

interface Medicine {
  id: string;
  name: string;
  category: 'ANALGESIC' | 'ANTIDOTE' | 'VASOPRESSOR' | 'ANTIBIOTIC' | 'IV_FLUID';
  stockVials: number;
  criticalMin: number;
  route: string;
  indication: string;
}

export const PharmacyView: React.FC = () => {
  const [meds, setMeds] = useState<Medicine[]>([
    { id: 'MED-01', name: 'Norepinephrine (4mg/4mL)', category: 'VASOPRESSOR', stockVials: 14, criticalMin: 10, route: 'IV Infusion', indication: 'Septic & Neurogenic Shock' },
    { id: 'MED-02', name: 'Atropine Sulfate (1mg/mL)', category: 'ANTIDOTE', stockVials: 6, criticalMin: 8, route: 'IV Push', indication: 'Symptomatic Bradycardia & Organophosphate' },
    { id: 'MED-03', name: 'Fentanyl Citrate (100mcg/2mL)', category: 'ANALGESIC', stockVials: 22, criticalMin: 15, route: 'IV / IN', indication: 'Severe Tactical Trauma Pain' },
    { id: 'MED-04', name: 'Ceftriaxone (1g)', category: 'ANTIBIOTIC', stockVials: 40, criticalMin: 20, route: 'IV / IM', indication: 'Open Fractures & Blast Sepsis' },
    { id: 'MED-05', name: 'Tranexamic Acid - TXA (1g)', category: 'ANTIDOTE', stockVials: 18, criticalMin: 12, route: 'IV Infusion', indication: 'Catastrophic Non-Compressible Hemorrhage' },
    { id: 'MED-06', name: 'Ringer Lactate (1000mL)', category: 'IV_FLUID', stockVials: 52, criticalMin: 30, route: 'IV / IO', indication: 'Volume Resuscitation' },
  ]);

  const handleDispense = (id: string) => {
    setMeds(prev => prev.map(m => m.id === id ? { ...m, stockVials: Math.max(0, m.stockVials - 1) } : m));
  };

  const handleRestock = (id: string) => {
    setMeds(prev => prev.map(m => m.id === id ? { ...m, stockVials: m.stockVials + 5 } : m));
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div className="nm-flat" style={{ padding: '20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
            <Pill style={{ width: '22px', height: '22px' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              FIELD PHARMACY &amp; CRITICAL RX DISPENSARY
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              Controlled tactical analgesics &bull; Resuscitation vasopressors &amp; Hemostatic TXA
            </p>
          </div>
        </div>

        <div className="nm-badge">
          <ShieldCheck style={{ width: '14px', height: '14px' }} />
          CONTROLLED SUBSTANCE LOG: SIGNED
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {meds.map(med => {
          const isLow = med.stockVials <= med.criticalMin;

          return (
            <div 
              key={med.id} 
              className="nm-flat" 
              style={{ 
                padding: '18px', 
                borderLeft: isLow ? '4px solid #ef4444' : '4px solid #10b981',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {med.name}
                  </h3>
                  <span className="nm-badge" style={{ fontSize: '10px' }}>
                    {med.category}
                  </span>
                </div>

                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
                  <strong>Indication:</strong> {med.indication} ({med.route})
                </p>

                <div className="nm-inset" style={{ padding: '10px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '10px', color: '#64748b' }}>AVAILABLE STOCK</span>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: isLow ? '#ef4444' : '#0f172a' }}>
                      {med.stockVials} <span style={{ fontSize: '11px', color: '#94a3b8' }}>vials</span>
                    </div>
                  </div>
                  {isLow && (
                    <span className="stale-badge" style={{ fontSize: '10px' }}>
                      <AlertTriangle style={{ width: '12px', height: '12px' }} />
                      RESTOCK
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleDispense(med.id)}
                  disabled={med.stockVials <= 0}
                  className="nm-btn"
                  style={{ flex: 1, padding: '8px', fontSize: '11px', fontWeight: 700 }}
                >
                  DISPENSE 1 UNIT
                </button>
                <button
                  onClick={() => handleRestock(med.id)}
                  className="nm-btn"
                  style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 700, color: '#10b981' }}
                >
                  <Plus style={{ width: '14px', height: '14px' }} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
