import React, { useState, useMemo } from 'react';
import {
  Scale, FileText, Hash, Building2,
  BookOpen, Sparkles, Bell, Gavel, Landmark
} from 'lucide-react';

/**
 * 8 Reference Engines Sectors
 * Exact 1-to-1 match with the reference infographic:
 * 1. CITATIONS (Top / 12 o'clock)
 * 2. CASE NUMBERS (Top-Right / 1:30)
 * 3. TEXT SEARCH (Right / 3 o'clock)
 * 4. NOTIFICATIONS (Bottom-Right / 4:30)
 * 5. FBR & SECP (Bottom / 6 o'clock)
 * 6. STATUTES (Bottom-Left / 7:30)
 * 7. TRIBUNAL, FTO (Left / 9 o'clock)
 * 8. PRA,SRB,KPRA,BRA (Top-Left / 10:30)
 */
const REFERENCE_SECTORS = [
  {
    id: 'citations',
    tag: 'CITATIONS',
    title: 'CITATIONS',
    sub: 'Year + Mag + Page',
    badge: 'JOURNALS',
    fullDesc: 'Law journal citations across SLD, TAX, PTD, PTCL, PLD, and SCMR',
    color: '#E11D48', // Crimson Red
    gradient: ['#FB7185', '#BE123C'],
    badgeBg: '#FFE4E6',
    badgeText: '#BE123C',
    badgeBorder: '#FDA4AF',
    icon: BookOpen
  },
  {
    id: 'case_numbers',
    tag: 'CASE NUMBERS',
    title: 'CASE NUMBERS',
    sub: 'ITA, STRA, W.P',
    badge: 'JUDGMENTS',
    fullDesc: 'Appeals, references, writ petitions, and case numbers',
    color: '#16A34A', // Vibrant Green
    gradient: ['#4ADE80', '#15803D'],
    badgeBg: '#DCFCE7',
    badgeText: '#15803D',
    badgeBorder: '#86EFAC',
    icon: Hash
  },
  {
    id: 'text_search',
    tag: 'TEXT SEARCH',
    title: 'TEXT SEARCH',
    sub: 'Get/sec details',
    badge: 'JUDGMENTS',
    fullDesc: 'Full verbatim text search across judgments, headnotes and section details',
    color: '#F97316', // Orange
    gradient: ['#FB923C', '#C2410C'],
    badgeBg: '#FFEDD5',
    badgeText: '#C2410C',
    badgeBorder: '#FDBA74',
    icon: FileText
  },
  {
    id: 'notifications',
    tag: 'NOTIFICATIONS',
    title: 'NOTIFICATIONS',
    sub: 'Number & Year',
    badge: 'PROV. & FED',
    fullDesc: 'Official notifications, gazettes, SROs and statutory alerts',
    color: '#0284C7', // Sky Blue
    gradient: ['#38BDF8', '#0369A1'],
    badgeBg: '#E0F2FE',
    badgeText: '#0369A1',
    badgeBorder: '#7DD3FC',
    icon: Bell
  },
  {
    id: 'fbr_secp',
    tag: 'FBR & SECP',
    title: 'FBR & SECP',
    sub: 'All Govt. Departments',
    badge: 'FEDERAL',
    fullDesc: 'FBR circulars, SECP orders and regulatory decisions',
    color: '#8B5CF6', // Purple / Violet
    gradient: ['#A78BFA', '#6D28D9'],
    badgeBg: '#7C3AED',
    badgeText: '#FFFFFF',
    badgeBorder: '#7C3AED',
    icon: Building2
  },
  {
    id: 'statutes',
    tag: 'STATUTES',
    title: 'STATUTES',
    sub: 'Updated Acts & Section',
    badge: 'PROV. & FED',
    fullDesc: 'Federal and provincial acts, ordinances, rules and sections',
    color: '#0D9488', // Teal
    gradient: ['#2DD4BF', '#0F766E'],
    badgeBg: '#CCFBF1',
    badgeText: '#0F766E',
    badgeBorder: '#5EEAD4',
    icon: Scale
  },
  {
    id: 'tribunal_fto',
    tag: 'Tri.,Fto,Hc,SC,FCCP',
    title: 'Tri.,Fto,Hc,SC,FCCP',
    sub: 'Search From All Courts/Fto',
    badge: 'ORDER',
    fullDesc: 'Decisions and orders from Appellate Tribunal Inland Revenue, Customs, High Courts, Supreme Court & FCCP',
    color: '#EAB308', // Amber / Gold
    gradient: ['#FBBF24', '#B45309'],
    badgeBg: '#FEF3C7',
    badgeText: '#B45309',
    badgeBorder: '#FCD34D',
    icon: Gavel
  },
  {
    id: 'pra_srb',
    tag: 'PRA,SRB,KPRA,BRA',
    title: 'PRA,SRB,KPRA,BRA',
    sub: 'Search From All Govt. Dept.',
    badge: 'SRO',
    fullDesc: 'Provincial revenue authorities circulars, orders, and SROs',
    color: '#EC4899', // Pink / Magenta
    gradient: ['#F472B6', '#BE185D'],
    badgeBg: '#FCE7F3',
    badgeText: '#BE185D',
    badgeBorder: '#F9A8D4',
    icon: Landmark
  }
];

