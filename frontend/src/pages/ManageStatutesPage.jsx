import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Hash, Search, AlertCircle, Copy, Check } from 'lucide-react';
import AdminFooter from '../features/dashboard/components/AdminFooter';
import ManageStatutesFilterBar from '../features/statutes/components/ManageStatutesFilterBar';
import ManageStatutesTable from '../features/statutes/components/ManageStatutesTable';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import FormField from '../components/ui/FormField';
import { statuteService } from '../features/statutes/services/statuteService';

const ManageStatutesPage = () => {
  const [searchParams] = useSearchParams();
  const initialParamQuery = searchParams.get('search') || '';

  const [statutes, setStatutes] = useState([]);
  const [highlightedId, setHighlightedId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState(initialParamQuery);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial statutes from statuteService
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    statuteService.getStatutes().then(data => {
      if (isMounted) {
        setStatutes(data);
      }
    }).finally(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, []);

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
  const [statuteIdResult, setStatuteIdResult] = useState(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isFetchingStatuteId, setIsFetchingStatuteId] = useState(false);

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
    setStatuteIdResult(null);
    setIsCopied(false);
    setGetStatuteIdModalOpen(true);
  };

  // Submit Get Statute ID
  const handleGetStatuteIdSubmit = async (e) => {
    e?.preventDefault();
    setGetStatuteIdError('');

    if (!getStatuteIdInput.trim()) {
      setGetStatuteIdError('Please enter a Statute SR #.');
      return;
    }

    const inputVal = getStatuteIdInput.trim();
    const clean = inputVal.toLowerCase().replace(/^statute\s*#?/i, '').replace(/^id\s*#?/i, '').replace(/^sr\s*#?/i, '').trim();
    setIsFetchingStatuteId(true);

    try {
      // Query database directly by SR # or ID
      let target = null;
      try {
        target = await statuteService.getStatuteById(clean);
      } catch (apiErr) {
        target = statutes.find(s => 
          s.id?.toString().toLowerCase() === clean ||
          s.srNumber?.toString().toLowerCase() === clean ||
          s.statuteId?.toLowerCase() === clean ||
          s.law?.toLowerCase().includes(clean) ||
          s.section?.toLowerCase() === clean
        );
      }

      if (!target) {
        setGetStatuteIdError(`No statute found matching SR #${inputVal} in database.`);
        setStatuteIdResult(null);
        return;
      }

      const uniqueStatuteId = target.statuteId || target.statute_id || `STAT-${String(target.srNumber || target.id).padStart(6, '0')}`;

      setStatuteIdResult({
        target,
        statuteId: uniqueStatuteId
      });
      setIsCopied(false);
    } catch (err) {
      setGetStatuteIdError(`Failed to fetch statute: ${err.message || 'Server error'}`);
      setStatuteIdResult(null);
    } finally {
      setIsFetchingStatuteId(false);
    }
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
          isLoading={isLoading}
        />
      </div>

      <AdminFooter />

      {/* Get Statute ID Dialogue Box */}
      <Modal
        isOpen={getStatuteIdModalOpen}
        onClose={() => {
          setGetStatuteIdModalOpen(false);
          setStatuteIdResult(null);
          setIsCopied(false);
        }}
        title="Get Statute ID by SR #"
        subtitle="Enter a Statute SR # to fetch the unique Statute ID from the database"
        icon={Hash}
        maxWidth="max-w-md"
        footer={
          <>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setGetStatuteIdModalOpen(false);
                setStatuteIdResult(null);
                setIsCopied(false);
              }}
            >
              Close
            </Button>
            <Button 
              variant="primary" 
              size="sm"
              className="bg-brand-orange hover:bg-brand-orange-hover text-white flex items-center gap-1.5"
              onClick={handleGetStatuteIdSubmit}
              disabled={isFetchingStatuteId}
            >
              {isFetchingStatuteId ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <Search className="w-4 h-4" />
              )}
              {isFetchingStatuteId ? 'Fetching ID...' : 'Get Statute ID'}
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

          <FormField label="Statute SR # (Required)" required>
            <Input 
              value={getStatuteIdInput}
              onChange={(e) => {
                setGetStatuteIdInput(e.target.value);
                if (getStatuteIdError) setGetStatuteIdError('');
                if (statuteIdResult) setStatuteIdResult(null);
              }}
              placeholder="e.g. 9338, 9337, or 1"
              required
              autoFocus
            />
          </FormField>

          {/* Suggestions */}
          <div>
            <span className="text-[11px] text-theme-muted font-medium block mb-1.5">
              Quick select Statute SR #:
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
              {statutes.slice(0, 10).map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setGetStatuteIdInput(s.srNumber ? s.srNumber.toString() : s.id.toString());
                    if (getStatuteIdError) setGetStatuteIdError('');
                    if (statuteIdResult) setStatuteIdResult(null);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    getStatuteIdInput === (s.srNumber ? s.srNumber.toString() : s.id.toString())
                      ? 'bg-brand-orange text-white border-brand-orange'
                      : 'bg-theme-surface-alt/60 hover:bg-theme-surface-alt text-theme-main border-theme-border'
                  }`}
                >
                  SR #{s.srNumber || s.id}
                </button>
              ))}
            </div>
          </div>

          {/* Unique Statute ID Result Card with Copy Button */}
          {statuteIdResult && (
            <div className="mt-4 p-3.5 bg-theme-surface-alt/80 border border-brand-orange/40 rounded-xl space-y-3 animate-fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-theme-main">Database Record Found:</span>
                <span className="px-2 py-0.5 rounded-md bg-brand-orange/10 text-brand-orange text-[11px] font-semibold border border-brand-orange/30">
                  SR #{statuteIdResult.target.srNumber || statuteIdResult.target.id}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 bg-theme-surface border border-theme-border rounded-lg p-2.5">
                <div className="flex flex-col">
                  <span className="text-[10px] text-theme-muted uppercase font-bold tracking-wider">Unique Statute ID</span>
                  <span className="font-mono text-base font-bold text-brand-orange select-all break-all">
                    {statuteIdResult.statuteId}
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(statuteIdResult.statuteId);
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2500);
                  }}
                  className="h-8 px-2.5 text-xs flex items-center gap-1.5 bg-theme-surface hover:bg-theme-surface-alt border-theme-border text-theme-main transition-colors shrink-0"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-500" />
                      <span className="text-green-500 font-medium">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy ID</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-theme-muted pt-0.5">
                <div>
                  <span className="font-medium text-theme-main block">Law:</span>
                  <span className="truncate block">{statuteIdResult.target.law || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium text-theme-main block">Section / Chapter:</span>
                  <span className="truncate block">{statuteIdResult.target.section || statuteIdResult.target.chapter || 'N/A'}</span>
                </div>
              </div>

              <Button
                type="button"
                size="sm"
                className="w-full bg-brand-orange hover:bg-brand-orange-hover text-white flex items-center justify-center gap-1.5 h-9 mt-1"
                onClick={() => {
                  if (searchQuery && !filteredStatutes.some(s => s.id === statuteIdResult.target.id)) {
                    setSearchQuery('');
                  }
                  setHighlightedId(statuteIdResult.target.id);
                  setGetStatuteIdModalOpen(false);
                  setStatuteIdResult(null);
                  setToastMessage(`Located Statute ${statuteIdResult.statuteId} (${statuteIdResult.target.law}). Scrolling to position...`);

                  setTimeout(() => {
                    const rowEl = document.getElementById(`statute-row-${statuteIdResult.target.id}`);
                    if (rowEl) {
                      rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }, 200);

                  setTimeout(() => {
                    setHighlightedId(null);
                  }, 5000);
                }}
              >
                <Search className="w-3.5 h-3.5" /> View & Highlight in Table
              </Button>
            </div>
          )}
        </form>
      </Modal>

    </div>
  );
};

export default ManageStatutesPage;

