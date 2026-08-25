import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Download, 
  FileText, 
  FileDown, 
  FileSpreadsheet, 
  Printer, 
  Hash, 
  Search, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import ManageCasesFilterBar from '../features/cases/components/ManageCasesFilterBar';
import ManageCasesTable from '../features/cases/components/ManageCasesTable';
import AdminFooter from '../features/dashboard/components/AdminFooter';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import FormField from '../components/ui/FormField';
import { MOCK_CASES } from '../features/cases/data/casesMockData';

// Helper function to generate and download file bundles
const downloadCaseExport = (caseItems, format = 'pdf', customTitle = '') => {
  const count = caseItems.length;
  const extension = format === 'word' ? 'doc' : format === 'excel' ? 'csv' : 'txt';
  const fileName = count === 1 
    ? `SLD_Case_${caseItems[0].sldNumber || caseItems[0].id}.${extension}`
    : `SLD_Cases_Export_${count}_Cases.${extension}`;
    
  let content = `========================================================================\n`;
  content += `                     SLD SYSTEM - LAW REPORTS EXPORT                     \n`;
  content += `========================================================================\n`;
  if (customTitle) content += `Category: ${customTitle}\n`;
  content += `Generated Date: ${new Date().toLocaleString()}\n`;
  content += `Total Records: ${count}\n`;
  content += `Export Format: ${format.toUpperCase()}\n`;
  content += `========================================================================\n\n`;

  caseItems.forEach((c, idx) => {
    content += `CASE #${idx + 1}\n`;
    content += `SLD Number:       ${c.sldNumber || 'N/A'}\n`;
    content += `Dated:            ${c.dated || 'N/A'}\n`;
    content += `Court:            ${c.court || 'N/A'}\n`;
    content += `Case Number:      ${Array.isArray(c.caseNumber) ? c.caseNumber.join(' ') : c.caseNumber || 'N/A'}\n`;
    content += `Judges Bench:     ${Array.isArray(c.judges) ? c.judges.join(' ') : c.judges || 'N/A'}\n`;
    content += `Lawyers:          ${Array.isArray(c.lawyers) ? c.lawyers.join(' ') : c.lawyers || 'N/A'}\n`;
    content += `Petitioners:      ${Array.isArray(c.petitioners) ? c.petitioners.join(' ') : c.petitioners || 'N/A'}\n`;
    content += `Citations:        ${Array.isArray(c.mapYearPage) ? c.mapYearPage.join(' | ') : c.mapYearPage || 'N/A'}\n`;
    content += `Status:           ${c.status || 'Active'}\n`;
    content += `------------------------------------------------------------------------\n\n`;
  });

  const mimeType = format === 'word' ? 'application/msword' : format === 'excel' ? 'text/csv' : 'text/plain';
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const ManageCasesPage = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('search') || '';

  const [cases, setCases] = useState(MOCK_CASES);
  const [selectedIds, setSelectedIds] = useState([]);
  const [toastMessage, setToastMessage] = useState('');
  
  // Search & Filter State
  const [filters, setFilters] = useState({
    subject: initialQuery,
    fromDate: null,
    toDate: null,
    magazine: ''
  });

  // Sync if URL search param updates
  useEffect(() => {
    const q = searchParams.get('search');
    if (q !== null && q !== undefined) {
      setFilters(prev => ({ ...prev, subject: q }));
    }
  }, [searchParams]);

  // Export Modal State (when 0 cases are selected)
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportCaseNumber, setExportCaseNumber] = useState('');
  const [exportFormat, setExportFormat] = useState('pdf');
  const [exportError, setExportError] = useState('');

  // Head Notes & Judgment & Get Case ID Modal States
  const [actionModal, setActionModal] = useState(null); // 'headNotes' | 'judgment' | 'getCaseId' | null
  const [actionCaseNumber, setActionCaseNumber] = useState('');
  const [actionError, setActionError] = useState('');

  // State for currentPage and highlighted case
  const [currentPage, setCurrentPage] = useState(1);
  const [highlightedId, setHighlightedId] = useState(null);

  // Filtered cases based on search criteria
  const filteredCases = useMemo(() => {
    return cases.filter(item => {
      if (filters.subject) {
        const query = filters.subject.toLowerCase().trim();
        const courtMatch = item.court?.toLowerCase().includes(query);
        const sldMatch = item.sldNumber?.toLowerCase().includes(query);
        const dateMatch = item.dated?.toLowerCase().includes(query);
        const caseNumMatch = Array.isArray(item.caseNumber) && item.caseNumber.some(c => c.toLowerCase().includes(query));
        const judgesMatch = Array.isArray(item.judges) && item.judges.some(j => j.toLowerCase().includes(query));
        const lawyersMatch = Array.isArray(item.lawyers) && item.lawyers.some(l => l.toLowerCase().includes(query));
        const petitionersMatch = Array.isArray(item.petitioners) && item.petitioners.some(p => p.toLowerCase().includes(query));
        const citationMatch = Array.isArray(item.mapYearPage) && item.mapYearPage.some(m => m.toLowerCase().includes(query));
        
        if (!courtMatch && !sldMatch && !dateMatch && !caseNumMatch && !judgesMatch && !lawyersMatch && !petitionersMatch && !citationMatch) {
          return false;
        }
      }
      if (filters.magazine) {
        const magMatch = item.mapYearPage?.some(m => m.toLowerCase().includes(filters.magazine.toLowerCase()));
        if (!magMatch) return false;
      }
      return true;
    });
  }, [cases, filters]);

  // Main Export Handler
  const handleExport = (format = 'pdf') => {
    if (selectedIds.length > 0) {
      // 1 or more cases selected -> direct export
      const selectedCases = cases.filter(c => selectedIds.includes(c.id));
      downloadCaseExport(selectedCases, format);
      setToastMessage(`Successfully exported ${selectedCases.length} selected case(s) as ${format.toUpperCase()}.`);
      setTimeout(() => setToastMessage(''), 4000);
    } else {
      // 0 cases selected -> open dialogue box asking for Case Number
      setExportFormat(format);
      setExportCaseNumber('');
      setExportError('');
      setExportModalOpen(true);
    }
  };

  // Submit Export from Dialogue Box
  const handleExportSubmit = (e) => {
    e?.preventDefault();
    setExportError('');

    if (!exportCaseNumber.trim()) {
      setExportError('Please specify or select a Case Number or SLD # to export.');
      return;
    }

    const cleanInput = exportCaseNumber.trim();
    // Search for match in cases database
    const matched = cases.find(c => 
      c.sldNumber === cleanInput || 
      c.id.toString() === cleanInput ||
      (Array.isArray(c.caseNumber) && c.caseNumber.some(n => n.toLowerCase().includes(cleanInput.toLowerCase())))
    );

    const exportTarget = matched || {
      id: 9999,
      sldNumber: cleanInput,
      dated: new Date().toISOString().split('T')[0],
      court: 'High Court / Supreme Court of Pakistan',
      caseNumber: [cleanInput],
      judges: ['Honorable Bench'],
      lawyers: ['Advocates of Supreme Court'],
      petitioners: ['Petitioner vs. Respondent'],
      mapYearPage: [`SLD 2025 ${cleanInput}`],
      status: 'Active'
    };

    downloadCaseExport([exportTarget], exportFormat);
    setToastMessage(`Case "${exportTarget.sldNumber || cleanInput}" exported successfully as ${exportFormat.toUpperCase()}.`);
    setExportModalOpen(false);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Head Notes Action Handler
  const handleHeadNotes = () => {
    if (selectedIds.length > 0) {
      const selectedCases = cases.filter(c => selectedIds.includes(c.id));
      downloadCaseExport(selectedCases, 'pdf', 'HEAD NOTES & CITATIONS');
      setToastMessage(`Generated Head Notes document for ${selectedCases.length} selected case(s).`);
      setTimeout(() => setToastMessage(''), 4000);
    } else {
      setActionCaseNumber('');
      setActionError('');
      setActionModal('headNotes');
    }
  };

  // Judgment Action Handler
  const handleJudgment = () => {
    if (selectedIds.length > 0) {
      const selectedCases = cases.filter(c => selectedIds.includes(c.id));
      downloadCaseExport(selectedCases, 'pdf', 'FULL JUDGMENT ORDER');
      setToastMessage(`Generated Judgment document for ${selectedCases.length} selected case(s).`);
      setTimeout(() => setToastMessage(''), 4000);
    } else {
      setActionCaseNumber('');
      setActionError('');
      setActionModal('judgment');
    }
  };

  // Get Case ID Handler (opens dialogue box to locate & scroll to case)
  const handleGetCaseId = () => {
    setActionCaseNumber('');
    setActionError('');
    setActionModal('getCaseId');
  };

  // Generic Action Modal Submit (Head Notes / Judgment / Get Case ID)
  const handleActionSubmit = (e) => {
    e?.preventDefault();
    setActionError('');

    if (!actionCaseNumber.trim()) {
      setActionError('Please enter a Case Number or SLD #.');
      return;
    }

    const clean = actionCaseNumber.trim().toLowerCase().replace(/^sld\s*#?/i, '').trim();
    
    // Find index in total cases
    const foundIndex = cases.findIndex(c => 
      c.sldNumber?.toLowerCase() === clean || 
      c.id?.toString() === clean ||
      (Array.isArray(c.caseNumber) && c.caseNumber.some(n => n.toLowerCase().includes(clean)))
    );

    if (actionModal === 'getCaseId') {
      if (foundIndex === -1) {
        setActionError(`Case SLD #${actionCaseNumber.trim()} does not exist in records.`);
        return;
      }

      const target = cases[foundIndex];
      
      // If current search filters hide this case, reset search
      const isVisibleInFilter = filteredCases.some(c => c.id === target.id);
      if (!isVisibleInFilter) {
        setFilters({ subject: '', fromDate: null, toDate: null, magazine: '' });
      }

      // Calculate the page the case resides on (10 items per page)
      const targetPage = Math.floor(foundIndex / 10) + 1;
      setCurrentPage(targetPage);
      setHighlightedId(target.id);

      setActionModal(null);
      setToastMessage(`Located Case SLD #${target.sldNumber} on Page ${targetPage}. Scrolling to position...`);

      // Scroll smoothly to case element
      setTimeout(() => {
        const rowEl = document.getElementById(`case-row-${target.id}`);
        if (rowEl) {
          rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 200);

      // Reset highlight after pulse animation
      setTimeout(() => {
        setHighlightedId(null);
      }, 4500);

      return;
    }

    // Handle Head Notes or Judgment
    const matched = cases.find(c => 
      c.sldNumber === clean || 
      c.id.toString() === clean ||
      (Array.isArray(c.caseNumber) && c.caseNumber.some(n => n.toLowerCase().includes(clean)))
    );

    const target = matched || {
      id: 9999,
      sldNumber: actionCaseNumber.trim(),
      dated: new Date().toISOString().split('T')[0],
      court: 'Pakistan Law Jurisdiction',
      caseNumber: [actionCaseNumber.trim()],
      judges: ['Honorable Bench'],
      lawyers: ['Advocate on Record'],
      petitioners: ['Party vs. State'],
      mapYearPage: [`SLD 2025 ${actionCaseNumber.trim()}`],
      status: 'Active'
    };

    if (actionModal === 'headNotes') {
      downloadCaseExport([target], 'pdf', 'HEAD NOTES & CITATIONS');
      setToastMessage(`Generated Head Notes for Case SLD #${target.sldNumber || actionCaseNumber.trim()}.`);
    } else if (actionModal === 'judgment') {
      downloadCaseExport([target], 'pdf', 'FULL JUDGMENT ORDER');
      setToastMessage(`Generated Judgment for Case SLD #${target.sldNumber || actionCaseNumber.trim()}.`);
    }

    setActionModal(null);
    setTimeout(() => setToastMessage(''), 4000);
  };

  return (
    <div className="flex flex-col h-full w-full animate-fade-in">
      <ManageCasesFilterBar 
        selectedCount={selectedIds.length}
        initialSearch={filters.subject}
        onExport={handleExport}
        onHeadNotes={handleHeadNotes}
        onJudgment={handleJudgment}
        onGetCaseId={handleGetCaseId}
        onSearch={setFilters}
        onShowAll={() => setFilters({ subject: '', fromDate: null, toDate: null, magazine: '' })}
      />

      <div className="flex-1">
        <ManageCasesTable 
          cases={filteredCases}
          setCases={setCases}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          toastMessage={toastMessage}
          setToastMessage={setToastMessage}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          highlightedId={highlightedId}
          onExportSelection={handleExport}
        />
      </div>

      <AdminFooter />

      {/* Export Case Dialogue Box (When No Case Selected) */}
      <Modal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="Export Case Law"
        subtitle="Specify a Case Number or SLD # to export"
        icon={Download}
        maxWidth="max-w-lg"
        footer={
          <>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setExportModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              size="sm"
              className="bg-brand-orange hover:bg-[#D44E35] text-white flex items-center gap-1.5"
              onClick={handleExportSubmit}
            >
              <Download className="w-4 h-4" /> Export Case
            </Button>
          </>
        }
      >
        <form onSubmit={handleExportSubmit} className="space-y-5">
          {exportError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{exportError}</span>
            </div>
          )}

          <div className="space-y-2">
            <FormField label="Case Number or SLD #" required>
              <Input 
                value={exportCaseNumber}
                onChange={(e) => {
                  setExportCaseNumber(e.target.value);
                  if (exportError) setExportError('');
                }}
                placeholder="e.g. 1629516 or C.P.L.A.3458-K/2022"
                required
                autoFocus
              />
            </FormField>

            {/* Quick Suggestions from available cases */}
            <div className="pt-1">
              <span className="text-[11px] text-theme-muted font-medium block mb-1.5">Quick select from database:</span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {cases.slice(0, 8).map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setExportCaseNumber(c.sldNumber);
                      if (exportError) setExportError('');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      exportCaseNumber === c.sldNumber
                        ? 'bg-brand-orange text-white border-brand-orange'
                        : 'bg-theme-surface-alt/60 hover:bg-theme-surface-alt text-theme-main border-theme-border'
                    }`}
                  >
                    SLD #{c.sldNumber}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Format Selection Cards */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-theme-main">Choose Export Format</label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setExportFormat('pdf')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center ${
                  exportFormat === 'pdf'
                    ? 'border-brand-orange bg-brand-orange/10 text-brand-orange font-semibold shadow-sm'
                    : 'border-theme-border bg-theme-surface-alt/30 hover:bg-theme-surface-alt text-theme-muted hover:text-theme-main'
                }`}
              >
                <FileText className="w-5 h-5 text-red-500" />
                <span className="text-xs">PDF Document</span>
              </button>

              <button
                type="button"
                onClick={() => setExportFormat('word')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center ${
                  exportFormat === 'word'
                    ? 'border-brand-orange bg-brand-orange/10 text-brand-orange font-semibold shadow-sm'
                    : 'border-theme-border bg-theme-surface-alt/30 hover:bg-theme-surface-alt text-theme-muted hover:text-theme-main'
                }`}
              >
                <FileDown className="w-5 h-5 text-blue-500" />
                <span className="text-xs">Word (.doc)</span>
              </button>

              <button
                type="button"
                onClick={() => setExportFormat('excel')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center ${
                  exportFormat === 'excel'
                    ? 'border-brand-orange bg-brand-orange/10 text-brand-orange font-semibold shadow-sm'
                    : 'border-theme-border bg-theme-surface-alt/30 hover:bg-theme-surface-alt text-theme-muted hover:text-theme-main'
                }`}
              >
                <FileSpreadsheet className="w-5 h-5 text-green-500" />
                <span className="text-xs">Excel (.csv)</span>
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Head Notes / Judgment / Get Case ID Dialogue Modal */}
      <Modal
        isOpen={Boolean(actionModal)}
        onClose={() => setActionModal(null)}
        title={
          actionModal === 'headNotes' 
            ? 'Generate Head Notes' 
            : actionModal === 'judgment' 
            ? 'Generate Judgment Order' 
            : 'Get Case by ID'
        }
        subtitle={
          actionModal === 'getCaseId' 
            ? 'Enter an SLD # or Case ID to scroll directly to its position' 
            : 'Enter the Case Number or SLD # to proceed'
        }
        icon={actionModal === 'getCaseId' ? Hash : Printer}
        maxWidth="max-w-md"
        footer={
          <>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setActionModal(null)}
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              size="sm"
              className="bg-brand-orange hover:bg-[#D44E35] text-white flex items-center gap-1.5"
              onClick={handleActionSubmit}
            >
              {actionModal === 'getCaseId' ? <Search className="w-4 h-4" /> : <Printer className="w-4 h-4" />}
              {actionModal === 'getCaseId' ? 'Locate & Scroll' : 'Generate'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleActionSubmit} className="space-y-4">
          {actionError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          <FormField label="Case SLD # or Case ID" required>
            <Input 
              value={actionCaseNumber}
              onChange={(e) => {
                setActionCaseNumber(e.target.value);
                if (actionError) setActionError('');
              }}
              placeholder="e.g. 1629516 or 1629515"
              required
              autoFocus
            />
          </FormField>

          {/* Suggestions */}
          <div>
            <span className="text-[11px] text-theme-muted font-medium block mb-1.5">
              {actionModal === 'getCaseId' ? 'Quick select Case SLD #:' : 'Suggestions:'}
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
              {cases.slice(0, 10).map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setActionCaseNumber(c.sldNumber);
                    if (actionError) setActionError('');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    actionCaseNumber === c.sldNumber
                      ? 'bg-brand-orange text-white border-brand-orange'
                      : 'bg-theme-surface-alt/60 hover:bg-theme-surface-alt text-theme-main border-theme-border'
                  }`}
                >
                  SLD #{c.sldNumber}
                </button>
              ))}
            </div>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default ManageCasesPage;

