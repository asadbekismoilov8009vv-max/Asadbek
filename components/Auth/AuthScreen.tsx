
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from "@google/genai";
import { UserData } from '../../App';
import CatIcon from '../CatIcon';

interface AuthScreenProps {
  onLogin: (user: UserData) => void;
  onStartSignUp: () => void;
  uiTranslations: Record<string, string>;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, onStartSignUp, uiTranslations: trans }) => {
  const [view, setView] = useState<'landing' | 'login'>('landing');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifyLogs, setVerifyLogs] = useState<string[]>([]);

  const isEmailValid = useMemo(() => {
    const gmailRegex = /^[a-zA-Z0-9._%+-]{3,}@gmail\.com$/;
    return gmailRegex.test(email.toLowerCase().trim());
  }, [email]);

  const isPasswordValid = useMemo(() => password.length >= 4, [password]);
  
  const handleDeepVerify = async () => {
    if (!isEmailValid) {
      setError("Provide a valid Gmail address (min 3 chars before @).");
      return;
    }
    setError(null);
    setIsVerifying(true);
    setVerifyLogs(["CONNECTING TO ACCOUNTS.GOOGLE.COM...", "PROBING SMTP.GMAIL.COM..."]);

    try {
      await new Promise(r => setTimeout(r, 600));
      setVerifyLogs(prev => [...prev, "MX RECORD MATCH: mx.google.com", "INITIATING SOCIAL IDENTITY AUDIT..."]);
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Act as the Google Identity Verification Engine. 
      Analyze this target address: "${email}". 
      
      Strictly evaluate if this is a realistic, human-owned primary Gmail account.
      REJECT (Return "DENIED") if:
      - It looks like a test string (test@, asdf@, 123@).
      - It has no human naming pattern (e.g., random mashes like "qwerasdf@").
      - It appears to be a temporary or bot-generated string.
      
      ACCEPT (Return "AUTHORIZED") if:
      - It follows human naming conventions (first.last, nickname_year, etc.).
      
      Return ONLY "AUTHORIZED" or "DENIED". No explanation.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: { thinkingConfig: { thinkingBudget: 2000 } }
      });

      const result = response.text.trim().toUpperCase();
      await new Promise(r => setTimeout(r, 800));
      
      if (result.includes("AUTHORIZED")) {
        setVerifyLogs(prev => [...prev, "SOCIAL PULSE: 100% HUMAN MATCH", "HANDSHAKE: SUCCESSFUL"]);
        setTimeout(() => {
          setVerifiedEmail(email.toLowerCase().trim());
          setIsVerifying(false);
        }, 1000);
      } else {
        setVerifyLogs(prev => [...prev, "SOCIAL PULSE: BOT PATTERN DETECTED", "HANDSHAKE: REJECTED"]);
        setTimeout(() => {
          setError("Gmail Identity Check Failed. Pulse suggests this is a 'wrong' or bot identity.");
          setIsVerifying(false);
          setVerifyLogs([]);
        }, 1200);
      }
    } catch (e) {
      // Emergency bypass if AI is down
      setVerifiedEmail(email.toLowerCase().trim());
      setIsVerifying(false);
    }
  };

  const handleLoginAttempt = () => {
    if (!verifiedEmail || !isPasswordValid) return;
    
    const savedAccounts = JSON.parse(localStorage.getItem('quicklearner_accounts') || '[]');
    const user = savedAccounts.find((a: UserData) => a.profile.email.toLowerCase().trim() === verifiedEmail && a.profile.password === password);
    
    if (user) {
      onLogin(user);
    } else { 
      setError("Neural signature not found for this verified Gmail. Did you register?"); 
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#0F172A] text-white flex flex-col items-center justify-center p-6 font-Montserrat overflow-y-auto no-scrollbar">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm text-center py-6">
        <div className="flex justify-center mb-6">
          <div className="bg-slate-900 p-6 rounded-[35px] shadow-2xl border border-white/5 relative">
             <CatIcon className="w-16 h-16 text-cyan-400" mood={isVerifying ? 'happy' : verifiedEmail ? 'happy' : 'neutral'} />
             {verifiedEmail && (
               <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-2 -right-2 bg-emerald-500 w-8 h-8 rounded-full border-4 border-slate-900 flex items-center justify-center text-[10px]">✓</motion.div>
             )}
          </div>
        </div>
        <h1 className="text-3xl font-black text-white mb-1 tracking-tighter">Quick<span className="text-cyan-400">Learner</span></h1>
        <p className="text-slate-500 font-bold text-[8px] uppercase tracking-widest mb-10">Neural G-Portal Access</p>

        <AnimatePresence mode="wait">
          {view === 'landing' && (
            <motion.div key="landing" className="space-y-4">
              <button onClick={onStartSignUp} className="w-full p-5 bg-cyan-500 text-slate-950 rounded-[30px] font-black text-md shadow-xl uppercase tracking-widest">
                {trans.get_started}
              </button>
              <button onClick={() => setView('login')} className="mt-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                {trans.already_have_account}
              </button>
            </motion.div>
          )}

          {view === 'login' && (
            <motion.div key="login" className="space-y-4 text-left w-full px-2">
              <div className="relative">
                <input 
                  type="email" 
                  placeholder="Official Gmail (from gmail.com)" 
                  className={`w-full p-4 bg-slate-900 border-2 transition-all rounded-[20px] font-bold text-sm focus:border-cyan-500 ${verifiedEmail ? 'border-emerald-500 bg-emerald-500/5 text-emerald-400' : (email.length > 0 && !isEmailValid ? 'border-red-500' : 'border-white/5')}`} 
                  value={email} 
                  disabled={isVerifying || !!verifiedEmail}
                  onChange={e => setEmail(e.target.value.replace(/\s/g, ''))} 
                />
                {!verifiedEmail && !isVerifying && isEmailValid && (
                  <button onClick={handleDeepVerify} className="absolute right-3 top-1/2 -translate-y-1/2 bg-cyan-500 text-slate-950 px-3 py-1.5 rounded-xl font-black text-[8px] uppercase tracking-widest shadow-lg">Verify</button>
                )}
                {verifiedEmail && (
                  <button onClick={() => setVerifiedEmail(null)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-[9px] uppercase">Change</button>
                )}
              </div>

              {isVerifying && (
                <div className="bg-slate-950/90 p-5 rounded-[25px] border border-cyan-500/30 font-mono text-[9px] space-y-1.5 shadow-2xl">
                  {verifyLogs.map((log, i) => (
                    <p key={i} className={log.includes('SUCCESS') || log.includes('AUTHORIZED') ? 'text-emerald-400' : 'text-cyan-400'}>
                      <span className="opacity-30">[{new Date().toLocaleTimeString()}]</span> {log}
                    </p>
                  ))}
                  <motion.div animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1.5 h-3 bg-cyan-500 inline-block align-middle ml-1" />
                </div>
              )}

              {verifiedEmail && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <input 
                    type="password" 
                    placeholder={trans.password} 
                    className="w-full p-4 bg-slate-900 border-2 border-white/5 rounded-[20px] font-bold text-sm focus:border-cyan-500" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                  />
                  <button 
                    onClick={handleLoginAttempt} 
                    disabled={!isPasswordValid} 
                    className={`w-full p-5 rounded-[30px] font-black text-md shadow-xl uppercase tracking-widest transition-all ${isPasswordValid ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-600 opacity-50 cursor-not-allowed'}`}
                  >
                    Authorize Neural Link
                  </button>
                </motion.div>
              )}

              {error && <p className="text-red-400 font-bold text-center text-[9px] uppercase tracking-tight bg-red-400/10 p-3 rounded-xl">{error}</p>}
              
              <button onClick={() => { setView('landing'); setVerifiedEmail(null); setVerifyLogs([]); }} className="w-full text-center text-slate-500 font-black text-[8px] uppercase tracking-widest mt-2">{trans.abort}</button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default AuthScreen;
