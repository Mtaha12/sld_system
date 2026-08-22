import img1 from '../assets/branding/logo/masonry/Row_1_img1.avif'
import img2 from '../assets/branding/logo/masonry/Row_1_img2.avif'
import img3 from '../assets/branding/logo/masonry/Row_1_img3.avif'
import img4 from '../assets/branding/logo/masonry/Row_2_img1.avif'
import img5 from '../assets/branding/logo/masonry/Row_2_img2.avif'
import img6 from '../assets/branding/logo/masonry/Row_2_img3.avif'
import img7 from '../assets/branding/logo/masonry/Row_3_img1.avif'
import img8 from '../assets/branding/logo/masonry/Row_3_img2.avif'
import img9 from '../assets/branding/logo/masonry/Row_3_img3.avif'

export const MASONRY_COLUMNS = [
  {
    id: 'col-1',
    animationClass: 'animate-scroll-up',
    delay: '0s',
    items: [
      {
        type: 'image',
        src: img1,
        alt: 'Legal',
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
        src: img2,
        alt: 'Courthouse',
        heightClass: 'h-96',
      },
      {
        type: 'image',
        src: img3,
        alt: 'Justice',
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
        src: img4,
        alt: 'Lawyer',
        heightClass: 'h-80',
      },
      {
        type: 'image',
        src: img5,
        alt: 'Library',
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
        src: img6,
        alt: 'Scales',
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
        src: img7,
        alt: 'Books',
        heightClass: 'h-72',
      },
      {
        type: 'image',
        src: img8,
        alt: 'Table',
        heightClass: 'h-64',
      },
      {
        type: 'image',
        src: img9,
        alt: 'Desk',
        heightClass: 'h-80',
      },
      {
        type: 'image',
        src: img1, // Reusing one image to maintain exact 4-item loop physics
        alt: 'Courthouse',
        heightClass: 'h-72',
      },
    ],
  },
]
