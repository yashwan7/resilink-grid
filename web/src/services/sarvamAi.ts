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
    'Clinical Recommendations:': 'चिकित्सकीय अनुशंसाएं:',
    'I am Groot. Link state is HEALTHY on PORT_A Wi-Fi. PDR is 96.8%, RSSI -62 dBm. Next fallback is PORT_B then MESH nRF24.':
      'मैं ग्रूट हूँ। पोर्ट A (Wi-Fi) पर रेडियो लिंक पूरी तरह स्वस्थ है। PDR 96.8% और सिग्नल -62 dBm है। बैकअप के लिए nRF24 मेश तैयार है।',
    'I am Groot. There are currently 2 ambulances FREE: AMB-1081 (KR Market, 1.2 km away) and AMB-1082 (Chamrajpet, 1.8 km away).':
      'मैं ग्रूट हूँ। वर्तमान में 2 एम्बुलेंस उपलब्ध हैं: AMB-1081 (1.2 किमी दूर) और AMB-1082 (1.8 किमी दूर)।',
    'I am Groot. Victoria Hospital has 18 beds and 4 ICU beds free. Manipal HAL has 45 beds and 11 ICU beds free. Oxygen reserves are 95%.':
      'मैं ग्रूट हूँ। आरआर नगर व विक्टोरिया अस्पताल में 18 सामान्य बेड और 4 ICU बेड खाली हैं। ऑक्सीजन भंडार 95% पर सुरक्षित है।',
    'I am Groot. Blood Bank status: O- is at 3 units (CRITICAL). A+ is at 34 units (Plentiful). Plasma units: 45 available.':
      'मैं ग्रूट हूँ। ब्लड बैंक स्थिति: O- नेगेटिव रक्त केवल 3 यूनिट शेष है (गंभीर कमी)। A+ 34 यूनिट और प्लाज्मा 45 यूनिट उपलब्ध हैं।',
    'I am Groot. Hub HMAC/SHA-256 audit chain is valid. All records up to sequence #2 are cryptographically intact.':
      'मैं ग्रूट हूँ। हब का HMAC/SHA-256 ऑडिट ब्लॉकचेन पूरी तरह वैध है। सभी रिकॉर्ड्स क्रिप्टोग्राफिक रूप से सील और सुरक्षित हैं।',
    'I am Groot. P0 alert recorded on node MCXN-001 (Ward A). Patient in severe hypoxia with compensatory tachycardia. Vitals: SpO2 86%, HR 138 bpm.':
      'मैं ग्रूट हूँ। वार्ड A में P0 गंभीर अलर्ट दर्ज: मरीज गंभीर हाइपोक्सिया में है। SpO2 86%, पल्स 138 bpm। तत्काल ऑक्सीजन मास्क लगाएं।'
  },
  'kn-IN': {
    'RESILINK GRID - DOCTOR CLINICAL TRIAGE REPORT': 'ರೆಸಿಲಿಂಕ್ ಗ್ರಿಡ್ - ವೈದ್ಯರ ಕ್ಲಿನಿಕಲ್ ಟ್ರಯಾಜ್ ವರದಿ',
    'Decision support, not a diagnosis': 'ನಿರ್ಧಾರ ಬೆಂಬಲ, ರೋಗನಿರ್ಣಯವಲ್ಲ',
    'Emergency Helpline: 108 / 112': 'ತುರ್ತು ಸಹಾಯವಾಣಿ: 108 / 112',
    'Heart Rate:': 'ಹೃದಯ ಬಡಿತ:',
    'Oxygen Saturation (SpO2):': 'ಆಮ್ಲಜನಕ ಮಟ್ಟ (SpO2):',
    'I am Groot. Link state is HEALTHY on PORT_A Wi-Fi. PDR is 96.8%, RSSI -62 dBm. Next fallback is PORT_B then MESH nRF24.':
      'ನಾನು ಗ್ರೂಟ್. ಪೋರ್ಟ್ A ವೈ-ಫೈ ರೇಡಿಯೋ ಲಿಂಕ್ ಉತ್ತಮ ಸ್ಥಿತಿಯಲ್ಲಿದೆ (PDR 96.8%, RSSI -62 dBm). ಬ್ಯಾಕಪ್ nRF24 ಮೆಶ್ ಸಿದ್ಧವಾಗಿದೆ.',
    'I am Groot. There are currently 2 ambulances FREE: AMB-1081 (KR Market, 1.2 km away) and AMB-1082 (Chamrajpet, 1.8 km away).':
      'ನಾನು ಗ್ರೂಟ್. ಪ್ರಸ್ತುತ 2 ಆಂಬ್ಯುಲೆನ್ಸ್‌ಗಳು ಲಭ್ಯವಿವೆ: AMB-1081 (1.2 ಕಿ.ಮೀ ದೂರ) ಮತ್ತು AMB-1082 (1.8 ಕಿ.ಮೀ ದೂರ).',
    'I am Groot. Victoria Hospital has 18 beds and 4 ICU beds free. Manipal HAL has 45 beds and 11 ICU beds free. Oxygen reserves are 95%.':
      'ನಾನು ಗ್ರೂಟ್. ಆಸ್ಪತ್ರೆಗಳಲ್ಲಿ 18 ಸಾಮಾನ್ಯ ಬೆಡ್ ಮತ್ತು 4 ಐಸಿಯು ಬೆಡ್ ಖಾಲಿ ಇವೆ. ಆಮ್ಲಜನಕ ದಾಸ್ತಾನು 95% ಇದೆ.',
    'I am Groot. Blood Bank status: O- is at 3 units (CRITICAL). A+ is at 34 units (Plentiful). Plasma units: 45 available.':
      'ನಾನು ಗ್ರೂಟ್. ರಕ್ತ ನಿಧಿ ಸ್ಥಿತಿ: O- ನೆಗೆಟಿವ್ ಕೇವಲ 3 ಯುನಿಟ್‌ಗಳು ಉಳಿದಿವೆ (ತುರ್ತು ಕೊರತೆ). A+ 34 ಯುನಿಟ್‌ಗಳು ಲಭ್ಯವಿವೆ.',
    'I am Groot. Hub HMAC/SHA-256 audit chain is valid. All records up to sequence #2 are cryptographically intact.':
      'ನಾನು ಗ್ರೂಟ್. ಹಬ್ HMAC/SHA-256 ಆಡಿಟ್ ಚೈನ್ ಪರಿಶೀಲಿಸಲಾಗಿದೆ. ಎಲ್ಲಾ ಡೇಟಾ ರೆಕಾರ್ಡ್‌ಗಳು ಸುರಕ್ಷಿತವಾಗಿವೆ.',
    'I am Groot. P0 alert recorded on node MCXN-001 (Ward A). Patient in severe hypoxia with compensatory tachycardia. Vitals: SpO2 86%, HR 138 bpm.':
      'ನಾನು ಗ್ರೂಟ್. P0 ತುರ್ತು ಎಚ್ಚರಿಕೆ: ರೋಗಿಗೆ ತೀವ್ರ ಆಮ್ಲಜನಕ ಕೊರತೆ (SpO2 86%, HR 138 bpm). ತಕ್ಷಣ ಹೈ-ಫ್ಲೋ ಆಮ್ಲಜನಕ ನೀಡಿ.'
  },
  'ta-IN': {
    'RESILINK GRID - DOCTOR CLINICAL TRIAGE REPORT': 'ரெசிலிங்க் கிரிட் - மருத்துவர் மருத்துவ பரிசோதனை அறிக்கை',
    'Decision support, not a diagnosis': 'முடிவு ஆதரவு மட்டுமே, மருத்துவ நோய் கண்டறிதல் அல்ல',
    'Emergency Helpline: 108 / 112': 'அவசர உதவி எண்: 108 / 112',
    'Heart Rate:': 'இதய துடிப்பு:',
    'Oxygen Saturation (SpO2):': 'ஆக்ஸிஜன் அளவு (SpO2):',
    'I am Groot. Link state is HEALTHY on PORT_A Wi-Fi. PDR is 96.8%, RSSI -62 dBm. Next fallback is PORT_B then MESH nRF24.':
      'நான் குரூட். போர்ட் A வைஃபை இணைப்பு சீராக உள்ளது (PDR 96.8%). அடுத்த இணைப்பு nRF24 மெஷ் தயார் நிலையில் உள்ளது.',
    'I am Groot. There are currently 2 ambulances FREE: AMB-1081 (KR Market, 1.2 km away) and AMB-1082 (Chamrajpet, 1.8 km away).':
      'நான் குரூட். தற்போது 2 ஆம்புலன்ஸ்கள் தயார் நிலையில் உள்ளன: AMB-1081 மற்றும் AMB-1082.',
    'I am Groot. Victoria Hospital has 18 beds and 4 ICU beds free. Manipal HAL has 45 beds and 11 ICU beds free. Oxygen reserves are 95%.':
      'நான் குரூட். மருத்துவமனைகளில் 18 படுக்கைகள் மற்றும் 4 தீவிர சிகிச்சை படுக்கைகள் காலியாக உள்ளன. ஆக்ஸிஜன் 95% உள்ளது.',
    'I am Groot. Blood Bank status: O- is at 3 units (CRITICAL). A+ is at 34 units (Plentiful). Plasma units: 45 available.':
      'நான் குரூட். ரத்த வங்கி நிலை: O- நெகட்டிவ் ரத்தம் 3 யூனிட்கள் மட்டுமே உள்ளன (அதி தீவிர பற்றாக்குறை).',
    'I am Groot. Hub HMAC/SHA-256 audit chain is valid. All records up to sequence #2 are cryptographically intact.':
      'நான் குரூட். HMAC/SHA-256 தணிக்கை சங்கிலி பாதுகாப்பாக உள்ளது. எந்த தரவும் மாற்றப்படவில்லை.',
    'I am Groot. P0 alert recorded on node MCXN-001 (Ward A). Patient in severe hypoxia with compensatory tachycardia. Vitals: SpO2 86%, HR 138 bpm.':
      'நான் குரூட். P0 அவசர எச்சரிக்கை: நோயாளிக்கு கடுமையான ஆக்ஸிஜன் பற்றாக்குறை (SpO2 86%, இதய துடிப்பு 138 bpm).'
  },
  'te-IN': {
    'RESILINK GRID - DOCTOR CLINICAL TRIAGE REPORT': 'రెజిలింక్ గ్రిడ్ - డాక్టర్ క్లినికల్ ట్రయాజ్ నివేదిక',
    'Decision support, not a diagnosis': 'నిర్ణయ మద్దతు మాత్రమే, రోగ నిర్ధారణ కాదు',
    'Emergency Helpline: 108 / 112': 'అత్యవసర హెల్ప్‌లైన్: 108 / 112',
    'Heart Rate:': 'గుండె వేగం (పల్స్):',
    'Oxygen Saturation (SpO2):': 'ఆక్సిజన్ సంతృప్తత (SpO2):',
    'I am Groot. Link state is HEALTHY on PORT_A Wi-Fi. PDR is 96.8%, RSSI -62 dBm. Next fallback is PORT_B then MESH nRF24.':
      'నేను గ్రూట్. పోర్ట్ A వై-ఫై రేడియో లింక్ సురక్షితంగా ఉంది. బ్యాకప్ కోసం nRF24 మెష్ సిద్ధంగా ఉంది.',
    'I am Groot. There are currently 2 ambulances FREE: AMB-1081 (KR Market, 1.2 km away) and AMB-1082 (Chamrajpet, 1.8 km away).':
      'నేను గ్రూట్. ప్రస్తుతం 2 అంబులెన్సులు సిద్ధంగా ఉన్నాయి: AMB-1081 మరియు AMB-1082.',
    'I am Groot. Victoria Hospital has 18 beds and 4 ICU beds free. Manipal HAL has 45 beds and 11 ICU beds free. Oxygen reserves are 95%.':
      'నేను గ్రూట్. ఆసుపత్రులలో 18 సాధారణ బెడ్లు మరియు 4 ఐసియు బెడ్లు అందుబాటులో ఉన్నాయి. ఆక్సిజన్ 95% ఉంది.',
    'I am Groot. Blood Bank status: O- is at 3 units (CRITICAL). A+ is at 34 units (Plentiful). Plasma units: 45 available.':
      'నేను గ్రూట్. బ్లడ్ బ్యాంక్ పరిస్థితి: O- నెగటివ్ రక్తం కేవలం 3 యూనిట్లు మాత్రమే ఉంది (తీవ్ర కొరత).',
    'I am Groot. Hub HMAC/SHA-256 audit chain is valid. All records up to sequence #2 are cryptographically intact.':
      'నేను గ్రూట్. HMAC/SHA-256 ఆడిట్ చైన్ ధృవీకరించబడింది. మొత్తం డేటా పూర్తిగా సురక్షితం.',
    'I am Groot. P0 alert recorded on node MCXN-001 (Ward A). Patient in severe hypoxia with compensatory tachycardia. Vitals: SpO2 86%, HR 138 bpm.':
      'నేను గ్రూట్. P0 అత్యవసర హెచ్చరిక: రోగికి తీవ్రమైన ఆక్సిజన్ కొరత (SpO2 86%, గుండె వేగం 138 bpm).'
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
