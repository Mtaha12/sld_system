import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import LegalRebuttalModal from './LegalRebuttalModal';

const WarningAlert = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3.5 p-4 bg-orange-50/80 dark:bg-theme-surface border-2 border-[#f15a24]/30 rounded-xl shadow-xs">
        <AlertTriangle className="w-6 h-6 text-[#f15a24] shrink-0 animate-pulse" />
        <p className="text-[#f15a24] text-sm sm:text-base font-bold leading-relaxed">
          Beware of SLG (Shahid Legal Group) --- Shahid Sharif, Atia Amjad, and Khalil --- Cheaters, Duplicators, Design Thieves, and Data Plunderers operating through the fake domain <span className="text-blue-600 underline font-extrabold">(sldsystempk.com)</span>{' '}
          <button onClick={() => setIsModalOpen(true)} className="underline font-black ml-1.5 hover:text-red-700 bg-white/70 dark:bg-black/30 px-2 py-0.5 rounded shadow-2xs transition-colors cursor-pointer">Read More</button>
        </p>
      </div>

      <LegalRebuttalModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export default WarningAlert;
