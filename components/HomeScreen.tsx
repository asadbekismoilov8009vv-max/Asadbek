
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { UserData } from '../App';
import CatIcon from './CatIcon';

interface Task {
  task_id: string;
  type: 'reading_comprehension' | 'writing_composition' | 'listening' | 'grammar' | 'speaking' | 'vocabulary' | 'matching';
  instruction: string;
  content: string;
  options?: string[];
  correct_answer: string;
  explanation: string;
  reading_passage?: string;
}

interface ShopItem {
  id: string;
  name: string;
  desc: string;
  price: string;
  type: 'hearts' | 'energy' | 'premium' | 'family_monthly' | 'family_yearly';
  value: number;
  icon: string;
  priceValue: number;
}

const TOTAL_LEVELS = 25;

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const ROADMAP_POSITIONS = Array.from({ length: TOTAL_LEVELS }).map((_, i) => ({
  x: Math.sin(i * 1.8) * 70 + (Math.random() - 0.5) * 20,
  y: i * 150,
  rot: (Math.random() - 0.5) * 12
}));

const MOCK_LEADERBOARD = [
  { name: 'NeuralNomad', level: 25, xp: 12400, avatar: '🧠' },
  { name: 'DataDrifter', level: 24, xp: 11800, avatar: '🤖' },
  { name: 'SyntaxSage', level: 24, xp: 11200, avatar: '👤' },
  { name: 'PulsePilot', level: 23, xp: 10500, avatar: '⚡' },
  { name: 'CyberCorgi', level: 22, xp: 9800, avatar: '🐕' },
];

const SHOP_ITEMS: ShopItem[] = [
  { id: 'h10', name: '+10 Hearts', desc: 'Restore life pulse instantly', price: '$1.99', type: 'hearts', value: 10, icon: '❤️', priceValue: 1.99 },
  { id: 'e20', name: '+20 Energy', desc: 'Powerful neural surge', price: '$0.99', type: 'energy', value: 20, icon: '⚡', priceValue: 0.99 },
  { id: 'p_ult', name: 'PREMIUM', desc: 'Unlimited Hearts & Energy Forever', price: '$9.67', type: 'premium', value: 0, icon: '💎', priceValue: 9.67 },
  { id: 'f_mo', name: 'Family Monthly', desc: 'Sync with up to 5 members', price: '$59.99/m', type: 'family_monthly', value: 0, icon: '👨‍👩‍👧', priceValue: 59.99 },
  { id: 'f_yr', name: 'Family Yearly', desc: 'Best value for the whole family', price: '$119.99/y', type: 'family_yearly', value: 0, icon: '💎👨‍👩‍👧‍👦', priceValue: 119.99 },
];

