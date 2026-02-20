
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CatIcon from './CatIcon';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("INITIALIZING NEURAL LINK");
  const quickLetters = "Quick".split("");
  const learnerLetters = "Learner".split("");

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 1200); 
          return 100;
        }
        return prev + 1.5;
      });
    }, 30);

    const statusInterval = setInterval(() => {
      const statuses = [
        "CALIBRATING SYNTAX NODES...",
        "STRENGTHENING NEURAL PATHS...",
        "VERIFYING LINGUISTIC PULSE...",
        "G-PORTAL HANDSHAKE IN PROGRESS...",
        "SYNCHRONIZING DIALECTS..."
      ];
      setStatusText(statuses[Math.floor(Math.random() * statuses.length)]);
    }, 800);

    return () => {
      clearInterval(interval);
      clearInterval(statusInterval);
    };
  }, [onComplete]);

  return (
    <div className="relative w-full h-[100dvh] bg-[#0F172A] flex flex-col items-center justify-center overflow-hidden font-Montserrat px-6">
      {/* Dynamic Background: Orbiting Energy Rings */}
      <motion.div 
        animate={{ 
          scale: [1, 1.1, 1], 
          opacity: [0.05, 0.1, 0.05],
          rotate: [0, -360] 
        }} 
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }} 
        className="absolute w-[800px] h-[800px] border-[2px] border-cyan-400/30 rounded-full blur-[80px]" 
      />
      <motion.div 
        animate={{ 
          scale: [1.2, 1, 1.2], 
          opacity: [0.02, 0.05, 0.02],
          rotate: [0, 360] 
        }} 
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }} 
        className="absolute w-[600px] h-[600px] border-[1px] border-cyan-500/20 rounded-full blur-[60px]" 
      />
      
      {/* Cinematic Logo Entrance */}
      <motion.div 
        initial={{ scale: 0.5, opacity: 0, rotateY: 90 }} 
        animate={{ scale: 1, opacity: 1, rotateY: 0 }} 
        transition={{ duration: 1.2, ease: "backOut" }}
        className="relative mb-16 z-10"
      >
        <div className="p-10 bg-slate-900/50 backdrop-blur-3xl rounded-[60px] shadow-[0_0_80px_rgba(34,211,238,0.2)] border border-white/10 relative overflow-hidden">
          <motion.div
            animate={{ 
              y: [0, -8, 0],
              scale: [1, 1.05, 1]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <CatIcon className="w-28 h-28 text-cyan-400" mood="happy" />
          </motion.div>
          
          {/* Scanning Beam */}
          <motion.div 
            animate={{ top: ['-20%', '120%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-4 bg-cyan-400/20 blur-md z-20 pointer-events-none"
          />
        </div>
      </motion.div>

      <div className="flex flex-col items-center z-10 w-full max-w-sm">
        <div className="flex items-center gap-1 mb-4">
          <div className="flex">
            {quickLetters.map((char, i) => (
              <motion.span
                key={`q-${i}`}
                initial={{ opacity: 0, x: -50, filter: "blur(15px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                transition={{ delay: 0.4 + (i * 0.08), duration: 0.6, type: "spring" }}
                className="text-5xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
              >
                {char}
              </motion.span>
            ))}
          </div>
          <div className="flex">
            {learnerLetters.map((char, i) => (
              <motion.span
                key={`l-${i}`}
                initial={{ opacity: 0, x: 50, filter: "blur(15px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                transition={{ delay: 0.8 + (i * 0.08), duration: 0.6, type: "spring" }}
                className="text-5xl font-black text-cyan-400 tracking-tighter drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]"
              >
                {char}
              </motion.span>
            ))}
          </div>
        </div>
        
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 1.4, duration: 0.8 }}
          className="h-[1px] w-48 bg-gradient-to-r from-transparent via-cyan-500 to-transparent mb-8"
        />

        <motion.p 
          key={statusText}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 0.5, scale: 1 }}
          className="text-[10px] font-black text-cyan-300 uppercase mb-12 text-center tracking-[0.5em] h-4"
        >
          {statusText}
        </motion.p>

        <div className="w-full px-8">
          <div className="w-full h-1 bg-slate-800/80 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.8)]" 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "linear" }}
            />
          </div>
          <div className="mt-2 flex justify-center">
             <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">G-PLATFORM v4.0.2</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
