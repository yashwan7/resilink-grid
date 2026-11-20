// F9 Patient-side Local Groot AI & Safety Guardrails
// Generates "AI report for this moment" from decrypted risk + snapshot.
// STRICT GUARDRAIL: No diagnosis, no dosing, always show "Decision support, not a diagnosis".

import { VitalsSample, RiskScore } from '../types';

export interface GrootAIReport {
  timestamp: number;
  headline: string;
  plainLanguageSummary: string;
  recommendedActions: string[];
  disclaimer: string;
  emergencyNumber: string;
}

export function generateMomentReport(vitals: VitalsSample, risk: RiskScore): GrootAIReport {
  let headline = 'Vitals Stable • Nominal Condition';
  let summary = 'Your body indicators are currently within standard ranges. Oxygen levels and heart rate show normal baseline activity.';
  let actions = [
    'Continue normal routine activities.',
    'Stay well hydrated with clean water.',
    'Keep your wearable sensor attached for continuous monitoring.'
  ];

  if (risk.class === 'CRITICAL') {
    headline = 'URGENT: Critical Physiological Strain Detected';
    summary = `Alert: Your oxygen saturation has dropped to ${vitals.spo2}%, accompanied by a rapid heart rate of ${vitals.hr} bpm and elevated breathing rate. This indicates severe hypoxemia and physiological distress.`;
    actions = [
      'Sit upright immediately in an open, well-ventilated area.',
      'Tap the Emergency SOS button below to trigger ambulance dispatch.',
      'Loosen tight clothing around your collar and chest.',
      'Take slow, deliberate breaths while assistance is on the way.'
    ];
  } else if (risk.class === 'HIGH') {
    headline = 'Elevated Risk: Physiological Stress Detected';
    summary = `Notice: Elevated pulse rate (${vitals.hr} bpm) with body temperature at ${vitals.temp.toFixed(1)}°C. Your system is exerting extra compensatory effort.`;
    actions = [
      'Rest immediately in a comfortable seated or reclined position.',
      'Take slow, deep breaths through your nose and out through your mouth.',
      'If you have prescribed emergency inhalers or medications, have them ready.',
      'Request a telemedicine consultation with your designated doctor.'
    ];
  } else if (risk.class === 'MED') {
    headline = 'Mild Physiological Variation Observed';
    summary = `Mild deviations detected: Heart rate ${vitals.hr} bpm, SpO2 ${vitals.spo2}%. Monitor how you feel over the next 15 minutes.`;
    actions = [
      'Avoid strenuous physical exertion.',
      'Sit comfortably and rest for 10 minutes.',
      'Re-check vitals in a seated position.'
    ];
  }

  return {
    timestamp: Date.now(),
    headline,
    plainLanguageSummary: summary,
    recommendedActions: actions,
    disclaimer: 'Decision support, not a diagnosis. Not a substitute for professional clinical medical judgment.',
    emergencyNumber: 'Emergency Helpline: 108 / 112'
  };
}

/**
 * Patient-side Chat Engine with Strict Clinical Guardrails
 */
export function answerPatientGrootQuery(query: string, vitals: VitalsSample, risk: RiskScore): string {
  const lower = query.toLowerCase();

  // Guardrail 1: Strictly refuse medication dosing or diagnosis
  if (lower.includes('dose') || lower.includes('dosage') || lower.includes('how much medicine') || lower.includes('prescribe')) {
    return 'I cannot prescribe or advise on medication dosages. Please consult Dr. Harshavardhan via the Consultation tab or contact your physician. "Decision support, not a diagnosis".';
  }

  if (lower.includes('diagnose') || lower.includes('what disease') || lower.includes('do i have')) {
    return 'I provide real-time decision support, not clinical diagnosis. Your current readings indicate ' + risk.class + ' risk (' + risk.score + '/100). Please consult your doctor for a formal diagnosis. "Decision support, not a diagnosis".';
  }

  if (lower.includes('spo2') || lower.includes('oxygen')) {
    return `Your oxygen saturation is currently ${vitals.spo2}%. Standard healthy range is 95-100%. ${vitals.spo2 < 90 ? 'Oxygen is low—please sit upright and take deep breaths.' : 'Your oxygen level is normal.'} "Decision support, not a diagnosis".`;
  }

  if (lower.includes('heart') || lower.includes('pulse') || lower.includes('bpm')) {
    return `Your pulse is currently ${vitals.hr} bpm. ${vitals.hr > 100 ? 'Your pulse is elevated (tachycardia).' : 'Your pulse is within normal resting parameters.'} "Decision support, not a diagnosis".`;
  }

  if (lower.includes('help') || lower.includes('sos') || lower.includes('emergency')) {
    return 'If you feel severe chest pain, shortness of breath, or dizziness, press the red SOS button immediately or call 108 / 112. "Decision support, not a diagnosis".';
  }

  return `Based on your live decrypted vitals (Pulse: ${vitals.hr} bpm, SpO2: ${vitals.spo2}%, Temp: ${vitals.temp}°C), your risk status is ${risk.class}. Sit comfortably and keep monitored. "Decision support, not a diagnosis".`;
}
