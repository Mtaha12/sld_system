import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  Building2, 
  Smartphone, 
  UploadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  Clock, 
  ArrowLeft, 
  ShieldCheck, 
  Info,
  FileCheck
} from 'lucide-react';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import logo from '../assets/branding/logo/Logo_Dark_No_Bg.png';
import { paymentService } from '../services/paymentService';

const PaymentInstructionsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Retrieve user email from location state or pending storage
  const [email, setEmail] = useState(() => {
    return location.state?.email || localStorage.getItem('sld_pending_email') || '';
  });

  const [instructionsData, setInstructionsData] = useState(null);
  const [userStatusData, setUserStatusData] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Upload Form State
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Clipboard copy tracker
  const [copiedKey, setCopiedKey] = useState('');

  // Fetch payment instructions on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoadingConfig(true);
        const res = await paymentService.getPaymentInstructions();
        if (res.success && res.data) {
          setInstructionsData(res.data);
        }
      } catch (err) {
        console.error('Failed to load payment instructions', err);
      } finally {
        setLoadingConfig(false);
      }
    };
    fetchConfig();
  }, []);

  // Fetch user submission status when email is available
  useEffect(() => {
    if (!email) return;

    const fetchStatus = async () => {
      try {
        const res = await paymentService.getPaymentStatus(email);
        if (res.success && res.data) {
          setUserStatusData(res.data);
        }
      } catch (err) {
        console.warn('Status query failed or user has not submitted proof yet', err);
      }
    };
    fetchStatus();
  }, [email, uploadSuccess]);

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2500);
  };

  const validateFile = (file) => {
    setFileError('');
    if (!file) return false;

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedMimeTypes.includes(file.type)) {
      setFileError('Invalid file format. Please select a JPG, PNG, or PDF file.');
      return false;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setFileError('File size exceeds the 10 MB maximum limit.');
      return false;
    }

    return true;
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
    }
  };

  const handleSubmitProof = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setFileError('');

    if (!email) {
      setErrorMessage('Please provide the email address used during registration.');
      return;
    }

    if (!selectedFile) {
      setFileError('Please select a payment receipt (JPG, PNG, or PDF).');
      return;
    }

    const formData = new FormData();
    formData.append('paymentProof', selectedFile);
    formData.append('email', email);

    try {
      setIsUploading(true);
      const res = await paymentService.uploadPaymentProof(formData);
      if (res.success) {
        setUploadSuccess(true);
        setSelectedFile(null);
      } else {
        setErrorMessage(res.message || 'Failed to upload proof. Please try again.');
      }
    } catch (err) {
      console.error('Upload failed', err);
      const msg = err.response?.data?.message || err.message || 'Failed to submit payment proof.';
      setErrorMessage(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const latestSub = userStatusData?.latestSubmission;
  const isPendingReview = latestSub?.status === 'PENDING_REVIEW' || uploadSuccess;
  const isRejected = userStatusData?.status === 'REJECTED' || latestSub?.status === 'REJECTED';
  const isActive = userStatusData?.status === 'ACTIVE' || userStatusData?.status === 'active';

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center">
      {/* Top Capsule Link */}
      <div className="mb-6 flex justify-center w-full">
        <Link 
          to="/login" 
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#14151A] border border-[#262833] hover:border-brand-orange/60 text-xs sm:text-sm text-gray-300 hover:text-white transition-all shadow-md"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-brand-orange" />
          <span>Back to Sign In</span>
        </Link>
      </div>

      {/* Header Branding */}
      <div className="flex flex-col items-center text-center mb-6 w-full">
        <img src={logo} alt="SLD System" className="h-14 md:h-[75px] mb-3" fetchPriority="high" loading="eager" />
        <h1 className="text-2xl sm:text-3xl text-white font-medium mb-1.5 tracking-tight">
          Payment <span className="text-brand-orange">Verification</span>
        </h1>
        <p className="text-gray-400 text-xs sm:text-sm leading-relaxed max-w-sm">
          Transfer your subscription fee to any official account below and submit your receipt for manual activation.
        </p>
      </div>

      {/* User Context Bar */}
      {email && (
        <div className="w-full bg-[#14151A] border border-[#262833] rounded-xl px-4 py-3 mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#1A1C23] border border-[#262833] flex items-center justify-center text-brand-orange shrink-0">
              <ShieldCheck size={15} />
            </div>
            <div className="min-w-0 text-left">
              <span className="text-[11px] text-gray-400 block leading-tight">Account Email:</span>
              <span className="text-xs text-white font-medium truncate block">{email}</span>
            </div>
          </div>
          {userStatusData && (
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase shrink-0 border ${
              isActive 
                ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                : isRejected 
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}>
              {userStatusData.status}
            </span>
          )}
        </div>
      )}

      {/* Active Account Banner */}
      {isActive && (
        <div className="w-full bg-green-500/10 border border-green-500/40 rounded-2xl p-5 text-center mb-6 animate-fade-in">
          <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
          <h2 className="text-lg font-semibold text-white mb-1">Account Active & Approved</h2>
          <p className="text-gray-300 text-xs sm:text-sm mb-4">
            Your payment has been verified. You can now log in to the portal.
          </p>
          <Button 
            onClick={() => navigate('/login')} 
            size="md"
            className="w-full h-11 text-sm font-semibold rounded-xl"
          >
            Sign In Now
          </Button>
        </div>
      )}

      {/* Rejection Alert Banner */}
      {isRejected && !uploadSuccess && (
        <div className="w-full bg-red-500/10 border border-red-500/40 rounded-2xl p-4 sm:p-5 mb-6 animate-shake text-left">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-red-400 mb-1">Payment Proof Rejected</h3>
              <p className="text-xs text-gray-300 mb-2">
                Your previous receipt could not be approved by the administrator.
              </p>
              {latestSub?.rejectionReason && (
                <div className="bg-[#14151A] border border-red-500/30 rounded-lg p-2.5 my-1.5 text-xs text-white break-words">
                  <span className="text-[10px] text-red-400 font-bold uppercase block mb-0.5">Reason:</span>
                  {latestSub.rejectionReason}
                </div>
              )}
              <p className="text-[11px] text-gray-400 mt-2">
                Please review the accounts below and upload a clear, revised proof of payment.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pending Review Notice */}
      {isPendingReview && !isRejected && !isActive && (
        <div className="w-full bg-[#14151A] border border-amber-500/40 rounded-2xl p-6 text-center mb-6 animate-fade-in shadow-xl shadow-black/40">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-3">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-1">Proof Submitted — Under Review</h2>
          <p className="text-gray-300 text-xs sm:text-sm leading-relaxed max-w-sm mx-auto mb-4">
            Your receipt has been submitted and transmitted to the administrator. You will receive an email once approved.
          </p>
          <div className="bg-[#1A1C23] border border-[#262833] rounded-xl p-3 max-w-sm mx-auto text-left text-xs text-gray-400 space-y-1 mb-4">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="text-amber-400 font-semibold uppercase">Pending Verification</span>
            </div>
            {latestSub?.fileName && (
              <div className="flex justify-between">
                <span>File:</span>
                <span className="text-white truncate max-w-[180px]">{latestSub.fileName}</span>
              </div>
            )}
          </div>
          <Button 
            variant="outline-dark" 
            onClick={() => navigate('/login')} 
            size="md" 
            className="w-full h-11 text-xs font-semibold rounded-xl"
          >
            Back to Sign In
          </Button>
        </div>
      )}

      {/* Dynamic Payment Details Section */}
      {loadingConfig ? (
        <div className="py-8 flex flex-col items-center justify-center text-gray-400">
          <Spinner size="md" />
          <span className="text-xs mt-2">Loading payment details...</span>
        </div>
      ) : (
        <div className="w-full space-y-5">
          {/* Subscription Package Card */}
          {instructionsData?.title && (
            <div className="bg-[#14151A] border border-[#262833] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-orange block">
                  Membership Package
                </span>
                <h3 className="text-sm font-medium text-white">{instructionsData.title}</h3>
              </div>
              {instructionsData?.amount && (
                <div className="sm:text-right shrink-0">
                  <span className="text-[10px] text-gray-400 block">Fee:</span>
                  <span className="text-sm font-bold text-white">{instructionsData.amount}</span>
                </div>
              )}
            </div>
          )}

          {/* Bank Accounts Section */}
          <div>
            <div className="flex items-center gap-1.5 mb-2.5 text-left">
              <Building2 className="w-4 h-4 text-brand-orange" />
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Bank Transfer Accounts</h3>
            </div>
            <div className="space-y-3">
              {instructionsData?.bankAccounts?.map((bank, index) => (
                <div key={index} className="bg-[#14151A] border border-[#262833] hover:border-brand-orange/40 rounded-xl p-3.5 transition-colors text-left">
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[#262833]">
                    <span className="font-semibold text-xs text-white">{bank.bankName}</span>
                    <span className="text-[9px] uppercase font-bold text-brand-orange bg-brand-orange/10 px-1.5 py-0.5 rounded">
                      Bank Deposit
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-gray-400 text-[11px] block">Title:</span>
                      <span className="text-white font-medium">{bank.accountTitle}</span>
                    </div>

                    <div>
                      <span className="text-gray-400 text-[11px] block">Account Number:</span>
                      <div className="flex items-center justify-between bg-[#1A1C23] px-2.5 py-1.5 rounded-lg border border-[#262833] mt-0.5">
                        <span className="text-white font-mono text-xs">{bank.accountNumber}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(bank.accountNumber, `bank_acc_${index}`)}
                          className="text-gray-400 hover:text-brand-orange transition-colors p-1"
                          title="Copy Account Number"
                        >
                          {copiedKey === `bank_acc_${index}` ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                        </button>
                      </div>
                    </div>

                    {bank.iban && (
                      <div>
                        <span className="text-gray-400 text-[11px] block">IBAN:</span>
                        <div className="flex items-center justify-between bg-[#1A1C23] px-2.5 py-1.5 rounded-lg border border-[#262833] mt-0.5">
                          <span className="text-white font-mono text-[11px] truncate mr-2">{bank.iban}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(bank.iban, `bank_iban_${index}`)}
                            className="text-gray-400 hover:text-brand-orange transition-colors p-1 shrink-0"
                            title="Copy IBAN"
                          >
                            {copiedKey === `bank_iban_${index}` ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Digital Wallets Section */}
          {instructionsData?.digitalWallets && instructionsData.digitalWallets.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2.5 text-left">
                <Smartphone className="w-4 h-4 text-brand-orange" />
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Mobile Wallets</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {instructionsData.digitalWallets.map((wallet, index) => (
                  <div key={index} className="bg-[#14151A] border border-[#262833] hover:border-brand-orange/40 rounded-xl p-3 transition-colors text-left">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-xs text-white">{wallet.provider}</span>
                      <span className="text-[9px] uppercase font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                        Wallet
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div>
                        <span className="text-gray-400 text-[11px] block">Title:</span>
                        <span className="text-white text-xs">{wallet.accountTitle}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 text-[11px] block">Number:</span>
                        <div className="flex items-center justify-between bg-[#1A1C23] px-2 py-1 rounded-lg border border-[#262833] mt-0.5">
                          <span className="text-white font-mono text-xs">{wallet.accountNumber}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(wallet.accountNumber, `wallet_${index}`)}
                            className="text-gray-400 hover:text-brand-orange transition-colors p-1"
                            title="Copy Number"
                          >
                            {copiedKey === `wallet_${index}` ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Guidelines Section */}
          {instructionsData?.instructions && instructionsData.instructions.length > 0 && (
            <div className="bg-[#14151A] border border-[#262833] rounded-xl p-4 text-left">
              <div className="flex items-center gap-1.5 mb-2">
                <Info className="w-3.5 h-3.5 text-brand-orange" />
                <h4 className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">Guidelines</h4>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-xs text-gray-400 leading-relaxed">
                {instructionsData.instructions.map((step, idx) => (
                  <li key={idx} className="pl-0.5 text-gray-300">{step}</li>
                ))}
              </ol>
            </div>
          )}

          {/* Proof Upload Form */}
          {(!isPendingReview || isRejected) && !isActive && (
            <form onSubmit={handleSubmitProof} className="bg-[#14151A] border border-brand-orange/30 rounded-2xl p-5 shadow-xl shadow-black/40 text-left">
              <div className="flex items-center justify-between mb-3 border-b border-[#262833] pb-2.5">
                <div className="flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-brand-orange" />
                  <h3 className="text-sm font-semibold text-white">Upload Payment Receipt</h3>
                </div>
                <span className="text-[10px] text-gray-400">Max: 10 MB</span>
              </div>

              {errorMessage && (
                <div className="bg-red-500/10 border border-red-500/40 text-red-400 text-xs p-2.5 rounded-lg mb-3 animate-shake">
                  {errorMessage}
                </div>
              )}

              {fileError && (
                <div className="bg-red-500/10 border border-red-500/40 text-red-400 text-xs p-2.5 rounded-lg mb-3 animate-shake">
                  {fileError}
                </div>
              )}

              {/* Email Input (if not present) */}
              {!email && (
                <div className="mb-3">
                  <label className="block text-xs text-gray-300 mb-1 font-medium">Registered Email Address *</label>
                  <input
                    type="email"
                    placeholder="Enter registered email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-[#1A1C23] border border-[#262833] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-orange transition-colors"
                  />
                </div>
              )}

              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                  isDragging 
                    ? 'border-brand-orange bg-brand-orange/5' 
                    : selectedFile 
                      ? 'border-green-500/60 bg-green-500/5' 
                      : 'border-[#262833] hover:border-brand-orange/50 bg-[#1A1C23]/60'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,application/pdf"
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="flex flex-col items-center">
                    <FileCheck className="w-8 h-8 text-green-400 mb-1.5" />
                    <span className="text-xs text-white font-medium truncate max-w-xs">{selectedFile.name}</span>
                    <span className="text-[11px] text-gray-400 mt-0.5">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Click to change
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <UploadCloud className="w-8 h-8 text-gray-400 mb-1.5 group-hover:text-brand-orange transition-colors" />
                    <span className="text-xs text-gray-200 font-medium">
                      Drag & drop receipt or <span className="text-brand-orange underline">browse file</span>
                    </span>
                    <span className="text-[10px] text-gray-500 mt-0.5">
                      JPG, PNG, PDF up to 10 MB
                    </span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isUploading || !selectedFile}
                className="w-full mt-4 h-11 bg-brand-orange hover:bg-brand-orange-hover disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center transition-colors focus:outline-none"
              >
                {isUploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner size="sm" /> Submitting Proof...
                  </span>
                ) : (
                  'Submit Payment Proof for Verification'
                )}
              </button>
            </form>
          )}

          {/* Contact Support */}
          <div className="pt-2 border-t border-[#262833]">
            <div className="text-left space-y-0.5 text-[11px] text-gray-400">
              <p className="text-brand-orange font-medium">Need payment support?</p>
              <p className="text-white font-medium">{instructionsData?.supportContact?.name || 'Haroon Ahmad Rafiq'}</p>
              <p>{instructionsData?.supportContact?.phone || '0321-5390007-8, 051-8315912'}</p>
              <p>{instructionsData?.supportContact?.email || 'info@sldsystem.com'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentInstructionsPage;