/**
 * Intelligently detect which of the 8 reference sectors extracted the case law
 */
const detectMatchingSector = (matchedCase, matchType) => {
  if (!matchedCase) return null;

  const court = String(matchedCase.court || '').toLowerCase();
  const caseNums = Array.isArray(matchedCase.caseNumber)
    ? matchedCase.caseNumber.join(' ').toLowerCase()
    : String(matchedCase.caseNumber || '').toLowerCase();
  const citations = Array.isArray(matchedCase.mapYearPage)
    ? matchedCase.mapYearPage.join(' ').toLowerCase()
    : String(matchedCase.mapYearPage || '').toLowerCase();
  const principle = String(matchedCase.principleLaw || '').toLowerCase();

  // 1. Tribunal / FTO / Ombudsman (e.g. Appellate Tribunal Inland Revenue, Customs Tribunal, FTO)
  if (
    court.includes('tribunal') ||
    court.includes('fto') ||
    court.includes('ombudsman') ||
    court.includes('atir') ||
    (court.includes('inland revenue') && court.includes('appellate')) ||
    court.includes('labour appellate')
  ) {
    return 'tribunal_fto';
  }

  // 2. Provincial Revenue Authorities (PRA, SRB, KPRA, BRA)
  if (
    court.includes('pra') ||
    court.includes('srb') ||
    court.includes('kpra') ||
    court.includes('bra') ||
    court.includes('punjab revenue') ||
    court.includes('sindh revenue') ||
    court.includes('kpk revenue') ||
    court.includes('khyber pakhtunkhwa') ||
    court.includes('balochistan revenue')
  ) {
    return 'pra_srb';
  }

  // 3. FBR & SECP
  if (
    court.includes('fbr') ||
    court.includes('secp') ||
    court.includes('federal board of revenue') ||
    court.includes('circular') ||
    court.includes('general order')
  ) {
    return 'fbr_secp';
  }

  // 4. Notifications & SROs
  if (
    court.includes('sro') ||
    court.includes('notification') ||
    court.includes('gazette') ||
    caseNums.includes('s.r.o') ||
    caseNums.includes('sro') ||
    caseNums.includes('notification')
  ) {
    return 'notifications';
  }

  // 5. Explicit matchType / statutory classification
  if (matchType === 'statute' || principle.includes('section') || principle.includes('ordinance')) {
    return 'statutes';
  }

  if (matchType === 'case_number') {
    return 'case_numbers';
  }

  if (matchType === 'citation' || citations.length > 0) {
    return 'citations';
  }

  if (matchType === 'exact_line' || matchType === 'text_search') {
    return 'text_search';
  }

  // Fallbacks:
  if (citations.length > 0) return 'citations';
  if (caseNums.length > 0) return 'case_numbers';
  return 'tribunal_fto';
};

/**
 * Returns the exact forum / court / institution name where the result was extracted
 */