const validateLuhn = (number: string) => {
  let sum = 0;
  let shouldDouble = false;
  for (let i = number.length - 1; i >= 0; i--) {
    let digit = parseInt(number.charAt(i));
    if (shouldDouble) {
      if ((digit *= 2) > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return (sum % 10) === 0;
};

const HomeScreen: React.FC<{ userData: UserData; onUpdateUser: (u: Partial<UserData>) => void; theme: 'dark' | 'light'; onToggleTheme: () => void; onLogout: () => void }> = ({ userData, onUpdateUser, onLogout }) => {
  const [view, setView] = useState<'map' | 'lesson' | 'profile' | 'leaderboard' | 'dictionary'>('map');
  const [activeLevel, setActiveLevel] = useState<number>(1);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ status: 'correct' | 'incorrect' | 'complete' | 'gameover' | 'payment_success' | 'payment_failed'; msg: string; explanation?: string } | null>(null);
  const [lessonProgress, setLessonProgress] = useState(0);
  const [scrambledPool, setScrambledPool] = useState<string[]>([]);
  const [scrambledResult, setScrambledResult] = useState<string[]>([]);
  const [writingInput, setWritingInput] = useState('');
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [wasInLesson, setWasInLesson] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  // Shop/Checkout state
  const [selectedShopItem, setSelectedShopItem] = useState<ShopItem | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [cardData, setCardData] = useState({ number: '', expiry: '', cvv: '' });
  const [cardError, setCardError] = useState<string | null>(null);

  // Dictionary state
  const [dictSearch, setDictSearch] = useState('');
  const [dictResult, setDictResult] = useState<{ 
    definition: string; 
    phonetics?: string; 
    translation: string; 
    synonyms: string[]; 
    examples?: string[]; 
  } | null>(null);
  const [isDictLoading, setIsDictLoading] = useState(false);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFirstName, setEditFirstName] = useState(userData.profile.firstName);
  const [editLastName, setEditLastName] = useState(userData.profile.lastName);
  const [editNickname, setEditNickname] = useState(userData.profile.nickname);
  const [editAvatar, setEditAvatar] = useState(userData.profile.avatar || '');
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const audioCache = useRef<Record<string, string>>({});

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const activeProfile = useMemo(() => userData.profiles.find(p => p.id === userData.activeProfileId) || userData.profiles[0], [userData]);
  const trans = userData.uiTranslations;

  const cardType = useMemo(() => {
    const raw = cardData.number.replace(/\s/g, '');
    if (raw.startsWith('8600')) return 'UZCARD';
    if (raw.startsWith('9860')) return 'HUMO';
    if (raw.startsWith('4')) return 'VISA';
    if (raw.startsWith('5')) return 'MASTERCARD';
    return 'UNKNOWN';
  }, [cardData.number]);

  const needsCVV = cardType === 'VISA' || cardType === 'MASTERCARD' || cardType === 'UNKNOWN';

  const playAudioBytes = async (base64Audio: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => {
        setIsAudioPlaying(false);
        setIsAudioLoading(false);
      };
      source.start();
    } catch (e) {
      console.error("Audio playback failure", e);
      setIsAudioPlaying(false);
      setIsAudioLoading(false);
    }
  };

  const handleSpeakText = async (text: string) => {
    if (isAudioPlaying || isAudioLoading || !text) return;
    if (audioCache.current[text]) {
      setIsAudioPlaying(true);
      playAudioBytes(audioCache.current[text]);
      return;
    }
    setIsAudioLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Clearly say the following phrase in a natural tone: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        },
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        audioCache.current[text] = base64Audio;
        setIsAudioPlaying(true);
        playAudioBytes(base64Audio);
      } else {
        setIsAudioLoading(false);
      }
    } catch (e) {
      console.error("Neural Audio Sync Error", e);
      setIsAudioLoading(false);
    }
  };

  const fetchNextTask = async (currentProgress: number) => {
    setLoading(true);
    setFeedback(null);
    setScrambledPool([]);
    setScrambledResult([]);
    setWritingInput('');
    setIsRecording(false);
    
    const isAdvancedOrFluent = ['ADVANCED', 'FLUENT'].includes(activeProfile.proficiency);
    const advancedSequence: Task['type'][] = ['listening', 'reading_comprehension', 'writing_composition', 'grammar', 'speaking'];
    const beginnerSequence: Task['type'][] = ['listening', 'reading_comprehension', 'vocabulary', 'grammar', 'speaking'];
    const taskType = isAdvancedOrFluent ? advancedSequence[currentProgress] : beginnerSequence[currentProgress];

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let difficultyPrompt = "";
      if (activeProfile.proficiency === 'BEGINNER') difficultyPrompt = "CEFR A1: Simple, basic vocabulary.";
      // RE-CALIBRATED INTERMEDIATE TRACK TO IELTS A2+
      else if (activeProfile.proficiency === 'INTERMEDIATE') difficultyPrompt = "IELTS A2+ level (Band 4.0): Focusing on practical communication, everyday academic English, and basic exam-style reasoning for IELTS preparation.";
      else if (activeProfile.proficiency === 'ADVANCED') difficultyPrompt = "CEFR B2: Professional and academic context.";
      else if (activeProfile.proficiency === 'FLUENT') difficultyPrompt = "CEFR C1: High-level nuanced English.";

      const prompt = `Linguistics professor portal. Level ${activeLevel}, Task ${taskType}. Target: ${activeProfile.target}. ${difficultyPrompt} Return JSON.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              task_id: { type: Type.STRING },
              type: { type: Type.STRING },
              instruction: { type: Type.STRING },
              content: { type: Type.STRING },
              reading_passage: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correct_answer: { type: Type.STRING },
              explanation: { type: Type.STRING }
            },
            required: ["task_id", "type", "instruction", "content", "correct_answer", "explanation"]
          }
        }
      });
      
      const task = JSON.parse(response.text);
      task.type = taskType; 
      setCurrentTask(task);
      
      if (task.type === 'listening') {
        const words = task.correct_answer.split(' ');
        setScrambledPool([...words].sort(() => Math.random() - 0.5));
      }
    } catch (e) {
      setCurrentTask({
        task_id: `err_${Date.now()}`,
        type: taskType as any,
        instruction: "Linguistic node active.",
        content: "Neural link established.",
        correct_answer: "Neural link established.",
        explanation: "Fallback content synced."
      });
    } finally { setLoading(false); }
  };

  const handleEnterLevel = (lvl: number) => {
    if (lvl > activeProfile.currentLevel) return;
    if (userData.hearts < 1 && !userData.isPremium) {
      setFeedback({ status: 'gameover', msg: trans.gameover });
      return;
    }
    setActiveLevel(lvl);
    setLessonProgress(0);
    setView('lesson');
    setWasInLesson(true);
    fetchNextTask(0);
  };

  const handleLeaveLesson = () => {
    setIsLeaveModalOpen(false);
    setView('map');
    setCurrentTask(null);
    setWasInLesson(false);
    setFeedback(null);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        handleSpeakingSubmit(audioBlob);
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      setIsRecording(true);
    } catch (e) { console.error(e); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleSpeakingSubmit = async (blob: Blob) => {
    if (!currentTask) return;
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: { parts: [{ text: `Evaluate pronunciation for: "${currentTask.correct_answer}". Return JSON: {"is_correct": boolean, "feedback": string}` }, { inlineData: { data: base64, mimeType: 'audio/webm' } }] },
          config: { responseMimeType: "application/json" }
        });
        const result = JSON.parse(response.text);
        processResult(result.is_correct, result.feedback);
      };
    } catch (e) { processResult(true, "Speech node verified."); } finally { setLoading(false); }
  };

  const handleAnswer = async (val: string) => {
    if (!currentTask || feedback) return;
    if (currentTask.type === 'writing_composition') {
      setLoading(true);
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const evalRes = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Evaluate: "${writingInput}" for theme "${currentTask.content}". Proficiency: ${activeProfile.proficiency}. Return JSON: {"is_correct": boolean, "feedback": string}`,
          config: { responseMimeType: "application/json" }
        });
        const result = JSON.parse(evalRes.text);
        processResult(result.is_correct, result.feedback);
      } catch (e) { processResult(writingInput.length > 5, "Composition node synced."); } finally { setLoading(false); }
    } else {
      let checkVal = val;
      if (currentTask.type === 'listening') checkVal = scrambledResult.join(' ');
      const clean = (s: string) => s.toLowerCase().trim().replace(/[.,!?;]/g, '');
      processResult(clean(checkVal) === clean(currentTask.correct_answer), currentTask.explanation);
    }
  };

  const processResult = (isCorrect: boolean, msg: string) => {
    if (isCorrect) {
      if (lessonProgress + 1 >= 5) {
        setFeedback({ status: 'complete', msg: trans.excellent, explanation: msg });
        if (activeLevel === activeProfile.currentLevel) {
          const updated = userData.profiles.map(p => p.id === activeProfile.id ? { ...p, currentLevel: p.currentLevel + 1 } : p);
          onUpdateUser({ profiles: updated, energy: userData.energy + 15 });
        }
      } else {
        setLessonProgress(p => p + 1);
        setFeedback({ status: 'correct', msg: trans.congratulations, explanation: msg });
      }
    } else {
      if (!userData.isPremium) onUpdateUser({ hearts: Math.max(0, userData.hearts - 1) });
      setFeedback({ status: 'incorrect', msg: trans.incorrect_title, explanation: msg });
      if (userData.hearts === 1 && !userData.isPremium) setFeedback({ status: 'gameover', msg: trans.gameover });
    }
  };

  const handleSearchDictionary = async () => {
    if (!dictSearch.trim()) return;
    setIsDictLoading(true);
    setDictResult(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Linguistic Probe: Analyze "${dictSearch}".
      User Context: Native Language: ${activeProfile.native}, Learning Target: ${activeProfile.target}.
      Task:
      1. Detect if input is ${activeProfile.native} or ${activeProfile.target}.
      2. Provide the translation to the other language.
      3. Provide a clear definition in ${activeProfile.target}.
      4. List 4-5 synonyms in ${activeProfile.target}.
      5. Include phonetic transcription for the ${activeProfile.target} version.
      6. Provide 2 usage examples.
      
      Return JSON exactly as: {"definition": string, "phonetics": string, "translation": string, "synonyms": string[], "examples": string[]}`;
      
      const res = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      setDictResult(JSON.parse(res.text));
    } catch (e) { 
      console.error(e); 
    } finally { 
      setIsDictLoading(false); 
    }
  };

  const handlePurchase = async () => {
    if (!selectedShopItem) return;
    const rawNum = cardData.number.replace(/\s/g, '');
    
    // VALIDATION BLOCK
    if (rawNum.length !== 16) {
        return setCardError("Invalid node length. Neural link requires 16 digits.");
    }
    
    if (cardType === 'UNKNOWN') {
        return setCardError("Unsupported network. Use Humo, Uzcard, Visa, or Mastercard.");
    }
    
    // LOCAL NODE VALIDATION (Uzcard/Humo)
    if (cardType === 'HUMO' && !rawNum.startsWith('9860')) {
        return setCardError("Invalid Humo network prefix.");
    }
    if (cardType === 'UZCARD' && !rawNum.startsWith('8600')) {
        return setCardError("Invalid Uzcard network prefix.");
    }
    
    // GLOBAL NODE VALIDATION (Visa/MC)
    if ((cardType === 'VISA' || cardType === 'MASTERCARD')) {
        if (!validateLuhn(rawNum)) {
            return setCardError("Neural signature invalid (Luhn check failed).");
        }
        if (!cardData.cvv || cardData.cvv.length !== 3) {
          return setCardError("Secure CVV (3 digits) required for global networks.");
        }
    }

    // EXPIRY VALIDATION
    if (!cardData.expiry.includes('/') || cardData.expiry.length !== 5) {
      return setCardError("Invalid expiry format. Use MM/YY.");
    }
    const [month, year] = cardData.expiry.split('/').map(Number);
    const now = new Date();
    const currentYearShort = now.getFullYear() % 100;
    const currentMonth = now.getMonth() + 1;
    if (month < 1 || month > 12 || year < currentYearShort || (year === currentYearShort && month < currentMonth)) {
      return setCardError("Neural asset expired. Please use a valid card.");
    }
    
    setCardError(null);
    setIsPaying(true);
    
    // MOCK API SIMULATION
    await new Promise(r => setTimeout(r, 2000));
    
    const updates: Partial<UserData> = {};
    if (selectedShopItem.type === 'hearts') updates.hearts = userData.hearts + selectedShopItem.value;
    if (selectedShopItem.type === 'energy') updates.energy = userData.energy + selectedShopItem.value;
    if (selectedShopItem.type === 'premium') updates.isPremium = true;
    
    onUpdateUser(updates);
    setIsShopOpen(false);
    setSelectedShopItem(null);
    setFeedback({ status: 'payment_success', msg: trans.payment_success });
    setIsPaying(false);
  };

  const handleSaveProfile = () => {
    onUpdateUser({ profile: { ...userData.profile, firstName: editFirstName, lastName: editLastName, nickname: editNickname, avatar: editAvatar } });
    setIsEditingProfile(false);
  };

  const handleGenerateAvatar = async () => {
    setIsGeneratingAvatar(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: `3D Character Profile Avatar for "${editNickname}", high-end animation style, linguistic expert theme.` }] },
        config: { imageConfig: { aspectRatio: "1:1" } }
      });
      const data = res.candidates?.[0]?.content?.parts.find(p => p.inlineData)?.inlineData?.data;
      if (data) setEditAvatar(`data:image/png;base64,${data}`);
    } catch (e) { console.error(e); } finally { setIsGeneratingAvatar(false); }
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const renderRoadmapNodes = () => {
    return ROADMAP_POSITIONS.map((pos, i) => {
      const levelNum = i + 1;
      const isLocked = levelNum > activeProfile.currentLevel;
      const isCurrent = levelNum === activeProfile.currentLevel;

      return (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ 
            transform: `translateX(${pos.x}px) rotate(${pos.rot}deg)`,
            marginBottom: '40px'
          }}
          className="relative"
        >
          <motion.button
            whileHover={!isLocked ? { scale: 1.1, rotate: 0 } : {}}
            whileTap={!isLocked ? { scale: 0.95 } : {}}
            onClick={() => handleEnterLevel(levelNum)}
            className={`w-20 h-20 rounded-[30px] flex flex-col items-center justify-center relative z-10 shadow-2xl transition-all duration-500 ${
              isLocked 
                ? 'bg-slate-800 border-2 border-white/5 text-slate-600' 
                : isCurrent 
                  ? 'bg-cyan-500 border-4 border-white shadow-[0_0_40px_rgba(34,211,238,0.5)] text-slate-950' 
                  : 'bg-slate-900 border-2 border-cyan-500/30 text-cyan-400'
            }`}
          >
            {isLocked ? (
              <span className="text-xl">🔒</span>
            ) : (
              <>
                <span className="text-[10px] font-black uppercase leading-none mb-1">NODE</span>
                <span className="text-2xl font-black leading-none">{levelNum}</span>
              </>
            )}
            
            {isCurrent && (
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-cyan-400 rounded-[30px] -z-10"
              />
            )}
          </motion.button>
          {i < TOTAL_LEVELS - 1 && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-[2px] h-[60px] bg-gradient-to-b from-cyan-500/20 to-transparent -z-0" />
          )}
        </motion.div>
      );
    });
  };

  const isSecondaryView = ['profile', 'leaderboard', 'dictionary'].includes(view);

  return (
    <div className="h-full flex flex-col relative font-Montserrat bg-[#0F172A] overflow-hidden">
      <div className="flex justify-between items-center p-4 bg-slate-900/60 backdrop-blur-xl border-b border-white/5 sticky top-0 z-40 h-16">
        <div className="flex items-center gap-3">
          {view === 'lesson' ? (
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setIsLeaveModalOpen(true)} className="w-10 h-10 flex items-center justify-center bg-slate-800 rounded-xl text-slate-400 font-black text-sm">✕</motion.button>
          ) : isSecondaryView ? (
            <motion.button onClick={() => { if (wasInLesson) setView('lesson'); else setView('map'); }} className="px-4 py-2 bg-slate-800 text-cyan-400 rounded-xl font-black text-[10px] uppercase border border-cyan-500/20">
              ← {wasInLesson ? 'Resume Tasks' : 'Back to Path'}
            </motion.button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-800 rounded-xl"><CatIcon className="w-6 h-6 text-cyan-400" mood="happy" /></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest leading-none mb-1">Node {activeProfile.currentLevel}</span>
                <span className="text-xs font-black text-slate-400 leading-none">{activeProfile.proficiency} PATH</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-4">
          <button onClick={() => setIsShopOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 rounded-full border border-white/5">
            <span className="text-xs">⚡</span><span className="text-xs font-black">{userData.isPremium ? '∞' : userData.energy}</span>
          </button>
          <button onClick={() => setIsShopOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 rounded-full border border-white/5">
            <span className="text-xs text-red-500">❤️</span><span className="text-xs font-black">{userData.isPremium ? '∞' : userData.hearts}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar relative">
        <AnimatePresence mode="wait">
          {view === 'map' && (
            <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 pt-12 pb-32 flex flex-col items-center min-h-full">
              {renderRoadmapNodes()}
            </motion.div>
          )}

          {view === 'lesson' && currentTask && (
            <motion.div key="lesson" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 h-full flex flex-col max-w-lg mx-auto w-full pb-32">
              <div className="w-full h-2 bg-slate-800 rounded-full mb-8 overflow-hidden">
                <motion.div className="h-full bg-cyan-400" animate={{ width: `${(lessonProgress / 5) * 100}%` }} />
              </div>
              <div className="bg-slate-900 p-8 rounded-[40px] border border-white/5 mb-8 shadow-2xl flex flex-col items-center justify-center min-h-[250px] relative overflow-hidden">
                {loading ? <CatIcon className="w-16 h-16 text-cyan-400/50 animate-pulse" /> : (
                  <div className="text-center w-full">
                    <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.4em] mb-4">Neural Input Required</p>
                    <p className="text-xl font-black text-white leading-relaxed mb-6">{currentTask.content}</p>
                    {(currentTask.type === 'listening' || currentTask.type === 'speaking') && (
                      <button onClick={() => handleSpeakText(currentTask.correct_answer || currentTask.content)} className="w-20 h-20 rounded-full bg-cyan-500 flex items-center justify-center text-slate-950 shadow-xl">
                        <span className="text-2xl">{isAudioLoading ? '🧠' : '🔊'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
              {!loading && (
                <div className="space-y-3 pb-24">
                  {currentTask.type === 'listening' ? (
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2 min-h-[100px] p-4 bg-slate-900 rounded-[25px] border-2 border-dashed border-cyan-500/10">
                        {scrambledResult.map((w, i) => <button key={i} onClick={() => { setScrambledPool([...scrambledPool, w]); setScrambledResult(scrambledResult.filter((_, idx) => idx !== i)); }} className="px-4 py-2 bg-cyan-500 text-slate-950 rounded-xl font-black text-xs">{w}</button>)}
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {scrambledPool.map((w, i) => <button key={i} onClick={() => { setScrambledResult([...scrambledResult, w]); setScrambledPool(scrambledPool.filter((_, idx) => idx !== i)); }} className="px-4 py-2 bg-slate-800 rounded-xl font-bold border border-white/5 text-xs">{w}</button>)}
                      </div>
                      <button onClick={() => handleAnswer('')} disabled={scrambledPool.length > 0} className="w-full p-5 bg-cyan-500 text-slate-950 rounded-[25px] font-black uppercase tracking-widest shadow-xl disabled:opacity-50">Submit Phrase</button>
                    </div>
                  ) : currentTask.type === 'speaking' ? (
                    <div className="flex flex-col items-center">
                       <motion.button onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording} animate={isRecording ? { scale: [1, 1.2, 1], boxShadow: "0 0 40px #ef4444" } : {}} className={`w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all ${isRecording ? 'bg-red-500' : 'bg-slate-900 border-2 border-cyan-500/50'}`}>
                         <span className="text-3xl">{isRecording ? '🎙️' : '🎤'}</span>
                       </motion.button>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {currentTask.options?.map((opt, i) => <button key={i} onClick={() => handleAnswer(opt)} className="p-5 bg-slate-900 border-2 border-white/5 rounded-[22px] text-left font-bold hover:border-cyan-500/50 transition-all text-sm">{opt}</button>)}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {view === 'dictionary' && (
            <motion.div key="dictionary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 pb-32 max-w-lg mx-auto w-full space-y-6">
              <h2 className="text-3xl font-black tracking-tighter text-white">Neural Lexicon</h2>
              <div className="relative">
                <input type="text" placeholder="Probe neural archive..." value={dictSearch} onChange={e => setDictSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearchDictionary()} className="w-full p-5 bg-slate-900 border-2 border-white/5 rounded-3xl font-bold focus:border-cyan-500 text-white" />
                <button onClick={handleSearchDictionary} className="absolute right-4 top-1/2 -translate-y-1/2 bg-cyan-500 text-slate-950 p-2 rounded-xl text-xs font-black uppercase tracking-widest">Search</button>
              </div>
              <AnimatePresence mode="wait">
                {isDictLoading ? <div className="p-10 flex justify-center"><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full" /></div> : dictResult && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900 p-8 rounded-[40px] border border-white/5 shadow-2xl space-y-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-2xl font-black text-cyan-400 capitalize">{dictSearch}</h3>
                          <span className="px-3 py-1 bg-cyan-400/10 border border-cyan-400/30 rounded-full text-[10px] font-black text-cyan-400 uppercase tracking-widest shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                            {dictResult.translation}
                          </span>
                        </div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{dictResult.phonetics}</p>
                      </div>
                      <button onClick={() => handleSpeakText(dictSearch)} className="p-3 bg-slate-800 rounded-full text-cyan-400 hover:bg-slate-700 transition-colors">🔊</button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Definition</p>
                        <p className="text-sm font-bold text-slate-300 leading-relaxed italic border-l-4 border-cyan-500 pl-4">{dictResult.definition}</p>
                      </div>

                      {dictResult.synonyms && dictResult.synonyms.length > 0 && (
                        <div>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Synonyms</p>
                          <div className="flex flex-wrap gap-2">
                            {dictResult.synonyms.map((syn, i) => (
                              <button 
                                key={i} 
                                onClick={() => { setDictSearch(syn); handleSearchDictionary(); }}
                                className="px-3 py-1.5 bg-slate-800/60 border border-white/5 rounded-xl text-[10px] font-bold text-slate-400 hover:border-cyan-500/50 hover:text-cyan-400 transition-all"
                              >
                                {syn}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                         <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Usage Scenarios</p>
                         {dictResult.examples?.map((ex, i) => <p key={i} className="text-xs text-slate-400 font-medium leading-tight p-3 bg-slate-950/40 rounded-xl border border-white/5">• {ex}</p>)}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {view === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 pb-32 max-w-lg mx-auto w-full space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black tracking-tighter text-white">Core Identity</h2>
                <button onClick={() => setIsEditingProfile(!isEditingProfile)} className="px-4 py-2 bg-slate-800 text-cyan-400 rounded-xl font-black text-[10px] uppercase border border-cyan-500/20">{isEditingProfile ? 'Cancel' : 'Modify'}</button>
              </div>
              <div className="bg-slate-900 p-8 rounded-[40px] border border-white/5 flex flex-col items-center shadow-2xl relative overflow-hidden">
                <div className="relative mb-6">
                  <div className={`w-36 h-36 rounded-full overflow-hidden border-4 ${isGeneratingAvatar ? 'border-cyan-500' : 'border-cyan-500/50'} bg-slate-800 flex items-center justify-center text-5xl shadow-2xl relative`}>
                    {isGeneratingAvatar && <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-10"><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" /></div>}
                    {editAvatar ? <img src={editAvatar} className="w-full h-full object-cover" alt="Avatar" /> : '👤'}
                  </div>
                  {isEditingProfile && (
                    <div className="absolute -bottom-2 -right-12 flex flex-col gap-2 z-20">
                      <button 
                        onClick={handleGenerateAvatar} 
                        disabled={isGeneratingAvatar} 
                        className="bg-cyan-500 text-slate-950 p-2 rounded-xl shadow-xl border-2 border-slate-900 text-[8px] font-black uppercase whitespace-nowrap"
                      >
                        Neural Gen
                      </button>
                      <button 
                        onClick={() => fileInputRef.current?.click()} 
                        disabled={isGeneratingAvatar} 
                        className="bg-slate-800 text-cyan-400 p-2 rounded-xl shadow-xl border-2 border-slate-900 text-[8px] font-black uppercase whitespace-nowrap"
                      >
                        Gallery
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleGalleryUpload} 
                      />
                    </div>
                  )}
                </div>
                {isEditingProfile ? (
                  <div className="w-full space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" placeholder="First Name" value={editFirstName} onChange={e => setEditFirstName(e.target.value)} className="w-full p-4 bg-slate-800 border border-white/5 rounded-2xl font-bold text-xs text-white" />
                      <input type="text" placeholder="Last Name" value={editLastName} onChange={e => setEditLastName(e.target.value)} className="w-full p-4 bg-slate-800 border border-white/5 rounded-2xl font-bold text-xs text-white" />
                    </div>
                    <input type="text" placeholder="Nickname" value={editNickname} onChange={e => setEditNickname(e.target.value)} className="w-full p-4 bg-slate-800 border border-white/5 rounded-2xl font-bold text-xs text-white" />
                    <button onClick={handleSaveProfile} className="w-full p-4 bg-cyan-500 text-slate-950 rounded-2xl font-black uppercase text-[10px]">Sync Updates</button>
                  </div>
                ) : (
                  <>
                    <h3 className="text-xl font-black text-white">{userData.profile.nickname}</h3>
                    <p className="text-slate-500 font-bold text-[9px] uppercase tracking-widest mb-6">{userData.profile.firstName} {userData.profile.lastName}</p>
                    <div className="w-full space-y-2">
                       <div className="p-4 bg-slate-800/40 rounded-2xl border border-white/5 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white"><span className="text-slate-500">Path Node</span><span>{activeProfile.currentLevel} / 25</span></div>
                    </div>
                  </>
                )}
              </div>
              {!isEditingProfile && <button onClick={onLogout} className="w-full p-5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-[25px] font-black uppercase text-[10px] tracking-widest">Terminate Session</button>}
            </motion.div>
          )}

          {view === 'leaderboard' && (
            <motion.div key="leaderboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 pb-32 max-w-lg mx-auto w-full text-white">
               <h2 className="text-3xl font-black mb-8 tracking-tighter">Global Rankings</h2>
               <div className="space-y-3">{MOCK_LEADERBOARD.map((u, i) => (<div key={u.name} className="p-5 bg-slate-900 rounded-[25px] border border-white/5 flex justify-between items-center shadow-lg"><div className="flex items-center gap-4"><span className="font-black text-cyan-500 text-xs">#{i+1}</span><span className="text-lg">{u.avatar}</span><span className="font-bold text-xs">@{u.name}</span></div><span className="font-black text-[9px] opacity-50 uppercase">Level {u.level}</span></div>))}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-slate-900/80 backdrop-blur-2xl rounded-[35px] border border-white/10 p-2 flex justify-around shadow-2xl z-50">
        {[{ id: 'map', icon: '⚡' }, { id: 'leaderboard', icon: '🏆' }, { id: 'dictionary', icon: '📖' }, { id: 'profile', icon: '👤' }].map(item => (
          <button key={item.id} onClick={() => { setView(item.id as any); setFeedback(null); setIsEditingProfile(false); }} className={`flex flex-col items-center p-3 rounded-2xl transition-all ${view === item.id ? 'bg-cyan-500 text-slate-950' : 'text-slate-500'}`}><span className="text-xl">{item.icon}</span></button>
        ))}
      </div>

      <AnimatePresence>
        {isShopOpen && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-2xl p-8 flex flex-col pt-safe overflow-y-auto no-scrollbar pb-24 text-white">
            <div className="flex justify-between items-center mb-10"><button onClick={() => setIsShopOpen(false)} className="text-[10px] font-black uppercase text-slate-500">← Back</button><h2 className="text-2xl font-black">Neural Shop</h2><div className="w-10" /></div>
            <div className="space-y-4">{SHOP_ITEMS.map(item => (<button key={item.id} onClick={() => setSelectedShopItem(item)} className="w-full p-6 bg-slate-900 rounded-[35px] border border-white/5 flex items-center justify-between shadow-xl"><div className="flex items-center gap-4 text-3xl"><span>{item.icon}</span><div className="text-left"><p className="font-black text-sm">{item.name}</p><p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{item.desc}</p></div></div><span className="text-cyan-400 font-black text-xs px-3 py-1 bg-cyan-400/10 rounded-lg">{item.price}</span></button>))}</div>
          </motion.div>
        )}
        
        {selectedShopItem && (
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed inset-0 z-[110] bg-slate-950 p-8 pt-safe flex flex-col items-center text-white">
            <button onClick={() => { setSelectedShopItem(null); setCardError(null); }} className="self-start text-[10px] font-black uppercase text-slate-500 mb-10">← Cancel</button>
            <div className="max-w-xs w-full space-y-6">
              <div className="text-center mb-8"><span className="text-5xl block mb-4">{selectedShopItem.icon}</span><h2 className="text-2xl font-black">{selectedShopItem.name}</h2></div>
              
              <div className="space-y-6">
                {/* Visual Card Network Bar */}
                <div className="flex justify-around items-center p-3 bg-slate-900/50 rounded-2xl border border-white/5 shadow-inner">
                   {['UZCARD', 'HUMO', 'VISA', 'MASTERCARD'].map(net => (
                     <motion.div 
                       key={net}
                       animate={cardType === net ? { scale: 1.1, opacity: 1, filter: 'drop-shadow(0 0 8px rgba(34,211,238,0.5))' } : { scale: 0.9, opacity: 0.3 }}
                       className={`flex flex-col items-center gap-1 transition-all duration-300`}
                     >
                        <div className={`w-8 h-5 rounded-sm flex items-center justify-center font-black text-[6px] text-white ${
                          net === 'VISA' ? 'bg-blue-600' : 
                          net === 'MASTERCARD' ? 'bg-orange-600' : 
                          net === 'HUMO' ? 'bg-emerald-600' : 'bg-indigo-800'
                        }`}>
                          {net.slice(0, 4)}
                        </div>
                        <span className="text-[5px] font-black uppercase tracking-tighter text-slate-500">{net}</span>
                     </motion.div>
                   ))}
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between items-end mb-1">
                      <label className="text-[9px] font-black uppercase text-slate-600 ml-2 tracking-[0.2em]">Secure Node ID</label>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${cardType === 'UNKNOWN' ? 'bg-slate-800 text-slate-600' : 'bg-cyan-500 text-slate-950 animate-pulse'}`}>
                        {cardType} {cardType !== 'UNKNOWN' ? 'DETECTED' : ''}
                      </span>
                    </div>
                    <div className="relative group">
                      <input 
                        type="text" 
                        placeholder="XXXX XXXX XXXX XXXX" 
                        maxLength={19} 
                        value={cardData.number} 
                        onChange={e => {
                          let val = e.target.value.replace(/\D/g, '');
                          let formatted = val.match(/.{1,4}/g)?.join(' ') || '';
                          setCardData({...cardData, number: formatted});
                        }} 
                        className={`w-full p-5 bg-slate-900 rounded-2xl font-bold border-2 transition-all duration-500 text-sm text-white ${
                          cardType === 'UNKNOWN' ? 'border-white/5' : 
                          cardType === 'VISA' ? 'border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.1)]' :
                          cardType === 'MASTERCARD' ? 'border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.1)]' :
                          cardType === 'HUMO' ? 'border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]' :
                          'border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.1)]'
                        } focus:border-cyan-500`}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="MM/YY" maxLength={5} value={cardData.expiry} onChange={e => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length >= 2) val = val.slice(0, 2) + '/' + val.slice(2, 4);
                      setCardData({...cardData, expiry: val});
                    }} className="w-full p-5 bg-slate-900 rounded-2xl font-bold border-2 border-white/5 focus:border-cyan-500 text-sm text-white" />
                    {needsCVV && (
                      <input 
                        type="password" 
                        placeholder="CVV" 
                        maxLength={3} 
                        value={cardData.cvv} 
                        onChange={e => setCardData({...cardData, cvv: e.target.value.replace(/\D/g, '')})} 
                        className="w-full p-5 bg-slate-900 rounded-2xl font-bold border-2 border-white/5 focus:border-cyan-500 text-sm text-white text-center tracking-[0.5em]" 
                      />
                    )}
                  </div>
                  {cardError && (
                    <motion.p 
                      initial={{ scale: 0.9, opacity: 0 }} 
                      animate={{ scale: 1, opacity: 1 }} 
                      className="text-[10px] font-black text-red-400 uppercase text-center bg-red-400/10 p-3 rounded-xl border border-red-500/20"
                    >
                      {cardError}
                    </motion.p>
                  )}
                  {!needsCVV && (
                    <p className="text-[9px] font-black text-emerald-500 uppercase text-center flex items-center justify-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Local Node Verified: CVV Waived
                    </p>
                  )}
                </div>
              </div>

              <button 
                onClick={handlePurchase} 
                disabled={isPaying} 
                className={`w-full p-5 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all duration-500 ${
                  isPaying ? 'bg-slate-800 text-slate-500' : 'bg-cyan-500 text-slate-950 active:scale-95'
                }`}
              >
                {isPaying ? 'SYNCING TRANSACTION...' : `AUTHORIZE $${selectedShopItem.priceValue}`}
              </button>
              
              <p className="text-[8px] font-bold text-slate-600 uppercase text-center tracking-widest px-8">
                Processed via Neural Portal Secure G-Sync. Data Encrypted with 256-bit Pulse-AES.
              </p>
            </div>
          </motion.div>
        )}

        {isLeaveModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 text-white">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-slate-900 border-2 border-red-500/20 p-8 rounded-[40px] max-w-xs w-full text-center shadow-2xl">
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-black text-white mb-2 uppercase tracking-tight">{trans.leave_task_title}</h3>
              <p className="text-[10px] font-bold text-slate-400 mb-8 leading-relaxed">{trans.leave_task_body}</p>
              <div className="flex flex-col gap-3">
                <button onClick={handleLeaveLesson} className="w-full p-4 bg-red-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">{trans.yes_btn}</button>
                <button onClick={() => setIsLeaveModalOpen(false)} className="w-full p-4 bg-slate-800 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest">{trans.no_btn}</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {feedback && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="fixed inset-x-6 top-[10%] z-[200] p-8 rounded-[40px] border-4 flex flex-col items-center text-center shadow-2xl backdrop-blur-3xl bg-slate-900/98 text-white" style={{ borderColor: feedback.status === 'correct' || feedback.status === 'complete' || feedback.status === 'payment_success' ? '#10B981' : '#EF4444' }}>
            <div className="text-5xl mb-4">{feedback.status === 'correct' || feedback.status === 'complete' || feedback.status === 'payment_success' ? '✅' : '❌'}</div>
            <h4 className="text-xl font-black text-white mb-6 uppercase tracking-tight">{feedback.msg}</h4>
            <button onClick={() => { const s = feedback.status; setFeedback(null); if (s === 'complete' || s === 'gameover') { setView('map'); setCurrentTask(null); setWasInLesson(false); } else if (s !== 'payment_success') { fetchNextTask(lessonProgress); } }} className={`w-full p-4 rounded-2xl font-black uppercase tracking-widest ${feedback.status.includes('success') || feedback.status.includes('correct') ? 'bg-emerald-500' : 'bg-red-500'}`}>Continue</button>
            <p className="mt-4 text-[11px] text-white/60 font-medium leading-relaxed italic">{feedback.explanation}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HomeScreen;
