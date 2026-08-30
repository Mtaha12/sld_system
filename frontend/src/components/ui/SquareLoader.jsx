import React from 'react';
import logoDark from '../../assets/branding/logo/Logo_Dark_No_Bg.png';
import logoLight from '../../assets/branding/logo/Logo_Light_No_Bg.png';

const SquareLoader = ({ 
  size = 'md', 
  text = '', 
  className = '', 
  fullscreen = false,
  minHeight = 'min-h-[260px]'
}) => {
  const sizeMap = {
    sm: { box: 'w-12 h-12', logo: 'w-6 h-6', stroke: 3, rx: 10 },
    md: { box: 'w-20 h-20', logo: 'w-10 h-10', stroke: 3.5, rx: 16 },
    lg: { box: 'w-28 h-28', logo: 'w-14 h-14', stroke: 4, rx: 20 }
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  const content = (
    <div className={`flex flex-col items-center justify-center p-6 animate-fade-in ${className}`}>
      {/* Square Container with Animated Border */}
      <div className={`relative ${currentSize.box} flex items-center justify-center rounded-2xl bg-theme-surface/80 dark:bg-theme-surface/60 shadow-lg border border-theme-border/40 backdrop-blur-sm overflow-hidden`}>
        {/* SVG Border Tracer */}
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none" 
          viewBox="0 0 100 100"
          fill="none"
        >
          {/* Static subtle background track */}
          <rect 
            x="4" 
            y="4" 
            width="92" 
            height="92" 
            rx={currentSize.rx} 
            ry={currentSize.rx} 
            className="stroke-theme-border/40 dark:stroke-theme-border/20" 
            strokeWidth={currentSize.stroke}
          />
          {/* Animated tracing border */}
          <rect 
            x="4" 
            y="4" 
            width="92" 
            height="92" 
            rx={currentSize.rx} 
            ry={currentSize.rx} 
            className="stroke-brand-orange animate-square-dash" 
            strokeWidth={currentSize.stroke}
            strokeDasharray="75 265"
            strokeLinecap="round"
          />
        </svg>

        {/* Centered SLD Logo - Theme Adaptive */}
        {/* Light Mode Logo */}
        <img 
          src={logoLight} 
          alt="SLD Loading" 
          className={`${currentSize.logo} object-contain select-none animate-pulse transition-transform duration-300 drop-shadow-sm dark:hidden`}
        />
        {/* Dark Mode Logo */}
        <img 
          src={logoDark} 
          alt="SLD Loading" 
          className={`${currentSize.logo} object-contain select-none animate-pulse transition-transform duration-300 drop-shadow-sm hidden dark:block`}
        />
      </div>

      {/* Optional Loading Caption */}
      {text && (
        <p className="mt-3.5 text-xs font-semibold text-theme-muted tracking-wide animate-pulse text-center">
          {text}
        </p>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-theme-base/75 dark:bg-theme-base/80 backdrop-blur-md">
        {content}
      </div>
    );
  }

  return (
    <div className={`w-full flex items-center justify-center ${minHeight}`}>
      {content}
    </div>
  );
};

export default SquareLoader;
