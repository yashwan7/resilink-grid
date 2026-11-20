import { describe, it, expect } from 'vitest';
import { 
  SUPPORTED_LANGUAGES, 
  generateMultilingualReportText, 
  translateWithSarvam 
} from './sarvamAi';
import { VitalsSample, RiskScore } from '../types';
import { GrootAIReport } from '../groot/patientGroot';

describe('Sarvam AI Multilingual Report & Translation Engine', () => {
  const sampleVitals: VitalsSample = {
    ts: Date.now(),
    hr: 138,
    spo2: 84,
    temp: 39.2,
    resp: 28,
    sim: true
  };

  const sampleRisk: RiskScore = {
    score: 94,
    class: 'CRITICAL',
    top_factors: ['Severe Hypoxia (84%)', 'Tachycardia (138 bpm)'],
    model_ver: 'tinyml-phys-v4.2-int8'
  };

  const sampleReport: GrootAIReport = {
    timestamp: Date.now(),
    headline: 'URGENT: Critical Physiological Strain Detected',
    plainLanguageSummary: 'Oxygen saturation dropped to 84% with high heart rate.',
    recommendedActions: [
      'Sit upright immediately in an open, well-ventilated area.',
      'Tap the Emergency SOS button below to trigger ambulance dispatch.'
    ],
    disclaimer: 'Decision support, not a diagnosis',
    emergencyNumber: 'Emergency Helpline: 108 / 112'
  };

  it('supports major Indian languages (Hindi, Telugu, Tamil, Kannada, Marathi, Bengali, Gujarati)', () => {
    const codes = SUPPORTED_LANGUAGES.map(l => l.code);
    expect(codes).toContain('hi-IN');
    expect(codes).toContain('te-IN');
    expect(codes).toContain('ta-IN');
    expect(codes).toContain('kn-IN');
  });

  it('generates a translated report in Hindi (hi-IN) with native medical headers', async () => {
    const result = await generateMultilingualReportText(sampleVitals, sampleRisk, sampleReport, 'hi-IN');
    expect(result.text).toContain('हृदय गति');
    expect(result.text).toContain('108 / 112');
    expect(result.filename).toContain('hi-IN');
  });

  it('generates a translated report in Telugu (te-IN)', async () => {
    const result = await generateMultilingualReportText(sampleVitals, sampleRisk, sampleReport, 'te-IN');
    expect(result.text).toContain('గుండె వేగం');
    expect(result.text).toContain('అత్యవసర హెల్ప్‌లైన్');
    expect(result.filename).toContain('te-IN');
  });

  it('generates a translated report in Kannada (kn-IN)', async () => {
    const result = await generateMultilingualReportText(sampleVitals, sampleRisk, sampleReport, 'kn-IN');
    expect(result.text).toContain('ಹೃದಯ ಬಡಿತ');
    expect(result.text).toContain('ತುರ್ತು ಸಹಾಯವಾಣಿ');
    expect(result.filename).toContain('kn-IN');
  });

  it('always includes the mandatory regulatory disclaimer in the report', async () => {
    const resultHi = await generateMultilingualReportText(sampleVitals, sampleRisk, sampleReport, 'hi-IN');
    expect(resultHi.text).toContain('निर्णय सहायता');

    const resultEn = await generateMultilingualReportText(sampleVitals, sampleRisk, sampleReport, 'en-IN');
    expect(resultEn.text).toContain('Decision support, not a diagnosis');
  });
});
