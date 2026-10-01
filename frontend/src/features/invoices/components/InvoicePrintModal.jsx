import React, { useRef, useState } from 'react';
import { Printer, Download, Receipt, X, Check } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import logo from '../../../assets/branding/logo/SLD_Logo.png';
import { numberToWords } from '../../../utils/numberToWords';

const BANK_ACCOUNTS = [
  {
    bank: 'MCB Bank Limited, Privilege Branch, Saddar-Rawalpindi',
    name: 'Super Law Data System',
    account: 'PK84MUCB1123909311000715'
  },
  {
    bank: 'United Bank Ltd., Bank Road, Saddar-Rawalpindi (Branch Code 1491)',
    name: 'Super Law Data System',
    account: 'PK60UNIL0109000222820349'
  },
  {
    bank: 'Allied Bank Ltd., Mall Branch, Saddar-Rawalpindi (Branch Code: 1105)',
    name: 'Super Law Data System',
    account: 'PK58ABPA0010037270730029'
  }
];

const InvoicePrintModal = ({ invoice, isOpen, onClose }) => {
  const printAreaRef = useRef(null);

  // Optional customizations for printout
  const [includeCredentials, setIncludeCredentials] = useState(true);
  const [username, setUsername] = useState('');
  const [includeBankDetails, setIncludeBankDetails] = useState(true);

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const finalReceivable = Number(invoice.totalReceivable) || (Number(invoice.totalBillAmount) - (Number(invoice.deductionAmount) || 0));
  const amountWords = numberToWords(finalReceivable);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Official Invoice Preview"
      subtitle={`Bill / Invoice #: ${invoice.invoiceId || `#${invoice.srNumber}`} • Dated: ${invoice.date}`}
      icon={Receipt}
      maxWidth="max-w-4xl"
      footer={
        <div className="flex flex-wrap items-center justify-between w-full gap-2 text-xs">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer select-none text-theme-muted hover:text-theme-main">
              <input
                type="checkbox"
                checked={includeCredentials}
                onChange={(e) => setIncludeCredentials(e.target.checked)}
                className="rounded text-brand-orange focus:ring-0"
              />
              <span>Include Portal Credentials</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer select-none text-theme-muted hover:text-theme-main">
              <input
                type="checkbox"
                checked={includeBankDetails}
                onChange={(e) => setIncludeBankDetails(e.target.checked)}
                className="rounded text-brand-orange focus:ring-0"
              />
              <span>Include Bank Accounts</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="bg-brand-orange text-white hover:bg-orange-600 border-transparent flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print / Save as PDF
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      }
    >
      <div className="overflow-x-auto max-h-[75vh] p-2 bg-gray-100 dark:bg-gray-900 rounded-lg">
        
        {/* Printable Invoice Page Canvas */}
        <div
          id="sld-printable-invoice"
          ref={printAreaRef}
          className="mx-auto bg-white text-gray-950 p-8 sm:p-12 shadow-md rounded-sm w-full max-w-[800px] border border-gray-200 print:border-none print:shadow-none print:p-0 print:m-0"
          style={{ fontFamily: "'Times New Roman', Times, serif" }}
        >
          
          {/* Header with SLD Branding */}
          <div className="text-center pb-2">
            <div className="flex items-center justify-center gap-3">
              <img 
                src={logo} 
                alt="SLD Logo" 
                className="h-12 sm:h-14 object-contain shrink-0" 
              />
              <h1 
                className="text-2xl sm:text-3xl font-extrabold tracking-wide uppercase text-gray-800"
                style={{
                  textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                  letterSpacing: '1px'
                }}
              >
                SUPER LAW DATA SYSTEM<sup className="text-sm font-normal ml-0.5">®</sup>
              </h1>
            </div>

            {/* Gold Bar Divider */}
            <div className="w-full h-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 my-2 rounded-full shadow-sm" />

            {/* Office Contact Info */}
            <p className="text-[12px] font-semibold text-gray-800 mt-1">
              Head Office: SO-6&7, 2<sup>nd</sup> Floor, City Centre, Bank Road, Saddar-Rawalpindi
            </p>
            <p className="text-[11px] text-gray-700">
              Web: <span className="font-medium text-blue-900">www.sldsystem.com</span>, E-mail: <span className="font-medium">info@sldsystem.com</span>
            </p>
            <p className="text-[11px] text-gray-700">
              Tel: 051-8315912, Cell: 0321-5390007 & 8
            </p>
          </div>

          {/* Reference & Date Bar */}
          <div className="flex justify-between items-center font-bold text-xs sm:text-sm mt-4 pb-2 border-b-2 border-gray-900">
            <div>
              <span>Bill / Invoice #: </span>
              <span className="text-gray-950 underline">{invoice.invoiceId || `#${invoice.srNumber}`}</span>
            </div>
            <div>
              <span>Dated: </span>
              <span className="text-gray-950 underline">{invoice.date}</span>
            </div>
          </div>

          {/* Client Details */}
          <div className="mt-3 mb-4 text-xs sm:text-sm leading-snug">
            <div className="font-bold text-gray-950">
              {invoice.name || 'Valued Client'}
            </div>
            {invoice.address && (
              <div className="text-gray-800 font-medium whitespace-pre-line">
                {invoice.address}
              </div>
            )}
          </div>

          {/* Main Billing Table */}
          <div className="w-full overflow-hidden border-2 border-gray-900">
            <table className="w-full border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b-2 border-gray-900 bg-gray-50 text-gray-950 font-bold">
                  <th className="py-1.5 px-2 border-r-2 border-gray-900 w-12 text-center">Sr.#</th>
                  <th className="py-1.5 px-3 border-r-2 border-gray-900 text-center">Descriptions</th>
                  <th className="py-1.5 px-2 border-r-2 border-gray-900 w-14 text-center">QTY</th>
                  <th className="py-1.5 px-3 border-r-2 border-gray-900 w-24 text-center">Rate</th>
                  <th className="py-1.5 px-3 w-28 text-center">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-900">
                
                {/* Active Items */}
                {invoice.items && invoice.items.length > 0 ? (
                  invoice.items.map((row, idx) => (
                    <tr key={idx} className="align-top">
                      <td className="py-2 px-2 border-r-2 border-gray-900 text-center font-semibold">
                        {row.srNumber || idx + 1}
                      </td>
                      <td className="py-2 px-3 border-r-2 border-gray-900 text-left font-medium uppercase leading-snug">
                        {row.details || 'SLD System Annual Legal Research Portal Access Subscription'}
                      </td>
                      <td className="py-2 px-2 border-r-2 border-gray-900 text-center font-semibold">
                        {row.qty || 1}
                      </td>
                      <td className="py-2 px-3 border-r-2 border-gray-900 text-right font-semibold">
                        {(Number(row.rate) || 0).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-bold">
                        {(Number(row.total) || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-2 px-2 border-r-2 border-gray-900 text-center">1</td>
                    <td className="py-2 px-3 border-r-2 border-gray-900 text-left font-medium">SLD System Portal Subscription</td>
                    <td className="py-2 px-2 border-r-2 border-gray-900 text-center">1</td>
                    <td className="py-2 px-3 border-r-2 border-gray-900 text-right font-semibold">{(invoice.totalBillAmount || 0).toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-bold">{(invoice.totalBillAmount || 0).toLocaleString()}</td>
                  </tr>
                )}

                {/* Deduction Row (if any) */}
                {Number(invoice.deductionAmount) > 0 && (
                  <tr>
                    <td className="py-1 px-2 border-r-2 border-gray-900 text-center"></td>
                    <td className="py-1 px-3 border-r-2 border-gray-900 font-bold text-gray-800">
                      Less {invoice.deductionPercent ? `(${invoice.deductionPercent}%)` : ''}
                    </td>
                    <td className="py-1 px-2 border-r-2 border-gray-900"></td>
                    <td className="py-1 px-3 border-r-2 border-gray-900"></td>
                    <td className="py-1 px-3 text-right font-bold text-red-700">
                      {Number(invoice.deductionAmount).toLocaleString()}
                    </td>
                  </tr>
                )}

                {/* Optional Portal Credentials Row matching Image 1 */}
                {includeCredentials && (
                  <>
                    <tr>
                      <td className="py-1 px-2 border-r-2 border-gray-900"></td>
                      <td className="py-1 px-3 border-r-2 border-gray-900 text-center text-xs font-semibold text-blue-900 underline">
                        www.sldsystem.com
                      </td>
                      <td className="py-1 px-2 border-r-2 border-gray-900"></td>
                      <td className="py-1 px-3 border-r-2 border-gray-900"></td>
                      <td className="py-1 px-3"></td>
                    </tr>
                    <tr>
                      <td className="py-0.5 px-2 border-r-2 border-gray-900"></td>
                      <td className="py-0.5 px-3 border-r-2 border-gray-900 text-left text-xs font-medium">
                        User: <span className="font-bold">{username || invoice.name?.toLowerCase().replace(/\s+/g, '') || 'client_portal'}</span>
                      </td>
                      <td className="py-0.5 px-2 border-r-2 border-gray-900"></td>
                      <td className="py-0.5 px-3 border-r-2 border-gray-900"></td>
                      <td className="py-0.5 px-3"></td>
                    </tr>
                    <tr>
                      <td className="py-0.5 px-2 border-r-2 border-gray-900"></td>
                      <td className="py-0.5 px-3 border-r-2 border-gray-900 text-left text-xs font-medium">
                        Password: <span className="font-bold">****</span>
                      </td>
                      <td className="py-0.5 px-2 border-r-2 border-gray-900"></td>
                      <td className="py-0.5 px-3 border-r-2 border-gray-900"></td>
                      <td className="py-0.5 px-3"></td>
                    </tr>
                  </>
                )}

                {/* Bank Accounts Section matching Image 1 */}
                {includeBankDetails && (
                  <>
                    {BANK_ACCOUNTS.map((b, i) => (
                      <React.Fragment key={i}>
                        <tr className="bg-gray-50/50">
                          <td className="py-1 px-2 border-r-2 border-gray-900 text-center font-bold text-[11px]">
                            BANK:
                          </td>
                          <td className="py-1 px-3 border-r-2 border-gray-900 font-bold text-xs">
                            {b.bank}
                          </td>
                          <td className="py-1 px-2 border-r-2 border-gray-900"></td>
                          <td className="py-1 px-3 border-r-2 border-gray-900"></td>
                          <td className="py-1 px-3"></td>
                        </tr>
                        <tr>
                          <td className="py-0.5 px-2 border-r-2 border-gray-900 text-center font-semibold text-[11px]">
                            Name
                          </td>
                          <td className="py-0.5 px-3 border-r-2 border-gray-900 font-medium text-xs">
                            {b.name}
                          </td>
                          <td className="py-0.5 px-2 border-r-2 border-gray-900"></td>
                          <td className="py-0.5 px-3 border-r-2 border-gray-900"></td>
                          <td className="py-0.5 px-3"></td>
                        </tr>
                        <tr>
                          <td className="py-0.5 px-2 border-r-2 border-gray-900 text-center font-semibold text-[11px]">
                            A/C
                          </td>
                          <td className="py-0.5 px-3 border-r-2 border-gray-900 font-mono font-bold text-xs tracking-wider">
                            {b.account}
                          </td>
                          <td className="py-0.5 px-2 border-r-2 border-gray-900"></td>
                          <td className="py-0.5 px-3 border-r-2 border-gray-900"></td>
                          <td className="py-0.5 px-3"></td>
                        </tr>
                      </React.Fragment>
                    ))}

                    {/* Cash A/C line */}
                    <tr className="bg-gray-50/50">
                      <td className="py-1 px-2 border-r-2 border-gray-900 text-center font-bold text-[11px] whitespace-nowrap">
                        Cash A/C.
                      </td>
                      <td className="py-1 px-3 border-r-2 border-gray-900 font-bold text-xs">
                        Jazz & Easy Paisa Mobile Account # 0321-5390007 (Haroon Ahmad)
                      </td>
                      <td className="py-1 px-2 border-r-2 border-gray-900"></td>
                      <td className="py-1 px-3 border-r-2 border-gray-900"></td>
                      <td className="py-1 px-3"></td>
                    </tr>
                  </>
                )}

                {/* Total Row */}
                <tr className="border-t-2 border-gray-900 bg-white">
                  <td colSpan={4} className="py-2 px-3 border-r-2 border-gray-900 text-left font-bold text-xs sm:text-sm">
                    Total ({amountWords})
                  </td>
                  <td className="py-2 px-3 text-right font-black text-sm sm:text-base text-gray-950">
                    {finalReceivable.toLocaleString()}
                  </td>
                </tr>

              </tbody>
            </table>
          </div>

          {/* Bottom Sign-off / Signature matching Image 1 */}
          <div className="flex justify-end mt-8 pt-4">
            <div className="text-center w-60">
              
              {/* Executive Stamp / Signature Flourish */}
              <div className="h-16 flex items-center justify-center relative">
                <svg className="w-40 h-14 text-gray-700 opacity-90" viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 45 C 30 10, 50 55, 70 20 C 90 -10, 110 50, 130 15 C 145 -5, 170 35, 190 25 M60 28 C 80 20, 140 25, 160 20 M90 40 C 110 42, 140 38, 175 35" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <ellipse cx="140" cy="28" rx="28" ry="18" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 2" transform="rotate(-15 140 28)" />
                </svg>
              </div>

              <div className="border-t border-gray-900 pt-1">
                <p className="text-xs text-gray-700 italic">For and on behalf of</p>
                <p className="font-extrabold text-xs sm:text-sm uppercase tracking-wider text-gray-950">
                  SLD System
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Embedded Print CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #sld-printable-invoice, #sld-printable-invoice * {
            visibility: visible !important;
          }
          #sld-printable-invoice {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 20mm !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>
    </Modal>
  );
};

export default InvoicePrintModal;
