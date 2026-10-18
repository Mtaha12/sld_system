import { useState, useEffect, useRef } from 'react';
import { Scale, Bell, Book, Landmark, ChevronLeft, ChevronRight, Circle } from 'lucide-react';
import { caseService } from '../../cases/services/caseService';
import { statuteService } from '../../statutes/services/statuteService';
import { notificationService } from '../../notifications/services/notificationService';
import { dictionaryService } from '../../dictionary/services/dictionaryService';
import { taxCardService } from '../../tax-cards/services/taxCardService';

// Import local assets
import oldLawBook from '../../../assets/branding/dashboard/old_law_book.png';
import fbrSecp from '../../../assets/branding/dashboard/fbr_secp.png';
import judgeHammer from '../../../assets/branding/dashboard/Judge_hammer_with_law_book.png';

const fallbackCards = [
  {
    id: 'case_laws',
    title: 'Case Laws',
    count: '393,870',
    icon: Scale,
    image: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=400',
    link: '/cases/view/165278',
    items: [
      { text: '2026 SLD 4312 Peshawar High Court (2026 CLC 1052)', link: '/cases/view/165278' },
      { text: '2026 SLD 4311 Sindh High Court, Sukkur Bench', link: '/cases/view/165277' },
      { text: '2026 SLD 4310 Lahore High Court, Multan Bench', link: '/cases/view/165276' },
      { text: '2026 SLD 4309 Peshawar High Court (2026 CLC 1159)', link: '/cases/view/165275' },
      { text: '2026 SLD 4308 Sindh High Court (2026 CLC 1024)', link: '/cases/view/165274' }
    ]
  },
  {
    id: 'statutes',
    title: 'Statutes / Laws',
    count: '9,349',
    icon: Scale,
    image: oldLawBook,
    link: '/statutes/view/6a90093e137c8854f5d4d367',
    items: [
      { text: 'Income Tax Rules, 2002 - Section 231CB (Miscellaneous)', link: '/statutes/view/6a90093e137c8854f5d4d367' },
      { text: 'Federal Excise Act, 2005 - Section 7A (Levy & Duty Collection)', link: '/statutes/view/6a90093e137c8854f5d4d36b' },
      { text: 'KPRA Employees (Appointment, Transfer) Regulation, 2018', link: '/statutes/view/6abcf2dbc1463bec312e6f40' },
      { text: 'Anand Marriage Act, 1909 - Statutory Provisions', link: '/statutes/view/6abcf2dbc1463bec312e6f42' },
      { text: 'Abandoned Properties (Management) Act, 1975', link: '/statutes/view/6abcf2dbc1463bec312e6f44' }
    ]
  },
  {
    id: 'notifications',
    title: 'Notifications',
    count: '11,669',
    icon: Bell,
    image: fbrSecp,
    link: '/notifications/view/6abcf2bdc1463bec312e1527',
    items: [
      { text: 'Notification No. 176 (1967) - Charitable Institutions & Funds', link: '/notifications/view/6abcf2bdc1463bec312e1527' },
      { text: 'Circular No. 1 (2017) - Promotion to Assistant Commissioners IRS', link: '/notifications/view/6abcf2bdc1463bec312e1529' },
      { text: 'Notification No. 783 (1972) - Bill of Export Cancellation Guidelines', link: '/notifications/view/6abcf2bdc1463bec312e152b' },
      { text: 'Notification No. 812 (1972) - Removal of Goods from Warehouse', link: '/notifications/view/6abcf2bdc1463bec312e152d' },
      { text: 'Notification No. 1206 (1972) - Rules for Canning of Motor Spirit', link: '/notifications/view/6abcf2bdc1463bec312e152f' }
    ]
  },
  {
    id: 'dictionary',
    title: 'Dictionary',
    count: '38,397',
    icon: Book,
    image: judgeHammer,
    link: '/dictionary/view/6abcf2b2c1463bec312d8e16',
    items: [
      { text: 'agency by operation of law: See agency by estoppel.', link: '/dictionary/view/6abcf2b2c1463bec312d8e16' },
      { text: 'agency coupled with an interest: Irrevocable authority with legal interest', link: '/dictionary/view/6abcf2b2c1463bec312d8e17' },
      { text: 'agency from necessity: See agency of necessity in law.', link: '/dictionary/view/6abcf2b2c1463bec312d8e18' },
      { text: 'agency in fact: An agency created voluntarily by contract.', link: '/dictionary/view/6abcf2b2c1463bec312d8e19' },
      { text: 'state agency: An executive or regulatory body of a state government.', link: '/dictionary/view/6abcf2b2c1463bec312d8e1a' }
    ]
  },
  {
    id: 'finance_act',
    title: 'Finance Act',
    count: '319',
    icon: Landmark,
    image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=400',
    link: '/tax-cards/view/6abcf3cd6db78969163e4ae7',
    items: [
      { text: 'Tax Rates 2023-24 (Annual Income & Corporate Slabs)', link: '/tax-cards/view/6abcf3cd6db78969163e4ae7' },
      { text: 'Tax Rates-TY 2024-Updated on 26-Jun-2023 Provisions', link: '/tax-cards/view/6abcf3cd6db78969163e4ae8' },
      { text: 'Tax Card 2024 - Amar Associates Budget Analysis', link: '/tax-cards/view/6abcf3cd6db78969163e4ae9' },
      { text: 'Tax Card Taxmax 2023-24 Complete Schedule', link: '/tax-cards/view/6abcf3cd6db78969163e4aea' },
      { text: 'UHY TAX CARD TY 2023-24 Guidelines', link: '/tax-cards/view/6abcf3cd6db78969163e4aeb' }
    ]
  }
];