const getExactSourceName = (matchedCase, fallbackSector) => {
  if (matchedCase) {
    if (matchedCase.court && matchedCase.court.trim()) {
      return matchedCase.court.trim();
    }
    if (matchedCase.mapYearPage && matchedCase.mapYearPage.length > 0) {
      return matchedCase.mapYearPage[0];
    }
    if (matchedCase.caseNumber && matchedCase.caseNumber.length > 0) {
      return matchedCase.caseNumber[0];
    }
  }
  return fallbackSector?.tag || 'Appellate Tribunal Inland Revenue';
};

/**
 * Formats the right-side category badge (e.g. TRIBUNAL, HIGH COURT, APEX COURT, PROVINCIAL)
 */
const getSourceCategoryTag = (courtName, sectorId) => {
  const c = String(courtName || '').toLowerCase();
  if (c.includes('supreme court')) return 'APEX COURT';
  if (c.includes('high court')) return 'HIGH COURT';
  if (c.includes('tribunal') || c.includes('fto') || c.includes('ombudsman')) return 'TRIBUNAL';
  if (c.includes('srb') || c.includes('pra') || c.includes('kpra') || c.includes('bra')) return 'PROVINCIAL';
  if (c.includes('fbr') || c.includes('secp')) return 'FEDERAL';

  const tagMap = {
    citations: 'JOURNAL',
    case_numbers: 'CASE RECORD',
    text_search: 'JUDGMENT TEXT',
    notifications: 'GAZETTE / SRO',
    fbr_secp: 'FEDERAL',
    statutes: 'STATUTE',
    tribunal_fto: 'TRIBUNAL',
    pra_srb: 'PROVINCIAL'
  };
  return tagMap[sectorId] || 'FIELD';
};

