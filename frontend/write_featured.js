const fs = require('fs');

const content = \import { useState, useEffect, useRef } from 'react';
import { Scale, Bell, Book, Landmark, ChevronLeft, ChevronRight, Circle } from 'lucide-react';
import { Link } from 'react-router-dom';

// Import local assets
import oldLawBook from '../../../assets/branding/dashboard/old_law_book.png';
import fbrSecp from '../../../assets/branding/dashboard/fbr_secp.png';
import judgeHammer from '../../../assets/branding/dashboard/Judge_hammer_with_law_book.png';

const originalCards = [
  {
    id: 'notifications',
    title: 'Notifications',
    count: '11,669',
    icon: Bell,
    image: fbrSecp,
    items: [
      'Sales Tax General Order No. 14 Of 2026, Islamabad, the 4th August, 2026',
      'Sales Tax General Order No. 12 Of 2026, Islamabad, the 31st July, 2026',
      'S.R.O. 874(I)/2026, Islamabad, the 11th May, 2026',
      'S.R.O. 1245(I)/2026, Islamabad, the 31st July, 2026',
      'C.No. 1(200) ST-LBP/2026/ 82342-R, Islamabad, the 29th July, 2026',
      'No. 07/DC/Reg/2026, Dated: 21.07.2026'
    ]
  },
  {
    id: 'dictionary',
    title: 'Dictionary',
    count: '38,397',
    icon: Book,
    image: judgeHammer,
    items: [
      'See agency by...',
      'An agency in which the agent is granted not only the power to act on behalf of...',
      'See agency of...',
      'An agency created voluntarily, as by a contract. Agency in fact is...',
      'state agency An executive or regulatory body of a state. State agencies include...',
      'See ADMINISTRATIVE...'
    ]
  },
  {
    id: 'finance_act',
    title: 'Finance Act',
    count: '319',
    icon: Landmark,
    image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=400',
    items: [
      'Finance Act 2026 RIAZ AHMAD & COMPANY',
      'Finance Act, 2026',
      '(MAN Tax ) Salient Feature (Income Tax & Sales Tax) Budget 2026',
      'Adv. Hamdan Hassan Butt -- Budget Summary 2026-27',
      'AFF\\'s Tax Memorandum on Finance Bill, 2026',
      'Amin & Co - Inland Revenue Memorandum - Finance Bill 2026'
    ]
  },
  {
    id: 'statutes',
    title: 'Statutes / Laws',
    count: '9,349',
    icon: Scale,
    image: oldLawBook,
    items: [
      'Abandoned Properties (Management) Act, 1975',
      'Abolition of the Discretionary Quotas in Housing Schemes Act, 2013',
      'Abolition of the Punishment of Whipping Act, 1996',
      'Access Promotion Rules, 2004',
      'Access to Inside Information Regulations, 2016'
    ]
  }
];

// Duplicate cards to allow for seamless infinite scrolling
const cards = [...originalCards, ...originalCards];

const FeaturedSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const trackRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => prev + 1);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const handleTransitionEnd = () => {
    // If we've scrolled past the first set of cards
    if (currentIndex >= originalCards.length) {
      setIsTransitioning(false); // Disable animation
      setCurrentIndex(0); // Instantly snap back to the start
      
      // Re-enable animation for the next frame
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
      setCurrentIndex(originalCards.length - 1);
      setTimeout(() => setIsTransitioning(true), 50);
    } else {
      setCurrentIndex(prev => prev - 1);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 overflow-hidden">
      <div className="flex justify-between items-center pr-2">
        <h2 className="text-xl font-bold text-theme-main">Featured</h2>
        <div className="flex items-center gap-2">
          <button onClick={prevSlide} className="p-1.5 border border-theme-border rounded-lg text-theme-main hover:border-[#f15a24] hover:text-[#f15a24] transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={nextSlide} className="p-1.5 border border-theme-border rounded-lg text-theme-main hover:border-[#f15a24] hover:text-[#f15a24] transition-colors">
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
            transform: \	ranslateX(calc(-\ * (33.333333% + 16px)))\,
            transition: isTransitioning ? 'transform 0.5s ease-in-out' : 'none',
            gap: '24px' // Assuming 24px gap between cards
          }}
        >
          {cards.map((card, idx) => (
            <div 
              key={\\-\\} 
              className="flex flex-col bg-white dark:bg-theme-surface border border-theme-border rounded-xl overflow-hidden shadow-sm hover:border-brand-orange/50 transition-colors flex-none"
              style={{ width: 'calc(33.333333% - 16px)' }}
            >
              <div className="h-52 w-full relative shrink-0">
                <img src={card.image} alt={card.title} className="w-full h-full object-cover" />
              </div>
              <div className="p-4 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-4 border-b border-theme-border pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#f15a24] flex items-center justify-center text-white shrink-0">
                      <card.icon className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold text-theme-main truncate">{card.title}</h3>
                  </div>
                  <span className="text-[#f15a24] font-semibold text-sm shrink-0 ml-2">{card.count}</span>
                </div>
                
                <ul className="space-y-3 flex-1 mb-4 overflow-y-auto">
                  {card.items.map((item, itemIdx) => (
                    <li key={itemIdx} className="flex items-start gap-2">
                      <Circle className="w-2 h-2 text-[#f15a24] fill-[#f15a24] mt-1.5 shrink-0" />
                      <span className="text-xs text-theme-main leading-relaxed line-clamp-2" title={item}>{item}</span>
                    </li>
                  ))}
                </ul>
                
                <Link to="#" className="text-[#f15a24] text-xs font-semibold hover:underline mt-auto">
                  View all
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeaturedSection;
\;
fs.writeFileSync('src/features/dashboard/components/FeaturedSection.jsx', content);
