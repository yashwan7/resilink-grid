import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  Globe, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  Activity, 
  ShieldCheck,
  Building2,
  Droplet
} from 'lucide-react';

// Multilingual Knowledge Base & Sovereign Localized Dispatches
const GROOT_LOCALIZED_KB = {
  'hi-IN': {
    name: 'हिंदी (Hindi)',
    greeting: 'मैं ग्रूट हूँ, सामरिक परिचालन और नैदानिक सलाहकार (Sarvam AI द्वारा संचालित)। मैं क्षेत्रीय अस्पतालों के बेड, ब्लड बैंक स्टॉक, और NXP एज टेलीमेट्री की निगरानी करता हूँ। "निर्णय सहायता, निदान नहीं"। मैं फील्ड कमांड टीम की क्या सहायता कर सकता हूँ?',
    placeholder: 'ग्रूट से अस्पताल, ब्लड बैंक या मरीज के बारे में पूछें...',
    chips: [
      'अस्पताल बेड और ICU स्थिति',
      'ब्लड बैंक O- यूनिट्स स्टॉक',
      'मरीज PT-101 ट्राइएज स्थिति',
      'NXP TinyML फेल्सफे स्टेटस'
    ],
    responses: {
      capacity: 'आरआर नगर और विक्टोरिया अस्पताल में सर्ज चेतावनी है (18 सामान्य बेड, 4 आईसीयू बेड, 95% ऑक्सीजन उपलब्ध)। मणिपाल अस्पताल में 45 बेड और 11 आईसीयू बेड तैयार हैं।',
      blood: 'ब्लड बैंक स्थिति: O- नेगेटिव रक्त का स्टॉक अत्यधिक संकट में है (केवल 3 यूनिट शेष)। बीजीएस ग्लेनीगल्स अस्पताल में 14 यूनिट O+ और 11 प्लाज्मा यूनिट उपलब्ध हैं। आपातकालीन ड्रोन डिलीवरी अनुशंसित है।',
      patient: 'मरीज PT-101 को कोड रेड (तत्काल पुनर्जीवन) श्रेणी में रखा गया है। वाइटल्स: SpO2 91%, पल्स 124 bpm। हाई-फ्लो O2 और 30ml/kg IV फ्लुइड की सिफारिश की गई है। "निर्णय सहायता, निदान नहीं"।',
      failover: 'NXP MCXN236 एज TinyML इंफेरेंस लेटेंसी 420 µs है। प्राथमिक पोर्ट A वाई-फाई लिंक सामान्य है, बैकअप nRF24 मेश 250kbps पर सक्रिय है।',
      general: 'स्वीकार किया गया। सभी ऑपरेशनल सिस्टम सामान्य हैं। येलहंका सेक्टर (13.1365, 77.5646) पर सभी मेडिकल टेलीमेट्री चैनल 100% सुरक्षित हैं।'
    }
  },
  'kn-IN': {
    name: 'ಕನ್ನಡ (Kannada)',
    greeting: 'ನಾನು ಗ್ರೂಟ್, ತುರ್ತು ಕಾರ್ಯಾಚರಣೆ ಮತ್ತು ಕ್ಲಿನಿಕಲ್ ಸಲಹೆಗಾರ (Sarvam AI ಚಾಲಿತ). ನಾನು ಆಸ್ಪತ್ರೆಗಳ ಬೆಡ್‌ಗಳು, ರಕ್ತ ನಿಧಿ ಮತ್ತು NXP ಎಡ್ಜ್ ಟೆಲಿಮೆಟ್ರಿಯನ್ನು ನೈಜ ಸಮಯದಲ್ಲಿ ಮೇಲ್ವಿಚಾರಣೆ ಮಾಡುತ್ತೇನೆ. "ನಿರ್ಧಾರ ಬೆಂಬಲ, ರೋಗನಿರ್ಣಯವಲ್ಲ". ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?',
    placeholder: 'ಆಸ್ಪತ್ರೆ, ರಕ್ತ ನಿಧಿ ಅಥವಾ ರೋಗಿಯ ಬಗ್ಗೆ ಗ್ರೂಟ್‌ಗೆ ಕೇಳಿ...',
    chips: [
      'ಆಸ್ಪತ್ರೆ ಬೆಡ್ ಮತ್ತು ICU ಸ್ಥಿತಿ',
      'ಬ್ಲಡ್ ಬ್ಯಾಂಕ್ O- ಯುನಿಟ್‌ಗಳ ದಾಸ್ತಾನು',
      'ರೋಗಿ PT-101 ಟ್ರಯಾಜ್ ವಿವರ',
      'TinyML ರೇಡಿಯೋ ಮೆಶ್ ಸ್ಥಿತಿ'
    ],
    responses: {
      capacity: 'ಯಲಹಂಕ ಮತ್ತು ವಿಕ್ಟೋರಿಯಾ ಆಸ್ಪತ್ರೆಯಲ್ಲಿ ತುರ್ತು ಎಚ್ಚರಿಕೆ ಇದೆ (18 ಬೆಡ್‌ಗಳು, 4 ಐಸಿಯು ಬೆಡ್‌ಗಳು ಮತ್ತು 95% ಆಮ್ಲಜನಕ ಲಭ್ಯ). ಮಣಿಪಾಲ್ ಆಸ್ಪತ್ರೆಯಲ್ಲಿ 45 ಬೆಡ್‌ಗಳು ಲಭ್ಯವಿವೆ.',
      blood: 'ಬ್ಲಡ್ ಬ್ಯಾಂಕ್ ಸ್ಥಿತಿ: O- ನೆಗೆಟಿವ್ ರಕ್ತದ ದಾಸ್ತಾನು ತೀವ್ರ ಕೊರತೆಯಲ್ಲಿದೆ (ಕೇವಲ 3 ಯುನಿಟ್‌ಗಳು ಉಳಿದಿವೆ). ಬಿಜಿಎಸ್ ಆಸ್ಪತ್ರೆಯಲ್ಲಿ 14 O+ ಯುನಿಟ್‌ಗಳು ಲಭ್ಯವಿವೆ.',
      patient: 'ರೋಗಿ PT-101 ಕೋಡ್ ರೆಡ್ (ತಕ್ಷಣದ ಚಿಕಿತ್ಸೆ) ಎಂದು ವರ್ಗೀಕರಿಸಲಾಗಿದೆ. ಜೀವಾಧಾರಕಗಳು: SpO2 91%, ನಾಡಿಮಿಡಿತ 124 bpm. ತಕ್ಷಣ ಹೈ-ಫ್ಲೋ ಆಮ್ಲಜನಕ ನೀಡಿ.',
      failover: 'NXP MCXN236 ಎಡ್ಜ್ TinyML ವಿಶ್ಲೇಷಣೆ ಸಮಯ 420 µs ಆಗಿದೆ. ಪೋರ್ಟ್ A ಲಿಂಕ್ ಸ್ಥಿರವಾಗಿದೆ, nRF24 ರೇಡಿಯೋ ಮೆಶ್ ಬ್ಯಾಕಪ್ ಸಿದ್ಧವಾಗಿದೆ.',
      general: 'ಸ್ವೀಕರಿಸಲಾಗಿದೆ. ಎಲ್ಲಾ ಕಾರ್ಯಾಚರಣಾ ವ್ಯವಸ್ಥೆಗಳು ಸಹಜವಾಗಿವೆ. ಯಲಹಂಕ ಸೆಕ್ಟರ್ (13.1365, 77.5646) ನಲ್ಲಿ ಟೆಲಿಮೆಟ್ರಿ ಸುರಕ್ಷಿತವಾಗಿದೆ.'
    }
  },
  'ta-IN': {
    name: 'தமிழ் (Tamil)',
    greeting: 'நான் குரூட், மருத்துவ மற்றும் செயல்பாட்டு ஆலோசகர் (Sarvam AI மூலம் இயங்குகிறது). மருத்துவமனை படுக்கைகள், ரத்த வங்கி இருப்பு மற்றும் NXP ரேடியோ மெஷ் நிலையை கண்காணிக்கிறேன். "முடிவு ஆதரவு மட்டுமே, நோய் கண்டறிதல் அல்ல". நான் எவ்வாறு உதவ முடியும்?',
    placeholder: 'மருத்துவமனை, ரத்தம் அல்லது நோயாளி பற்றி கேளுங்கள்...',
    chips: [
      'மருத்துவமனை படுக்கை & ICU நிலை',
      'ரத்த வங்கி O- இருப்பு',
      'நோயாளி PT-101 நிலை',
      'TinyML நெட்வொர்க் நிலை'
    ],
    responses: {
      capacity: 'எலஹங்கா மற்றும் விக்டோரியா மருத்துவமனையில் அவசர நிலை உள்ளது (18 படுக்கைகள், 4 தீவிர சிகிச்சை படுக்கைகள், 95% ஆக்ஸிஜன் இருப்பு).',
      blood: 'ரத்த வங்கி நிலை: O- நெகட்டிவ் ரத்தம் மிகக் குறைந்த அளவில் உள்ளது (3 யூனிட்கள் மட்டுமே உள்ளன). அவசர ட்ரோன் விநியோகம் பரிந்துரைக்கப்படுகிறது.',
      patient: 'நோயாளி PT-101 கோட் ரெட் (உடனடி தீவிர சிகிச்சை) பிரிவில் உள்ளார். SpO2 91%, இதய துடிப்பு 124 bpm. அவசர ஆக்ஸிஜன் செலுத்தவும்.',
      failover: 'NXP MCXN236 எட்ஜ் TinyML வேகம் 420 µs. போர்ட் A வைஃபை இணைப்பு சீராக உள்ளது, nRF24 ரேடியோ மெஷ் தயார் நிலையில் உள்ளது.',
      general: 'செய்தி பெறப்பட்டது. அனைத்து செயல்பாட்டு அமைப்புகளும் இயல்பாக உள்ளன. எலஹங்கா மையத்தில் அனைத்து தகவல்களும் பாதுகாக்கப்பட்டுள்ளன.'
    }
  },
  'te-IN': {
    name: 'తెలుగు (Telugu)',
    greeting: 'నేను గ్రూట్, అత్యవసర కార్యకలాపాలు మరియు క్లినికల్ సలహాదారుని (Sarvam AI ద్వారా ఆధారితం). ఆసుపత్రుల పడకలు, బ్లడ్ బ్యాంక్ నిల్వలు మరియు NXP ఎడ్జ్ నెట్‌వర్క్‌ను పర్యవేక్షిస్తాను. "నిర్ణయ మద్దతు మాత్రమే, రోగ నిర్ధారణ కాదు". నేను మీకు ఎలా సహాయపడగలను?',
    placeholder: 'ఆసుపత్రి, బ్లడ్ బ్యాంక్ లేదా రోగి గురించి అడగండి...',
    chips: [
      'ఆసుపత్రి బెడ్లు & ICU పరిస్థితి',
      'బ్లడ్ బ్యాంక్ O- యూనిట్లు',
      'రోగి PT-101 ట్రయాజ్ వివరాలు',
      'TinyML నెట్‌వర్క్ స్థితి'
    ],
    responses: {
      capacity: 'యలహంక మరియు విక్టోరియా ఆసుపత్రిలో హెచ్చరిక ఉంది (18 సాధారణ బెడ్లు, 4 ఐసియు బెడ్లు, 95% ఆక్సిజన్ అందుబాటులో ఉన్నాయి).',
      blood: 'బ్లడ్ బ్యాంక్ పరిస్థితి: O- నెగటివ్ రక్తం అత్యంత తక్కువగా ఉంది (కేవలం 3 యూనిట్లు మాత్రమే మిగిలి ఉన్నాయి).',
      patient: 'రోగి PT-101 కోడ్ రెడ్ (తక్షణ అత్యవసర చికిత్స) కింద ఉన్నారు. ప్రాణాధారాలు: SpO2 91%, పల్స్ 124 bpm. వెంటనే ఆక్సిజన్ అందించండి.',
      failover: 'NXP MCXN236 ఎడ్జ్ TinyML వేగం 420 µs. పోర్ట్ A వై-ఫై లింక్ సురక్షితంగా ఉంది, nRF24 మెష్ బ్యాకప్ సిద్ధంగా ఉంది.',
      general: 'అభ్యర్థన స్వీకరించబడింది. అన్ని కార్యాచరణ వ్యవస్థలు సాధారణంగా ఉన్నాయి. యలహంక సెంటర్‌లో టెలిమెట్రీ సురక్షితంగా ఉంది.'
    }
  },
  'bn-IN': {
    name: 'বাংলা (Bengali)',
    greeting: 'আমি গ্রুট, জরুরী অপারেশনাল এবং ক্লিনিকাল উপদেষ্টা (Sarvam AI চালিত)। আমি হাসপাতালের শয্যা, ব্লাড ব্যাংক রিজার্ভ এবং NXP এজ টেলিমেট্রি পর্যবেক্ষণ করি। "সিদ্ধান্ত সমর্থন, রোগ নির্ণয় নয়"। আমি ফিল্ড টিমকে কীভাবে সাহায্য করতে পারি?',
    placeholder: 'হাসপাতাল, ব্লাড ব্যাংক বা রোগী সম্পর্কে জিজ্ঞাসা করুন...',
    chips: [
      'হাসপাতাল শয্যা ও ICU অবস্থা',
      'ব্লাড ব্যাংক O- ইউনিট মজুত',
      'রোগী PT-101 ট্রায়াজ অবস্থা',
      'TinyML নেটওয়ার্ক স্ট্যাটাস'
    ],
    responses: {
      capacity: 'য়েলহাঙ্কা এবং ভিক্টোরিয়া হাসপাতালে জরুরী সতর্কতা জারি রয়েছে (১৮টি সাধারণ শয্যা, ৪টি আইসিইউ শয্যা এবং ৯৫% অক্সিজেন মজুত আছে)।',
      blood: 'ব্লাড ব্যাংকের অবস্থা: O- নেগেটিভ রক্ত চরম সংকটে রয়েছে (মাত্র ৩ ইউনিট অবশিষ্ট)। অবিলম্বে ড্রোন সরবরাহের সুপারিশ করা হচ্ছে।',
      patient: 'রোগী PT-101 কোড রেড (অবিলম্বে চিকিৎসা) তালিকার অন্তর্ভুক্ত। ভাইটালস: SpO2 91%, পালস 124 bpm। উচ্চ প্রবাহের অক্সিজেন প্রদান করুন।',
      failover: 'NXP MCXN236 এজ TinyML লেটেন্সি ৪২০ মাইক্রোসেকেন্ড। পোর্ট A ওয়াই-ফাই লিঙ্ক স্বাভাবিক, nRF24 মেশ ব্যাকআপ প্রস্তুত।',
      general: 'অনুরোধ গৃহীত হয়েছে। সমস্ত অপারেশনাল সিস্টেম স্বাভাবিক আছে। য়েলহাঙ্কা ট্যাকটিক্যাল গ্রিডে সমস্ত ডেটা নিরাপদ।'
    }
  },
  'en-IN': {
    name: 'English (India)',
    greeting: 'I am Groot, Tactical Operational & Clinical Advisor (Powered by Sarvam AI). I monitor hospital surge capacity, blood bank reserves, and NXP Edge telemetry failover. "Decision support, not a diagnosis". How can I assist the field command team?',
    placeholder: 'Ask Groot about beds, blood bank, vitals, failover...',
    chips: [
      'Hospital Bed & ICU Surge Status',
      'Blood Bank O- Units Reserve',
      'Patient PT-101 Triage Summary',
      'TinyML 500ms Failover State'
    ],
    responses: {
      capacity: 'Yelahanka General & Victoria Hospital are at SURGE WARNING (18 free beds, 4 ICU beds, 95% O2). Manipal HAL has 45 beds and 11 ICU beds available.',
      blood: 'Blood Bank Status: O- is in CRITICAL stock (3 units remaining). BGS Gleneagles & RR Medical College have 14 units O+ and 11 Plasma units. Emergency UAV dispatch recommended.',
      patient: 'Patient PT-101 is classified as CODE RED / IMMEDIATE RESUSCITATION. Vitals: SpO2 91%, HR 124 bpm. High-flow O2 via non-rebreather mask & 30ml/kg crystalloids ordered.',
      failover: 'NXP MCXN236 Edge TinyML inference latency is 420 µs. Primary 500ms failover state machine is HEALTHY on Port A (Wi-Fi), fallback to nRF24 mesh ready.',
      general: 'Acknowledged. All operational systems nominal. Medical telemetry channels locked to Yelahanka Sector (13.1365, 77.5646).'
    }
  }
};

