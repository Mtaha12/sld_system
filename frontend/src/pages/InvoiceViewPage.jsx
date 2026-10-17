import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { invoiceService } from '../features/invoices/services/invoiceService';
import Spinner from '../components/ui/Spinner';
import { 
  ArrowLeft, Printer, Receipt, Copy, Check, 
  Calendar, ShieldCheck, Building2, User, CreditCard
} from 'lucide-react';

const InvoiceViewPage = () => {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        const data = await invoiceService.getInvoiceById(id);
        if (!data) {
          setError('No invoice found matching this identifier in the SLD database.');
        } else {
          setInvoice(data);
        }
      } catch (err) {
        console.error('Failed to load invoice:', err);
        setError('Failed to load invoice record.');
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [id]);

  const handleCopy = () => {
    const fullText = `Invoice #${invoice?.invoiceId || invoice?.srNumber || ''}\nClient: ${invoice?.name || ''}\nDate: ${invoice?.date || ''}\nTotal Receivable: Rs. ${(invoice?.totalReceivable || 0).toLocaleString()}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950 flex flex-col items-center justify-center p-6">
        <Spinner size="lg" />
        <p className="mt-4 text-sm font-semibold text-stone-600 dark:text-stone-400 animate-pulse">
          Retrieving official invoice statement from SLD database...
        </p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-8 text-center shadow-xl">
          <Receipt className="w-12 h-12 text-[#f15a24] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-2">Invoice Not Found</h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 mb-6">{error || 'Invoice record could not be retrieved.'}</p>
          <button
            onClick={() => window.close()}
            className="px-5 py-2.5 bg-[#f15a24] text-white rounded-xl text-sm font-bold hover:bg-[#d94817] transition-all cursor-pointer"
          >
            Close Tab
          </button>
        </div>
      </div>
    );
  }

  const items = invoice.items || [];

  return (
    <div className="min-h-screen bg-[#f7f5f0] dark:bg-[#121316] text-stone-900 dark:text-stone-100 font-sans antialiased selection:bg-[#f15a24]/20 selection:text-[#f15a24]">
      {/* Top Floating Control Bar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 shadow-xs print:hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.close()}
              className="p-2 rounded-xl text-stone-600 dark:text-stone-400 hover:text-stone-950 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              title="Close View"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#f15a24]/10 flex items-center justify-center text-[#f15a24]">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-none">
                  Invoice #{invoice.invoiceId || invoice.srNumber || 'N/A'}
                </h1>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                  Client: {invoice.name || 'Private Client'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold transition-all cursor-pointer"
              title="Copy invoice details"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f15a24] hover:bg-[#d94817] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Invoice Sheet */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="bg-white dark:bg-[#1a1b1e] border border-stone-200/80 dark:border-stone-800 shadow-xl rounded-2xl p-6 sm:p-12 md:p-16">
          
          {/* Invoice Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-stone-200 dark:border-stone-800 pb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl font-black tracking-tight text-[#f15a24]">SLD</span>
                <span className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">SYSTEM</span>
              </div>
              <p className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                Statutory Law Database & Legal Consultancy (SMC-PVT) Ltd.
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-500 mt-1">
                Pakistan Tax & Corporate Legal Practice
              </p>
            </div>

            <div className="sm:text-right">
              <span className="inline-block px-3 py-1 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-extrabold uppercase text-xs tracking-wider mb-2">
                Legal Fee Invoice
              </span>
              <p className="text-sm font-mono font-bold text-stone-900 dark:text-stone-100">
                #{invoice.invoiceId || invoice.srNumber || 'SLD-INV'}
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 flex sm:justify-end items-center gap-1">
                <Calendar className="w-3 h-3 text-stone-400" />
                Date: {invoice.date || 'N/A'}
              </p>
            </div>
          </div>

          {/* Bill To Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-stone-200 dark:border-stone-800">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-1">
                Billed To
              </p>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#f15a24]" />
                {invoice.name || 'Valued Client'}
              </h2>
              {invoice.address ? (
                <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 whitespace-pre-line">
                  {invoice.address}
                </p>
              ) : (
                <p className="text-xs text-stone-400 italic mt-1">No address specified</p>
              )}
            </div>

            <div className="sm:text-right flex flex-col sm:items-end justify-center">
              <p className="text-xs font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-1">
                Payment Status
              </p>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                <Check className="w-3.5 h-3.5" />
                Generated Official Bill
              </span>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="py-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-3">
              Description of Services & Charges
            </h3>
            
            <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-700 dark:text-stone-300 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-3 py-2.5 text-center w-12">Sr #</th>
                    <th className="px-4 py-2.5">Details</th>
                    <th className="px-3 py-2.5 text-center w-16">Qty</th>
                    <th className="px-4 py-2.5 text-right w-28">Rate (Rs.)</th>
                    <th className="px-4 py-2.5 text-right w-32">Total (Rs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800 text-stone-800 dark:text-stone-200">
                  {items.length > 0 ? (
                    items.map((row, idx) => (
                      <tr key={row._id || idx} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/30">
                        <td className="px-3 py-3 text-center font-semibold text-stone-500">
                          {row.srNumber || (idx + 1)}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {row.details || 'Legal Services rendered'}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {row.qty || 1}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {(row.rate || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold">
                          {(row.total || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-stone-500 italic">
                        No individual items specified in this invoice record.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Section */}
          <div className="flex flex-col sm:flex-row justify-end pt-4 pb-8">
            <div className="w-full sm:w-72 space-y-2 text-xs">
              <div className="flex justify-between py-1 text-stone-600 dark:text-stone-400">
                <span>Total Bill Amount:</span>
                <span className="font-mono font-semibold">
                  Rs. {(invoice.totalBillAmount || 0).toLocaleString()}
                </span>
              </div>

              {Boolean(invoice.deductionPercent || invoice.deductionAmount) && (
                <div className="flex justify-between py-1 text-amber-600 dark:text-amber-400">
                  <span>Deduction ({invoice.deductionPercent || 0}%):</span>
                  <span className="font-mono font-semibold">
                    - Rs. {(invoice.deductionAmount || 0).toLocaleString()}
                  </span>
                </div>
              )}

              <div className="border-t-2 border-stone-900 dark:border-stone-100 pt-2 flex justify-between items-center text-sm font-bold text-stone-900 dark:text-stone-100">
                <span>Net Receivable:</span>
                <span className="font-mono text-base text-[#f15a24]">
                  Rs. {(invoice.totalReceivable || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Footer & Signature */}
          <div className="border-t border-stone-200 dark:border-stone-800 pt-8 mt-4 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-stone-500">
            <div>
              <p className="font-bold text-stone-700 dark:text-stone-300 mb-1">Terms & Conditions:</p>
              <p className="text-[11px] leading-relaxed">
                1. Payment is due within 15 days from the date of invoice.<br />
                2. Cheques / pay orders must be drawn in favour of SLD System (SMC-PVT) Limited.
              </p>
            </div>
            
            <div className="flex flex-col items-start sm:items-end justify-end">
              <div className="w-48 border-b border-stone-400 dark:border-stone-600 pb-1 text-center">
                <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">Authorized Signature</span>
              </div>
              <p className="text-[10px] text-stone-400 mt-1">SLD System Accounts Department</p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default InvoiceViewPage;
