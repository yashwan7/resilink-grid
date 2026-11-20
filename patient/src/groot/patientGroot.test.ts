import { describe, it, expect } from 'vitest';
import { generateMomentReport, answerPatientGrootQuery } from './patientGroot';
import { VitalsSample, RiskScore } from '../types';

describe('Patient-side Local Groot AI Guardrails & Reporting', () => {
  const normalVitals: VitalsSample = {
    ts: 1000,
    hr: 72,
    spo2: 98,
    temp: 36.8,
    sim: true
  };

  const normalRisk: RiskScore = {
    score: 10,
    class: 'LOW',
    top_factors: ['Nominal physiological state'],
    model_ver: 'tinyml-phys-v4.2-int8'
  };

  it('always appends "Decision support, not a diagnosis" to AI reports', () => {
    const report = generateMomentReport(normalVitals, normalRisk);
    expect(report.disclaimer).toContain('Decision support, not a diagnosis');
    expect(report.emergencyNumber).toContain('108 / 112');
  });

  it('generates urgent guidance for CRITICAL risk state', () => {
    const criticalVitals: VitalsSample = {
      ts: 2000,
      hr: 135,
      spo2: 83,
      temp: 39.2,
      sim: true
    };
    const criticalRisk: RiskScore = {
      score: 95,
      class: 'CRITICAL',
      top_factors: ['Severe Hypoxia (83%)', 'High Fever (39.2°C)'],
      model_ver: 'tinyml-phys-v4.2-int8'
    };

    const report = generateMomentReport(criticalVitals, criticalRisk);
    expect(report.headline).toContain('URGENT');
    expect(report.plainLanguageSummary).toContain('83%');
    expect(report.recommendedActions.some(a => a.includes('Emergency SOS'))).toBe(true);
  });

  it('strictly blocks and refuses medication dosing queries', () => {
    const answer = answerPatientGrootQuery('Can you tell me how much paracetamol dose to take?', normalVitals, normalRisk);
    expect(answer).toContain('I cannot prescribe or advise on medication dosages');
    expect(answer).toContain('Decision support, not a diagnosis');
  });

  it('strictly deflects clinical diagnosis inquiries to physician', () => {
    const answer = answerPatientGrootQuery('What disease do I have?', normalVitals, normalRisk);
    expect(answer).toContain('Decision support, not a diagnosis');
    expect(answer).toContain('formal diagnosis');
  });
});
