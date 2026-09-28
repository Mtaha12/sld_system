import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, ShieldCheck, User, Mail, Calendar, FileText, ArrowRight } from 'lucide-react';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import logo from '../assets/branding/logo/SLD_Logo.png';
import { paymentService } from '../services/paymentService';

const PaymentReviewApprovePage = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [reviewData, setReviewData] = useState(null);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [approvedSuccess, setApprovedSuccess] = useState(false);

  useEffect(() => {
    const fetchTokenDetails = async () => {
      if (!token) {
        setError('Missing approval token.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await paymentService.getReviewTokenInfo(token);
        if (res.success && res.data) {
          setReviewData(res.data);
        } else {
          setError(res.message || 'Invalid or expired approval token.');
        }
      } catch (err) {
        console.error('Failed to load review token', err);
        const msg = err.response?.data?.message || err.message || 'Approval token is invalid, expired, or already used.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchTokenDetails();
  }, [token]);

  const handleApprove = async () => {
    try {
      setIsProcessing(true);
      setError('');
      const res = await paymentService.approveSubmission(token);
      if (res.success) {
        setApprovedSuccess(true);
      } else {
        setError(res.message || 'Approval failed.');
      }
    } catch (err) {
      console.error('Approval failed', err);
      const msg = err.response?.data?.message || err.message || 'Failed to approve account.';
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
          Account <span className="text-green-400">Approval</span>
        </h1>
        <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
          System Owner Verification Gateway
        </p>
      </div>

      <div className="w-full">
        {loading ? (
          <div className="bg-[#14151A] border border-[#262833] rounded-2xl p-8 text-center text-gray-400">
            <Spinner size="md" />
            <p className="text-xs mt-3">Validating approval security token...</p>
          </div>
        ) : error ? (
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
        ) : approvedSuccess ? (
          <div className="bg-[#14151A] border border-green-500/40 rounded-2xl p-6 sm:p-8 text-center animate-fade-in shadow-xl shadow-black/50">
            <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-400 mx-auto mb-3">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1.5">Account Approved Successfully</h2>
            <p className="text-gray-300 text-xs sm:text-sm leading-relaxed mb-5">
              The user account for <strong className="text-white">{reviewData?.user?.fullName}</strong> ({reviewData?.user?.email}) is now active. Confirmation email dispatched.
            </p>
            <div className="bg-[#1A1C23] border border-[#262833] rounded-xl p-3 text-xs text-gray-400 space-y-1 mb-5 text-left">
              <div className="flex justify-between">
                <span>Account Status:</span>
                <span className="text-green-400 font-bold uppercase">ACTIVE</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Status:</span>
                <span className="text-green-400 font-bold uppercase">APPROVED</span>
              </div>
              <div className="flex justify-between">
                <span>Single-Use Token:</span>
                <span className="text-gray-500 font-mono">CONSUMED</span>
              </div>
            </div>
            <Link to="/login" className="block w-full">
              <button
                type="button"
                className="w-full h-11 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center transition-colors focus:outline-none"
              >
                Return to Login Page
              </button>
            </Link>
          </div>
        ) : (
          <div className="bg-[#14151A] border border-[#262833] rounded-2xl p-5 sm:p-6 shadow-xl shadow-black/50 text-left">
            <div className="flex items-center justify-between border-b border-[#262833] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-green-400" />
                <div>
                  <h3 className="text-sm font-semibold text-white">Review Registration</h3>
                  <p className="text-[11px] text-gray-400">Verify user info & payment receipt</p>
                </div>
              </div>
              <span className="text-[9px] uppercase font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                Pending
              </span>
            </div>

            {/* User Details */}
            <div className="bg-[#1A1C23] border border-[#262833] rounded-xl p-3.5 space-y-2 text-xs text-gray-300 mb-4">
              <div className="flex items-center justify-between border-b border-[#262833] pb-1.5">
                <span className="text-gray-400 flex items-center gap-1.5"><User size={12} /> Name:</span>
                <span className="text-white font-medium">{reviewData?.user?.fullName}</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#262833] pb-1.5">
                <span className="text-gray-400 flex items-center gap-1.5"><Mail size={12} /> Email:</span>
                <span className="text-brand-orange font-medium">{reviewData?.user?.email}</span>
              </div>
              {reviewData?.user?.contactNumber && (
                <div className="flex items-center justify-between border-b border-[#262833] pb-1.5">
                  <span className="text-gray-400">Contact:</span>
                  <span className="text-white">{reviewData.user.contactNumber}</span>
                </div>
              )}
              {reviewData?.user?.companyName && (
                <div className="flex items-center justify-between border-b border-[#262833] pb-1.5">
                  <span className="text-gray-400">Firm:</span>
                  <span className="text-white">{reviewData.user.companyName}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-gray-400 flex items-center gap-1.5"><Calendar size={12} /> Registered:</span>
                <span className="text-gray-300">
                  {reviewData?.user?.registeredAt ? new Date(reviewData.user.registeredAt).toLocaleDateString() : 'Recent'}
                </span>
              </div>
            </div>

            {/* Proof Document Link */}
            {reviewData?.submission?.proofUrl && (
              <div className="mb-5">
                <a
                  href={reviewData.submission.proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between bg-[#1A1C23] hover:bg-[#20232c] border border-brand-orange/40 hover:border-brand-orange rounded-xl p-3 transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-brand-orange shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white group-hover:text-brand-orange transition-colors">
                        View Uploaded Receipt
                      </div>
                      <div className="text-[11px] text-gray-400 truncate">
                        {reviewData.submission.fileName || 'Payment Proof'}
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-gray-400 group-hover:translate-x-0.5 group-hover:text-brand-orange transition-all shrink-0 ml-2" />
                </a>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleApprove}
                disabled={isProcessing}
                className="w-full h-11 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center transition-colors shadow-md shadow-green-900/30 focus:outline-none"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner size="sm" /> Activating Account...
                  </span>
                ) : (
                  '✓ Approve Account & Send Confirmation Email'
                )}
              </button>

              <Link to={`/payment-review/reject/${token}`} className="block w-full">
                <button
                  type="button"
                  className="w-full h-10 bg-transparent border border-red-500/30 hover:bg-red-500/10 hover:border-red-500/60 text-red-400 text-xs font-semibold rounded-xl flex items-center justify-center transition-colors focus:outline-none"
                >
                  ✕ Reject Payment Proof Instead
                </button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentReviewApprovePage;
