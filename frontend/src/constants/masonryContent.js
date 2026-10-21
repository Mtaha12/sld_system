import oldLawBook from '../assets/branding/dashboard/old_law_book.png';
import fbrSecp from '../assets/branding/dashboard/fbr_secp.png';
import judgeHammer from '../assets/branding/dashboard/Judge_hammer_with_law_book.png';

const citationsImg = 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=400';
const financeActImg = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=400';

export const MASONRY_COLUMNS = [
  {
    id: 'col-1',
    animationClass: 'animate-scroll-up',
    delay: '0s',
    items: [
      {
        type: 'image',
        src: citationsImg,
        alt: 'Citations & Case Laws',
        heightClass: 'h-64',
      },
      {
        type: 'stat',
        bgColorClass: 'bg-brand-orange',
        heightClass: 'h-80',
        heading: '98%',
        text: 'of law firms rely on robust case management systems for efficiency.',
      },
      {
        type: 'image',
        src: oldLawBook,
        alt: 'Statutes & Laws',
        heightClass: 'h-96',
      },
      {
        type: 'image',
        src: fbrSecp,
        alt: 'Official Notifications',
        heightClass: 'h-72',
      },
    ],
  },
  {
    id: 'col-2',
    animationClass: 'animate-scroll-down',
    delay: '0s',
    items: [
      {
        type: 'image',
        src: judgeHammer,
        alt: 'Legal Dictionary',
        heightClass: 'h-80',
      },
      {
        type: 'image',
        src: financeActImg,
        alt: 'Finance Act & Tax Schedules',
        heightClass: 'h-64',
      },
      {
        type: 'stat',
        bgColorClass: 'bg-brand-green',
        heightClass: 'h-72',
        heading: '24/7',
        text: 'secure access to critical case files and court documents.',
      },
      {
        type: 'image',
        src: citationsImg,
        alt: 'Citations & Case Laws',
        heightClass: 'h-80',
      },
    ],
  },
  {
    id: 'col-3',
    animationClass: 'animate-scroll-up',
    delay: '-15s',
    items: [
      {
        type: 'image',
        src: oldLawBook,
        alt: 'Statutes & Laws',
        heightClass: 'h-72',
      },
      {
        type: 'image',
        src: judgeHammer,
        alt: 'Legal Dictionary',
        heightClass: 'h-64',
      },
      {
        type: 'image',
        src: fbrSecp,
        alt: 'Official Notifications',
        heightClass: 'h-80',
      },
      {
        type: 'image',
        src: financeActImg,
        alt: 'Finance Act & Tax Schedules',
        heightClass: 'h-72',
      },
    ],
  },
];
