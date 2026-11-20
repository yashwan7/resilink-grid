import React, { useState } from 'react';
import { Zap, Cpu, Radio, ShieldCheck, Activity, RefreshCw, CheckCircle2 } from 'lucide-react';

export const FailoverTinyMLView: React.FC = () => {
  const [activeRoute, setActiveRoute] = useState<'PORT_A_WIFI' | 'PORT_B_BACKUP' | 'MESH_NRF24'>('PORT_A_WIFI');
  const [isSimulatingFailover, setIsSimulatingFailover] = useState(false);

  const handleSimulateRouteSwitch = () => {
    setIsSimulatingFailover(true);
    setTimeout(() => {
      setActiveRoute(prev => {
        if (prev === 'PORT_A_WIFI') return 'PORT_B_BACKUP';
        if (prev === 'PORT_B_BACKUP') return 'MESH_NRF24';
        return 'PORT_A_WIFI';
      });
      setIsSimulatingFailover(false);
    }, 800);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div className="nm-flat" style={{ padding: '20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
            <Zap style={{ width: '22px', height: '22px' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              EDGE HARDWARE &amp; TINYML FAILOVER ENGINE
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              Lead Engineer: Yashwanth &bull; NXP FRDM-MCXN236 Rev C1 &bull; ESP32-WROOM-32D Bridge
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <span className="nm-badge" style={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', color: '#047857' }}>
            <CheckCircle2 style={{ width: '13px', height: '13px' }} />
            T1-T18 AUDIT VERIFIED
          </span>
          <button
            onClick={handleSimulateRouteSwitch}
            disabled={isSimulatingFailover}
            className="nm-btn"
            style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw className={isSimulatingFailover ? 'clinical-pulse' : ''} style={{ width: '13px', height: '13px' }} />
            SIMULATE FAILOVER
          </button>
        </div>
      </div>

      {/* Main Hardware Architecture Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* NXP MCXN236 Specs */}
        <div className="nm-flat" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Cpu style={{ width: '18px', height: '18px', color: '#2563eb' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              NXP FRDM-MCXN236 (Edge Primary)
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="nm-inset" style={{ padding: '10px' }}>
              <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>CORE FREQUENCY</span>
              <strong style={{ fontSize: '15px', color: '#0f172a' }}>150 MHz</strong>
              <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>ARM Cortex-M33</span>
            </div>

            <div className="nm-inset" style={{ padding: '10px' }}>
              <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>TINYML INFERENCE</span>
              <strong style={{ fontSize: '15px', color: '#10b981' }}>420 µs</strong>
              <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>Target: &lt; 1.0 ms</span>
            </div>

            <div className="nm-inset" style={{ padding: '10px' }}>
              <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>SRAM ARENA FOOTPRINT</span>
              <strong style={{ fontSize: '15px', color: '#2563eb' }}>16.0 KB</strong>
              <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>Budget: 32.0 KB</span>
            </div>

            <div className="nm-inset" style={{ padding: '10px' }}>
              <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>CRITICAL RECALL</span>
              <strong style={{ fontSize: '15px', color: '#047857' }}>99.52%</strong>
              <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>P0 Sensitivity</span>
            </div>
          </div>
        </div>

        {/* ESP32 Coprocessor */}
        <div className="nm-flat" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Radio style={{ width: '18px', height: '18px', color: '#0284c7' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              ESP32-WROOM-32D (Radio Bridge)
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="nm-inset" style={{ padding: '10px' }}>
              <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>BRIDGE BAUD RATE</span>
              <strong style={{ fontSize: '15px', color: '#0f172a' }}>460,800 baud</strong>
              <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>CRC-16-CCITT</span>
            </div>

            <div className="nm-inset" style={{ padding: '10px' }}>
              <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>PRIORITY QUEUE</span>
              <strong style={{ fontSize: '15px', color: '#2563eb' }}>P0 &gt; P1 &gt; P2</strong>
              <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>2-bit hardware PQ</span>
            </div>

            <div className="nm-inset" style={{ padding: '10px' }}>
              <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>NRF24 PHYSICAL FRAME</span>
              <strong style={{ fontSize: '15px', color: '#0f172a' }}>32 Bytes</strong>
              <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>8B Header + 24B Data</span>
            </div>

            <div className="nm-inset" style={{ padding: '10px' }}>
              <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>MAX RELAY HOPS</span>
              <strong style={{ fontSize: '15px', color: '#10b981' }}>&le; 4 Hops</strong>
              <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>Drop on ttl &lt; 0</span>
            </div>
          </div>
        </div>

        {/* Dynamic Route Arbitration */}
        <div className="nm-flat" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Activity style={{ width: '18px', height: '18px', color: '#10b981' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Link Route Arbitration Status
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: activeRoute === 'PORT_A_WIFI' ? '2px solid #2563eb' : '1px solid #e2e8f0',
              background: activeRoute === 'PORT_A_WIFI' ? '#eff6ff' : '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <strong style={{ fontSize: '12px', color: activeRoute === 'PORT_A_WIFI' ? '#1d4ed8' : '#0f172a' }}>
                  PORT_A: PRIMARY FIELD WI-FI
                </strong>
                <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>5 GHz High-Throughput &bull; RSSI -58 dBm</span>
              </div>
              {activeRoute === 'PORT_A_WIFI' && <span className="nm-badge">ACTIVE</span>}
            </div>

            <div style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: activeRoute === 'PORT_B_BACKUP' ? '2px solid #f59e0b' : '1px solid #e2e8f0',
              background: activeRoute === 'PORT_B_BACKUP' ? '#fffbeb' : '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <strong style={{ fontSize: '12px', color: activeRoute === 'PORT_B_BACKUP' ? '#b45309' : '#0f172a' }}>
                  PORT_B: CELLULAR BACKUP (SIM800L)
                </strong>
                <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>GPRS 2G Failover &bull; 2A Peak Current Regulated</span>
              </div>
              {activeRoute === 'PORT_B_BACKUP' && <span className="nm-badge" style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a', color: '#b45309' }}>ACTIVE</span>}
            </div>

            <div style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: activeRoute === 'MESH_NRF24' ? '2px solid #ef4444' : '1px solid #e2e8f0',
              background: activeRoute === 'MESH_NRF24' ? '#fef2f2' : '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <strong style={{ fontSize: '12px', color: activeRoute === 'MESH_NRF24' ? '#b91c1c' : '#0f172a' }}>
                  MESH: nRF24L01+ MULTI-HOP
                </strong>
                <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>2.4 GHz ISM &bull; Zero Infrastructure Radio Relay</span>
              </div>
              {activeRoute === 'MESH_NRF24' && <span className="stale-badge">ACTIVE</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
