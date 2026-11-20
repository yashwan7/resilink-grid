import React, { useState } from 'react';
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
import { getSarvamDispatch } from '../data/sarvamIndicData';

export default function GrootChatBot({ isOpen, onClose, selectedPatientId = 'PT-101' }) {
  const [selectedLang, setSelectedLang] = useState('hi-IN');
  const [messages, setMessages] = useState([
    {
      sender: 'groot',
      text: 'I am Groot, Tactical Operational & Clinical Advisor (Powered by Sarvam AI & Nirantara). I monitor hospital surge capacity, blood bank reserves, and EOG telemetry failover. "Decision support, not a diagnosis". How can I assist the field command team?',
      ts: Date.now() - 30000
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);

  if (!isOpen) return null;

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
      let reply = 'I am Groot. ';
      const lower = query.toLowerCase();

      if (lower.includes('capacity') || lower.includes('bed') || lower.includes('hospital') || lower.includes('icu')) {
        reply += 'Victoria Central Hospital is at SURGE WARNING (18 free beds, 4 ICU beds, 92% O2). Manipal HAL has 45 beds and 11 ICU beds available.';
      } else if (lower.includes('blood') || lower.includes('hemo') || lower.includes('donor')) {
        reply += 'Blood Bank Status: O- is in CRITICAL stock (3 units remaining). Emergency UAV resupply protocol is recommended.';
      } else if (lower.includes('patient') || lower.includes('triage') || lower.includes('p0') || lower.includes('critical')) {
        reply += `Patient ${selectedPatientId} is under active clinical surveillance. Triage level: HIGH / IMMEDIATE. Vitals monitored via TinyML. "Decision support, not a diagnosis".`;
      } else if (lower.includes('failover') || lower.includes('tinyml') || lower.includes('link') || lower.includes('route')) {
        reply += 'NXP MCXN236 Edge TinyML inference latency is 420 µs. Primary 500ms failover state machine is HEALTHY on Port A.';
      } else if (lower.includes('eog') || lower.includes('hmac') || lower.includes('nurse')) {
        reply += 'EOG 100Hz DSP pipeline is operational. Nurse Call signal verified with SHA-256 HMAC integrity.';
      } else {
        reply += `Acknowledged query: "${query}". All clinical telemetry channels operational. Regional surge capacity is within limits.`;
      }

      setMessages(prev => [...prev, {
        sender: 'groot',
        text: reply,
        ts: Date.now()
      }]);
      setIsTranslating(false);
    }, 600);
  };

  const quickPrompts = [
    'Hospital Bed & ICU Surge Status',
    'Blood Bank O- Units Reserve',
    'Patient PT-101 Triage Summary',
    'TinyML 500ms Failover State'
  ];

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
              Sarvam AI Multilingual Voice &bull; Offline Guardrails
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
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 font-medium">
        <div className="flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-mono text-[11px] font-bold">SARVAM VOICE:</span>
        </div>
        <select
          value={selectedLang}
          onChange={(e) => setSelectedLang(e.target.value)}
          className="nm-btn px-2.5 py-1 text-xs font-bold bg-white text-slate-800 outline-none"
        >
          <option value="en-IN">English (India)</option>
          <option value="hi-IN">हिंदी (Hindi)</option>
          <option value="ta-IN">தமிழ் (Tamil)</option>
          <option value="te-IN">తెలుగు (Telugu)</option>
          <option value="kn-IN">ಕನ್ನಡ (Kannada)</option>
          <option value="bn-IN">বাংলা (Bengali)</option>
        </select>
      </div>

      {/* Quick Prompt Chips */}
      <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none">
        {quickPrompts.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSendQuery(chip)}
            className="nm-btn px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-700 hover:text-blue-600 shrink-0 border border-slate-300"
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
                    ? 'nm-flat text-slate-900 border border-slate-200/90' 
                    : 'nm-btn-accent text-white font-medium shadow-md shadow-blue-500/20'
                }`}
              >
                {msg.text}
              </div>

              <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-slate-400 font-mono">
                <span>{new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {isGroot && (
                  <button
                    onClick={() => handleSpeakText(msg.text, idx)}
                    className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-transparent border-none cursor-pointer"
                  >
                    {speakingIndex === idx ? (
                      <>
                        <VolumeX className="w-3 h-3 text-red-500" />
                        <span className="text-red-500">Stop</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3 h-3" />
                        <span>Speak</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {isTranslating && (
          <div className="flex items-center gap-2 text-xs text-slate-500 p-2">
            <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            <span>Groot is thinking...</span>
          </div>
        )}
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
          placeholder="Ask Groot about beds, blood bank, vitals..."
          className="nm-inset flex-1 px-3.5 py-2.5 text-xs text-slate-900 outline-none"
        />
        <button
          type="submit"
          className="nm-btn-accent p-2.5 rounded-xl flex items-center justify-center shrink-0 border-none"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </form>
    </div>
  );
}
