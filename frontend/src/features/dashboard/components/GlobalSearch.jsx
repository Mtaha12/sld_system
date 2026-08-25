import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  X, 
  RotateCcw, 
  Check, 
  Briefcase, 
  FileText, 
  Bell, 
  Calendar, 
  Building2, 
  Paperclip,
  ChevronRight
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import { MOCK_CASES } from '../../cases/data/casesMockData';
import { MOCK_NOTIFICATIONS } from '../../notifications/data/notificationsMockData';
import { MOCK_STATUTES } from '../../statutes/data/statutesMockData';

const RECORD_TYPES = [
  { id: 'all', label: 'All Records' },
  { id: 'case', label: 'Case Law', icon: Briefcase },
  { id: 'statute', label: 'Statutes', icon: FileText },
  { id: 'notification', label: 'Notifications', icon: Bell }
];

const COURTS = [
  { value: 'all', label: 'All Courts & Jurisdictions' },
  { value: 'Federal Constitutional Court of Pakistan', label: 'Federal Constitutional Court' },
  { value: 'Supreme Court of Pakistan', label: 'Supreme Court of Pakistan' },
  { value: 'High Court of Sindh', label: 'High Court of Sindh' },
  { value: 'Lahore High Court', label: 'Lahore High Court' },
  { value: 'Islamabad High Court', label: 'Islamabad High Court' },
  { value: 'Tax / FBR', label: 'Tax / FBR Authorities' }
];

const TIMEFRAMES = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Past 24 Hours' },
  { value: 'week', label: 'Past 7 Days' },
  { value: 'month', label: 'This Month' },
  { value: '2026', label: 'Year 2026' },
  { value: '2025', label: 'Year 2025' }
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' }
];