const FeaturedSection = () => {
  const [cardsList, setCardsList] = useState(fallbackCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const trackRef = useRef(null);

  // Fetch live latest 5 entries from backend across all 5 sections
  useEffect(() => {
    let isMounted = true;

    const fetchLatestRecords = async () => {
      try {
        const [casesRes, statutesRes, notifsRes, dictRes, taxRes, dbCountsRes] = await Promise.allSettled([
          caseService.getCases({ limit: 5 }),
          statuteService.getStatutes({ limit: 5 }),
          notificationService.getNotifications({ limit: 5 }),
          dictionaryService.getDictionary({ limit: 5 }),
          taxCardService.getTaxCards(),
          caseService.getDatabaseCounts()
        ]);

        if (!isMounted) return;

        setCardsList(prevCards => {
          return prevCards.map(card => {
            if (card.id === 'case_laws') {
              const rawCases = casesRes.status === 'fulfilled'
                ? (casesRes.value?.data || (Array.isArray(casesRes.value) ? casesRes.value : []))
                : [];
              const dbCounts = dbCountsRes.status === 'fulfilled' ? dbCountsRes.value : null;
              const displayCount = dbCounts?.displayCount || (dbCounts?.totalCitationsWithOtherLaws ? dbCounts.totalCitationsWithOtherLaws.toLocaleString() : '393,870');

              if (rawCases.length > 0) {
                const latest5 = rawCases.slice(0, 5).map(c => {
                  const citation = c.mapYearPage?.[0] || `${c.dated ? new Date(c.dated).getFullYear() : '2026'} SLD ${c.sldNumber}`;
                  const title = c.court ? `${citation} (${c.court})` : citation;
                  const docId = c.mongoId || c._id || c.sldNumber;
                  return {
                    text: title,
                    link: `/cases/view/${docId}`
                  };
                });
                return {
                  ...card,
                  link: latest5[0]?.link || card.link,
                  count: displayCount,
                  items: latest5
                };
              } else {
                return {
                  ...card,
                  count: displayCount
                };
              }
            }

            if (card.id === 'statutes' && statutesRes.status === 'fulfilled') {
              const rawStatutes = Array.isArray(statutesRes.value) ? statutesRes.value : (statutesRes.value?.data || []);
              if (rawStatutes.length > 0) {
                const latest5 = rawStatutes.slice(0, 5).map(s => {
                  const title = s.law 
                    ? `${s.law}${s.section ? ` - Sec. ${s.section}` : ''}`
                    : (s.heading || `Statute Section #${s.srNumber}`);
                  const docId = s._id || s.statuteId || s.srNumber;
                  return {
                    text: title,
                    link: `/statutes/view/${docId}`
                  };
                });
                return {
                  ...card,
                  link: latest5[0]?.link || card.link,
                  count: statutesRes.value?.total ? statutesRes.value.total.toLocaleString() : card.count,
                  items: latest5
                };
              }
            }

            if (card.id === 'notifications' && notifsRes.status === 'fulfilled') {
              const rawNotifs = Array.isArray(notifsRes.value) ? notifsRes.value : (notifsRes.value?.data || []);
              if (rawNotifs.length > 0) {
                const latest5 = rawNotifs.slice(0, 5).map(n => {
                  const title = n.subject || (n.number ? `Notification No. ${n.number} (${n.year || ''})` : `Notification #${n.srNumber}`);
                  const docId = n._id || n.notificationId || n.srNumber;
                  return {
                    text: title,
                    link: `/notifications/view/${docId}`
                  };
                });
                return {
                  ...card,
                  link: latest5[0]?.link || card.link,
                  count: notifsRes.value?.total ? notifsRes.value.total.toLocaleString() : card.count,
                  items: latest5
                };
              }
            }

            if (card.id === 'dictionary' && dictRes.status === 'fulfilled') {
              const rawDict = Array.isArray(dictRes.value) ? dictRes.value : (dictRes.value?.data || []);
              if (rawDict.length > 0) {
                const latest5 = rawDict.slice(0, 5).map(d => {
                  const title = d.words ? `${d.words}${d.meaning ? `: ${d.meaning.slice(0, 60)}...` : ''}` : `Legal Term #${d.srNumber}`;
                  const docId = d._id || d.dictionaryId || d.srNumber;
                  return {
                    text: title,
                    link: `/dictionary/view/${docId}`
                  };
                });
                return {
                  ...card,
                  link: latest5[0]?.link || card.link,
                  count: dictRes.value?.total ? dictRes.value.total.toLocaleString() : card.count,
                  items: latest5
                };
              }
            }

            if (card.id === 'finance_act' && taxRes.status === 'fulfilled') {
              const rawTax = Array.isArray(taxRes.value) ? taxRes.value : (taxRes.value?.data || []);
              if (rawTax.length > 0) {
                const latest5 = rawTax.slice(0, 5).map(t => {
                  const title = t.heading || (t.year ? `Tax Rates & Schedule ${t.year}` : `Finance Schedule #${t.srNumber}`);
                  const docId = t._id || t.taxCardId || t.srNumber;
                  return {
                    text: title,
                    link: `/tax-cards/view/${docId}`
                  };
                });
                return {
                  ...card,
                  link: latest5[0]?.link || card.link,
                  count: rawTax.length ? rawTax.length.toLocaleString() : card.count,
                  items: latest5
                };
              }
            }

            return card;
          });
        });
      } catch (err) {
        console.error('[FeaturedSection] Failed to load latest entries:', err);
      }
    };

    fetchLatestRecords();
    return () => { isMounted = false; };
  }, []);

  // Duplicate cards for seamless loop
  const displayCards = [...cardsList, ...cardsList];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => prev + 1);
    }, 3800);
    return () => clearInterval(timer);
  }, []);

  const handleTransitionEnd = () => {
    if (currentIndex >= cardsList.length) {
      setIsTransitioning(false);
      setCurrentIndex(0);
      setTimeout(() => {
        setIsTransitioning(true);
      }, 50);
    }
  };

  const nextSlide = () => {
    setCurrentIndex(prev => prev + 1);
  };

  const prevSlide = () => {
    if (currentIndex === 0) {
      setIsTransitioning(false);
      setCurrentIndex(cardsList.length - 1);
      setTimeout(() => setIsTransitioning(true), 50);
    } else {
      setCurrentIndex(prev => prev - 1);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 overflow-hidden">
      <div className="flex justify-between items-center pr-2">
        <div>
          <h2 className="text-xl font-bold text-theme-main">Featured Documents</h2>
          <p className="text-xs text-theme-muted font-medium">Click any entry to view official document in new tab</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={prevSlide} 
            className="p-1.5 border border-theme-border rounded-lg text-theme-main hover:border-[#f15a24] hover:text-[#f15a24] transition-colors cursor-pointer" 
            title="Previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={nextSlide} 
            className="p-1.5 border border-theme-border rounded-lg text-theme-main hover:border-[#f15a24] hover:text-[#f15a24] transition-colors cursor-pointer" 
            title="Next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 relative w-full overflow-hidden">
        <div 
          ref={trackRef}
          onTransitionEnd={handleTransitionEnd}
          className="flex h-full"
          style={{
            transform: `translateX(calc(-${currentIndex} * (33.333333% + 16px)))`,
            transition: isTransitioning ? 'transform 0.5s ease-in-out' : 'none',
            gap: '24px'
          }}
        >
          {displayCards.map((card, idx) => (
            <div 
              key={`${card.id}-${idx}`} 
              className="group flex flex-col bg-white dark:bg-theme-surface border border-theme-border rounded-xl overflow-hidden shadow-sm hover:border-[#f15a24]/50 hover:shadow-md transition-all flex-none relative"
              style={{ width: 'calc(33.333333% - 16px)' }}
            >
              {/* Card Image Cover with Explore Button */}
              <div className="h-44 sm:h-48 w-full relative shrink-0 overflow-hidden bg-stone-100 dark:bg-stone-800">
                <img src={card.image} alt={card.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                  <a 
                    href={card.link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="bg-[#f15a24] hover:bg-[#d94817] text-white px-5 py-2 rounded-full font-bold shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 text-xs sm:text-sm cursor-pointer"
                  >
                    View Document ↗
                  </a>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-3 border-b border-theme-border pb-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-[#f15a24] flex items-center justify-center text-white shrink-0 shadow-2xs">
                      <card.icon className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="font-bold text-sm sm:text-base text-theme-main truncate">{card.title}</h3>
                  </div>
                  <span className="text-[#f15a24] font-black text-xs sm:text-sm shrink-0 ml-2">{card.count}</span>
                </div>
                
                {/* Latest 5 Dynamic Entries List */}
                <ul className="space-y-2 flex-1 mb-3 overflow-y-auto custom-scrollbar">
                  {card.items.map((item, itemIdx) => {
                    const itemText = typeof item === 'string' ? item : item.text;
                    const itemLink = typeof item === 'string' ? card.link : item.link;
                    return (
                      <li key={itemIdx}>
                        <a 
                          href={itemLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="group/line flex items-start gap-2 p-1.5 -m-1 rounded-lg hover:bg-orange-50/90 dark:hover:bg-orange-950/30 transition-all cursor-pointer block"
                          title={`Click to view document: "${itemText}" in new tab`}
                        >
                          <Circle className="w-1.5 h-1.5 text-[#f15a24] fill-[#f15a24] mt-1.5 shrink-0 group-hover/line:scale-125 transition-transform" />
                          <span className="text-xs text-theme-main group-hover/line:text-[#f15a24] leading-snug line-clamp-2 transition-colors font-medium">
                            {itemText}
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
                
                {/* View Document Link */}
                <a 
                  href={card.link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[#f15a24] text-xs font-bold hover:underline mt-auto flex items-center gap-1 group/all pt-2 border-t border-theme-border/50"
                >
                  <span>View Full Document</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover/all:translate-x-0.5 transition-transform" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeaturedSection;
