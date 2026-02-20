
import React from 'react';

const JaguarIcon: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="100%" stopColor="#0891B2" />
        </linearGradient>
      </defs>

      {/* Abstract Speed-Q Silhouette - Minimalist & Non-Human */}
      <path 
        d="M50 15C30.67 15 15 30.67 15 50C15 69.33 30.67 85 50 85C56.5 85 62.6 83.2 67.8 80L85 92V75C91.2 68.2 95 59.5 95 50C95 30.67 79.33 15 50 15Z" 
        fill="#0F172A" 
      />
      
      {/* Inner "Speed Streak" - Predatory Ear Motif integrated into letterform */}
      <path 
        d="M50 25C36.19 25 25 36.19 25 50C25 63.81 36.19 75 50 75C54.1 75 57.9 74 61.3 72.2L78 84V64.7C82.3 60.5 85 54.6 85 50C85 36.19 73.81 25 50 25Z" 
        fill="url(#logoGrad)"
      />

      {/* Sharp 'Predator' Accent Cut-out */}
      <path 
        d="M75 35L88 15L65 28" 
        fill="#0F172A" 
      />
    </svg>
  );
};

export default JaguarIcon;
