
import React from 'react';
import { motion } from 'framer-motion';

const CatIcon: React.FC<{ className?: string; mood?: 'happy' | 'sad' | 'neutral' }> = ({ className, mood = 'neutral' }) => {
  return (
    <motion.svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      {/* Cat silhouette */}
      <path 
        d="M25 100 
           C25 85 35 75 35 60 
           C35 50 30 48 30 35 
           C30 20 40 15 50 15 
           C60 15 70 20 70 35 
           C70 48 65 50 65 60 
           C65 75 75 85 75 100" 
        fill="currentColor" 
      />
      
      {/* Ears with mood animation */}
      <motion.path 
        animate={mood === 'sad' ? { rotate: -20, x: -2, y: 5 } : { rotate: 0, x: 0, y: 0 }}
        d="M32 18 L28 2 C28 2 35 0 42 16" 
        fill="currentColor" 
      />
      <motion.path 
        animate={mood === 'sad' ? { rotate: 20, x: 2, y: 5 } : { rotate: 0, x: 0, y: 0 }}
        d="M68 18 L72 2 C72 2 65 0 58 16" 
        fill="currentColor" 
      />

      {/* Eyes: Change based on mood */}
      {mood === 'sad' ? (
        <g stroke="black" strokeWidth="2" strokeLinecap="round">
          <path d="M38 42 Q 42 38 46 42" />
          <path d="M54 42 Q 58 38 62 42" />
        </g>
      ) : (
        <>
          <ellipse cx="42" cy="42" rx="7" ry="8" fill="black" />
          <ellipse cx="58" cy="42" rx="7" ry="8" fill="black" />
        </>
      )}

      {/* Nose */}
      <path d="M49 50 H51" stroke="black" strokeWidth="1.5" strokeLinecap="round" />

      {/* Whiskers */}
      <motion.g 
        animate={mood === 'sad' ? { opacity: 0.5, y: 2 } : { opacity: 1, y: 0 }}
        stroke="black" strokeWidth="1" strokeLinecap="round"
      >
        <line x1="30" y1="48" x2="18" y2="46" />
        <line x1="29" y1="52" x2="15" y2="52" />
        <line x1="30" y1="56" x2="18" y2="58" />

        <line x1="70" y1="48" x2="82" y2="46" />
        <line x1="71" y1="52" x2="85" y2="52" />
        <line x1="70" y1="56" x2="82" y2="58" />
      </motion.g>
    </motion.svg>
  );
};

export default CatIcon;
