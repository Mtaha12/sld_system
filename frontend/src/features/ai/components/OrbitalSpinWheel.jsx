import React, { useState, useMemo } from 'react';
import { 
  Bot, Scale, FileText, Hash, Building2, UserCheck, 
  BookOpen, Layers, Users, Sparkles, Zap
} from 'lucide-react';

/**
 * 8 Law Case Fields Sectors
 * Strictly representing the direct fields of a Case Law in SLD system
 */
const REFERENCE_SECTORS = [
  {
    id: 'case_numbers',
    tag: 'CASE NO.',
    title: 'Appeals & Suits',
    sub: 'Case Number',
    fullDesc: 'Case appeal numbers, writ petitions, references, and revision applications',
    color: '#84CC16', // Lime Green
    gradient: ['#A3E635', '#65A30D'],
    icon: Hash
  },
  {
    id: 'judgments',
    tag: 'JUDGMENT',
    title: 'Verbatim Orders',
    sub: 'Court Orders',
    fullDesc: 'Complete verbatim text of judicial decisions, judgments, and operative orders',
    color: '#F97316', // Vibrant Orange (SLD Brand)
    gradient: ['#FB923C', '#EA580C'],
    icon: FileText
  },
  {
    id: 'judges',
    tag: 'JUDGES',
    title: 'Coram & Bench',
    sub: 'Author Judges',
    fullDesc: 'Presiding judges, division benches, author members, and judicial coram',
    color: '#0284C7', // Deep Sky Blue
    gradient: ['#38BDF8', '#0369A1'],
    icon: UserCheck
  },
  {
    id: 'petitioners',
    tag: 'PETITIONER',
    title: 'Parties & Litigants',
    sub: 'Litigant Parties',
    fullDesc: 'Petitioners, appellants, respondents, and appearing company parties',
    color: '#9333EA', // Royal Purple
    gradient: ['#C084FC', '#7E22CE'],
    icon: Users
  },
  {
    id: 'headnotes',
    tag: 'HEADNOTES',
    title: 'Ratio Decidendi',
    sub: 'Editorial Points',
    fullDesc: 'Key legal headnotes, legal issues framed, and authoritative points of law',
    color: '#EAB308', // Gold / Amber
    gradient: ['#FACC15', '#CA8A04'],
    icon: Scale
  },
  {
    id: 'legal_maxim',
    tag: 'LEGAL MAXIM',
    title: 'Legal Maxims',
    sub: 'Doctrines of Law',
    fullDesc: 'Established legal maxims, Latin legal doctrines, and foundational canons',
    color: '#EC4899', // Magenta / Pink
    gradient: ['#F472B6', '#DB2777'],
    icon: Sparkles
  },
  {
    id: 'principle_law',
    tag: 'PRINCIPLE OF LAW',
    title: 'Core Principles',
    sub: 'Precedent Rules',
    fullDesc: 'Governing legal principles, ratio decidendi, and binding precedents established',
    color: '#10B981', // Emerald Green
    gradient: ['#34D399', '#059669'],
    icon: Layers
  },
  {
    id: 'citations',
    tag: 'CITATION',
    title: 'Law Reports',
    sub: 'SLD, TAX, PTD',
    fullDesc: 'Cross-journal citations across SLD, TAX, PTD, PTCL, PLD, and SCMR',
    color: '#E11D48', // Crimson Red
    gradient: ['#FB7185', '#BE123C'],
    icon: BookOpen
  }
];

