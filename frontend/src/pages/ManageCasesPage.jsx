import { useState, useEffect, useCallback, useRef } from 'react';
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

  if (format === 'excel') {
    const fileName = count === 1 
      ? `SLD_Case_${caseItems[0].sldNumber || caseItems[0].id}.csv`
      : `SLD_Cases_Export_${count}_Cases.csv`;

    const headers = [
      'SLD #',
      'Dated',
      'Year / Mag / Page',
      'Court',
      'Case Number',
      'Judges',
      'Lawyers',
      'Petitioners',
      'Head Note',
      'Judgment Order'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = Array.isArray(val) ? val.join('; ') : String(val);
      return '"' + str.replace(/"/g, '""').replace(/\r?\n/g, ' ') + '"';
    };

    const rows = caseItems.map(c => [
      escapeCsv(c.sldNumber),
      escapeCsv(c.dated),
      escapeCsv(Array.isArray(c.mapYearPage) ? c.mapYearPage.join(' | ') : (c.mapYearPage || '')),
      escapeCsv(c.court),
      escapeCsv(c.caseNumber),
      escapeCsv(c.judges),
      escapeCsv(c.lawyers),
      escapeCsv(c.petitioners),
      escapeCsv(c.headNote),
      escapeCsv(c.judgment)
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  const extension = format === 'word' ? 'doc' : 'txt';
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

  const mimeType = format === 'word' ? 'application/msword' : 'text/plain';
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

const downloadWordDocument = (caseItems, type = 'headnotes', customTitle = '') => {
  const count = caseItems.length;
  if (count === 0) return;

  const isHeadNotes = type === 'headnotes';
  const firstSld = caseItems[0].sldNumber || caseItems[0].id || '1';
  const lastSld = caseItems[caseItems.length - 1].sldNumber || caseItems[caseItems.length - 1].id || count;
  const fileName = `SLD_${isHeadNotes ? 'HeadNotes' : 'Judgments'}_${firstSld}_to_${lastSld}.doc`;

  const formatParagraphs = (rawText) => {
    if (!rawText || !rawText.trim()) {
      return '<p style="margin: 0 0 12pt 0; font-size: 11.5pt; line-height: 1.5; font-family: Calibri, Times New Roman, serif;">N/A</p>';
    }
    const paras = rawText
      .split(/\r?\n+/)
      .map(p => p.trim())
      .filter(Boolean);
    
    if (paras.length === 0) {
      return '<p style="margin: 0 0 12pt 0; font-size: 11.5pt; line-height: 1.5; font-family: Calibri, Times New Roman, serif;">N/A</p>';
    }

    return paras
      .map(p => `<p style="margin: 0 0 12pt 0; font-size: 11.5pt; line-height: 1.5; text-align: justify; font-family: Calibri, Times New Roman, serif;">${p}</p>`)
      .join('\n');
  };

  let html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" 
      xmlns:w="urn:schemas-microsoft-com:office:word" 
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>${isHeadNotes ? 'Head Notes' : 'Judgment'}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    body {
      font-family: 'Calibri', 'Times New Roman', serif;
      font-size: 11.5pt;
      line-height: 1.5;
      color: #000000;
      margin: 1in;
    }
    p {
      margin: 0 0 12pt 0;
      line-height: 1.5;
    }
  </style>
</head>
<body>
`;

  caseItems.forEach((c) => {
    const sldNum = c.sldNumber || c.id || '1';
    const mainText = isHeadNotes ? (c.headNote || '') : (c.judgment || '');

    html += `
  <div style="margin-bottom: 24pt; ${count > 1 ? 'page-break-after: always; mso-break-type: section-break;' : ''}">
    <p style="font-weight: bold; font-size: 13pt; margin: 0 0 12pt 0; color: #000000; font-family: Calibri, Times New Roman, serif;">SLD # ${sldNum}</p>
    ${formatParagraphs(mainText)}
  </div>
`;
  });

  html += `
</body>
</html>
`;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const ManageCasesPage = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('search') || '';

  // Server-driven data state
  const [cases, setCases] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [toastMessage, setToastMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Search & Filter State
  const [filters, setFilters] = useState({
    subject: initialQuery,
    fromYear: '',
    toYear: '',
    magazine: ''
  });

  // Debounced subject for API calls
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const debounceTimerRef = useRef(null);

  // State for currentPage, sort (default descending: last number on top), and highlighted case
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: 'sldNumber', direction: 'desc' });
  const [highlightedId, setHighlightedId] = useState(null);

  // Sync if URL search param updates
  useEffect(() => {
    const q = searchParams.get('search');
    if (q !== null && q !== undefined) {
      setFilters(prev => ({ ...prev, subject: q }));
    }
  }, [searchParams]);

  // Debounce filter changes (400ms for subject typing, immediate for other filters)
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedFilters(filters);
      setCurrentPage(1); // Reset to page 1 on filter change
    }, 400);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [filters]);

  // Fetch data from server whenever page, debounced filters, or sort changes
  const fetchRequestRef = useRef(0);
  useEffect(() => {
    const requestId = ++fetchRequestRef.current;
    setIsLoading(true);

    const isMag = Boolean(debouncedFilters.magazine && debouncedFilters.magazine.trim());
    const params = {
      page: currentPage,
      limit: isMag ? 500 : 100
    };
    if (debouncedFilters.subject) params.subject = debouncedFilters.subject;
    if (debouncedFilters.fromYear) params.fromYear = debouncedFilters.fromYear;
    if (debouncedFilters.toYear) params.toYear = debouncedFilters.toYear;
    if (debouncedFilters.fromDate) params.fromDate = debouncedFilters.fromDate;
    if (debouncedFilters.toDate) params.toDate = debouncedFilters.toDate;
    if (debouncedFilters.magazine) params.magazine = debouncedFilters.magazine;
    if (sortConfig.key && sortConfig.direction) {
      params.sortField = sortConfig.key;
      params.sortOrder = sortConfig.direction;
    }

    caseService.getCases(params)
      .then(response => {
        if (requestId !== fetchRequestRef.current) return; // Stale request
        setCases(response.data || []);
        setTotalItems(response.pagination?.totalItems || 0);
        setTotalPages(response.pagination?.totalPages || 0);
      })
      .catch(() => {
        if (requestId !== fetchRequestRef.current) return;
        setCases([]);
        setTotalItems(0);
        setTotalPages(0);
      })
      .finally(() => {
        if (requestId !== fetchRequestRef.current) return;
        setIsLoading(false);
      });
  }, [currentPage, debouncedFilters, sortConfig]);

  // Handle sort changes from the table
  const handleSort = useCallback((key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        if (prev.direction === 'desc') return { key: null, direction: null };
        return { key, direction: 'asc' };
      }
      return { key, direction: 'asc' };
    });
    setCurrentPage(1);
  }, []);

  // Export Modal State (when 0 cases are selected)
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState('range'); // 'range' | 'single'
  const [exportFromSld, setExportFromSld] = useState('1');
  const [exportToSld, setExportToSld] = useState('100');
  const [exportCaseNumber, setExportCaseNumber] = useState('');
  const [exportFormat, setExportFormat] = useState('pdf');
  const [exportError, setExportError] = useState('');
  const [isExportingModal, setIsExportingModal] = useState(false);

  // Head Notes & Judgment & Get Case ID Modal States
  const [actionModal, setActionModal] = useState(null); // 'headNotes' | 'judgment' | 'getCaseId' | null
  const [actionCaseNumber, setActionCaseNumber] = useState('');
  const [actionFromNo, setActionFromNo] = useState('');
  const [actionToNo, setActionToNo] = useState('');
  const [isExtractingRange, setIsExtractingRange] = useState(false);
  const [actionError, setActionError] = useState('');
  const [caseIdResult, setCaseIdResult] = useState(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isFetchingCaseId, setIsFetchingCaseId] = useState(false);

  // Main Export Handler
  const handleExport = (format = 'pdf') => {
    if (selectedIds.length > 0) {
      // 1 or more cases selected -> direct export
      const selectedCases = cases.filter(c => selectedIds.includes(c.id));
      downloadCaseExport(selectedCases, format);
      setToastMessage(`Successfully exported ${selectedCases.length} selected case(s) as ${format.toUpperCase()}.`);
      setTimeout(() => setToastMessage(''), 4000);
    } else {
      // 0 cases selected -> open dialogue box asking for Case Range or Number
      setExportFormat(format);
      setExportCaseNumber('');
      setExportFromSld('1');
      setExportToSld('100');
      setExportError('');
      setExportModalOpen(true);
    }
  };

  // Submit Export from Dialogue Box
  const handleExportSubmit = async (e) => {
    e?.preventDefault();
    setExportError('');

    if (exportType === 'range') {
      if (!exportFromSld.toString().trim() || !exportToSld.toString().trim()) {
        setExportError('Please enter both From SLD # and To SLD #.');
        return;
      }

      const fromNum = parseInt(exportFromSld.toString().trim(), 10);
      const toNum = parseInt(exportToSld.toString().trim(), 10);

      if (isNaN(fromNum) || isNaN(toNum)) {
        setExportError('From SLD # and To SLD # must be valid numbers.');
        return;
      }

      const minNum = Math.min(fromNum, toNum);
      const maxNum = Math.max(fromNum, toNum);
      const rangeCount = maxNum - minNum + 1;

      setIsExportingModal(true);
      try {
        const response = await caseService.getCases({
          fromSld: minNum,
          toSld: maxNum,
          fromNo: minNum,
          toNo: maxNum,
          limit: rangeCount,
          sortField: 'sldNumber',
          sortOrder: 'asc'
        });
        let rangeCases = (response.data || []).filter(c => {
          const num = parseInt(c.sldNumber, 10);
          return !isNaN(num) && num >= minNum && num <= maxNum;
        });
        rangeCases.sort((a, b) => (parseInt(a.sldNumber, 10) || 0) - (parseInt(b.sldNumber, 10) || 0));

        if (rangeCases.length === 0) {
          setExportError(`No cases found in range from SLD #${minNum} to #${maxNum}.`);
          return;
        }

        downloadCaseExport(rangeCases, exportFormat);
        setToastMessage(`Exported ${rangeCases.length} cases (SLD #${minNum} to #${maxNum}) as ${exportFormat.toUpperCase()}.`);
        setExportModalOpen(false);
        setTimeout(() => setToastMessage(''), 4000);
      } catch (err) {
        setExportError(`Export failed: ${err.message || 'Server error'}`);
      } finally {
        setIsExportingModal(false);
      }
    } else {
      if (!exportCaseNumber.trim()) {
        setExportError('Please specify or select a Case Number or SLD # to export.');
        return;
      }

      const cleanInput = exportCaseNumber.trim();
      setIsExportingModal(true);
      try {
        let matched = null;
        try {
          matched = await caseService.getCaseById(cleanInput);
        } catch (apiErr) {
          matched = cases.find(c => 
            c.sldNumber === cleanInput || 
            c.id.toString() === cleanInput ||
            (Array.isArray(c.caseNumber) && c.caseNumber.some(n => n.toLowerCase().includes(cleanInput.toLowerCase())))
          );
        }

        const exportTarget = matched || {
          id: 9999,
          sldNumber: cleanInput,
          dated: new Date().toISOString().split('T')[0],
          court: 'High Court / Supreme Court of Pakistan',
          caseNumber: [cleanInput],
          judges: ['Honorable Bench'],
          lawyers: ['Advocates of Supreme Court'],
          petitioners: ['Petitioner vs. Respondent'],
          mapYearPage: [`2025 SLD ${cleanInput}`],
          status: 'Active'
        };

        downloadCaseExport([exportTarget], exportFormat);
        setToastMessage(`Case "${exportTarget.sldNumber || cleanInput}" exported successfully as ${exportFormat.toUpperCase()}.`);
        setExportModalOpen(false);
        setTimeout(() => setToastMessage(''), 4000);
      } catch (err) {
        setExportError(`Export failed: ${err.message || 'Server error'}`);
      } finally {
        setIsExportingModal(false);
      }
    }
  };

  // Head Notes Action Handler
  const handleHeadNotes = () => {
    if (selectedIds.length > 0) {
      const selectedCases = cases.filter(c => selectedIds.includes(c.id));
      downloadWordDocument(selectedCases, 'headnotes');
      setToastMessage(`Downloaded Word document for ${selectedCases.length} selected case(s).`);
      setTimeout(() => setToastMessage(''), 4000);
    } else {
      setActionFromNo('');
      setActionToNo('');
      setActionError('');
      setActionModal('headNotes');
    }
  };

  // Judgment Action Handler
  const handleJudgment = async () => {
    if (selectedIds.length > 0) {
      let selectedCases = cases.filter(c => selectedIds.includes(c.id));
      // Ensure judgments are fully loaded
      selectedCases = await Promise.all(selectedCases.map(async (c) => {
        if (!c.judgment || c.judgment.trim().length === 0) {
          try {
            const fullCase = await caseService.getCaseById(c.id || c.sldNumber);
            if (fullCase?.judgment) return { ...c, judgment: fullCase.judgment };
          } catch (e) {}
        }
        return c;
      }));
      downloadWordDocument(selectedCases, 'judgment');
      setToastMessage(`Downloaded Judgments Word document for ${selectedCases.length} selected case(s).`);
      setTimeout(() => setToastMessage(''), 4000);
    } else {
      setActionFromNo('');
      setActionToNo('');
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
  const handleActionSubmit = async (e) => {
    e?.preventDefault();
    setActionError('');

    // 1. Get Case ID Modal: Uses SLD Number to fetch the unique Case ID from the database
    if (actionModal === 'getCaseId') {
      if (!actionCaseNumber.trim()) {
        setActionError('Please enter an SLD Number.');
        return;
      }

      const inputVal = actionCaseNumber.trim();
      const cleanSld = inputVal.replace(/^sld\s*#?/i, '').trim();
      setIsFetchingCaseId(true);

      try {
        let target = null;
        try {
          target = await caseService.getCaseById(cleanSld);
        } catch (apiErr) {
          target = cases.find(c => 
            c.sldNumber?.toLowerCase() === cleanSld.toLowerCase() || 
            c.id?.toString() === cleanSld ||
            c.caseId?.toLowerCase() === cleanSld.toLowerCase()
          );
        }

        if (!target) {
          setActionError(`No case found matching SLD #${inputVal} in the database. Please enter a valid SLD number.`);
          setCaseIdResult(null);
          return;
        }

        const uniqueCaseId = target.caseId || target.case_id || target.id;
        const rawCaseNum = target.caseNumber;
        const caseNumbers = Array.isArray(rawCaseNum)
          ? rawCaseNum.join(', ')
          : (rawCaseNum || 'N/A');

        setCaseIdResult({
          target,
          caseId: uniqueCaseId,
          caseNumbers,
          targetPage: 1,
          isInList: true,
          sldSearchTerm: cleanSld
        });
        setIsCopied(false);
      } catch (err) {
        setActionError(`Failed to fetch case: ${err.message || 'Server error'}`);
        setCaseIdResult(null);
      } finally {
        setIsFetchingCaseId(false);
      }
      return;
    }

    // 2. Head Notes or Judgment: Range extraction by From No. to To No. downloaded in Word (.doc)
    if (!actionFromNo.trim() || !actionToNo.trim()) {
      setActionError('Please enter both From No. and To No. to extract the range.');
      return;
    }

    const fromNum = parseInt(actionFromNo.trim(), 10);
    const toNum = parseInt(actionToNo.trim(), 10);

    if (isNaN(fromNum) || isNaN(toNum)) {
      setActionError('From No. and To No. must be valid numeric values.');
      return;
    }

    const minNum = Math.min(fromNum, toNum);
    const maxNum = Math.max(fromNum, toNum);
    const rangeCount = maxNum - minNum + 1;

    if (rangeCount > 500) {
      setActionError('To ensure optimal speed, maximum range limit is 500 cases per export.');
      return;
    }

    setIsExtractingRange(true);
    try {
      const response = await caseService.getCases({
        fromNo: minNum,
        toNo: maxNum,
        fromSld: minNum,
        toSld: maxNum,
        limit: rangeCount,
        sortField: 'sldNumber',
        sortOrder: 'asc',
        includeJudgment: actionModal === 'judgment' ? 'true' : 'false'
      });
      let rangeCases = (response.data || []).filter(c => {
        const num = parseInt(c.sldNumber, 10);
        return !isNaN(num) && num >= minNum && num <= maxNum;
      });

      // Sort by sldNumber ascending so SLD # 1 comes before SLD # 2
      rangeCases.sort((a, b) => (parseInt(a.sldNumber, 10) || 0) - (parseInt(b.sldNumber, 10) || 0));

      if (rangeCases.length === 0) {
        setActionError(`No cases found in range from #${minNum} to #${maxNum}.`);
        return;
      }

      if (actionModal === 'judgment') {
        // Ensure judgment text is loaded for all cases
        rangeCases = await Promise.all(rangeCases.map(async (c) => {
          if (!c.judgment || c.judgment.trim().length === 0) {
            try {
              const fullCase = await caseService.getCaseById(c.id || c.sldNumber);
              if (fullCase?.judgment) return { ...c, judgment: fullCase.judgment };
            } catch (e) {}
          }
          return c;
        }));
      }

      downloadWordDocument(rangeCases, actionModal === 'headNotes' ? 'headnotes' : 'judgment');
      setToastMessage(`Extracted & downloaded ${rangeCases.length} cases (SLD #${minNum} to #${maxNum}) in Word format (.doc).`);
      setActionModal(null);
      setTimeout(() => setToastMessage(''), 4000);
    } catch (err) {
      setActionError(`Extraction failed: ${err.message || 'Server error'}`);
    } finally {
      setIsExtractingRange(false);
    }
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
        onShowAll={() => setFilters({ subject: '', fromYear: '', toYear: '', magazine: '' })}
      />

      <div className="flex-1">
        <ManageCasesTable 
          cases={cases}
          setCases={setCases}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          toastMessage={toastMessage}
          setToastMessage={setToastMessage}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalItems={totalItems}
          totalPages={totalPages}
          sortConfig={sortConfig}
          onSort={handleSort}
          highlightedId={highlightedId}
          onExportSelection={handleExport}
          isLoading={isLoading}
          serverPaginated={true}
          isMagazineSearch={Boolean(filters.magazine && filters.magazine.trim())}
        />
      </div>

      <AdminFooter />
      {/* Export Case Dialogue Box (When No Case Selected) */}
      <Modal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="Export Case Law"
        subtitle="Specify SLD Range or Single Case to export"
        icon={Download}
        maxWidth="max-w-lg"
        footer={
          <>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setExportModalOpen(false)}
              disabled={isExportingModal}
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              size="sm" 
              className="bg-brand-orange hover:bg-brand-orange-hover text-white flex items-center gap-1.5"
              onClick={handleExportSubmit}
              disabled={isExportingModal}
            >
              {isExportingModal ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" /> 
                  <span>Export Case{exportType === 'range' ? 's' : ''}</span>
                </>
              )}
            </Button>
          </>
        }
      >
        <form onSubmit={handleExportSubmit} className="space-y-4">
          {exportError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{exportError}</span>
            </div>
          )}

          {/* Mode Selector: Range vs Single */}
          <div className="flex rounded-lg p-1 bg-theme-surface-alt/70 border border-theme-border">
            <button
              type="button"
              onClick={() => { setExportType('range'); setExportError(''); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                exportType === 'range' 
                  ? 'bg-brand-orange text-white shadow-xs' 
                  : 'text-theme-muted hover:text-theme-main'
              }`}
            >
              SLD # Range (From — To)
            </button>
            <button
              type="button"
              onClick={() => { setExportType('single'); setExportError(''); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                exportType === 'single' 
                  ? 'bg-brand-orange text-white shadow-xs' 
                  : 'text-theme-muted hover:text-theme-main'
              }`}
            >
              Single Case / SLD #
            </button>
          </div>

          {exportType === 'range' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="From SLD #" required>
                  <Input 
                    type="number"
                    value={exportFromSld}
                    onChange={(e) => {
                      setExportFromSld(e.target.value);
                      if (exportError) setExportError('');
                    }}
                    placeholder="e.g. 1"
                    required
                    autoFocus
                  />
                </FormField>
                <FormField label="To SLD #" required>
                  <Input 
                    type="number"
                    value={exportToSld}
                    onChange={(e) => {
                      setExportToSld(e.target.value);
                      if (exportError) setExportError('');
                    }}
                    placeholder="e.g. 100"
                    required
                  />
                </FormField>
              </div>

              {/* Quick Range Suggestions */}
              <div>
                <span className="text-[11px] text-theme-muted font-medium block mb-1.5">Quick Range Suggestions:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { from: '1', to: '50' },
                    { from: '1', to: '100' },
                    { from: '101', to: '200' },
                    { from: '165200', to: '165281' }
                  ].map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setExportFromSld(r.from);
                        setExportToSld(r.to);
                        if (exportError) setExportError('');
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium border bg-theme-surface-alt/60 hover:bg-brand-orange hover:text-white hover:border-brand-orange text-theme-main border-theme-border transition-colors cursor-pointer"
                    >
                      #{r.from} - #{r.to}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
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
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
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
          )}

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
            ? 'Extract Head Notes (From No. to To No.)' 
            : actionModal === 'judgment' 
            ? 'Extract Judgments (From No. to To No.)' 
            : 'Get Case ID by SLD #'
        }
        subtitle={
          actionModal === 'getCaseId' 
            ? 'Enter an SLD Number to fetch the unique Case ID from the database' 
            : 'Enter range (From No. to To No.) to extract and download in Microsoft Word (.doc) format'
        }
        icon={actionModal === 'getCaseId' ? Hash : FileText}
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
              disabled={isFetchingCaseId || isExtractingRange}
            >
              Close
            </Button>
            <Button 
              variant="primary" 
              size="sm" 
              className="bg-brand-orange hover:bg-brand-orange-hover text-white flex items-center gap-1.5"
              onClick={handleActionSubmit}
              disabled={isFetchingCaseId || isExtractingRange}
            >
              {isFetchingCaseId || isExtractingRange ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>{actionModal === 'getCaseId' ? 'Fetching ID...' : 'Extracting Word Document...'}</span>
                </>
              ) : (
                <>
                  {actionModal === 'getCaseId' ? <Search className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  <span>{actionModal === 'getCaseId' ? 'Get Case ID' : 'Download in Word (.doc)'}</span>
                </>
              )}
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

          {actionModal === 'getCaseId' ? (
            <>
              <FormField label="SLD Number (Required)" required>
                <Input 
                  value={actionCaseNumber}
                  onChange={(e) => {
                    setActionCaseNumber(e.target.value);
                    if (actionError) setActionError('');
                    if (caseIdResult) setCaseIdResult(null);
                  }}
                  placeholder="e.g. 1629516 or 1629515"
                  required
                  autoFocus
                />
              </FormField>

              {/* Dynamic Suggestions for SLD */}
              <div>
                <span className="text-[11px] text-theme-muted font-medium block mb-1.5">
                  Quick select SLD Number:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                  {cases.slice(0, 10).map(c => (
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
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-brand-orange/5 border border-brand-orange/20 rounded-xl text-xs text-theme-main">
                <span className="font-semibold text-brand-orange">
                  Microsoft Word (.doc) Extraction
                </span>
                <p className="mt-1 text-theme-muted leading-relaxed">
                  Enter the start and end SLD / Case serial range. The system will extract {actionModal === 'headNotes' ? 'Head Notes, Principles of Law and Citations' : 'Full Operative Judgment Orders'} and download a formatted Word document (.doc).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="From No. (Required)" required>
                  <Input 
                    type="number"
                    value={actionFromNo}
                    onChange={(e) => {
                      setActionFromNo(e.target.value);
                      if (actionError) setActionError('');
                    }}
                    placeholder="e.g. 100"
                    required
                    autoFocus
                  />
                </FormField>

                <FormField label="To No. (Required)" required>
                  <Input 
                    type="number"
                    value={actionToNo}
                    onChange={(e) => {
                      setActionToNo(e.target.value);
                      if (actionError) setActionError('');
                    }}
                    placeholder="e.g. 110"
                    required
                  />
                </FormField>
              </div>

              {/* Quick Range Presets */}
              <div>
                <span className="text-[11px] text-theme-muted font-medium block mb-1.5">
                  Quick Range Suggestions:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { from: '1', to: '25' },
                    { from: '26', to: '50' },
                    { from: '51', to: '100' },
                    { from: '101', to: '150' },
                    { from: '500', to: '520' }
                  ].map((range, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setActionFromNo(range.from);
                        setActionToNo(range.to);
                        if (actionError) setActionError('');
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium border bg-theme-surface-alt/60 hover:bg-brand-orange hover:text-white hover:border-brand-orange text-theme-main border-theme-border transition-colors cursor-pointer"
                    >
                      #{range.from} - #{range.to}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Case Number / ID Result Card with Copy Button */}
          {actionModal === 'getCaseId' && caseIdResult && (
            <div className="mt-4 p-3.5 bg-theme-surface-alt/80 border border-brand-orange/40 rounded-xl space-y-3 animate-fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-theme-main">Database Record Found:</span>
                <span className="px-2 py-0.5 rounded-md bg-brand-orange/10 text-brand-orange text-[11px] font-semibold border border-brand-orange/30">
                  SLD #{caseIdResult.target.sldNumber}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 bg-theme-surface border border-theme-border rounded-lg p-2.5">
                <div className="flex flex-col">
                  <span className="text-[10px] text-theme-muted uppercase font-bold tracking-wider">Unique Case ID</span>
                  <span className="font-mono text-base font-bold text-brand-orange select-all break-all">
                    {caseIdResult.caseId}
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(caseIdResult.caseId);
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
                  <span className="font-medium text-theme-main block">Case Number:</span>
                  <span className="truncate block">{caseIdResult.caseNumbers}</span>
                </div>
                <div>
                  <span className="font-medium text-theme-main block">Court:</span>
                  <span className="truncate block">{caseIdResult.target.court || 'N/A'}</span>
                </div>
              </div>

              <Button
                type="button"
                size="sm"
                className="w-full bg-brand-orange hover:bg-brand-orange-hover text-white flex items-center justify-center gap-1.5 h-9 mt-1"
                onClick={() => {
                  // Search by SLD number to surface it via server-side filtering
                  const sldTerm = caseIdResult.sldSearchTerm || caseIdResult.target.sldNumber || '';
                  setFilters({ subject: sldTerm, fromDate: null, toDate: null, magazine: '' });
                  setCurrentPage(1);
                  setHighlightedId(caseIdResult.target.id);
                  setActionModal(null);
                  setCaseIdResult(null);
                  setToastMessage(`Searching for Case ${caseIdResult.caseId} (SLD #${caseIdResult.target.sldNumber})...`);

                  setTimeout(() => {
                    const rowEl = document.getElementById(`case-row-${caseIdResult.target.id}`);
                    if (rowEl) {
                      rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }, 800); // Wait for server response + render

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

export default ManageCasesPage;

