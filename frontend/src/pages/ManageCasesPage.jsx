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
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import ManageCasesFilterBar from '../features/cases/components/ManageCasesFilterBar';
import ManageCasesTable from '../features/cases/components/ManageCasesTable';
import AdminFooter from '../features/dashboard/components/AdminFooter';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import FormField from '../components/ui/FormField';
import { caseService } from '../features/cases/services/caseService';

// Helper function to generate and download file bundles
const downloadCaseExport = (caseItems, format = 'pdf', customTitle = '') => {
  const count = caseItems.length;

  if (format === 'pdf') {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popup blocker blocked case export. Please enable popups.');
      return;
    }

    let html = `
<!DOCTYPE html>
<html>
<head>
  <title>SLD System Law Reports Export</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1f2937;
      padding: 40px;
      line-height: 1.6;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #e55c41;
      padding-bottom: 16px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      color: #0b0c10;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .header p {
      margin: 4px 0 0 0;
      color: #4b5563;
      font-size: 13px;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .meta-table td {
      padding: 10px 14px;
      border: 1px solid #e5e7eb;
      font-size: 13px;
      vertical-align: top;
    }
    .meta-table td.label {
      font-weight: 600;
      background-color: #f9fafb;
      width: 130px;
      color: #4b5563;
    }
    .case-card {
      page-break-after: always;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 30px;
      background-color: #ffffff;
    }
    .case-card:last-child {
      page-break-after: avoid;
    }
    .case-title {
      color: #e55c41;
      font-size: 16px;
      font-weight: bold;
      border-bottom: 1px solid #f3f4f6;
      padding-bottom: 10px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
    }
    .detail-section {
      margin-bottom: 20px;
      background: #fafafa;
      padding: 16px;
      border-radius: 6px;
      border-left: 4px solid #e55c41;
    }
    .section-label {
      font-size: 11px;
      color: #e55c41;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 6px;
      letter-spacing: 0.5px;
    }
    .section-value {
      font-size: 13px;
      white-space: pre-wrap;
      color: #1f2937;
    }
    .section-value.bold {
      font-weight: 700;
      font-size: 14px;
    }
    @media print {
      body {
        padding: 0;
      }
      .case-card {
        border: none;
        padding: 0;
        margin: 0;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>SLD SYSTEM - LAW REPORTS EXPORT</h1>
    <p>Supreme Court & High Court Law Reports Portal</p>
    ${customTitle ? `<p style="font-weight: 600; color: #e55c41; margin-top: 6px; font-size: 14px;">${customTitle}</p>` : ''}
    <p style="font-size: 11px; color: #9ca3af; margin-top: 4px;">Generated Date: ${new Date().toLocaleString()}</p>
  </div>
  `;

    caseItems.forEach((c, idx) => {
      html += `
      <div class="case-card">
        <div class="case-title">
          <span>CASE #${idx + 1} • SLD #${c.sldNumber || 'N/A'}</span>
          <span style="font-size: 13px; color: #4b5563; font-weight: 500;">Dated: ${c.dated || 'N/A'}</span>
        </div>
        
        <table class="meta-table">
          <tr>
            <td class="label">Court</td>
            <td><strong>${c.court || 'N/A'}</strong></td>
            <td class="label">Status</td>
            <td><span style="color: #16a34a; font-weight: 600;">${c.status || 'Active'}</span></td>
          </tr>
          <tr>
            <td class="label">Case Number</td>
            <td>${Array.isArray(c.caseNumber) ? c.caseNumber.join(' ') : c.caseNumber || 'N/A'}</td>
            <td class="label">Judges Bench</td>
            <td>${Array.isArray(c.judges) ? c.judges.join(', ') : c.judges || 'N/A'}</td>
          </tr>
          <tr>
            <td class="label">Petitioners</td>
            <td>${Array.isArray(c.petitioners) ? c.petitioners.join(', ') : c.petitioners || 'N/A'}</td>
            <td class="label">Lawyers</td>
            <td>${Array.isArray(c.lawyers) ? c.lawyers.join(', ') : c.lawyers || 'N/A'}</td>
          </tr>
          <tr>
            <td class="label">Citations</td>
            <td colspan="3">${Array.isArray(c.mapYearPage) ? c.mapYearPage.join(' | ') : c.mapYearPage || 'N/A'}</td>
          </tr>
        </table>

        <div class="detail-section">
          <div class="section-label">Head Note / Principle Law</div>
          <div class="section-value bold">${c.headNote || 'N/A'}</div>
        </div>

        <div class="detail-section">
          <div class="section-label">References / Citations</div>
          <div class="section-value">${c.references || 'N/A'}</div>
        </div>

        <div class="detail-section" style="border-left-color: #4b5563;">
          <div class="section-label" style="color: #4b5563;">Judgment Order Details</div>
          <div class="section-value">${c.judgment || 'N/A'}</div>
        </div>
      </div>
      `;
    });

    html += `
  <script>
    window.onload = function() {
      window.print();
      setTimeout(function() { window.close(); }, 500);
    };
  </script>
</body>
</html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    return;
  }

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

  const [cases, setCases] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [toastMessage, setToastMessage] = useState('');

  // Fetch initial cases from caseService
  useEffect(() => {
    let isMounted = true;
    caseService.getCases().then(data => {
      if (isMounted) {
        setCases(data);
      }
    });
    return () => { isMounted = false; };
  }, []);
  
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
  const [caseIdResult, setCaseIdResult] = useState(null);
  const [isCopied, setIsCopied] = useState(false);

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

  // Get Case ID Handler (opens dialogue box to look up case no using SLD #)
  const handleGetCaseId = () => {
    setActionCaseNumber('');
    setActionError('');
    setCaseIdResult(null);
    setIsCopied(false);
    setActionModal('getCaseId');
  };

  // Generic Action Modal Submit (Head Notes / Judgment / Get Case ID)
  const handleActionSubmit = (e) => {
    e?.preventDefault();
    setActionError('');

    if (!actionCaseNumber.trim()) {
      if (actionModal === 'getCaseId') {
        setActionError('Please enter an SLD Number.');
      } else {
        setActionError('Please enter a Case Number (e.g. C.A. 145/2026).');
      }
      return;
    }

    const inputVal = actionCaseNumber.trim();

    // 1. Get Case ID Modal: Takes SLD Number -> Displays Case Number in same dialogue with Copy button
    if (actionModal === 'getCaseId') {
      const cleanSld = inputVal.toLowerCase().replace(/^sld\s*#?/i, '').trim();

      const foundIndex = cases.findIndex(c => 
        c.sldNumber?.toLowerCase() === cleanSld || 
        c.id?.toString() === cleanSld
      );

      if (foundIndex === -1) {
        setActionError(`No case found matching SLD #${inputVal}. Please enter a valid SLD number.`);
        setCaseIdResult(null);
        return;
      }

      const target = cases[foundIndex];
      const rawCaseNum = target.caseNumber;
      const caseNumbers = Array.isArray(rawCaseNum)
        ? rawCaseNum.map(n => n.split(',')[0].trim()).join(', ')
        : (rawCaseNum || 'N/A').split(',')[0].trim();
      const targetPage = Math.floor(foundIndex / 10) + 1;

      setCaseIdResult({
        target,
        caseNumbers,
        targetPage
      });
      setIsCopied(false);
      return;
    }

    // 2. Head Notes or Judgment: Strictly works with Case Number (NOT SLD Number)
    const cleanCaseNumber = inputVal.toLowerCase();

    // Find strictly by Case Number
    const matched = cases.find(c =>
      Array.isArray(c.caseNumber) && c.caseNumber.some(n => n.toLowerCase().includes(cleanCaseNumber))
    );

    if (!matched) {
      // Check if user entered an SLD number instead
      const isSldInput = cases.some(c => 
        c.sldNumber?.toLowerCase() === cleanCaseNumber || 
        c.id?.toString() === cleanCaseNumber
      );

      if (isSldInput) {
        setActionError(`"${inputVal}" is an SLD Number. Head Notes and Judgments only work with Case Numbers (e.g. C.A. 145/2026). Use 'Get Case ID' to look up Case Numbers by SLD.`);
      } else {
        setActionError(`No case found matching Case Number "${inputVal}". Please enter a valid Case Number.`);
      }
      return;
    }

    const caseNumberDisplay = Array.isArray(matched.caseNumber) ? matched.caseNumber.join(', ') : matched.caseNumber;

    if (actionModal === 'headNotes') {
      downloadCaseExport([matched], 'pdf', 'HEAD NOTES & CITATIONS');
      setToastMessage(`Generated Head Notes for Case No: ${caseNumberDisplay} (SLD #${matched.sldNumber}).`);
    } else if (actionModal === 'judgment') {
      downloadCaseExport([matched], 'pdf', 'FULL JUDGMENT ORDER');
      setToastMessage(`Generated Judgment Order for Case No: ${caseNumberDisplay} (SLD #${matched.sldNumber}).`);
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
              className="bg-brand-orange hover:bg-brand-orange-hover text-white flex items-center gap-1.5"
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
        onClose={() => {
          setActionModal(null);
          setCaseIdResult(null);
          setIsCopied(false);
        }}
        title={
          actionModal === 'headNotes' 
            ? 'Generate Head Notes by Case Number' 
            : actionModal === 'judgment' 
            ? 'Generate Judgment by Case Number' 
            : 'Get Case Number by SLD #'
        }
        subtitle={
          actionModal === 'getCaseId' 
            ? 'Enter an SLD Number to retrieve the corresponding Case Number' 
            : 'Enter the Case Number to proceed (e.g. C.A. 145/2026)'
        }
        icon={actionModal === 'getCaseId' ? Hash : Printer}
        maxWidth="max-w-md"
        footer={
          <>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setActionModal(null);
                setCaseIdResult(null);
                setIsCopied(false);
              }}
            >
              Close
            </Button>
            <Button 
              variant="primary" 
              size="sm"
              className="bg-brand-orange hover:bg-brand-orange-hover text-white flex items-center gap-1.5"
              onClick={handleActionSubmit}
            >
              {actionModal === 'getCaseId' ? <Search className="w-4 h-4" /> : <Printer className="w-4 h-4" />}
              {actionModal === 'getCaseId' ? 'Get Case No' : 'Generate Document'}
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

          <FormField 
            label={actionModal === 'getCaseId' ? 'SLD Number (Required)' : 'Case Number (Required)'} 
            required
          >
            <Input 
              value={actionCaseNumber}
              onChange={(e) => {
                setActionCaseNumber(e.target.value);
                if (actionError) setActionError('');
                if (caseIdResult) setCaseIdResult(null);
              }}
              placeholder={
                actionModal === 'getCaseId' 
                  ? 'e.g. 1629516 or 1629515' 
                  : 'e.g. C.A. 145/2026 or C.P.L.A. 3458-K/2022'
              }
              required
              autoFocus
            />
          </FormField>

          {/* Dynamic Suggestions */}
          <div>
            <span className="text-[11px] text-theme-muted font-medium block mb-1.5">
              {actionModal === 'getCaseId' ? 'Quick select SLD Number:' : 'Quick select Case Number:'}
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
              {actionModal === 'getCaseId' ? (
                cases.slice(0, 10).map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setActionCaseNumber(c.sldNumber);
                      if (actionError) setActionError('');
                      if (caseIdResult) setCaseIdResult(null);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      actionCaseNumber === c.sldNumber
                        ? 'bg-brand-orange text-white border-brand-orange'
                        : 'bg-theme-surface-alt/60 hover:bg-theme-surface-alt text-theme-main border-theme-border'
                    }`}
                  >
                    SLD #{c.sldNumber}
                  </button>
                ))
              ) : (
                cases
                  .filter(c => Array.isArray(c.caseNumber) && c.caseNumber.length > 0)
                  .slice(0, 8)
                  .map(c => {
                    const firstCaseNum = c.caseNumber[0];
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setActionCaseNumber(firstCaseNum);
                          if (actionError) setActionError('');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                          actionCaseNumber === firstCaseNum
                            ? 'bg-brand-orange text-white border-brand-orange'
                            : 'bg-theme-surface-alt/60 hover:bg-theme-surface-alt text-theme-main border-theme-border'
                        }`}
                      >
                        {firstCaseNum}
                      </button>
                    );
                  })
              )}
            </div>
          </div>

          {/* Case Number Result Card with Copy Button */}
          {actionModal === 'getCaseId' && caseIdResult && (
            <div className="mt-4 p-3.5 bg-theme-surface-alt/80 border border-brand-orange/40 rounded-xl space-y-3 animate-fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-theme-main">Case Number Found:</span>
                <span className="px-2 py-0.5 rounded-md bg-brand-orange/10 text-brand-orange text-[11px] font-medium border border-brand-orange/30">
                  SLD #{caseIdResult.target.sldNumber}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 bg-theme-surface border border-theme-border rounded-lg p-2.5">
                <span className="font-mono text-sm font-semibold text-brand-orange select-all break-all">
                  {caseIdResult.caseNumbers}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(caseIdResult.caseNumbers);
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
                      <span>Copy</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-theme-muted pt-0.5">
                <div>
                  <span className="font-medium text-theme-main block">Court:</span>
                  <span className="truncate block">{caseIdResult.target.court || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium text-theme-main block">Table Location:</span>
                  <span>Page {caseIdResult.targetPage}</span>
                </div>
              </div>

              <Button
                type="button"
                size="sm"
                className="w-full bg-brand-orange hover:bg-brand-orange-hover text-white flex items-center justify-center gap-1.5 h-9 mt-1"
                onClick={() => {
                  const isVisibleInFilter = filteredCases.some(c => c.id === caseIdResult.target.id);
                  if (!isVisibleInFilter) {
                    setFilters({ subject: '', fromDate: null, toDate: null, magazine: '' });
                  }
                  setCurrentPage(caseIdResult.targetPage);
                  setHighlightedId(caseIdResult.target.id);
                  setActionModal(null);
                  setCaseIdResult(null);
                  setToastMessage(`Located Case SLD #${caseIdResult.target.sldNumber} (Case No: ${caseIdResult.caseNumbers}) on Page ${caseIdResult.targetPage}.`);

                  setTimeout(() => {
                    const rowEl = document.getElementById(`case-row-${caseIdResult.target.id}`);
                    if (rowEl) {
                      rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }, 200);

                  setTimeout(() => {
                    setHighlightedId(null);
                  }, 5000);
                }}
              >
                <Search className="w-3.5 h-3.5" /> View Case in Table
              </Button>
            </div>
          )}
        </form>
      </Modal>

    </div>
  );
};

export default ManageCasesPage;

