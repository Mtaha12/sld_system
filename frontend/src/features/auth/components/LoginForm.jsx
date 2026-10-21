import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { User, Lock, CheckCircle2, ChevronRight } from 'lucide-react'
import Input from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'
import logo from '../../../assets/branding/logo/SLD_Logo.png'
import { loginSchema } from '../validation/authSchema'
import { authService } from '../services/authService'
import { useUser } from '../../../contexts/UserContext'

const LoginForm = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { loginUser } = useUser()
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
  })

  const [statusInfo, setStatusInfo] = useState(null);

  const onSubmit = async (data) => {
    try {
      setStatusInfo(null);
      const response = await authService.login(data);
      if (response.success && response.user) {
        loginUser(response.user);
        const destination = location.state?.from?.pathname || '/dashboard';
        navigate(destination, { replace: true });
      } else {
        setError('root', { message: response.message || 'Invalid credentials.' });
      }
    } catch (error) {
      console.error('Login failed', error);
      const resData = error.response?.data;
      if (resData?.status === 'PENDING_APPROVAL' || resData?.status === 'REJECTED') {
        setStatusInfo({
          status: resData.status,
          message: resData.message,
          email: resData.email || data.identifier,
          redirect: resData.redirect || '/payment-instructions'
        });
      } else if (resData?.unverified) {
        setStatusInfo({
          status: 'UNVERIFIED',
          message: resData.message || 'Your email address is not verified. Please verify OTP first.',
          email: resData.email || data.identifier,
          redirect: '/verify-email'
        });
      } else {
        const errorMsg = resData?.message || error.message || 'Login failed. Please check your credentials.';
        setError('root', { message: errorMsg });
      }
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-col items-center text-center mb-7">
        <img src={logo} alt="SLD System" className="h-16 md:h-[90px] mb-4 md:mb-5" fetchPriority="high" loading="eager" />
        <h1 className="text-2xl md:text-3xl text-white mb-2 md:mb-3 font-bold tracking-tight">
          Welcome to <span className="text-brand-orange">SLD System</span>
        </h1>
        <p className="text-slate-300 text-sm leading-relaxed max-w-sm">
          Please sign in to continue to your account and access the legal intelligence system.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {statusInfo && (
          <div className={`border p-4 rounded-xl text-left animate-fade-in ${
            statusInfo.status === 'REJECTED' 
              ? 'bg-red-500/10 border-red-500/40 text-red-300' 
              : 'bg-amber-500/10 border-amber-500/40 text-amber-300'
          }`}>
            <p className="text-sm font-medium whitespace-pre-line leading-relaxed mb-3">
              {statusInfo.message}
            </p>
            <Link 
              to={statusInfo.redirect}
              state={{ email: statusInfo.email }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-orange hover:text-brand-orange-hover underline transition-colors"
            >
              {statusInfo.status === 'UNVERIFIED' ? 'Verify Email Address →' : 'Go to Payment Instructions →'}
            </Link>
          </div>
        )}

        {errors.root && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-lg text-center animate-shake whitespace-pre-line">
            {errors.root.message}
          </div>
        )}

        <Input
          type="text"
          placeholder="Email or Username *"
          icon={User}
          variant="dark"
          error={errors.identifier}
          {...register('identifier')}
        />

        <Input
          type="password"
          placeholder="Password *"
          icon={Lock}
          variant="dark"
          error={errors.password}
          {...register('password')}
        />

        <div className="flex justify-end w-full">
          <Link to="/forgot-password" className="text-xs font-semibold text-brand-orange hover:text-brand-orange-hover transition-colors">
            Forgot Password?
          </Link>
        </div>

        <Button type="submit" className="w-full mt-1 font-bold text-sm h-11" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : 'Login'}
        </Button>

        {/* Create Account Link Card (Positioned where Google signin was) */}
        <div className="mt-1 p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="text-left w-full sm:w-auto">
            <span className="text-xs text-slate-400 block font-medium">Don't have an account?</span>
            <span className="text-xs font-bold text-slate-100">Register as a new member</span>
          </div>
          <Link
            to="/signup"
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <span>Create Account</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Contact Us Block */}
        <div className="mt-3 p-4 rounded-xl bg-slate-900/60 border border-slate-700/60">
          <div className="relative mb-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700/70"></div>
            </div>
            <div className="relative flex justify-center text-[10px]">
              <span className="px-3 bg-slate-800 text-slate-400 font-bold tracking-wider uppercase rounded-full">CONTACT WITH US</span>
            </div>
          </div>
          
          <div className="text-left space-y-2 text-xs text-slate-300">
            <p className="text-brand-orange font-bold text-xs mb-1">
              Having trouble signing in? Please contact:
            </p>
            <div className="space-y-0.5 border-b border-slate-700/60 pb-2">
              <p className="text-white font-bold">Haroon Ahmad Rafiq</p>
              <p className="leading-snug text-slate-300">Head Office # SO-6 & 7, 2nd Floor, City Centre, Bank Road, Saddar-Rawalpindi</p>
              <p className="leading-snug text-slate-400 font-mono text-[11px]">0321-5390007-8, 051-8315912 • info@sldsystem.com</p>
            </div>
            <div className="space-y-0.5 pt-0.5">
              <p className="text-white font-bold">Abdul Sami Abbasi <span className="text-[11px] font-normal text-slate-400">(Sales Manager)</span></p>
              <p className="leading-snug text-slate-300">Karachi Branch Office No. 408, 4th Floor, Al-Ayesha Chambers, Sharar-e-Iraq, Near Passport Office, Saddar-Karachi</p>
              <p className="leading-snug text-slate-400 font-mono text-[11px]">0325-8986393 • sami@sldsystem.com</p>
            </div>
          </div>
        </div>

      </form>
    </div>
  )
}

export default LoginForm
