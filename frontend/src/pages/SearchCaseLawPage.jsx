import React, { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';
import { caseService } from '../features/cases/services/caseService';
import { settingService } from '../services/settingService';
import { magazineService, courtService } from '../services/adminSettingsServices';
import CaseDocumentModal from '../components/ui/CaseDocumentModal';

/* ── Shared styles ────────────────────────────────────────────────────── */
const inp =
  'w-full bg-white text-gray-700 placeholder-gray-400 text-sm px-3 py-2 rounded-md ' +
  'border-0 outline-none focus:ring-2 focus:ring-[#4a7a9b]/40 h-[38px]';

const sel =
  'w-full bg-white text-gray-700 text-sm px-3 py-2 rounded-md ' +
  'border-0 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-[#4a7a9b]/40 h-[38px]';

const SelectField = React.memo(({ value, onChange, options = [] }) => {
  const allOptions = React.useMemo(() => {
    const list = [...options];
    if (value && !list.some(o => o.value === value)) {
      list.push({ value, label: value });
    }
    return list;
  }, [options, value]);

  return (
    <div className="relative w-full">
      <select className={sel} value={value} onChange={onChange}>
        {allOptions.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    </div>
  );
});

/* ─────────────────────────────────────────────────────────────────────── */

const EMPTY = {
  yearVolume: '', magazine: '', page: '',
  selectLaw: '', section: '', section2: '',
  court: '', caseNumber: '', date: '',
  text: '', text2: '', phrase: '',
  judges: '', lawyers: '', petitioner: '',
  principleLaw: '',
};

const SearchCaseLawPage = () => {
  const [f, setF]               = useState(EMPTY);
  const [results, setResults]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [viewId, setViewId]     = useState(null);

  // Dynamic dropdown options fetched entirely from backend
  const [magazineOptions, setMagazineOptions] = useState([{ value: '', label: 'Select Magazine' }]);
  const [courtOptions, setCourtOptions] = useState([{ value: '', label: 'Select Court' }]);
  const [lawOptions, setLawOptions] = useState([{ value: '', label: 'Select Law' }]);
  const [principleOptions, setPrincipleOptions] = useState([{ value: '', label: 'Select Principle Law' }]);

  // Dynamically load all dropdown options from backend collections
  useEffect(() => {
    let isMounted = true;

    // 1. Fetch Magazines from backend
    magazineService.getMagazines({ status: 'active' })
      .then(res => {
        if (isMounted && res?.data && Array.isArray(res.data) && res.data.length > 0) {
          setMagazineOptions([
            { value: '', label: 'Select Magazine' },
            ...res.data.map(m => ({ value: m.name, label: m.name }))
          ]);
        }
      })
      .catch(err => {
        console.warn('Could not load dynamic magazines for SearchCaseLawPage:', err);
      });

    // 2. Fetch Courts from backend
    courtService.getCourts({ status: 'active' })
      .then(res => {
        if (isMounted && res?.data && Array.isArray(res.data) && res.data.length > 0) {
          setCourtOptions([
            { value: '', label: 'Select Court' },
            ...res.data.map(c => ({ value: c.name, label: c.name }))
          ]);
        }
      })
      .catch(err => {
        console.warn('Could not load dynamic courts for SearchCaseLawPage:', err);
      });

    // 3. Fetch Laws from backend
    settingService.getLaws({ status: 'active', limit: 5000 })
      .then(res => {
        if (isMounted && res?.data && Array.isArray(res.data) && res.data.length > 0) {
          const fetchedLaws = res.data.map(l => ({ value: l.name, label: l.name }));
          setLawOptions([
            { value: '', label: 'Select Law' },
            ...fetchedLaws
          ]);
          setPrincipleOptions([
            { value: '', label: 'Select Principle Law' },
            ...fetchedLaws
          ]);
        }
      })
      .catch(err => {
        console.warn('Could not load dynamic laws for SearchCaseLawPage:', err);
      });

    return () => { isMounted = false; };
  }, []);

  const set = field => e => setF(p => ({ ...p, [field]: e.target.value }));

  const handleSearch = async () => {
    setError(null);
    setResults(null);

    const filters = {
      yearVolume:   f.yearVolume   || undefined,
      magazine:     f.magazine     || undefined,
      page:         f.page         || undefined,
      selectLaw:    f.selectLaw    || undefined,
      section:      f.section      || undefined,
      section2:     f.section2     || undefined,
      court:        f.court        || undefined,
      caseNumber:   f.caseNumber   || undefined,
      date:         f.date         || undefined,
      keywords:     f.text         || undefined,
      keywords2:    f.text2        || undefined,
      phrase:       f.phrase       || undefined,
      judges:       f.judges       || undefined,
      lawyers:      f.lawyers      || undefined,
      petitioner:   f.petitioner   || undefined,
      principleLaw: f.principleLaw || undefined,
    };

    const hasAny = Object.values(filters).some(v => v);
    if (!hasAny) { setError('Please fill in at least one field.'); return; }

    setLoading(true);
    try {
      const data = await caseService.searchCases(filters);
      setResults(data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => { setF(EMPTY); setResults(null); setError(null); };

  const handleKeyDown = e => { if (e.key === 'Enter') handleSearch(); };

  /* ── render ─────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col w-full animate-fade-in" onKeyDown={handleKeyDown}>

      {/* ── White header bar ─────────────────────────────────────────────── */}
      <div className="bg-white px-6 py-3 flex items-center justify-between border-b border-gray-200 rounded-t-xl shadow-sm">
        <span className="text-sm font-semibold text-gray-800">Select single or multiple blocks</span>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-5 py-1.5 bg-[#3d4a7a] hover:bg-[#2e3a6a] text-white text-sm font-semibold rounded transition-colors disabled:opacity-60"
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {/* ── Blue panel ───────────────────────────────────────────────────── */}
      <div className="bg-[#a8cfe0] px-8 py-6 rounded-b-xl">

        {error && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
            {error}
          </div>
        )}

        {/* ── Row 1: Year/vol · Select Magazine · Page ───────────────── */}
        <div className="grid grid-cols-3 gap-4 mb-3">
          {/* Year/vol — narrower, centered-ish */}
          <div className="flex justify-center">
            <div className="w-[75%]">
              <input className={inp} placeholder="Year/vol" value={f.yearVolume} onChange={set('yearVolume')} />
            </div>
          </div>
          <SelectField value={f.magazine} onChange={set('magazine')} options={magazineOptions} />
          <div className="flex justify-center">
            <div className="w-[75%]">
              <input className={inp} placeholder="Page" value={f.page} onChange={set('page')} />
            </div>
          </div>
        </div>

        {/* ── Row 2: Select Law (wide) · Enter Section · Enter Section 2 ─ */}
        <div className="flex gap-4 mb-3 items-center">
          <div className="w-[58%]">
            <SelectField value={f.selectLaw} onChange={set('selectLaw')} options={lawOptions} />
          </div>
          <div className="flex-1">
            <input className={inp} placeholder="Enter Section" value={f.section} onChange={set('section')} />
          </div>
          <div className="flex-1">
            <input className={inp} placeholder="Enter Section 2" value={f.section2} onChange={set('section2')} />
          </div>
        </div>

        {/* ── Row 3: Select Court (wide) · Enter Case # · Enter Date ────── */}
        <div className="flex gap-4 mb-3 items-center">
          <div className="w-[58%]">
            <SelectField value={f.court} onChange={set('court')} options={courtOptions} />
          </div>
          <div className="flex-1">
            <input className={inp} placeholder="Enter Case #" value={f.caseNumber} onChange={set('caseNumber')} />
          </div>
          <div className="flex-1">
            <input className={inp} placeholder="Enter Date" value={f.date} onChange={set('date')} />
          </div>
        </div>

        {/* ── Row 4: Enter Text · Enter Text 2 · Phrase Search ─────────── */}
        <div className="grid grid-cols-3 gap-4 mb-3">
          <input className={inp} placeholder="Enter Text" value={f.text} onChange={set('text')} />
          <input className={inp} placeholder="Enter Text 2" value={f.text2} onChange={set('text2')} />
          <input className={inp} placeholder="Phrase Search" value={f.phrase} onChange={set('phrase')} />
        </div>

        {/* ── Row 5: Judges · Lawyers · Petitioner (shifted right, centered) */}
        <div className="grid grid-cols-3 gap-4 mb-3 px-[8.33%]">
          <input className={inp} placeholder="Judges" value={f.judges} onChange={set('judges')} />
          <input className={inp} placeholder="Lawyers" value={f.lawyers} onChange={set('lawyers')} />
          <input className={inp} placeholder="Petitioner" value={f.petitioner} onChange={set('petitioner')} />
        </div>

        {/* ── Row 6: Select Principle Law — centered wide ───────────────── */}
        <div className="flex justify-center mb-5">
          <div className="w-[66%]">
            <SelectField value={f.principleLaw} onChange={set('principleLaw')} options={principleOptions} />
          </div>
        </div>

        {/* ── Centered Search button ────────────────────────────────────── */}
        <div className="flex justify-center gap-3">
          <button
            onClick={handleReset}
            className="px-5 py-1.5 border border-white/60 text-white text-sm font-medium rounded hover:bg-white/20 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-10 py-2 bg-[#3d4a7a] hover:bg-[#2e3a6a] text-white text-sm font-semibold rounded transition-colors disabled:opacity-60 min-w-[120px]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Searching…
              </span>
            ) : 'Search'}
          </button>
        </div>
      </div>

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {results !== null && (
        <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
            <span className="text-sm font-semibold text-gray-800">
              Search Results
            </span>
            <span className="px-2.5 py-0.5 bg-[#a8cfe0] text-[#1e3a5a] text-xs font-bold rounded-full">
              {results.length} record{results.length !== 1 ? 's' : ''} found
            </span>
          </div>

          {results.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">No records match your search criteria.</p>
              <button onClick={handleReset} className="mt-3 text-[#3d4a7a] hover:underline text-xs font-medium">
                Clear and try again
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#3d4a7a] text-white">
                    <th className="px-3 py-2.5 font-semibold">#</th>
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap">SLD #</th>
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Citation</th>
                    <th className="px-3 py-2.5 font-semibold">Court</th>
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Case No.</th>
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Date</th>
                    <th className="px-3 py-2.5 font-semibold">Head Note</th>
                    <th className="px-3 py-2.5 font-semibold"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {results.map((c, i) => (
                    <tr key={c.id || i} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-3 py-2.5 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">
                        {c.sldNumber || '—'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {(Array.isArray(c.mapYearPage) ? c.mapYearPage : []).map((cit, j) => (
                          <span key={j} className="inline-block mr-1 px-1.5 py-0.5 bg-[#a8cfe0]/50 text-[#1e3a5a] rounded text-[11px] font-semibold">
                            {cit}
                          </span>
                        ))}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700 max-w-[180px] truncate">
                        {c.court || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 max-w-[140px] truncate">
                        {Array.isArray(c.caseNumber) ? c.caseNumber.join(', ') : (c.caseNumber || '—')}
                      </td>
                      <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                        {c.dated ? String(c.dated).split('T')[0] : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 max-w-[260px]">
                        <p className="line-clamp-2">{c.headNote || '—'}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <a
                          href={`/cases/view/${c.id || c._id || c.sldNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#3d4a7a] hover:bg-[#2e3a6a] text-white text-[11px] font-semibold rounded transition-colors whitespace-nowrap"
                        >
                          <Eye className="w-3 h-3" /> View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <CaseDocumentModal caseId={viewId} onClose={() => setViewId(null)} />
    </div>
  );
};

export default SearchCaseLawPage;