const OrbitalSpinWheel = ({
  isSearching = false,
  activeReferences = [],
  focusedNode = null,
  onNodeClick,
  lastMatchedCase = null,
  matchType = null,
  className = ""
}) => {
  const [hoveredSector, setHoveredSector] = useState(null);

  // Intelligently identify which sector extracted this result
  const extractedSectorId = useMemo(() => {
    return detectMatchingSector(lastMatchedCase, matchType);
  }, [lastMatchedCase, matchType]);

  // Determine currently active or displayed sector for center hub & detail card
  const displayedSector = useMemo(() => {
    if (hoveredSector) {
      return REFERENCE_SECTORS.find(s => s.id === hoveredSector) || REFERENCE_SECTORS[0];
    }
    if (focusedNode) {
      return REFERENCE_SECTORS.find(s => s.id === focusedNode) || REFERENCE_SECTORS[0];
    }
    if (extractedSectorId) {
      return REFERENCE_SECTORS.find(s => s.id === extractedSectorId) || REFERENCE_SECTORS[0];
    }
    return REFERENCE_SECTORS.find(s => s.id === 'tribunal_fto') || REFERENCE_SECTORS[0];
  }, [hoveredSector, focusedNode, extractedSectorId]);

  // Exact name where the result was extracted
  const exactSourceName = useMemo(() => {
    return getExactSourceName(lastMatchedCase, displayedSector);
  }, [lastMatchedCase, displayedSector]);

  // Category classification for the result
  const sourceCategoryTag = useMemo(() => {
    return getSourceCategoryTag(lastMatchedCase?.court || exactSourceName, displayedSector.id);
  }, [lastMatchedCase, exactSourceName, displayedSector]);

  const DisplayedIcon = displayedSector.icon;

  // Center coordinate and radii for the 800x800 SVG canvas
  const cx = 400;
  const cy = 400;

  // Dimensions matching the reference infographic
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
    <div className={`relative flex flex-col items-center justify-start select-none w-full max-w-[500px] mx-auto gap-3 ${className}`}>

      {/* 1. TOP HEADER: Matching Reference Image (● SLD LEGAL WHEEL  |  8 Reference Engines) */}
      <div className="w-full flex items-center justify-between px-1 py-1 z-20 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] shrink-0" />
          <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 truncate">
            SLD LEGAL WHEEL
          </span>
        </div>

        <span className="text-[11px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-3 py-0.5 rounded-full border border-rose-200/80 dark:border-rose-900/60 whitespace-nowrap">
          8 Reference Engines
        </span>
      </div>

      {/* 2. MAIN SVG INFOGRAPHIC WHEEL */}
      <div className="relative w-full aspect-square flex items-center justify-center">

        {/* Subtle Ambient Radial Aura */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className={`w-[85%] h-[85%] rounded-full bg-gradient-to-tr from-brand-orange/15 via-cyan-500/10 to-purple-500/15 blur-3xl transition-opacity duration-700 ${isSearching ? 'opacity-90 animate-pulse' : 'opacity-40'
            }`} />
        </div>

        <svg
          viewBox="0 0 800 800"
          className="w-full h-full drop-shadow-lg overflow-visible"
        >
          <defs>
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
              <feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="#000" floodOpacity="0.18" />
            </filter>

            {/* Radiant Glowing Halos for Active/Extracted Sector */}
            <filter id="activeSectorGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="7" floodColor="#FFFFFF" floodOpacity="0.9" />
              <feDropShadow dx="0" dy="0" stdDeviation="14" floodColor="#F59E0B" floodOpacity="0.5" />
            </filter>

            {/* Deep 3D Shadow for Highlighted Card */}
            <filter id="cardActiveShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="6" stdDeviation="9" floodColor="#000" floodOpacity="0.3" />
              <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#F59E0B" floodOpacity="0.4" />
            </filter>

            {/* Gear 3D Shadow */}
            <filter id="gearShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.25" />
            </filter>

            {/* Text Path Arc for curved outer banners (radius 340) */}
            <path
              id="bannerTextPath"
              d={`
                M ${cx + 340 * Math.cos((-17 * Math.PI) / 180)} ${cy + 340 * Math.sin((-17 * Math.PI) / 180)}
                A 340 340 0 0 1 ${cx + 340 * Math.cos((17 * Math.PI) / 180)} ${cy + 340 * Math.sin((17 * Math.PI) / 180)}
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
            opacity="0.5"
          />
          <circle
            cx={cx}
            cy={cy}
            r={382}
            fill="none"
            stroke="currentColor"
            className="text-slate-300 dark:text-slate-800"
            strokeWidth="1"
            opacity="0.3"
          />

          {/* ROTATING ASSEMBLY (8 SECTORS) */}
          <g className={isSearching ? "wheel-scanning-spin" : "wheel-idle-settled"}>

            {REFERENCE_SECTORS.map((sector, index) => {
              const sectorAngle = index * 45 - 90;
              const isExtracted = sector.id === extractedSectorId;
              const isFocused = sector.id === focusedNode;
              const isHovered = hoveredSector === sector.id;
              const isActive = isExtracted || isFocused;
              const isHighlighted = isActive || isHovered;

              return (
                <g
                  key={sector.id}
                  transform={`rotate(${sectorAngle}, ${cx}, ${cy})`}
                >
                  {/* VISUAL LAYER */}
                  <g className="pointer-events-none">

                    {/* 1. OUTER COLORED CURVED BANNER WITH TAB */}
                    <g>
                      <path
                        d={bannerPath}
                        fill={`url(#grad-${sector.id})`}
                        stroke={isExtracted ? "#FFFFFF" : isHovered ? "#FFFFFF" : "none"}
                        strokeWidth={isExtracted ? "2.5" : isHovered ? "1.5" : "0"}
                        filter={isExtracted ? "url(#activeSectorGlow)" : "none"}
                        className={`transition-all duration-300 ${isExtracted ? 'filter drop-shadow-[0_0_14px_rgba(255,255,255,0.9)]' : ''
                          }`}
                        opacity={isHighlighted ? 1 : 0.94}
                      />

                      {/* Outer Tag Curved Text */}
                      <text
                        fill="#FFFFFF"
                        fontSize={
                          sector.id === 'tribunal_fto' ? "13" :
                            sector.tag === 'PRA,SRB,KPRA,BRA' ? "14.5" :
                              sector.tag.length > 9 ? "17" : "19"
                        }
                        fontWeight="900"
                        letterSpacing={
                          sector.id === 'tribunal_fto' ? "0.6" :
                            sector.tag === 'PRA,SRB,KPRA,BRA' ? "1.0" :
                              sector.tag.length > 9 ? "1.5" : "2.2"
                        }
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
                        r={isExtracted ? 4.5 : 3.5}
                        fill="#FFFFFF"
                        opacity={isExtracted ? 1 : 0.95}
                        className={isExtracted ? "animate-pulse drop-shadow-md" : "drop-shadow-sm"}
                      />
                    </g>

                    {/* 2. WHITE 3D WEDGE CARD */}
                    <g filter={isExtracted ? "url(#cardActiveShadow)" : "url(#cardShadow)"}>
                      {/* Card Body */}
                      <path
                        d={cardPath}
                        className={`transition-all duration-300 ${isExtracted
                            ? 'fill-amber-50/70 dark:fill-[#252b3b]'
                            : isHovered
                              ? 'fill-amber-50/40 dark:fill-[#252b3b]'
                              : 'fill-white dark:fill-[#1e222d]'
                          }`}
                        stroke={isExtracted ? sector.color : isHovered ? sector.color : '#CBD5E1'}
                        strokeWidth={isExtracted ? '3.5' : isHovered ? '2.5' : '1'}
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

                      {/* CARD CONTENT (Subtitle and Badge Pill - Title removed as requested) */}
                      <g transform={`translate(${cx + 242}, ${cy})`}>
                        <g transform="rotate(90)">
                          {/* Subtitle */}
                          <text
                            x="0"
                            y="-6"
                            textAnchor="middle"
                            fontSize={sector.sub.length > 20 ? "9.5" : "11"}
                            fontWeight="800"
                            className="fill-slate-700 dark:fill-slate-200 select-none font-sans"
                          >
                            {sector.sub}
                          </text>

                          {/* Pill Badge matching reference */}
                          <g transform="translate(0, 16)">
                            <rect
                              x="-36"
                              y="-8.5"
                              width="72"
                              height="17"
                              rx="8.5"
                              fill={sector.badgeBg}
                              stroke={sector.badgeBorder}
                              strokeWidth="1"
                            />
                            <text
                              x="0"
                              y="3.5"
                              textAnchor="middle"
                              fill={sector.badgeText}
                              fontSize="9.5"
                              fontWeight="900"
                              letterSpacing="0.6"
                              className="select-none font-sans"
                            >
                              {sector.badge}
                            </text>
                          </g>
                        </g>
                      </g>

                      {/* Pulsing indicator on arrow tip when active or extracted */}
                      {isActive && (
                        <>
                          <circle
                            cx={cx + R_ARROW_TIP + 2}
                            cy={cy}
                            r={7}
                            fill={sector.color}
                            className="animate-ping"
                            opacity="0.8"
                          />
                          <circle
                            cx={cx + R_ARROW_TIP + 2}
                            cy={cy}
                            r={4.5}
                            fill={sector.color}
                            stroke="#FFFFFF"
                            strokeWidth="1.5"
                          />
                        </>
                      )}

                    </g>
                  </g>

                  {/* 3. STATIC HIT TARGET (TOP-MOST TRANSPARENT WEDGE) */}
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

            {/* Top Arc Text: ✦ SLD "All in One Search" ✦ */}
            <text
              fill="#F97316"
              fontSize="10"
              fontWeight="900"
              letterSpacing="1.2"
              className="select-none font-sans"
            >
              <textPath href="#gearHubTextTop" startOffset="50%" textAnchor="middle">
                ✦ SLD "All in One Search" ✦
              </textPath>
            </text>

            {/* Bottom Arc Text: 162,865+ CASES GROUNDED */}
            <text
              fill="#475569"
              fontSize="9"
              fontWeight="800"
              letterSpacing="1.5"
              className="select-none font-sans"
            >
              <textPath href="#gearHubTextBottom" startOffset="50%" textAnchor="middle">
                162,865+ CASES GROUNDED
              </textPath>
            </text>

            {/* Center Dark Circle Hub */}
            <circle
              cx={cx}
              cy={cy}
              r={58}
              fill="#13151B"
              stroke="#F59E0B"
              strokeWidth="2"
            />

            {/* Subtle inner decorative ring */}
            <circle
              cx={cx}
              cy={cy}
              r={52}
              fill="none"
              stroke="#F59E0B"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.6"
            />

          </g>

          {/* Interactive Center Hub Display */}
          <foreignObject
            x={cx - 50}
            y={cy - 50}
            width={100}
            height={100}
            className="cursor-pointer"
            onClick={() => onNodeClick?.(displayedSector.id)}
          >
            <div className="w-full h-full flex flex-col items-center justify-center text-center px-1">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white mb-0.5 shadow-sm"
                style={{ backgroundColor: displayedSector.color }}
              >
                <DisplayedIcon className="w-4 h-4" />
              </div>
              <span
                className="text-[9px] font-black tracking-tight truncate max-w-[88px] leading-tight"
                style={{ color: '#A78BFA' }}
              >
                {displayedSector.title}
              </span>
              <span className="text-[7.5px] font-black uppercase tracking-widest text-amber-400 mt-0.5">
                TAP TO QUERY
              </span>
            </div>
          </foreignObject>

        </svg>

      </div>

      {/* 3. THREE STACKED CARDS DIRECTLY BELOW THE WHEEL (SYNCHRONIZED WITH GROUNDED PRECEDENT) */}
      <div className="w-full flex flex-col gap-2 z-20 shrink-0">

        {/* CARD 1: Case Court / Citation — SLD # | 100% Grounded */}
        <div className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700/60 bg-emerald-50/40 dark:bg-slate-900 shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 animate-pulse" />
            <span className="text-xs sm:text-[13px] font-black text-slate-800 dark:text-slate-100 truncate">
              {lastMatchedCase
                ? `${lastMatchedCase.court || 'Court of Record'} — SLD #${lastMatchedCase.sldNumber || ''}`
                : 'Appellate Tribunal Inland Revenue — SLD Precedents'}
            </span>
          </div>
          <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 px-2.5 py-0.5 rounded-full shrink-0">
            100% Grounded
          </span>
        </div>

        {/* CARD 2: Result from [EXACT NAME OF EXTRACTED FORUM / TRIBUNAL / STATUTE] | FORUM CATEGORY */}
        <div className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 animate-ping"
              style={{ backgroundColor: displayedSector.color }}
            />
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 -ml-5"
              style={{ backgroundColor: displayedSector.color }}
            />
            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate">
              Result from <strong className="uppercase font-black" style={{ color: displayedSector.color }}>{exactSourceName}</strong>
            </span>
          </div>
          <span
            className="text-[10px] font-black tracking-wider uppercase shrink-0 px-2 py-0.5 rounded border"
            style={{
              color: displayedSector.color,
              borderColor: `${displayedSector.color}40`,
              backgroundColor: `${displayedSector.color}15`
            }}
          >
            {sourceCategoryTag}
          </span>
        </div>

        {/* CARD 3: Sector Detail Card (Interactive Deep Dive / Query Trigger) */}
        <div
          onClick={() => onNodeClick?.(displayedSector.id)}
          className="w-full flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border-2 bg-white dark:bg-slate-900 shadow-sm cursor-pointer hover:shadow-md transition-all gap-2.5"
          style={{ borderColor: `${displayedSector.color}60` }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md shrink-0 transition-transform"
              style={{
                background: `linear-gradient(135deg, ${displayedSector.gradient[0]}, ${displayedSector.gradient[1]})`
              }}
            >
              <DisplayedIcon className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <h4
                className="text-xs sm:text-[13px] font-black truncate leading-tight"
                style={{ color: displayedSector.color }}
              >
                {displayedSector.title}
              </h4>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium truncate">
                {displayedSector.sub}
              </p>
              <p className="text-[11px] text-slate-800 dark:text-slate-200 font-bold truncate mt-0.5">
                {displayedSector.fullDesc}
              </p>
            </div>
          </div>

          <span
            className="text-[10px] font-black uppercase tracking-wider text-white px-2.5 py-1.5 rounded-lg shrink-0 shadow-xs"
            style={{ backgroundColor: displayedSector.badgeText === '#FFFFFF' ? displayedSector.badgeBg : displayedSector.color }}
          >
            {displayedSector.badge}
          </span>
        </div>

      </div>

    </div>
  );
};

export default OrbitalSpinWheel;
