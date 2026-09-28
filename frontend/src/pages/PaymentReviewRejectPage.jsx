import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertTriangle, XCircle, ShieldAlert, FileText, ArrowRight, Check } from 'lucide-react';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import logo from '../assets/branding/logo/SLD_Logo.png';
import { paymentService } from '../services/paymentService';

const PRESET_REASONS = [
  'Payment not found in bank statement',
  'Incorrect amount transferred',
  'Invalid receipt or counterfeit slip',
  'Receipt unreadable or blurry image',
  'Transaction reference ID missing'
];

const PaymentReviewRejectPage = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [reviewData, setReviewData] = useState(null);
  const [error, setError] = useState('');
  const [selectedPreset, setSelectedPreset] = useState(PRESET_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectedSuccess, setRejectedSuccess] = useState(false);

  useEffect(() => {
    const fetchTokenDetails = async () => {
      if (!token) {
        setError('Missing rejection token.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await paymentService.getReviewTokenInfo(token);
        if (res.success && res.data) {
          setReviewData(res.data);
        } else {
          setError(res.message || 'Invalid or expired review token.');
        }
      } catch (err) {
        console.error('Failed to load review token', err);
        const msg = err.response?.data?.message || err.message || 'Rejection token is invalid, expired, or already used.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchTokenDetails();
  }, [token]);

  const handleReject = async (e) => {
    e.preventDefault();
    const finalReason = customReason.trim() || selectedPreset;

    if (!finalReason) {
      setError('Please select or specify a reason for rejection.');
      return;
    }

    try {
      setIsProcessing(true);
      setError('');
      const res = await paymentService.rejectSubmission(token, finalReason);
      if (res.success) {
        setRejectedSuccess(true);
      } else {
        setError(res.message || 'Failed to submit rejection.');
      }
    } catch (err) {
      console.error('Rejection failed', err);
      const msg = err.response?.data?.message || err.message || 'Failed to reject payment proof.';
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center">
      {/* Header Branding */}
      <div className="flex flex-col items-center text-center mb-6 w-full">
        <img src={logo} alt="SLD System" className="h-14 md:h-[75px] mb-3" fetchPriority="high" loading="eager" />
        <h1 className="text-2xl sm:text-3xl text-white font-medium mb-1.5 tracking-tight">
          Reject <span className="text-red-400">Payment Proof</span>
        </h1>
        <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
          System Owner Verification Gateway
        </p>
      </div>

      <div className="w-full">
        {loading ? (
          <div className="bg-[#14151A] border border-[#262833] rounded-2xl p-8 text-center text-gray-400">
            <Spinner size="md" />
            <p className="text-xs mt-3">Validating rejection security token...</p>
          </div>
        ) : error && !reviewData ? (
          <div className="bg-[#14151A] border border-red-500/40 rounded-2xl p-6 sm:p-8 text-center animate-shake">
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-2.5" />
            <h3 className="text-base font-semibold text-white mb-1.5">Action Cannot Be Completed</h3>
            <p className="text-xs text-red-400 mb-5 leading-relaxed">{error}</p>
            <Link to="/login" className="block w-full">
              <Button variant="outline-dark" size="md" className="w-full h-11 text-xs font-semibold rounded-xl">
                Go to Portal Login
              </Button>
            </Link>
          </div>
        ) : rejectedSuccess ? (
          <div className="bg-[#14151A] border border-red-500/40 rounded-2xl p-6 sm:p-8 text-center animate-fade-in shadow-xl shadow-black/50">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto mb-3">
              <XCircle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1.5">Payment Proof Rejected</h2>
            <p className="text-gray-300 text-xs sm:text-sm leading-relaxed mb-5">
              The submission for <strong className="text-white">{reviewData?.user?.fullName}</strong> ({reviewData?.user?.email}) has been rejected. Notification dispatched.
            </p>
            <div className="bg-[#1A1C23] border border-[#262833] rounded-xl p-3 text-xs text-gray-400 space-y-1 mb-5 text-left">
              <div className="flex justify-between">
                <span>Account Status:</span>
                <span className="text-red-400 font-bold uppercase">REJECTED</span>
              </div>
              <div className="flex justify-between">
                <span>Reason:</span>
                <span className="text-white font-medium truncate max-w-[200px]">{customReason.trim() || selectedPreset}</span>
              </div>
              <div className="flex justify-between">
                <span>Single-Use Token:</span>
                <span className="text-gray-500 font-mono">CONSUMED</span>
              </div>
            </div>
            <Link to="/login" className="block w-full">
              <button
                type="button"
                className="w-full h-11 bg-transparent border border-[#262833] hover:border-gray-500 text-gray-300 hover:text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center transition-colors focus:outline-none"
              >
                Return to Login Page
              </button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReject} className="bg-[#14151A] border border-red-500/30 rounded-2xl p-5 sm:p-6 shadow-xl shadow-black/50 text-left">
            <div className="flex items-center justify-between border-b border-[#262833] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-400" />
                <div>
                  <h3 className="text-sm font-semibold text-white">Reject Account Submission</h3>
                  <p className="text-[11px] text-gray-400">Specify why payment proof could not be verified</p>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/40 text-red-400 text-xs p-2.5 rounded-lg mb-3 animate-shake">
                {error}
              </div>
            )}

            {/* Applicant Details */}
            <div className="bg-[#1A1C23] border border-[#262833] rounded-xl p-3 space-y-1 text-xs text-gray-300 mb-4 text-left">
              <div className="flex justify-between">
                <span className="text-gray-400">Applicant:</span>
                <span className="text-white font-medium">{reviewData?.user?.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Email:</span>
                <span className="text-brand-orange font-medium">{reviewData?.user?.email}</span>
              </div>
            </div>

            {/* Document Link */}
            {reviewData?.submission?.proofUrl && (
              <div className="mb-4">
                <a
                  href={reviewData.submission.proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between bg-[#1A1C23] hover:bg-[#20232c] border border-[#262833] hover:border-brand-orange/50 rounded-xl p-2.5 text-xs text-gray-300 transition-colors"
                >
                  <span className="flex items-center gap-2 text-white">
                    <FileText size={13} className="text-brand-orange" />
                    Inspect Receipt Document
                  </span>
                  <ArrowRight size={13} className="text-gray-400" />
                </a>
              </div>
            )}

            {/* Reason Selection */}
            <div className="text-left mb-4">
              <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-2">
                Select Reason *
              </label>
              <div className="space-y-1.5">
                {PRESET_REASONS.map((reason, idx) => (
                  <label
                    key={idx}
                    onClick={() => {
                      setSelectedPreset(reason);
                      setCustomReason('');
                    }}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      selectedPreset === reason && !customReason
                        ? 'bg-red-500/10 border-red-500/50 text-white'
                        : 'bg-[#1A1C23] border-[#262833] text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="rejectionPreset"
                      checked={selectedPreset === reason && !customReason}
                      onChange={() => {
                        setSelectedPreset(reason);
                        setCustomReason('');
                      }}
                      className="text-red-500 focus:ring-0 bg-transparent border-gray-600"
                    />
                    <span className="flex-1 text-xs leading-snug">{reason}</span>
                    {selectedPreset === reason && !customReason && (
                      <Check size={13} className="text-red-400 shrink-0" />
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Custom Rejection Reason Input */}
            <div className="text-left mb-5">
              <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                Or Custom Reason
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Receipt unreadable. Please re-upload clear slip."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full bg-[#1A1C23] border border-[#262833] rounded-xl p-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500/60 transition-colors"
              />
            </div>

            {/* Actions */}
            <div className="space-y-2.5">
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full h-11 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center transition-colors shadow-md shadow-red-900/30 focus:outline-none"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner size="sm" /> Sending Rejection Notice...
                  </span>
                ) : (
                  '✕ Confirm Rejection & Email User'
                )}
              </button>

              <Link to={`/payment-review/approve/${token}`} className="block w-full">
                <button
                  type="button"
                  className="w-full h-10 bg-transparent border border-green-500/30 hover:bg-green-500/10 hover:border-green-500/60 text-green-400 text-xs font-semibold rounded-xl flex items-center justify-center transition-colors focus:outline-none"
                >
                  ✓ Approve Account Instead
                </button>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default PaymentReviewRejectPage;
