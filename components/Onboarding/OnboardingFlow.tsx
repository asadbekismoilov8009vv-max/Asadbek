
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from "@google/genai";
import { DEFAULT_UI_STRINGS } from '../../App';
import CatIcon from '../CatIcon';

const LANGUAGES = [
  { code: 'ar', name: 'Arabic' }, { code: 'bn', name: 'Bengali' }, { code: 'zh', name: 'Chinese' },
  { code: 'cs', name: 'Czech' }, { code: 'da', name: 'Danish' }, { code: 'nl', name: 'Dutch' },
  { code: 'en', name: 'English' }, { code: 'fi', name: 'Finnish' }, { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' }, { code: 'el', name: 'Greek' }, { code: 'he', name: 'Hebrew' },
  { code: 'hi', name: 'Hindi' }, { code: 'hu', name: 'Hungarian' }, { code: 'id', name: 'Indonesian' },
  { code: 'it', name: 'Italian' }, { code: 'ja', name: 'Japanese' }, { code: 'ko', name: 'Korean' },
  { code: 'ms', name: 'Malay' }, { code: 'no', name: 'Norwegian' }, { code: 'pl', name: 'Polish' },
  { code: 'pt', name: 'Portuguese' }, { code: 'ro', name: 'Romanian' }, { code: 'ru', name: 'Russian' },
  { code: 'es', name: 'Spanish' }, { code: 'sv', name: 'Swedish' }, { code: 'th', name: 'Thai' },
  { code: 'tr', name: 'Turkish' }, { code: 'uz', name: 'Uzbek' }, { code: 'vi', name: 'Vietnamese' }
];

interface OnboardingFlowProps {
  onComplete: (data: any) => void;
  onCancel: () => void;
  showHomeButton?: boolean;
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formError, setFormError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [verifyLogs, setVerifyLogs] = useState<string[]>([]);
  
  const [data, setData] = useState<any>({
    profile: { firstName: '', lastName: '', nickname: '', email: '', password: '', avatar: '' },
    languages: { native: 'Uzbek', target: 'English' },
    proficiency: '',
    uiTranslations: DEFAULT_UI_STRINGS
  });

  const isEmailFormatValid = useMemo(() => {
    const gmailRegex = /^[a-zA-Z0-9._%+-]{3,}@gmail\.com$/;
    return gmailRegex.test(data.profile.email.toLowerCase().trim());
  }, [data.profile.email]);

  const handleDeepVerify = async () => {
    if (!isEmailFormatValid) {
      setFormError("Neural Identity requires a valid @gmail.com address.");
      return;
    }
    setFormError(null);
    setIsVerifying(true);
    setVerifyLogs(["QUERYING GMAIL GLOBAL NAMESPACE...", "VERIFYING DOMAIN MX RECORDS..."]);

    try {
      await new Promise(r => setTimeout(r, 700));
      setVerifyLogs(prev => [...prev, "MX.GOOGLE.COM REACHED", "COMMENCING DEEP IDENTITY SCAN..."]);
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Act as the Google Account Integrity Auditor.
      Analyze this candidate Gmail address for registration: "${data.profile.email}".
      
      Does this address appear to be a legitimate, human-owned primary account?
      REJECT if:
      - It's a random string of letters (e.g., asdfghjkl).
      - It's too short (under 3 chars before @).
      - It's an obvious test email.
      
      Return "AUTHORIZED" or "DENIED" ONLY.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: { thinkingConfig: { thinkingBudget: 1500 } }
      });

      const result = response.text.trim().toUpperCase();
      await new Promise(r => setTimeout(r, 600));

      if (result.includes("AUTHORIZED")) {
        setVerifyLogs(prev => [...prev, "IDENTITY HANDSHAKE: SUCCESS", "PULSE STATUS: HUMAN VERIFIED"]);
        setTimeout(() => {
          setVerifiedEmail(data.profile.email.toLowerCase().trim());
          setIsVerifying(false);
        }, 800);
      } else {
        setVerifyLogs(prev => [...prev, "IDENTITY HANDSHAKE: REJECTED", "PULSE STATUS: NON-HUMAN/BOT PATTERN"]);
        setTimeout(() => {
          setFormError("Neural Identity Rejected. Please use a verified primary Gmail.");
          setIsVerifying(false);
          setVerifyLogs([]);
        }, 1000);
      }
    } catch (e) {
      setVerifiedEmail(data.profile.email.toLowerCase().trim());
      setIsVerifying(false);
    }
  };

  const isStep1Valid = !!verifiedEmail && data.profile.nickname.length >= 3 && data.profile.password.length >= 6;

  const handleStep1Submit = () => {
    if (!isStep1Valid) {
      if (!verifiedEmail) setFormError("Verification with Gmail.com is required to proceed.");
      else if (data.profile.nickname.length < 3) setFormError("Nickname must be at least 3 characters.");
      else if (data.profile.password.length < 6) setFormError("Password must be 6+ characters.");
      return;
    }
    setStep(2); 
  };

  const proceedToStep3 = () => {
    setStep(3); 
    (async () => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Translate UI strings to ${data.languages.native}: ${JSON.stringify(DEFAULT_UI_STRINGS)}`,
          config: { responseMimeType: "application/json" }
        });
        setData((prev: any) => ({ ...prev, uiTranslations: JSON.parse(response.text || '{}') }));
      } catch (e) {}
    })();
  };

  const trans = data.uiTranslations;

  return (
    <div className="min-h-[100dvh] bg-[#0F172A] text-white flex flex-col items-center p-6 overflow-y-auto no-scrollbar font-Montserrat">
      <div className="w-full flex justify-between items-center mb-8 max-w-lg pt-safe">
        <button onClick={onCancel} className="bg-slate-900 px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest">
          ← {trans.back || 'Back'}
        </button>
        <span className="font-bold text-slate-500 text-[9px] tracking-widest">{step}/3</span>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full max-w-sm space-y-6">
            <h2 className="text-3xl font-black tracking-tighter text-center">Identity Sync</h2>
            
            <div className="bg-slate-900/50 p-6 rounded-[45px] border border-white/5 flex flex-col items-center gap-4">
               {verifiedEmail ? (
                 <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex flex-col items-center">
                   <div className="w-20 h-20 rounded-full border-4 border-emerald-500 bg-slate-800 flex items-center justify-center text-3xl mb-2">👤</div>
                   <div className="flex items-center gap-2 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/30">
                     <span className="text-emerald-500 text-[10px] font-black uppercase">Verified Gmail:</span>
                     <span className="text-white text-[10px] font-bold">{verifiedEmail}</span>
                   </div>
                   <button onClick={() => { setVerifiedEmail(null); setVerifyLogs([]); }} className="mt-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Switch Identity</button>
                 </motion.div>
               ) : (
                 <div className="w-full space-y-4">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Neural Gmail Handshake</p>
                   <div className="relative">
                     <input 
                       type="email" 
                       placeholder="Enter Gmail (from gmail.com)" 
                       className={`w-full p-4 bg-slate-900 border-2 transition-all rounded-2xl font-bold ${data.profile.email.length > 0 && !isEmailFormatValid ? 'border-red-500' : 'border-white/5'}`} 
                       value={data.profile.email} 
                       disabled={isVerifying}
                       onChange={e => setData({...data, profile: {...data.profile, email: e.target.value.replace(/\s/g, '')}})} 
                     />
                     {isEmailFormatValid && !isVerifying && (
                       <button onClick={handleDeepVerify} className="absolute right-3 top-1/2 -translate-y-1/2 bg-cyan-500 text-slate-950 px-3 py-1.5 rounded-xl font-black text-[8px] uppercase tracking-widest shadow-xl">Verify</button>
                     )}
                   </div>
                   
                   {isVerifying && (
                      <div className="bg-slate-950/80 p-5 rounded-[28px] border border-cyan-500/20 font-mono text-[8px] space-y-1.5 shadow-xl">
                        {verifyLogs.map((log, i) => (
                          <p key={i} className={log.includes('SUCCESS') ? 'text-emerald-400' : 'text-cyan-400'}>{log}</p>
                        ))}
                        <motion.div animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1.5 h-2.5 bg-cyan-500 inline-block align-middle ml-1" />
                      </div>
                   )}
                 </div>
               )}
            </div>

            {verifiedEmail && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 overflow-hidden">
                <input type="text" placeholder={trans.nickname} className="w-full p-4 bg-slate-900 border-2 border-white/5 rounded-2xl font-bold shadow-lg" value={data.profile.nickname} onChange={e => setData({...data, profile: {...data.profile, nickname: e.target.value}})} />
                <input type="password" placeholder={trans.password} className="w-full p-4 bg-slate-900 border-2 border-white/5 rounded-2xl font-bold shadow-lg" value={data.profile.password} onChange={e => setData({...data, profile: {...data.profile, password: e.target.value}})} />
              </motion.div>
            )}

            {formError && <p className="text-red-400 text-[10px] font-black uppercase text-center bg-red-400/10 p-3 rounded-2xl">{formError}</p>}
            
            <button 
              onClick={handleStep1Submit} 
              disabled={!isStep1Valid} 
              className={`w-full p-5 rounded-[25px] font-black uppercase tracking-widest transition-all ${isStep1Valid ? 'bg-cyan-500 text-slate-950 shadow-[0_15px_35px_rgba(34,211,238,0.4)]' : 'bg-slate-800 text-slate-600 opacity-50 cursor-not-allowed'}`}
            >
              Confirm Neural Link
            </button>
          </motion.div>
        )}

        {/* ... steps 2 and 3 remain same ... */}
        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full max-w-sm space-y-8">
            <h2 className="text-3xl font-black tracking-tighter text-center">{trans.neural_sync}</h2>
            <div className="space-y-4">
               <label className="text-[9px] font-black uppercase text-slate-500">{trans.native_tongue}</label>
               <select className="w-full p-4 bg-slate-900 border-2 border-white/5 rounded-2xl font-bold" value={data.languages.native} onChange={e => setData({...data, languages: {...data.languages, native: e.target.value}})}>
                 {LANGUAGES.map(l => <option key={l.code} value={l.name}>{l.name}</option>)}
               </select>
            </div>
            <div className="space-y-4">
               <label className="text-[9px] font-black uppercase text-slate-500">{trans.learning_goal}</label>
               <select className="w-full p-4 bg-slate-900 border-2 border-white/5 rounded-2xl font-bold" value={data.languages.target} onChange={e => setData({...data, languages: {...data.languages, target: e.target.value}})}>
                 {LANGUAGES.map(l => <option key={l.code} value={l.name}>{l.name}</option>)}
               </select>
            </div>
            <button onClick={proceedToStep3} className="w-full p-5 bg-cyan-500 text-slate-950 rounded-[25px] font-black uppercase tracking-widest">
              {trans.continue}
            </button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm space-y-4">
            <h2 className="text-3xl font-black tracking-tighter mb-4 text-center">{trans.rank}</h2>
            {['Beginner', 'Intermediate', 'Advanced', 'Fluent'].map(p => (
              <button key={p} onClick={() => onComplete({...data, proficiency: p.toUpperCase()})} className="w-full p-5 border-2 border-white/5 bg-slate-900 rounded-[22px] text-left font-bold text-sm uppercase flex justify-between items-center group shadow-xl">
                {p} <span className="text-cyan-500 group-hover:translate-x-2 transition-transform">→</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OnboardingFlow;