const GlobalSearch = ({
  searchQuery = '',
  setSearchQuery,
  filters = { recordType: 'all', court: 'all', timeframe: 'all', status: 'all', hasAttachment: false },
  setFilters,
  isFilterOpen = false,
  setIsFilterOpen,
  activeFiltersCount = 0,
  onSearch,
  onReset
}) => {
  const navigate = useNavigate();
  const searchDropdownRef = useRef(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const [isDropdownFocused, setIsDropdownFocused] = useState(false);
  
  const isOpen = isFilterOpen !== undefined ? isFilterOpen : internalOpen;
  const setIsOpen = setIsFilterOpen || setInternalOpen;

  // Close search suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target)) {
        setIsDropdownFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute live search matches across modules
  const liveResults = useMemo(() => {
    if (!searchQuery.trim()) return { cases: [], notifications: [], statutes: [], total: 0 };
    const q = searchQuery.toLowerCase().trim();

    const matchedCases = MOCK_CASES.filter(c => 
      c.sldNumber?.toLowerCase().includes(q) ||
      c.court?.toLowerCase().includes(q) ||
      (Array.isArray(c.caseNumber) && c.caseNumber.some(cn => cn.toLowerCase().includes(q))) ||
      (Array.isArray(c.judges) && c.judges.some(j => j.toLowerCase().includes(q))) ||
      (Array.isArray(c.lawyers) && c.lawyers.some(l => l.toLowerCase().includes(q))) ||
      (Array.isArray(c.petitioners) && c.petitioners.some(p => p.toLowerCase().includes(q)))
    ).slice(0, 3);

    const matchedNotifications = MOCK_NOTIFICATIONS.filter(n => 
      n.srNumber?.toString().includes(q) ||
      n.sroNumber?.toLowerCase().includes(q) ||
      n.subject?.toLowerCase().includes(q) ||
      n.department?.toLowerCase().includes(q) ||
      n.lawStatute?.toLowerCase().includes(q)
    ).slice(0, 3);

    const matchedStatutes = MOCK_STATUTES.filter(s => 
      s.id.toString().includes(q) ||
      s.law.toLowerCase().includes(q) ||
      s.section.toLowerCase().includes(q) ||
      s.sectionHeading.toLowerCase().includes(q)
    ).slice(0, 3);

    const total = matchedCases.length + matchedNotifications.length + matchedStatutes.length;
    return { cases: matchedCases, notifications: matchedNotifications, statutes: matchedStatutes, total };
  }, [searchQuery]);

  const handleClearSearch = () => {
    if (setSearchQuery) setSearchQuery('');
  };

  const handleUpdateFilter = (key, value) => {
    if (setFilters) {
      setFilters(prev => ({ ...prev, [key]: value }));
    }
  };

  const handleResetFilters = () => {
    if (setFilters) {
      setFilters({
        recordType: 'all',
        court: 'all',
        timeframe: 'all',
        status: 'all',
        hasAttachment: false
      });
    }
    if (onReset) onReset();
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    setIsDropdownFocused(false);
    if (!searchQuery.trim()) {
      if (onSearch) onSearch();
      return;
    }

    const q = encodeURIComponent(searchQuery.trim());
    if (filters.recordType === 'case') {
      navigate(`/manage-cases?search=${q}`);
    } else if (filters.recordType === 'statute') {
      navigate(`/manage-statutes?search=${q}`);
    } else if (filters.recordType === 'notification') {
      navigate(`/manage-notifications?search=${q}`);
    } else {
      // Direct routing if single module matches heavily
      if (liveResults.cases.length > 0 && liveResults.notifications.length === 0 && liveResults.statutes.length === 0) {
        navigate(`/manage-cases?search=${q}`);
      } else if (liveResults.notifications.length > 0 && liveResults.cases.length === 0 && liveResults.statutes.length === 0) {
        navigate(`/manage-notifications?search=${q}`);
      } else if (liveResults.statutes.length > 0 && liveResults.cases.length === 0 && liveResults.notifications.length === 0) {
        navigate(`/manage-statutes?search=${q}`);
      } else {
        navigate(`/manage-cases?search=${q}`);
      }
    }
    if (onSearch) onSearch();
  };

  return (
    <div className="flex flex-col w-full gap-3 mb-6 relative" ref={searchDropdownRef}>
      
      {/* Search Input Bar + Action Buttons */}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row w-full gap-3 items-start sm:items-center relative z-20">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-theme-disabled" />
          </div>
          
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              if (setSearchQuery) setSearchQuery(e.target.value);
              setIsDropdownFocused(true);
            }}
            onFocus={() => setIsDropdownFocused(true)}
            className="block w-full pl-11 pr-10 py-2.5 bg-theme-surface border border-theme-border rounded-xl text-sm placeholder-theme-disabled focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange shadow-sm transition-colors text-theme-main"
            placeholder="Search cases, case numbers, judges, lawyers, statutes..."
          />

          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-theme-muted hover:text-theme-main transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Live Search Suggestions Dropdown */}
          {isDropdownFocused && searchQuery.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-theme-surface border border-theme-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in divide-y divide-theme-border/50">
              
              {/* Header */}
              <div className="p-3 bg-theme-surface-alt/60 flex items-center justify-between text-xs text-theme-muted">
                <span className="font-semibold text-theme-main flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-brand-orange" />
                  Quick Results for &quot;{searchQuery}&quot;
                </span>
                <span>{liveResults.total} matches found</span>
              </div>

              {/* Cases Matches */}
              {liveResults.cases.length > 0 && (
                <div className="p-3 space-y-1.5 bg-theme-surface">
                  <div className="flex items-center justify-between text-[11px] font-bold text-brand-orange uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5" /> Case Law ({liveResults.cases.length})
                    </span>
                    <Link 
                      to={`/manage-cases?search=${encodeURIComponent(searchQuery)}`}
                      className="hover:underline flex items-center gap-0.5 text-xs normal-case font-medium text-brand-orange"
                    >
                      View in Cases <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>

                  {liveResults.cases.map(c => (
                    <Link
                      key={c.id}
                      to={`/manage-cases?search=${encodeURIComponent(c.sldNumber || searchQuery)}`}
                      onClick={() => setIsDropdownFocused(false)}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-theme-surface-alt transition-colors group"
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="text-xs font-semibold text-theme-main group-hover:text-brand-orange truncate">
                          SLD #{c.sldNumber} • {c.court}
                        </span>
                        <span className="text-[11px] text-theme-muted truncate">
                          {Array.isArray(c.caseNumber) ? c.caseNumber[0] : c.caseNumber} • {c.dated}
                        </span>
                      </div>
                      <span className="text-xs text-brand-orange font-medium shrink-0">Open &rarr;</span>
                    </Link>
                  ))}
                </div>
              )}

              {/* Statutes Matches */}
              {liveResults.statutes.length > 0 && (
                <div className="p-3 space-y-1.5 bg-theme-surface">
                  <div className="flex items-center justify-between text-[11px] font-bold text-brand-orange uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> Statutes ({liveResults.statutes.length})
                    </span>
                    <Link 
                      to={`/manage-statutes?search=${encodeURIComponent(searchQuery)}`}
                      className="hover:underline flex items-center gap-0.5 text-xs normal-case font-medium text-brand-orange"
                    >
                      View in Statutes <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>

                  {liveResults.statutes.map(s => (
                    <Link
                      key={s.id}
                      to={`/manage-statutes?search=${encodeURIComponent(s.id.toString())}`}
                      onClick={() => setIsDropdownFocused(false)}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-theme-surface-alt transition-colors group"
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="text-xs font-semibold text-theme-main group-hover:text-brand-orange truncate">
                          Statute #{s.id} • {s.law}
                        </span>
                        <span className="text-[11px] text-theme-muted truncate">
                          Section {s.section} ({s.sectionHeading})
                        </span>
                      </div>
                      <span className="text-xs text-brand-orange font-medium shrink-0">Open &rarr;</span>
                    </Link>
                  ))}
                </div>
              )}

              {/* Notifications Matches */}
              {liveResults.notifications.length > 0 && (
                <div className="p-3 space-y-1.5 bg-theme-surface">
                  <div className="flex items-center justify-between text-[11px] font-bold text-brand-orange uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Bell className="w-3.5 h-3.5" /> Notifications ({liveResults.notifications.length})
                    </span>
                    <Link 
                      to={`/manage-notifications?search=${encodeURIComponent(searchQuery)}`}
                      className="hover:underline flex items-center gap-0.5 text-xs normal-case font-medium text-brand-orange"
                    >
                      View in Notifications <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>

                  {liveResults.notifications.map(n => (
                    <Link
                      key={n.id}
                      to={`/manage-notifications?search=${encodeURIComponent(n.srNumber?.toString() || searchQuery)}`}
                      onClick={() => setIsDropdownFocused(false)}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-theme-surface-alt transition-colors group"
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="text-xs font-semibold text-theme-main group-hover:text-brand-orange truncate">
                          SR #{n.srNumber} • {n.sroNumber}
                        </span>
                        <span className="text-[11px] text-theme-muted truncate">
                          {n.subject} • {n.department}
                        </span>
                      </div>
                      <span className="text-xs text-brand-orange font-medium shrink-0">Open &rarr;</span>
                    </Link>
                  ))}
                </div>
              )}

              {/* 0 Matches */}
              {liveResults.total === 0 && (
                <div className="p-6 text-center text-xs text-theme-muted bg-theme-surface">
                  No direct matches for &quot;{searchQuery}&quot;. Press Enter or click Search to view all matching records.
                </div>
              )}

              {/* Bottom Footer Submit */}
              <div className="p-2.5 bg-theme-surface-alt text-center">
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="text-xs font-semibold text-brand-orange hover:text-[#D44E35] flex items-center justify-center gap-1 w-full"
                >
                  Search all records for &quot;{searchQuery}&quot; &rarr;
                </button>
              </div>

            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <Button 
            type="submit" 
            variant="primary" 
            className="flex-1 sm:flex-none bg-brand-orange hover:bg-[#D44E35] text-white flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" /> Search
          </Button>

          {/* Filter Toggle Button */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`relative px-4 py-2.5 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2 shadow-sm ${
              isOpen || activeFiltersCount > 0
                ? 'bg-brand-orange/10 border-brand-orange text-brand-orange dark:bg-brand-orange/20'
                : 'bg-theme-surface border-theme-border text-theme-main hover:bg-theme-surface-alt'
            }`}
            title="Filter search results"
          >
            <Filter className={`w-4 h-4 ${isOpen || activeFiltersCount > 0 ? 'text-brand-orange' : 'text-brand-orange'}`} />
            <span className="hidden xs:inline">Filter</span>
            
            {activeFiltersCount > 0 && (
              <span className="bg-brand-orange text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </form>

      {/* Active Filter Chips */}
      {(activeFiltersCount > 0 || searchQuery) && (
        <div className="flex items-center gap-2 flex-wrap text-xs animate-fade-in pt-1">
          <span className="text-theme-muted font-medium">Active filters:</span>
          
          {searchQuery && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-orange/10 border border-brand-orange/30 text-brand-orange rounded-lg">
              Query: &quot;{searchQuery}&quot;
              <button onClick={handleClearSearch} className="hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.recordType !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-theme-surface-alt border border-theme-border text-theme-main rounded-lg">
              Type: {RECORD_TYPES.find(r => r.id === filters.recordType)?.label}
              <button onClick={() => handleUpdateFilter('recordType', 'all')} className="hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.court !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-theme-surface-alt border border-theme-border text-theme-main rounded-lg">
              Court: {COURTS.find(c => c.value === filters.court)?.label || filters.court}
              <button onClick={() => handleUpdateFilter('court', 'all')} className="hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.timeframe !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-theme-surface-alt border border-theme-border text-theme-main rounded-lg">
              Time: {TIMEFRAMES.find(t => t.value === filters.timeframe)?.label}
              <button onClick={() => handleUpdateFilter('timeframe', 'all')} className="hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.status !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-theme-surface-alt border border-theme-border text-theme-main rounded-lg">
              Status: {filters.status === 'active' ? 'Active' : 'Inactive'}
              <button onClick={() => handleUpdateFilter('status', 'all')} className="hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.hasAttachment && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-theme-surface-alt border border-theme-border text-theme-main rounded-lg">
              With Attachments Only
              <button onClick={() => handleUpdateFilter('hasAttachment', false)} className="hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs text-red-500 hover:text-red-600 font-medium ml-1 transition-colors underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Expandable Filter Panel */}
      {isOpen && (
        <div className="bg-theme-surface border border-theme-border rounded-2xl p-5 shadow-md animate-fade-in space-y-4">
          <div className="flex items-center justify-between border-b border-theme-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-brand-orange" />
              <h3 className="text-sm font-semibold text-theme-main">Filter Dashboard Records</h3>
            </div>
            
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-theme-muted hover:text-theme-main hover:bg-theme-surface-alt transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Record Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-theme-muted uppercase tracking-wider block">
                Record Type
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {RECORD_TYPES.map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleUpdateFilter('recordType', type.id)}
                    className={`px-2.5 py-2 rounded-xl text-xs font-medium border transition-all text-center flex items-center justify-center gap-1.5 ${
                      filters.recordType === type.id
                        ? 'bg-brand-orange text-white border-brand-orange shadow-sm font-semibold'
                        : 'bg-theme-surface-alt/60 hover:bg-theme-surface-alt text-theme-main border-theme-border'
                    }`}
                  >
                    {type.icon && <type.icon className="w-3.5 h-3.5" />}
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Court / Jurisdiction */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-theme-muted uppercase tracking-wider block flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-brand-orange" /> Court / Authority
              </label>
              <select
                value={filters.court}
                onChange={(e) => handleUpdateFilter('court', e.target.value)}
                className="w-full px-3 py-2 bg-theme-surface border border-theme-border rounded-xl text-xs text-theme-main focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange cursor-pointer"
              >
                {COURTS.map(court => (
                  <option key={court.value} value={court.value} className="bg-theme-surface text-theme-main">
                    {court.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Timeframe */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-theme-muted uppercase tracking-wider block flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-brand-orange" /> Timeframe
              </label>
              <select
                value={filters.timeframe}
                onChange={(e) => handleUpdateFilter('timeframe', e.target.value)}
                className="w-full px-3 py-2 bg-theme-surface border border-theme-border rounded-xl text-xs text-theme-main focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange cursor-pointer"
              >
                {TIMEFRAMES.map(tf => (
                  <option key={tf.value} value={tf.value} className="bg-theme-surface text-theme-main">
                    {tf.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status & Attachments */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-theme-muted uppercase tracking-wider block">
                Status & Attachment
              </label>
              <div className="flex flex-col gap-2">
                <select
                  value={filters.status}
                  onChange={(e) => handleUpdateFilter('status', e.target.value)}
                  className="w-full px-3 py-2 bg-theme-surface border border-theme-border rounded-xl text-xs text-theme-main focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange cursor-pointer"
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-theme-surface text-theme-main">
                      {opt.label}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-2 text-xs text-theme-main cursor-pointer hover:text-brand-orange select-none pt-0.5">
                  <input
                    type="checkbox"
                    checked={filters.hasAttachment}
                    onChange={(e) => handleUpdateFilter('hasAttachment', e.target.checked)}
                    className="rounded border-theme-border text-brand-orange focus:ring-brand-orange accent-[#E55C41] cursor-pointer"
                  />
                  <Paperclip className="w-3.5 h-3.5 text-brand-orange shrink-0" />
                  <span>Has attachments only</span>
                </label>
              </div>
            </div>

          </div>

          {/* Panel Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-theme-border/60">
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-theme-muted hover:text-red-500 font-medium flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
            </button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-brand-orange hover:bg-[#D44E35] text-white flex items-center gap-1.5"
                onClick={() => {
                  setIsOpen(false);
                  if (onSearch) onSearch();
                }}
              >
                <Check className="w-3.5 h-3.5" /> Apply Filters
              </Button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

export default GlobalSearch;

