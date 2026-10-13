import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, ArrowUpRight } from 'lucide-react';

const FloatingAiWatermark = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isHovered, setIsHovered] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const hasMovedRef = useRef(false);

  // If already on the full AI assistant page, display as watermark badge without redirect loop
  const isAIPage = location.pathname === '/ai-assistant';

  // Smooth dynamic scroll motion: ensures the floating button constantly moves with the user's scroll
  useEffect(() => {
    let ticking = false;
    let lastScrollY = window.scrollY || 0;

    const onScroll = (e) => {
      const target = e?.target;
      let currentScrollY = 0;
      if (target && target.scrollTop !== undefined) {
        currentScrollY = target.scrollTop;
      } else {
        currentScrollY = window.scrollY || document.documentElement.scrollTop || 0;
      }

      if (!ticking) {
        window.requestAnimationFrame(() => {
          const delta = currentScrollY - lastScrollY;
          // Calculate fluid scroll-travel offset:
          // Moves with the page scroll so it never sticks rigidly in one place
          const wave = Math.sin(currentScrollY * 0.015) * 20;
          const velocityKick = Math.max(-32, Math.min(32, delta * 1.6));
          setScrollOffset(wave - velocityKick);
          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true });
      document.removeEventListener('scroll', onScroll, { capture: true });
      if (mainEl) mainEl.removeEventListener('scroll', onScroll);
    };
  }, []);

  // Dragging support: allows user to freely relocate the button anywhere on their screen
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: dragPos.x,
      posY: dragPos.y
    };

    const onMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - dragStartRef.current.x;
      const dy = moveEvent.clientY - dragStartRef.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMovedRef.current = true;
      }
      setDragPos({
        x: dragStartRef.current.posX + dx,
        y: dragStartRef.current.posY + dy
      });
    };

    const onMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleClick = (e) => {
    if (hasMovedRef.current) {
      e.stopPropagation();
      return;
    }
    if (!isAIPage) {
      navigate('/ai-assistant');
    }
  };

  return (
    <>
      <style>{`
        @keyframes slowAttractBounce {
          0%, 70%, 100% {
            transform: translateY(0) scale(1);
          }
          75% {
            transform: translateY(-14px) scale(1.07);
          }
          82% {
            transform: translateY(0) scale(0.97);
          }
          88% {
            transform: translateY(-7px) scale(1.03);
          }
          93% {
            transform: translateY(0) scale(1);
          }
        }
        .ai-widget-bounce {
          animation: slowAttractBounce 5s cubic-bezier(0.28, 0.84, 0.42, 1) infinite;
        }
      `}</style>
      <aside 
        aria-label="AI Search Watermark"
        className="fixed z-40 print:hidden select-none pointer-events-auto transition-transform duration-300 ease-out"
        style={{
          bottom: '20px',
          right: '20px',
          transform: `translate3d(${dragPos.x}px, ${dragPos.y + scrollOffset}px, 0)`,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleMouseDown}
      >
        <div 
          className="relative group flex items-center justify-end cursor-pointer ai-widget-bounce"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handleClick}
        >
          {/* Hover Pill Tooltip */}
          <div 
            className={`absolute right-16 top-1/2 -translate-y-1/2 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950/90 text-cyan-300 border border-cyan-500/40 shadow-xl backdrop-blur-md transition-all duration-300 whitespace-nowrap text-xs font-semibold tracking-wide pointer-events-none ${
              isHovered && !isDragging ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-3'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>AI Q Search • All in One</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />
          </div>

          {/* Ambient Pulsing Glow Effect */}
          <div className="absolute inset-0 rounded-full bg-cyan-500/25 blur-lg group-hover:bg-cyan-400/45 transition-all duration-500 animate-pulse" />

          {/* Outer Circular Emblem Housing */}
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0.5 bg-gradient-to-tr from-cyan-600 via-blue-500 to-indigo-600 shadow-[0_0_20px_rgba(6,182,212,0.45)] group-hover:shadow-[0_0_28px_rgba(6,182,212,0.7)] group-hover:scale-108 transition-all duration-300 ease-out">
            <div className="w-full h-full rounded-full overflow-hidden bg-black flex items-center justify-center p-0.5 border border-cyan-400/50">
              <img 
                src="/ai-q-search-logo.png" 
                alt="AI Q Search All in One Logo" 
                className="w-full h-full object-contain rounded-full group-hover:rotate-3 transition-transform duration-300 pointer-events-none"
                loading="eager"
                draggable="false"
              />
            </div>

            {/* Active Online Indicator Dot */}
            <span className="absolute top-0.5 right-0.5 flex h-3.5 w-3.5 pointer-events-none">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-500 border-2 border-slate-950" />
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default FloatingAiWatermark;
