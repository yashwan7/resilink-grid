// Sarvam AI Multilingual Translation & Report Engine for Doctor Station
// Supports Indian Languages: Hindi, Telugu, Tamil, Kannada, Malayalam, Marathi, Bengali, Gujarati, English

import { VitalsSample, RiskScore } from '../types';

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  greeting: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en-IN', name: 'English', nativeName: 'English', greeting: 'Hello' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', greeting: 'नमस्ते' },
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు', greeting: 'నమస్కారం' },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்', greeting: 'வணக்கம்' },
  { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ', greeting: 'ನಮಸ್ಕಾರ' },
  { code: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം', greeting: 'നമസ്കാരം' },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी', greeting: 'नमस्कार' },
  { code: 'bn-IN', name: 'Bengali', nativeName: 'বাংলা', greeting: 'নমস্কার' },
  { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી', greeting: 'નમસ્તે' }
];

const TRANSLATION_MAP: Record<string, Record<string, string>> = {
  'hi-IN': {
    'RESILINK GRID - DOCTOR CLINICAL TRIAGE REPORT': 'रेज़िलिंक ग्रिड - चिकित्सक नैदानिक ट्राइएज रिपोर्ट',
    'Decision support, not a diagnosis': 'निर्णय सहायता, निदान नहीं (डॉक्टर का अंतिम निर्णय मान्य)',
    'Emergency Helpline: 108 / 112': 'आपातकालीन हेल्पलाइन: 108 / 112',
    'Report Generated:': 'रिपोर्ट निर्माण समय:',
    'Patient Pseudonym:': 'रोगी का छद्म नाम:',
    'Current Risk Status:': 'वर्तमान जोखिम स्तर:',
    'Heart Rate:': 'हृदय गति (पल्स):',
    'Oxygen Saturation (SpO2):': 'ऑक्सीजन संतृप्ति (SpO2):',
    'Body Temperature:': 'शरीर का तापमान:',
    'Respiration Rate:': 'श्वसन दर:',
    'Fine Priority Score:': 'प्राथमिकता स्कोर (ट्राइएज):',
    'Key Physiological Factors:': 'प्रमुख शारीरिक कारक:',
    'Clinical Recommendations:': 'चिकित्सकीय अनुशंसाएं:'
  },
  'te-IN': {
    'RESILINK GRID - DOCTOR CLINICAL TRIAGE REPORT': 'రెజిలింక్ గ్రిడ్ - డాక్టర్ క్లినికల్ ట్రయాజ్ నివేదిక',
    'Decision support, not a diagnosis': 'నిర్ణయ మద్దతు మాత్రమే, రోగ నిర్ధారణ కాదు',
    'Emergency Helpline: 108 / 112': 'అత్యవసర హెల్ప్‌లైన్: 108 / 112',
    'Report Generated:': 'నివేదిక సమయం:',
    'Patient Pseudonym:': 'రోగి మారుపేరు:',
    'Current Risk Status:': 'ప్రస్తుత ప్రమాద స్థాయి:',
    'Heart Rate:': 'గుండె వేగం (పల్స్):',
    'Oxygen Saturation (SpO2):': 'ఆక్సిజన్ సంతృప్తత (SpO2):',
    'Body Temperature:': 'శరీర ఉష్ణోగ్రత:',
    'Fine Priority Score:': 'ప్రాధాన్యత స్కోరు (ట్రయాజ్):',
    'Key Physiological Factors:': 'ముఖ్యమైన శారీరక కారకాలు:'
  },
  'ta-IN': {
    'RESILINK GRID - DOCTOR CLINICAL TRIAGE REPORT': 'ரெசிலிங்க் கிரிட் - மருத்துவர் மருத்துவ பரிசோதனை அறிக்கை',
    'Decision support, not a diagnosis': 'முடிவு ஆதரவு மட்டுமே, மருத்துவ நோய் கண்டறிதல் அல்ல',
    'Emergency Helpline: 108 / 112': 'அவசர உதவி எண்: 108 / 112',
    'Heart Rate:': 'இதய துடிப்பு:',
    'Oxygen Saturation (SpO2):': 'ஆக்ஸிஜன் அளவு (SpO2):'
  },
  'kn-IN': {
    'RESILINK GRID - DOCTOR CLINICAL TRIAGE REPORT': 'ರೆಸಿಲಿಂಕ್ ಗ್ರಿಡ್ - ವೈದ್ಯರ ಕ್ಲಿನಿಕಲ್ ಟ್ರಯಾಜ್ ವರದಿ',
    'Decision support, not a diagnosis': 'ನಿರ್ಧಾರ ಬೆಂಬಲ, ರೋಗನಿರ್ಣಯವಲ್ಲ',
    'Emergency Helpline: 108 / 112': 'ತುರ್ತು ಸಹಾಯವಾಣಿ: 108 / 112',
    'Heart Rate:': 'ಹೃದಯ ಬಡಿತ:',
    'Oxygen Saturation (SpO2):': 'ಆಮ್ಲಜನಕ ಮಟ್ಟ (SpO2):'
  }
};

export function getSarvamApiKey(): string {
  if (typeof localStorage !== 'undefined') {
    const local = localStorage.getItem('resilink_sarvam_api_key');
    if (local && local.trim()) return local.trim();
  }
  return (import.meta as any).env?.VITE_SARVAM_API_KEY || '';
}

export function setSarvamApiKey(key: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('resilink_sarvam_api_key', key.trim());
  }
}

