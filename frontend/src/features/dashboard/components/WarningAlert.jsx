import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import LegalRebuttalModal from './LegalRebuttalModal';

const WarningAlert = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3 p-3 bg-white dark:bg-theme-surface border border-theme-border rounded-lg shadow-sm">
        <AlertTriangle className="w-5 h-5 text-[#f15a24] shrink-0" />
        <p className="text-[#f15a24] text-sm font-medium leading-relaxed">
          Beware of SLG (Shahid Legal Group) --- Shahid Sharif, Atia Amjad, and Khalil --- Cheaters, Duplicators, Design Thieves, and Data Plunderers operating through the fake domain <span className="text-blue-500">(sldsystempk.com)</span>{' '}
          <button onClick={() => setIsModalOpen(true)} className="underline font-semibold ml-1 hover:text-red-700 transition-colors">Read More</button>
        </p>
      </div>

      <LegalRebuttalModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export default WarningAlert;