const OrbitalSpinWheel = ({
  isSearching = false,
  activeReferences = [],
  focusedNode = null,
  onNodeClick,
  lastMatchedCase = null,
  className = ""
}) => {
  const [hoveredSector, setHoveredSector] = useState(null);

  // Center coordinate and radii for the 800x800 SVG canvas
  const cx = 400;
  const cy = 400;
  
  // High-precision dimensions exactly matching the reference infographic
  const R_BANNER_OUT = 372;
  const R_BANNER_IN = 308;
  const R_CARD_OUT = 298;
  const R_CARD_IN = 188;
  const R_ARROW_TIP = 152;
  const TAB_RADIUS = 20;

  /**
   * Generates the SVG path for the Outer Colored Curved Banner with the circular tab
   */
  const bannerPath = useMemo(() => {
    const halfAngle = 19.5;
    const toRad = deg => (deg * Math.PI) / 180;
    
    // Outer arc endpoints
    const xOut1 = cx + R_BANNER_OUT * Math.cos(toRad(-halfAngle));
    const yOut1 = cy + R_BANNER_OUT * Math.sin(toRad(-halfAngle));
    const xOut2 = cx + R_BANNER_OUT * Math.cos(toRad(halfAngle));
    const yOut2 = cy + R_BANNER_OUT * Math.sin(toRad(halfAngle));

    // Inner arc endpoints
    const xIn2 = cx + R_BANNER_IN * Math.cos(toRad(halfAngle));
    const yIn2 = cy + R_BANNER_IN * Math.sin(toRad(halfAngle));
    const xIn1 = cx + R_BANNER_IN * Math.cos(toRad(-halfAngle));
    const yIn1 = cy + R_BANNER_IN * Math.sin(toRad(-halfAngle));

    // Notch points along the inner edge
    const tabAngle = 4.2;
    const xTabRight = cx + R_BANNER_IN * Math.cos(toRad(tabAngle));
    const yTabRight = cy + R_BANNER_IN * Math.sin(toRad(tabAngle));
    const xTabLeft = cx + R_BANNER_IN * Math.cos(toRad(-tabAngle));
    const yTabLeft = cy + R_BANNER_IN * Math.sin(toRad(-tabAngle));

    return `
      M ${xOut1} ${yOut1}
      A ${R_BANNER_OUT} ${R_BANNER_OUT} 0 0 1 ${xOut2} ${yOut2}
      L ${xIn2} ${yIn2}
      A ${R_BANNER_IN} ${R_BANNER_IN} 0 0 0 ${xTabRight} ${yTabRight}
      A ${TAB_RADIUS} ${TAB_RADIUS} 0 0 1 ${xTabLeft} ${yTabLeft}
      A ${R_BANNER_IN} ${R_BANNER_IN} 0 0 0 ${xIn1} ${yIn1}
      Z
    `;
  }, []);

  /**
   * Generates the SVG path for the White 3D Wedge Card
   * Includes top semicircular cutout notch and bottom triangular arrowhead
   */
  const cardPath = useMemo(() => {
    const halfAngleOut = 18.2;
    const halfAngleIn = 14.8;
    const toRad = deg => (deg * Math.PI) / 180;

    // Outer edge corners
    const xOut1 = cx + R_CARD_OUT * Math.cos(toRad(-halfAngleOut));
    const yOut1 = cy + R_CARD_OUT * Math.sin(toRad(-halfAngleOut));
    const xOut2 = cx + R_CARD_OUT * Math.cos(toRad(halfAngleOut));
    const yOut2 = cy + R_CARD_OUT * Math.sin(toRad(halfAngleOut));

    // Outer notch (semicircular cutout)
    const tabAngle = 4.4;
    const xNotchRight = cx + R_CARD_OUT * Math.cos(toRad(tabAngle));
    const yNotchRight = cy + R_CARD_OUT * Math.sin(toRad(tabAngle));
    const xNotchLeft = cx + R_CARD_OUT * Math.cos(toRad(-tabAngle));
    const yNotchLeft = cy + R_CARD_OUT * Math.sin(toRad(-tabAngle));

    // Inner edge corners
    const xIn2 = cx + R_CARD_IN * Math.cos(toRad(halfAngleIn));
    const yIn2 = cy + R_CARD_IN * Math.sin(toRad(halfAngleIn));
    const xIn1 = cx + R_CARD_IN * Math.cos(toRad(-halfAngleIn));
    const yIn1 = cy + R_CARD_IN * Math.sin(toRad(-halfAngleIn));

    // Inner arrow base points and tip
    const arrowBaseAngle = 4.5;
    const xArrowBaseRight = cx + R_CARD_IN * Math.cos(toRad(arrowBaseAngle));
    const yArrowBaseRight = cy + R_CARD_IN * Math.sin(toRad(arrowBaseAngle));
    const xArrowBaseLeft = cx + R_CARD_IN * Math.cos(toRad(-arrowBaseAngle));
    const yArrowBaseLeft = cy + R_CARD_IN * Math.sin(toRad(-arrowBaseAngle));
    const xArrowTip = cx + R_ARROW_TIP;
    const yArrowTip = cy;

    return `
      M ${xOut1} ${yOut1}
      A ${R_CARD_OUT} ${R_CARD_OUT} 0 0 1 ${xNotchLeft} ${yNotchLeft}
      A ${TAB_RADIUS + 2} ${TAB_RADIUS + 2} 0 0 0 ${xNotchRight} ${yNotchRight}
      A ${R_CARD_OUT} ${R_CARD_OUT} 0 0 1 ${xOut2} ${yOut2}
      L ${xIn2} ${yIn2}
      A ${R_CARD_IN} ${R_CARD_IN} 0 0 0 ${xArrowBaseRight} ${yArrowBaseRight}
      L ${xArrowTip} ${yArrowTip}
      L ${xArrowBaseLeft} ${yArrowBaseLeft}
      A ${R_CARD_IN} ${R_CARD_IN} 0 0 0 ${xIn1} ${yIn1}
      Z
    `;
  }, []);

  /**
   * Generates the SVG hit-target path for each sector (45-degree full wedge).
   * Remains 100% static with pointerEvents="all" to guarantee ZERO hover flicker.
   */
  const hitPath = useMemo(() => {
    const halfAngle = 22.5;
    const toRad = deg => (deg * Math.PI) / 180;
    const rIn = 145;
    const rOut = 385;

    const xOut1 = cx + rOut * Math.cos(toRad(-halfAngle));
    const yOut1 = cy + rOut * Math.sin(toRad(-halfAngle));
    const xOut2 = cx + rOut * Math.cos(toRad(halfAngle));
    const yOut2 = cy + rOut * Math.sin(toRad(halfAngle));

    const xIn2 = cx + rIn * Math.cos(toRad(halfAngle));
    const yIn2 = cy + rIn * Math.sin(toRad(halfAngle));
    const xIn1 = cx + rIn * Math.cos(toRad(-halfAngle));
    const yIn1 = cy + rIn * Math.sin(toRad(-halfAngle));

    return `
      M ${xOut1} ${yOut1}
      A ${rOut} ${rOut} 0 0 1 ${xOut2} ${yOut2}
      L ${xIn2} ${yIn2}
      A ${rIn} ${rIn} 0 0 0 ${xIn1} ${yIn1}
      Z
    `;
  }, []);

  /**
   * Generates the SVG path for the Center 16-tooth Gear / Cogwheel
   */
  const gearPath = useMemo(() => {
    const numTeeth = 16;
    const rRoot = 114;
    const rTip = 138;
    const toRad = deg => (deg * Math.PI) / 180;
    
    let path = '';
    for (let i = 0; i < numTeeth; i++) {
      const step = 360 / numTeeth;
      const a0 = i * step;
      const a1 = a0 + step * 0.22;
      const a2 = a0 + step * 0.50;
      const a3 = a0 + step * 0.72;
      const a4 = a0 + step;

      const p0 = { x: cx + rRoot * Math.cos(toRad(a0)), y: cy + rRoot * Math.sin(toRad(a0)) };
      const p1 = { x: cx + rTip * Math.cos(toRad(a1)), y: cy + rTip * Math.sin(toRad(a1)) };
      const p2 = { x: cx + rTip * Math.cos(toRad(a2)), y: cy + rTip * Math.sin(toRad(a2)) };
      const p3 = { x: cx + rRoot * Math.cos(toRad(a3)), y: cy + rRoot * Math.sin(toRad(a3)) };
      const p4 = { x: cx + rRoot * Math.cos(toRad(a4)), y: cy + rRoot * Math.sin(toRad(a4)) };

      if (i === 0) {
        path += `M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} `;
      }
      path += `L ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} `;
      path += `A ${rTip} ${rTip} 0 0 1 ${p2.x.toFixed(1)} ${p2.y.toFixed(1)} `;
      path += `L ${p3.x.toFixed(1)} ${p3.y.toFixed(1)} `;
      path += `A ${rRoot} ${rRoot} 0 0 1 ${p4.x.toFixed(1)} ${p4.y.toFixed(1)} `;
    }
    return path + 'Z';
  }, []);

  return (
    <div className={`relative flex flex-col items-center justify-center p-1 select-none w-full max-w-[480px] mx-auto ${className}`}>
      
      {/* Top Telemetry Header - No play/pause buttons, completely clean */}
      <div className="w-full flex items-center justify-between px-2 py-1 mb-1 z-20 gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${
            isSearching 
              ? 'bg-brand-orange animate-ping' 
              : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
          }`} />
          <span className="text-[11px] font-black uppercase tracking-wider text-theme-main truncate">
            {isSearching ? 'Scanning 15,000 Cases...' : 'SLD Legal Wheel'}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[9px] font-semibold text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-full border border-brand-orange/20 whitespace-nowrap">
            {isSearching ? 'Active Scan' : '8 Reference Engines'}
          </span>
        </div>
      </div>

      {/* Main SVG Infographic Wheel with GPU-Accelerated CSS Auto-Spin */}
      <div className="relative w-full aspect-square flex items-center justify-center">
        
        {/* Ambient Radial Aura */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className={`w-[85%] h-[85%] rounded-full bg-gradient-to-tr from-brand-orange/20 via-cyan-500/15 to-purple-500/20 blur-3xl transition-opacity duration-700 ${
            isSearching ? 'opacity-90 animate-pulse' : 'opacity-60'
          }`} />
        </div>

        <svg
          viewBox="0 0 800 800"
          className="w-full h-full drop-shadow-xl overflow-visible"
        >
          <defs>
            {/* GPU CSS Keyframe Animations inside SVG */}
            <style>{`
              @keyframes wheelAutoScanSpin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              .wheel-scanning-spin {
                transform-origin: 400px 400px;
                animation: wheelAutoScanSpin 3.2s linear infinite;
                will-change: transform;
              }
              .wheel-idle-settled {
                transform-origin: 400px 400px;
                transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
                will-change: transform;
              }
            `}</style>

            {/* Soft 3D Drop Shadow for Wedge Cards */}
            <filter id="cardShadow" x="-15%" y="-15%" width="130%" height="130%">
              <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#000" floodOpacity="0.20" />
            </filter>

            {/* Elevated Shadow on Hover / Active */}
            <filter id="cardElevatedShadow" x="-25%" y="-25%" width="150%" height="150%">
              <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#f15a24" floodOpacity="0.35" />
            </filter>

            {/* Gear 3D Shadow */}
            <filter id="gearShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.30" />
            </filter>

            {/* Text Path Arc for curved outer banners (radius 342) */}
            <path
              id="bannerTextPath"
              d={`
                M ${cx + 342 * Math.cos((-16 * Math.PI) / 180)} ${cy + 342 * Math.sin((-16 * Math.PI) / 180)}
                A 342 342 0 0 1 ${cx + 342 * Math.cos((16 * Math.PI) / 180)} ${cy + 342 * Math.sin((16 * Math.PI) / 180)}
              `}
            />

            {/* Dynamic Segment Linear Gradients */}
            {REFERENCE_SECTORS.map((sector) => (
              <linearGradient key={`grad-${sector.id}`} id={`grad-${sector.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={sector.gradient[0]} />
                <stop offset="100%" stopColor={sector.gradient[1]} />
              </linearGradient>
            ))}
          </defs>

          {/* Outer Platter / Track Guide Ring */}
          <circle
            cx={cx}
            cy={cy}
            r={388}
            fill="none"
            stroke="currentColor"
            className="text-slate-200 dark:text-slate-800"
            strokeWidth="3"
            strokeDasharray="6 4"
            opacity="0.6"
          />
          <circle
            cx={cx}
            cy={cy}
            r={382}
            fill="none"
            stroke="currentColor"
            className="text-slate-300 dark:text-slate-800"
            strokeWidth="1"
            opacity="0.4"
          />

          {/* 
            ROTATING ASSEMBLY (Contains 8 Sectors)
            Automatically spins via GPU-accelerated CSS when isSearching is true!
            Never hangs, stutters, or uses main-thread JS timers!
          */}
          <g className={isSearching ? "wheel-scanning-spin" : "wheel-idle-settled"}>
            
            {REFERENCE_SECTORS.map((sector, index) => {
              const sectorAngle = index * 45 - 90;
              const isActive = activeReferences.includes(sector.id) || focusedNode === sector.id;
              const isHovered = hoveredSector === sector.id;

              return (
                <g
                  key={sector.id}
                  transform={`rotate(${sectorAngle}, ${cx}, ${cy})`}
                >
                  {/* VISUAL LAYER: pointer-events-none ensures child paths & text never cause mouseleave jitter */}
                  <g className="pointer-events-none">
                    
                    {/* 1. OUTER COLORED CURVED BANNER WITH TAB */}
                    <g>
                      <path
                        d={bannerPath}
                        fill={`url(#grad-${sector.id})`}
                        stroke={isHovered ? "#FFFFFF" : "none"}
                        strokeWidth={isHovered ? "1.5" : "0"}
                        className={`transition-all duration-200 ${
                          isActive ? 'filter drop-shadow-[0_0_12px_rgba(241,90,36,0.6)]' : ''
                        }`}
                        opacity={isHovered || isActive ? 1 : 0.94}
                      />

                      {/* Outer Tag Curved Text */}
                      <text
                        fill="#FFFFFF"
                        fontSize={sector.tag.length > 12 ? "10.5" : sector.tag.length > 9 ? "12" : "13.5"}
                        fontWeight="900"
                        letterSpacing={sector.tag.length > 12 ? "1.2" : "2"}
                        textAnchor="middle"
                        className="select-none tracking-widest drop-shadow-sm font-sans"
                      >
                        <textPath href="#bannerTextPath" startOffset="50%" textAnchor="middle">
                          {sector.tag}
                        </textPath>
                      </text>

                      {/* Accent dot in tab center */}
                      <circle
                        cx={cx + R_BANNER_IN - 10}
                        cy={cy}
                        r={3.5}
                        fill="#FFFFFF"
                        opacity="0.95"
                        className="drop-shadow-sm"
                      />
                    </g>

                    {/* 2. WHITE 3D WEDGE CARD (PLATE) */}
                    <g filter="url(#cardShadow)">
                      {/* Card Body */}
                      <path
                        d={cardPath}
                        className={`transition-colors duration-200 ${
                          isHovered 
                            ? 'fill-amber-50/50 dark:fill-[#252b3b]' 
                            : 'fill-white dark:fill-[#1e222d]'
                        }`}
                        stroke={isActive ? sector.color : isHovered ? sector.color : '#CBD5E1'}
                        strokeWidth={isActive ? '3' : isHovered ? '2.5' : '1'}
                      />

                      {/* Top Bevel Highlight */}
                      <path
                        d={`
                          M ${cx + (R_CARD_OUT - 2) * Math.cos((-16 * Math.PI) / 180)} ${cy + (R_CARD_OUT - 2) * Math.sin((-16 * Math.PI) / 180)}
                          A ${R_CARD_OUT - 2} ${R_CARD_OUT - 2} 0 0 1 ${cx + (R_CARD_OUT - 2) * Math.cos((16 * Math.PI) / 180)} ${cy + (R_CARD_OUT - 2) * Math.sin((16 * Math.PI) / 180)}
                        `}
                        fill="none"
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                        opacity="0.7"
                      />

                      {/* Colored Accent on outer notch rim */}
                      <path
                        d={`
                          M ${cx + (R_CARD_OUT - 1) * Math.cos((-3.5 * Math.PI) / 180)} ${cy + (R_CARD_OUT - 1) * Math.sin((-3.5 * Math.PI) / 180)}
                          A ${TAB_RADIUS + 2} ${TAB_RADIUS + 2} 0 0 0 ${cx + (R_CARD_OUT - 1) * Math.cos((3.5 * Math.PI) / 180)} ${cy + (R_CARD_OUT - 1) * Math.sin((3.5 * Math.PI) / 180)}
                        `}
                        fill="none"
                        stroke={sector.color}
                        strokeWidth="2"
                        opacity="0.85"
                      />

                      {/* CARD CONTENT (Title, Subtitle, and Badge) */}
                      <g transform={`translate(${cx + 242}, ${cy})`}>
                        <g transform="rotate(90)">
                          {/* Title */}
                          <text
                            x="0"
                            y="-10"
                            textAnchor="middle"
                            fill="currentColor"
                            className={`font-bold text-[13px] tracking-tight select-none font-sans transition-colors ${
                              isHovered ? 'text-brand-orange dark:text-brand-orange font-extrabold' : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {sector.title}
                          </text>

                          {/* Subtitle */}
                          <text
                            x="0"
                            y="6"
                            textAnchor="middle"
                            fill="currentColor"
                            className="text-slate-500 dark:text-slate-400 font-medium text-[9.5px] select-none font-sans"
                          >
                            {sector.sub}
                          </text>

                          {/* Status Pill Badge */}
                          <g transform="translate(0, 19)">
                            <rect
                              x="-32"
                              y="-6.5"
                              width="64"
                              height="13"
                              rx="6.5"
                              fill={sector.color}
                              fillOpacity={isActive || isHovered ? "0.95" : "0.15"}
                              stroke={sector.color}
                              strokeWidth="0.8"
                            />
                            <text
                              x="0"
                              y="2.5"
                              textAnchor="middle"
                              fill={isActive || isHovered ? "#FFFFFF" : sector.color}
                              fontSize="8"
                              fontWeight="800"
                              letterSpacing="0.8"
                              className="select-none font-sans"
                            >
                              {isActive ? 'GROUNDED' : isHovered ? 'FILTER' : 'EXPLORE'}
                            </text>
                          </g>
                        </g>
                      </g>

                      {/* Glowing pulse on arrowhead tip when active */}
                      {isActive && (
                        <circle
                          cx={cx + R_ARROW_TIP + 2}
                          cy={cy}
                          r={4}
                          fill={sector.color}
                          className="animate-ping"
                        />
                      )}

                    </g>
                  </g>

                  {/* 3. STATIC HIT TARGET (TOP-MOST TRANSPARENT WEDGE) */}
                  {/* Captures all clicks, mouseEnter, and mouseLeave with zero movement and zero flicker */}
                  <path
                    d={hitPath}
                    fill="transparent"
                    className="cursor-pointer"
                    style={{ pointerEvents: 'all' }}
                    onClick={() => onNodeClick?.(sector.id)}
                    onMouseEnter={() => setHoveredSector(sector.id)}
                    onMouseLeave={() => setHoveredSector(null)}
                  />

                </g>
              );
            })}

          </g>

          {/* 3. CENTRAL MECHANICAL GEAR (COGWHEEL) */}
          <g filter="url(#gearShadow)">
            
            {/* Gear Body with 16 Teeth */}
            <path
              d={gearPath}
              className="fill-slate-100 dark:fill-slate-800 transition-colors"
              stroke="#94A3B8"
              strokeWidth="2"
            />

            {/* Embossed Inner Bevel Ring */}
            <circle
              cx={cx}
              cy={cy}
              r={112}
              className="fill-slate-200/60 dark:fill-slate-900/60 stroke-slate-300 dark:stroke-slate-700"
              strokeWidth="1.5"
            />

            {/* Gear Recessed Hub */}
            <circle
              cx={cx}
              cy={cy}
              r={92}
              className="fill-white dark:fill-[#12141a] stroke-slate-300 dark:stroke-slate-700"
              strokeWidth="2.5"
            />

            {/* Circular Track Text Around Center */}
            <path
              id="gearHubTextTop"
              d={`
                M ${cx - 75} ${cy}
                A 75 75 0 1 1 ${cx + 75} ${cy}
              `}
              fill="none"
            />
            <path
              id="gearHubTextBottom"
              d={`
                M ${cx + 75} ${cy}
                A 75 75 0 0 1 ${cx - 75} ${cy}
              `}
              fill="none"
            />

            <text
              fill="#F97316"
              fontSize="8.5"
              fontWeight="900"
              letterSpacing="1.5"
              className="select-none font-sans"
            >
              <textPath href="#gearHubTextTop" startOffset="50%" textAnchor="middle">
                ✦ SLD NEURAL AI CORE ✦
              </textPath>
            </text>

            <text
              fill="#64748B"
              fontSize="7.5"
              fontWeight="800"
              letterSpacing="1.2"
              className="select-none font-sans"
            >
              <textPath href="#gearHubTextBottom" startOffset="50%" textAnchor="middle">
                15,000 CASES GROUNDED
              </textPath>
            </text>

            {/* Center AI Bot Core Circle */}
            <circle
              cx={cx}
              cy={cy}
              r={58}
              fill="#101217"
              stroke="#F97316"
              strokeWidth="2.5"
            />

            {/* Glowing Aura Ring in Bot Core */}
            <circle
              cx={cx}
              cy={cy}
              r={52}
              fill="none"
              stroke="#F97316"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              className={isSearching ? "animate-spin" : ""}
              style={{ animationDuration: '6s' }}
              opacity="0.8"
            />

          </g>

          {/* Interactive AI Bot Icon & Status inside Center Hub */}
          <foreignObject
            x={cx - 45}
            y={cy - 45}
            width={90}
            height={90}
            className="pointer-events-none"
          >
            <div className="w-full h-full flex flex-col items-center justify-center text-white">
              <div className="relative">
                {isSearching ? (
                  <Zap className="w-7 h-7 text-brand-orange animate-bounce drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                ) : (
                  <Bot className="w-7 h-7 text-brand-orange drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
                )}
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider text-white mt-0.5">
                AI BOT
              </span>
              <span className="text-[7.5px] font-bold text-cyan-400 leading-none">
                {isSearching ? 'SCANNING' : 'ONLINE'}
              </span>
            </div>
          </foreignObject>

        </svg>

      </div>

      {/* Dynamic Hover Tooltip / Detail Card with Fixed Height Container (Prevents Layout Shifts & Flickering) */}
      <div className="mt-2 w-full h-[52px] flex items-center justify-center shrink-0">
        {hoveredSector ? (
          (() => {
            const sec = REFERENCE_SECTORS.find(s => s.id === hoveredSector);
            if (!sec) return null;
            const Icon = sec.icon;
            return (
              <div className="w-full h-full px-3.5 py-1.5 bg-white dark:bg-theme-surface border border-theme-border rounded-xl shadow-md flex items-center gap-3 animate-fade-in">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm"
                  style={{ backgroundColor: sec.color }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-theme-main">
                      {sec.tag}: {sec.title}
                    </span>
                    <span className="text-[10px] font-semibold text-brand-orange">
                      Click to query
                    </span>
                  </div>
                  <p className="text-[11px] text-theme-muted truncate">
                    {sec.fullDesc}
                  </p>
                </div>
              </div>
            );
          })()
        ) : lastMatchedCase ? (
          <div className="w-full h-full px-3.5 py-1.5 bg-brand-orange/10 border border-brand-orange/30 rounded-xl shadow-sm flex items-center justify-between gap-2 text-xs animate-fade-in">
            <div className="flex items-center gap-2 truncate">
              <Sparkles className="w-3.5 h-3.5 text-brand-orange shrink-0" />
              <span className="text-[11px] text-theme-main font-semibold truncate">
                Active Grounding: <strong>SLD #{lastMatchedCase.sldNumber || lastMatchedCase.id}</strong> ({lastMatchedCase.court})
              </span>
            </div>
            <span className="text-[10px] font-bold text-brand-orange bg-brand-orange/20 px-2 py-0.5 rounded-full shrink-0">
              100% Grounded
            </span>
          </div>
        ) : (
          <div className="w-full h-full px-3.5 py-1.5 bg-theme-surface-alt/40 border border-theme-border/60 rounded-xl flex items-center justify-between gap-2 text-xs text-theme-muted">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
              <span className="text-[11px]">8 Direct Case Law Fields Active</span>
            </div>
            <span className="text-[10px] text-brand-orange font-semibold">Hover to inspect</span>
          </div>
        )}
      </div>

    </div>
  );
};

export default OrbitalSpinWheel;