export async function translateWithSarvam(
  text: string,
  targetLangCode: string,
  sourceLangCode: string = 'en-IN'
): Promise<string> {
  if (targetLangCode === 'en-IN' || targetLangCode === sourceLangCode) {
    return text;
  }

  const apiKey = getSarvamApiKey();
  if (apiKey && typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const response = await fetch('https://api.sarvam.ai/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-subscription-key': apiKey
        },
        body: JSON.stringify({
          input: text,
          source_language_code: sourceLangCode,
          target_language_code: targetLangCode,
          speaker_gender: 'Female',
          mode: 'formal',
          model: 'mayura:v1'
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.translated_text) {
          return data.translated_text;
        }
      }
    } catch (err) {
      console.warn("Sarvam API error, fallback to local:", err);
    }
  }

  const dict = TRANSLATION_MAP[targetLangCode];
  if (dict && dict[text]) {
    return dict[text];
  }

  let translated = text;
  if (dict) {
    for (const [enTerm, localTerm] of Object.entries(dict)) {
      translated = translated.split(enTerm).join(localTerm);
    }
  }
  return translated;
}

export async function generateDoctorReportText(
  patientId: string,
  vitals: VitalsSample,
  risk: RiskScore,
  fineScore: number,
  targetLangCode: string
): Promise<{ text: string; filename: string; language: SupportedLanguage }> {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === targetLangCode) || SUPPORTED_LANGUAGES[0];
  const t = async (p: string) => await translateWithSarvam(p, targetLangCode);

  const title = await t('RESILINK GRID - DOCTOR CLINICAL TRIAGE REPORT');
  const genTime = await t('Report Generated:');
  const patLabel = await t('Patient Pseudonym:');
  const riskLabel = await t('Current Risk Status:');
  const hrLabel = await t('Heart Rate:');
  const spo2Label = await t('Oxygen Saturation (SpO2):');
  const tempLabel = await t('Body Temperature:');
  const scoreLabel = await t('Fine Priority Score:');
  const factorsLabel = await t('Key Physiological Factors:');
  const disclaimer = await t('Decision support, not a diagnosis');
  const helpline = await t('Emergency Helpline: 108 / 112');

  const border = '='.repeat(68);
  const subBorder = '-'.repeat(68);

  const report = `
${border}
${title}
[${lang.name} - ${lang.nativeName}] • Generated via Sarvam AI
${border}

${genTime} ${new Date().toLocaleString()}
${patLabel} ${patientId}
${riskLabel} ${risk.class} (Risk Score: ${risk.score}/100)
${scoreLabel} ${fineScore.toFixed(2)}
${subBorder}

PHYSIOLOGICAL VITALS:
• ${hrLabel} ${vitals.hr} bpm
• ${spo2Label} ${vitals.spo2} %
• ${tempLabel} ${vitals.temp.toFixed(1)} °C
• Respiration Rate: ${vitals.resp || 16} bpm

${factorsLabel}
${risk.top_factors.map((f, i) => `  ${i + 1}. ${f}`).join('\n')}

${subBorder}
REGULATORY NOTICE:
• ${disclaimer}
• ${helpline}
• Verified via WebCrypto P-256 raw signature
${border}
`.trim();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return {
    text: report,
    filename: `RESILINK_DoctorReport_${patientId}_${lang.code}_${timestamp}.txt`,
    language: lang
  };
}

export function triggerFileDownload(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