export default function GrootChatBot({ isOpen, onClose, selectedPatientId = 'PT-101' }) {
  const [selectedLang, setSelectedLang] = useState('hi-IN');
  const [messages, setMessages] = useState([
    {
      sender: 'groot',
      text: GROOT_LOCALIZED_KB['hi-IN'].greeting,
      ts: Date.now() - 30000
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const messagesEndRef = useRef(null);

  // When language changes, update greeting if at initial state
  const handleLanguageChange = (newLang) => {
    setSelectedLang(newLang);
    window.speechSynthesis?.cancel();
    setSpeakingIndex(null);

    const langData = GROOT_LOCALIZED_KB[newLang] || GROOT_LOCALIZED_KB['en-IN'];
    setMessages(prev => {
      // If user hasn't asked anything yet, switch the initial greeting cleanly
      if (prev.length <= 1) {
        return [{
          sender: 'groot',
          text: langData.greeting,
          ts: Date.now()
        }];
      } else {
        // Post a notification that language has switched
        return [...prev, {
          sender: 'groot',
          text: `[🌐 ${langData.name}] ${langData.greeting.split('.')[0]}.`,
          ts: Date.now()
        }];
      }
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const currentLangData = GROOT_LOCALIZED_KB[selectedLang] || GROOT_LOCALIZED_KB['en-IN'];

  // Native Speech Synthesis with dialect voice selector
  const handleSpeakText = (text, index) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported on this browser.');
      return;
    }
    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectedLang;
    utterance.rate = 0.95;

    // Pick best matching native voice if available
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find(v => v.lang.toLowerCase() === selectedLang.toLowerCase() || v.lang.startsWith(selectedLang.split('-')[0]));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);
    setSpeakingIndex(index);
    window.speechSynthesis.speak(utterance);
  };

  const handleSendQuery = (customText) => {
    const query = (customText || inputText).trim();
    if (!query) return;

    const userMsg = { sender: 'user', text: query, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTranslating(true);

    setTimeout(() => {
      const lower = query.toLowerCase();
      const res = currentLangData.responses;
      let reply = '';

      if (lower.includes('capacity') || lower.includes('bed') || lower.includes('hospital') || lower.includes('icu') || lower.includes('बेड') || lower.includes('ಬೆಡ್') || lower.includes('படுக்கை') || lower.includes('బెడ్') || lower.includes('শয্যা')) {
        reply = res.capacity;
      } else if (lower.includes('blood') || lower.includes('o-') || lower.includes('donor') || lower.includes('रक्त') || lower.includes('ರಕ್ತ') || lower.includes('ரத்தம்') || lower.includes('బ్లడ్') || lower.includes('রক্ত')) {
        reply = res.blood;
      } else if (lower.includes('patient') || lower.includes('triage') || lower.includes('p0') || lower.includes('pt-101') || lower.includes('मरीज') || lower.includes('ರೋಗಿ') || lower.includes('நோயாளி') || lower.includes('రోగి') || lower.includes('রোগী')) {
        reply = res.patient;
      } else if (lower.includes('failover') || lower.includes('tinyml') || lower.includes('link') || lower.includes('route') || lower.includes('मेश') || lower.includes('ಮೆಶ್') || lower.includes('ரேடியோ') || lower.includes('నెట్‌వర్క్')) {
        reply = res.failover;
      } else {
        reply = res.general;
      }

      setMessages(prev => [...prev, {
        sender: 'groot',
        text: reply,
        ts: Date.now()
      }]);
      setIsTranslating(false);
    }, 450);
  };

  return (
    <div className="fixed top-0 right-0 bottom-0 w-[420px] max-w-full bg-white shadow-2xl z-[1000] flex flex-col border-l border-slate-200 font-sans">
      {/* ResQMesh Tactical Deep Navy Header */}
      <div className="bg-gradient-to-r from-[#14284b] via-[#1a3666] to-[#204482] text-white p-4 flex items-center justify-between border-b border-white/10 select-none">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 to-blue-500 flex items-center justify-center text-white shadow-inner">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black tracking-wider uppercase font-mono m-0 text-white">
                GROOT AI ADVISOR
              </h3>
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            </div>
            <p className="text-[10px] text-blue-200/80 font-mono m-0">
              Sarvam AI Sovereign Multilingual Engine
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all border-none cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Language Dialect Selector */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-700 font-medium">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-600 animate-pulse" />
          <span className="font-mono text-[11px] font-bold text-slate-900">SARVAM VOICE:</span>
        </div>
        <select
          value={selectedLang}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="px-2.5 py-1 text-xs font-bold bg-white text-slate-900 border border-slate-300 rounded-lg shadow-sm outline-none cursor-pointer"
        >
          <option value="hi-IN">हिंदी (Hindi)</option>
          <option value="kn-IN">ಕನ್ನಡ (Kannada - Bengaluru)</option>
          <option value="ta-IN">தமிழ் (Tamil)</option>
          <option value="te-IN">తెలుగు (Telugu)</option>
          <option value="bn-IN">বাংলা (Bengali)</option>
          <option value="en-IN">English (India)</option>
        </select>
      </div>

      {/* Quick Prompt Chips (Dynamically Localized in Selected Language) */}
      <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none">
        {currentLangData.chips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSendQuery(chip)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-800 bg-white hover:text-blue-600 hover:border-blue-400 shrink-0 border border-slate-300 shadow-sm transition-all"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#eef2f7]">
        {messages.map((msg, idx) => {
          const isGroot = msg.sender === 'groot';

          return (
            <div
              key={idx}
              className={`flex flex-col ${isGroot ? 'items-start' : 'items-end'}`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                  isGroot 
                    ? 'bg-white text-slate-900 border border-slate-200/90 shadow-sm' 
                    : 'bg-blue-600 text-white font-medium shadow-md shadow-blue-500/20'
                }`}
              >
                {msg.text}
              </div>

              <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-slate-500 font-mono">
                <span>{new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {isGroot && (
                  <button
                    onClick={() => handleSpeakText(msg.text, idx)}
                    className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-transparent border-none cursor-pointer"
                  >
                    {speakingIndex === idx ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5 text-red-500" />
                        <span className="text-red-500 font-bold">Stop Audio</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Speak Audio</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {isTranslating && (
          <div className="flex items-center gap-2 text-xs text-slate-600 p-2 font-medium">
            <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            <span>Sarvam AI translating &amp; generating advisory...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Field */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendQuery();
        }}
        className="p-3 bg-white border-t border-slate-200 flex gap-2 items-center"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={currentLangData.placeholder}
          className="flex-1 px-3.5 py-2.5 text-xs text-slate-900 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl flex items-center justify-center shrink-0 border-none cursor-pointer shadow-sm transition-all"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </form>
    </div>
  );
}
