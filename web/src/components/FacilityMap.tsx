import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Pill, 
  Droplet, 
  Truck, 
  MapPin, 
  Phone, 
  Clock, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  Navigation,
  Layers,
  Info
} from 'lucide-react';
import { Hospital, Pharmacy, BloodBank, Ambulance, DrugItem } from '../types';
import { HubApi, EmergencyAssignment, haversineDistanceKm } from '../mock/hubApi';

export const FacilityMap: React.FC = () => {
  const [activeLayer, setActiveLayer] = useState<'hospitals' | 'pharmacies' | 'bloodbanks' | 'ambulances'>('hospitals');
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [bloodbanks, setBloodBanks] = useState<BloodBank[]>([]);
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [activeEmergencies, setActiveEmergencies] = useState<EmergencyAssignment[]>([]);

  // Search & Filter States
  const [drugSearchQuery, setDrugSearchQuery] = useState('');
  const [selectedBloodGroup, setSelectedBloodGroup] = useState<string>('ALL');
  const [selectedFacility, setSelectedFacility] = useState<any | null>(null);

  // Device GPS Location (Bangalore demo base)
  const deviceLocation = { lat: 12.9647, lon: 77.5768 };

  useEffect(() => {
    fetchFacilities();
    const interval = setInterval(fetchFacilities, 6000);
    return () => clearInterval(interval);
  }, []);

  const fetchFacilities = async () => {
    try {
      const [h, p, b, a, em] = await Promise.all([
        HubApi.getHospitals(),
        HubApi.getPharmacies(),
        HubApi.getBloodBanks(),
        HubApi.getAmbulances(),
        HubApi.getActiveEmergencies()
      ]);
      setHospitals(h);
      setPharmacies(p);
      setBloodBanks(b);
      setAmbulances(a);
      setActiveEmergencies(em);
    } catch (err) {
      console.error("Failed to load facilities:", err);
    }
  };

  const isStale = (asOfIso: string) => {
    const ageMin = (Date.now() - new Date(asOfIso).getTime()) / 60000;
    return ageMin > 15;
  };

  const isDrugExpiringSoon = (expiryIso: string) => {
    const diffDays = (new Date(expiryIso).getTime() - Date.now()) / (1000 * 3600 * 24);
    return diffDays < 30;
  };

  const getSourceBadge = (source: string, asOf: string) => {
    const stale = isStale(asOf);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{
          backgroundColor: source === 'live' ? '#065f46' : source === 'cached' ? '#78350f' : '#1e3a8a',
          color: source === 'live' ? '#34d399' : source === 'cached' ? '#fbbf24' : '#60a5fa',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: 'bold',
          textTransform: 'uppercase'
        }}>
          {source}
        </span>
        {stale && (
          <span className="stale-badge" title="Data age exceeds 15 minutes">
            <AlertTriangle size={11} /> STALE (&gt;15m)
          </span>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1300px', margin: '0 auto' }}>
      {/* Title & Active Dispatch Alert Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={22} color="#fbbf24" />
            F5-F7 Tactical Geospatial Medical Map
          </h2>
          <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '2px' }}>
            Real-time facility telemetry • Local MBTiles / Offline cached vectors • Honest as-of provenance
          </div>
        </div>

        {/* Layer Switcher Buttons */}
        <div style={{ display: 'flex', gap: '6px', backgroundColor: '#111827', padding: '4px', borderRadius: '8px', border: '1px solid #374151' }}>
          <button
            onClick={() => setActiveLayer('hospitals')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: activeLayer === 'hospitals' ? '#0284c7' : 'transparent',
              color: activeLayer === 'hospitals' ? '#fff' : '#9ca3af',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Building2 size={14} /> Hospitals ({hospitals.length})
          </button>

          <button
            onClick={() => setActiveLayer('pharmacies')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: activeLayer === 'pharmacies' ? '#0284c7' : 'transparent',
              color: activeLayer === 'pharmacies' ? '#fff' : '#9ca3af',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Pill size={14} /> Pharmacies ({pharmacies.length})
          </button>

          <button
            onClick={() => setActiveLayer('bloodbanks')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: activeLayer === 'bloodbanks' ? '#0284c7' : 'transparent',
              color: activeLayer === 'bloodbanks' ? '#fff' : '#9ca3af',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Droplet size={14} /> Blood Banks ({bloodbanks.length})
          </button>

          <button
            onClick={() => setActiveLayer('ambulances')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: activeLayer === 'ambulances' ? '#0284c7' : 'transparent',
              color: activeLayer === 'ambulances' ? '#fff' : '#9ca3af',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Truck size={14} /> Ambulances ({ambulances.length})
          </button>
        </div>
      </div>

      {/* Active Emergency Dispatch Vector Banner */}
      {activeEmergencies.length > 0 && (
        <div style={{
          backgroundColor: '#450a0a',
          border: '1px solid #ef4444',
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
            <Truck size={24} color="#f87171" className="animate-pulse-critical" />
            <div>
              <strong style={{ color: '#fca5a5', fontSize: '14px' }}>
                ACTIVE EMERGENCY DISPATCH: {activeEmergencies[0].trigger.pseudonym} (P0)
              </strong>
              <div style={{ fontSize: '12px', color: '#fecaca' }}>
                Assigned: {activeEmergencies[0].ambulance.id} ➔ Destination: {activeEmergencies[0].hospital.name} • ETA: {activeEmergencies[0].eta_minutes} min (Offline straight-line vector active)
              </div>
            </div>
          </div>
          <div style={{
            backgroundColor: '#7f1d1d',
            color: '#fff',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            Status: {activeEmergencies[0].status}
          </div>
        </div>
      )}

      {/* Interactive Tactical Map & Facility Inspector */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        {/* Tactical Canvas / Map Visualizer */}
        <div style={{
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '16px',
          minHeight: '480px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Navigation size={14} color="#38bdf8" />
              Tactical Grid: Bangalore Central (12.9647 N, 77.5768 E)
            </span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Offline Vector View (Local MBTiles)
            </span>
          </div>

          {/* Interactive SVG Radar / Map representation */}
          <div style={{
            flex: 1,
            backgroundColor: '#0b1329',
            border: '1px dashed #1e293b',
            borderRadius: '6px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Grid Lines */}
            <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.8" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Active Emergency Dispatch Line */}
              {activeEmergencies.length > 0 && (
                <line
                  x1="50%"
                  y1="50%"
                  x2="75%"
                  y2="30%"
                  stroke="#ef4444"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                />
              )}
            </svg>

            {/* Patient/Device Marker Center */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                zIndex: 10
              }}
            >
              <div style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: '#38bdf8',
                border: '3px solid #fff',
                boxShadow: '0 0 12px #38bdf8',
                margin: '0 auto'
              }} />
              <div style={{
                fontSize: '11px',
                fontWeight: 'bold',
                color: '#38bdf8',
                backgroundColor: '#0f172a',
                padding: '2px 6px',
                borderRadius: '4px',
                marginTop: '4px',
                whiteSpace: 'nowrap'
              }}>
                Device GPS (Patient)
              </div>
            </div>

            {/* Facility Markers plotted by layer */}
            {activeLayer === 'hospitals' && hospitals.map((h, idx) => {
              // Offset based on coordinate delta
              const top = 50 + (h.lat - deviceLocation.lat) * 2000;
              const left = 50 + (h.lon - deviceLocation.lon) * 2000;
              const isSelected = selectedFacility?.id === h.id;

              return (
                <div
                  key={h.id}
                  onClick={() => setSelectedFacility(h)}
                  style={{
                    position: 'absolute',
                    top: `${Math.min(85, Math.max(15, top))}%`,
                    left: `${Math.min(85, Math.max(15, left))}%`,
                    transform: 'translate(-50%, -50%)',
                    cursor: 'pointer',
                    zIndex: isSelected ? 20 : 5
                  }}
                >
                  <div style={{
                    width: isSelected ? '26px' : '20px',
                    height: isSelected ? '26px' : '20px',
                    borderRadius: '6px',
                    backgroundColor: '#0284c7',
                    border: isSelected ? '2px solid #fff' : '1px solid #38bdf8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    boxShadow: isSelected ? '0 0 10px #0284c7' : 'none'
                  }}>
                    <Building2 size={12} />
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: '#e2e8f0',
                    backgroundColor: 'rgba(15, 23, 42, 0.85)',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    marginTop: '2px',
                    whiteSpace: 'nowrap'
                  }}>
                    {h.name.split(' ')[0]} ({h.beds_free} beds)
                  </div>
                </div>
              );
            })}

            {activeLayer === 'pharmacies' && pharmacies.map((p) => {
              const top = 50 + (p.lat - deviceLocation.lat) * 2000;
              const left = 50 + (p.lon - deviceLocation.lon) * 2000;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedFacility(p)}
                  style={{
                    position: 'absolute',
                    top: `${Math.min(85, Math.max(15, top))}%`,
                    left: `${Math.min(85, Math.max(15, left))}%`,
                    transform: 'translate(-50%, -50%)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    border: '1px solid #34d399',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff'
                  }}>
                    <Pill size={11} />
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: '#e2e8f0',
                    backgroundColor: 'rgba(15, 23, 42, 0.85)',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    marginTop: '2px',
                    whiteSpace: 'nowrap'
                  }}>
                    {p.name.split(' ')[0]}
                  </div>
                </div>
              );
            })}

            {activeLayer === 'bloodbanks' && bloodbanks.map((b) => {
              const top = 50 + (b.lat - deviceLocation.lat) * 2000;
              const left = 50 + (b.lon - deviceLocation.lon) * 2000;
              return (
                <div
                  key={b.id}
                  onClick={() => setSelectedFacility(b)}
                  style={{
                    position: 'absolute',
                    top: `${Math.min(85, Math.max(15, top))}%`,
                    left: `${Math.min(85, Math.max(15, left))}%`,
                    transform: 'translate(-50%, -50%)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#dc2626',
                    border: '1px solid #f87171',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff'
                  }}>
                    <Droplet size={11} />
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: '#e2e8f0',
                    backgroundColor: 'rgba(15, 23, 42, 0.85)',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    marginTop: '2px',
                    whiteSpace: 'nowrap'
                  }}>
                    {b.name.split(' ')[0]}
                  </div>
                </div>
              );
            })}

            {activeLayer === 'ambulances' && ambulances.map((a) => {
              const top = 50 + (a.lat - deviceLocation.lat) * 2000;
              const left = 50 + (a.lon - deviceLocation.lon) * 2000;
              const isFree = a.status === 'FREE';
              return (
                <div
                  key={a.id}
                  onClick={() => setSelectedFacility(a)}
                  style={{
                    position: 'absolute',
                    top: `${Math.min(85, Math.max(15, top))}%`,
                    left: `${Math.min(85, Math.max(15, left))}%`,
                    transform: 'translate(-50%, -50%)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '4px',
                    backgroundColor: isFree ? '#059669' : '#dc2626',
                    border: `1px solid ${isFree ? '#34d399' : '#f87171'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff'
                  }}>
                    <Truck size={12} />
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: '#e2e8f0',
                    backgroundColor: 'rgba(15, 23, 42, 0.85)',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    marginTop: '2px',
                    whiteSpace: 'nowrap'
                  }}>
                    {a.id} [{a.status}]
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Radius: 15 km • Offline fallback: Canvas Vector Mode</span>
            <span>Tap any marker to view real-time inventory</span>
          </div>
        </div>

        {/* Layer Detail & Search Panel */}
        <div style={{
          backgroundColor: '#111827',
          border: '1px solid #374151',
          borderRadius: '8px',
          padding: '20px',
          maxHeight: '520px',
          overflowY: 'auto'
        }}>
          {/* Layer Sub-header & Filters */}
          {activeLayer === 'pharmacies' && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#1f2937',
                borderRadius: '6px',
                padding: '6px 10px',
                border: '1px solid #374151'
              }}>
                <Search size={14} color="#9ca3af" style={{ marginRight: '8px' }} />
                <input
                  type="text"
                  placeholder="Search drugs (e.g. Remdesivir, Adrenaline)..."
                  value={drugSearchQuery}
                  onChange={(e) => setDrugSearchQuery(e.target.value)}
                  style={{
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    color: '#f9fafb',
                    fontSize: '12px',
                    width: '100%'
                  }}
                />
              </div>
            </div>
          )}

          {activeLayer === 'bloodbanks' && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>Filter Blood Group:</div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {['ALL', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(grp => (
                  <button
                    key={grp}
                    onClick={() => setSelectedBloodGroup(grp)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      backgroundColor: selectedBloodGroup === grp ? '#dc2626' : '#1f2937',
                      color: selectedBloodGroup === grp ? '#fff' : '#d1d5db'
                    }}
                  >
                    {grp}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cards for Active Layer */}
          {activeLayer === 'hospitals' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {hospitals.map(h => (
                <div key={h.id} style={{
                  backgroundColor: '#1f2937',
                  border: selectedFacility?.id === h.id ? '1px solid #38bdf8' : '1px solid #374151',
                  borderRadius: '6px',
                  padding: '14px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <strong style={{ fontSize: '14px' }}>{h.name}</strong>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                        Distance: {haversineDistanceKm(deviceLocation.lat, deviceLocation.lon, h.lat, h.lon).toFixed(1)} km
                      </div>
                    </div>
                    {getSourceBadge(h.source, h.as_of)}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', margin: '10px 0' }}>
                    <div style={{ backgroundColor: '#111827', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: '#9ca3af' }}>Beds</div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#34d399' }}>{h.beds_free}</div>
                    </div>
                    <div style={{ backgroundColor: '#111827', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: '#9ca3af' }}>ICU</div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#38bdf8' }}>{h.icu_free}</div>
                    </div>
                    <div style={{ backgroundColor: '#111827', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: '#9ca3af' }}>O2 Cyl</div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fbbf24' }}>{h.o2_cylinders}</div>
                    </div>
                    <div style={{ backgroundColor: '#111827', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: '#9ca3af' }}>Vents</div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#a855f7' }}>{h.ventilators}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>
                      as_of: {new Date(h.as_of).toLocaleTimeString()}
                    </span>
                    <a
                      href={`tel:${h.phone}`}
                      style={{
                        backgroundColor: '#0284c7',
                        color: '#fff',
                        textDecoration: 'none',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Phone size={12} /> Call Hospital
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeLayer === 'pharmacies' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pharmacies.map(p => {
                const filteredDrugs = p.drugs.filter(d => 
                  drugSearchQuery === '' || d.name.toLowerCase().includes(drugSearchQuery.toLowerCase())
                );
                if (drugSearchQuery !== '' && filteredDrugs.length === 0) return null;

                return (
                  <div key={p.id} style={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '6px',
                    padding: '14px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <strong style={{ fontSize: '14px' }}>{p.name}</strong>
                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                          Dist: {haversineDistanceKm(deviceLocation.lat, deviceLocation.lon, p.lat, p.lon).toFixed(1)} km
                        </div>
                      </div>
                      {getSourceBadge(p.source, p.as_of)}
                    </div>

                    {/* Drug list table */}
                    <div style={{ fontSize: '11px', margin: '8px 0' }}>
                      {filteredDrugs.map((d, i) => {
                        const expiring = isDrugExpiringSoon(d.expiry);
                        return (
                          <div key={i} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '4px 0',
                            borderBottom: '1px solid #374151'
                          }}>
                            <div>
                              <span>{d.name}</span>
                              {d.rare && (
                                <span style={{
                                  backgroundColor: '#7c3aed',
                                  color: '#fff',
                                  fontSize: '9px',
                                  padding: '1px 4px',
                                  borderRadius: '3px',
                                  marginLeft: '6px'
                                }}>
                                  RARE
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 'bold' }}>Qty: {d.qty}</span>
                              {expiring ? (
                                <span style={{ color: '#ef4444', fontWeight: 'bold' }}>
                                  Exp: {d.expiry} ⚠️
                                </span>
                              ) : (
                                <span style={{ color: '#9ca3af' }}>Exp: {d.expiry}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#6b7280' }}>
                        as_of: {new Date(p.as_of).toLocaleTimeString()}
                      </span>
                      <a
                        href={`tel:${p.phone}`}
                        style={{
                          backgroundColor: '#059669',
                          color: '#fff',
                          textDecoration: 'none',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Phone size={12} /> Call Pharmacy
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeLayer === 'bloodbanks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {bloodbanks.map(b => (
                <div key={b.id} style={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '6px',
                  padding: '14px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <strong style={{ fontSize: '14px' }}>{b.name}</strong>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                        Dist: {haversineDistanceKm(deviceLocation.lat, deviceLocation.lon, b.lat, b.lon).toFixed(1)} km
                      </div>
                    </div>
                    {getSourceBadge(b.source, b.as_of)}
                  </div>

                  {/* 8-Group Availability Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '6px',
                    margin: '10px 0'
                  }}>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(grp => {
                      const units = b.units[grp] || 0;
                      const isHighlighted = selectedBloodGroup === grp;
                      return (
                        <div
                          key={grp}
                          style={{
                            backgroundColor: isHighlighted ? '#7f1d1d' : '#111827',
                            border: isHighlighted ? '1px solid #ef4444' : '1px solid #374151',
                            padding: '6px',
                            borderRadius: '4px',
                            textAlign: 'center'
                          }}
                        >
                          <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 'bold' }}>{grp}</div>
                          <div style={{ fontSize: '14px', fontWeight: 'bold', color: units > 5 ? '#34d399' : '#f87171' }}>
                            {units} <span style={{ fontSize: '10px', fontWeight: 'normal' }}>u</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>
                      as_of: {new Date(b.as_of).toLocaleTimeString()}
                    </span>
                    <a
                      href={`tel:${b.phone}`}
                      style={{
                        backgroundColor: '#dc2626',
                        color: '#fff',
                        textDecoration: 'none',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Phone size={12} /> Contact Blood Bank
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeLayer === 'ambulances' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {ambulances.map(a => {
                const isFree = a.status === 'FREE';
                return (
                  <div key={a.id} style={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '6px',
                    padding: '14px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div>
                        <strong style={{ fontSize: '14px' }}>{a.id}</strong>
                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                          Dist: {haversineDistanceKm(deviceLocation.lat, deviceLocation.lon, a.lat, a.lon).toFixed(1)} km
                        </div>
                      </div>
                      <span style={{
                        backgroundColor: isFree ? '#065f46' : '#7f1d1d',
                        color: isFree ? '#34d399' : '#f87171',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        {a.status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#6b7280' }}>
                        Contact: {a.contact}
                      </span>
                      <a
                        href={`tel:${a.contact}`}
                        style={{
                          backgroundColor: '#0284c7',
                          color: '#fff',
                          textDecoration: 'none',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Phone size={12} /> Call Driver
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
