import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Hash, Search, AlertCircle, Printer } from 'lucide-react';
import AdminFooter from '../features/dashboard/components/AdminFooter';
import ManageStatutesFilterBar from '../features/statutes/components/ManageStatutesFilterBar';
import ManageStatutesTable from '../features/statutes/components/ManageStatutesTable';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import FormField from '../components/ui/FormField';

const INITIAL_DATA = [
  {
    id: 9338,
    law: 'Income Tax Rules, 2002',
    chapter: 'CHAPTER-XIX',
    display: 'Active',
    dated: '08/20/2026',
    section: '231CB',
    sectionHeading: 'Independent case scrutiny committees',
    department: 'Tax',
    heading: 'MISCELLANEOUS'
  },
  {
    id: 9337,
    law: 'Federal Excise Act, 2005',
    chapter: 'Chapter-V',
    display: 'Active',
    dated: '07/01/2026',
    section: '34AA',
    sectionHeading: 'Independent case scrutiny committee',
    department: 'Tax',
    heading: 'POWERS, ADJUDICATION AND APPEALS'
  },
  {
    id: 9336,
    law: 'Federal Excise Act, 2005',
    chapter: 'Chapter-II',
    display: 'Active',
    dated: '07/01/2026',
    section: '7A',
    sectionHeading: 'National faceless centre and',
    department: 'Tax',
    heading: 'LEVY, COLLECTION AND PAYMENT OF DUTY'
  }
];

const ManageStatutesPage = () => {
  const [searchParams] = useSearchParams();
  const initialParamQuery = searchParams.get('search') || '';

  const [statutes, setStatutes] = useState(INITIAL_DATA);
  const [highlightedId, setHighlightedId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState(initialParamQuery);

  // Sync if URL query changes
  useEffect(() => {
    const q = searchParams.get('search');
    if (q !== null && q !== undefined) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  // Get Statute ID Modal State
  const [getStatuteIdModalOpen, setGetStatuteIdModalOpen] = useState(false);
  const [getStatuteIdInput, setGetStatuteIdInput] = useState('');
  const [getStatuteIdError, setGetStatuteIdError] = useState('');

  // Filtered Statutes based on search
  const filteredStatutes = useMemo(() => {
    if (!searchQuery) return statutes;
    const query = searchQuery.toLowerCase().trim();
    return statutes.filter(item => {
      const idMatch = item.id?.toString().includes(query);
      const lawMatch = item.law?.toLowerCase().includes(query);
      const chapMatch = item.chapter?.toLowerCase().includes(query);
      const secMatch = item.section?.toLowerCase().includes(query);
      const secHeadMatch = item.sectionHeading?.toLowerCase().includes(query);
      const deptMatch = item.department?.toLowerCase().includes(query);
      const headMatch = item.heading?.toLowerCase().includes(query);
      return idMatch || lawMatch || chapMatch || secMatch || secHeadMatch || deptMatch || headMatch;
    });
  }, [statutes, searchQuery]);

  // Open Get Statute ID Modal
  const handleOpenGetStatuteId = () => {
    setGetStatuteIdInput('');
    setGetStatuteIdError('');
    setGetStatuteIdModalOpen(true);
  };

  // Submit Get Statute ID
  const handleGetStatuteIdSubmit = (e) => {
    e?.preventDefault();
    setGetStatuteIdError('');

    if (!getStatuteIdInput.trim()) {
      setGetStatuteIdError('Please enter a Statute ID or Law Name.');
      return;
    }

    const clean = getStatuteIdInput.trim().toLowerCase().replace(/^statute\s*#?/i, '').replace(/^id\s*#?/i, '').trim();

    // Find in statutes
    const target = statutes.find(s => 
      s.id?.toString().toLowerCase() === clean ||
      s.law?.toLowerCase().includes(clean) ||
      s.section?.toLowerCase() === clean
    );

    if (!target) {
      setGetStatuteIdError(`Statute ID #${getStatuteIdInput.trim()} does not exist in records.`);
      return;
    }

    // Clear search if hidden
    if (searchQuery && !filteredStatutes.some(s => s.id === target.id)) {
      setSearchQuery('');
    }

    setHighlightedId(target.id);
    setGetStatuteIdModalOpen(false);

    setToastMessage(`Located Statute #${target.id} (${target.law}). Scrolling to position...`);

    // Smooth scroll to element
    setTimeout(() => {
      const rowEl = document.getElementById(`statute-row-${target.id}`);
      if (rowEl) {
        rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 200);

    // Clear highlight after pulse
    setTimeout(() => {
      setHighlightedId(null);
    }, 4500);
  };

  return (
    <div className="flex flex-col w-full animate-fade-in gap-6">
      
      <div className="flex flex-col gap-2">
        <ManageStatutesFilterBar 
          initialSearch={searchQuery}
          onGetStatuteId={handleOpenGetStatuteId}
          onSearch={setSearchQuery}
          onShowAll={() => setSearchQuery('')}
        />
        <ManageStatutesTable 
          statutes={filteredStatutes}
          setStatutes={setStatutes}
          highlightedId={highlightedId}
          toastMessage={toastMessage}
          setToastMessage={setToastMessage}
        />
      </div>

      <AdminFooter />

      {/* Get Statute ID Dialogue Box */}
      <Modal
        isOpen={getStatuteIdModalOpen}
        onClose={() => setGetStatuteIdModalOpen(false)}
        title="Get Statute by ID"
        subtitle="Enter a Statute ID or Law Name to scroll directly to its position"
        icon={Hash}
        maxWidth="max-w-md"
        footer={
          <>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setGetStatuteIdModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              size="sm"
              className="bg-brand-orange hover:bg-[#D44E35] text-white flex items-center gap-1.5"
              onClick={handleGetStatuteIdSubmit}
            >
              <Search className="w-4 h-4" /> Locate & Scroll
            </Button>
          </>
        }
      >
        <form onSubmit={handleGetStatuteIdSubmit} className="space-y-4">
          {getStatuteIdError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{getStatuteIdError}</span>
            </div>
          )}

          <FormField label="Statute ID or Law Name" required>
            <Input 
              value={getStatuteIdInput}
              onChange={(e) => {
                setGetStatuteIdInput(e.target.value);
                if (getStatuteIdError) setGetStatuteIdError('');
              }}
              placeholder="e.g. 9338, 9337, or Income Tax Rules"
              required
              autoFocus
            />
          </FormField>

          {/* Suggestions */}
          <div>
            <span className="text-[11px] text-theme-muted font-medium block mb-1.5">
              Quick select Statute ID:
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
              {statutes.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setGetStatuteIdInput(s.id.toString());
                    if (getStatuteIdError) setGetStatuteIdError('');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    getStatuteIdInput === s.id.toString()
                      ? 'bg-brand-orange text-white border-brand-orange'
                      : 'bg-theme-surface-alt/60 hover:bg-theme-surface-alt text-theme-main border-theme-border'
                  }`}
                >
                  Statute #{s.id}
                </button>
              ))}
            </div>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default ManageStatutesPage;

