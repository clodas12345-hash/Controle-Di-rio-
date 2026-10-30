import React, { useState } from 'react';
import appLogo from '../assets/logo.png';

interface GkdMobilityLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'hero';
  rounded?: boolean;
}

export const GkdMobilityLogo: React.FC<GkdMobilityLogoProps> = ({ 
  className = '', 
  size = 'md',
  rounded = true
}) => {
  const [imgError, setImgError] = useState(false);

  const dimensions = {
    xs: 'w-7 h-7',
    sm: 'w-9 h-9',
    md: 'w-11 h-11',
    lg: 'w-16 h-16',
    hero: 'w-28 h-28'
  }[size];

  return (
    <div className={`relative inline-flex items-center justify-center select-none overflow-hidden bg-white shadow-md border border-zinc-300 ${rounded ? 'rounded-xl' : ''} ${dimensions} ${className}`}>
      {!imgError ? (
        <img
          src={appLogo}
          alt="GKD Mobility - Controle Diário"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-contain p-0.5 transition-transform duration-200 hover:scale-105"
        />
      ) : (
        <div className="w-full h-full bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400 font-black text-xs">
          GKD
        </div>
      )}
    </div>
  );
};
