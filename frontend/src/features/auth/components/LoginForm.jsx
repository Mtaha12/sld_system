import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { User, Lock, CheckCircle2, ChevronRight } from 'lucide-react'
import Input from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'
import SocialAuthButton from '../../../components/ui/SocialAuthButton'
import logo from '../../../assets/branding/logo/Logo_Dark_No_Bg.png'
import { loginSchema } from '../validation/authSchema'
import { authService } from '../services/authService'
import { useUser } from '../../../contexts/UserContext'

const LoginForm = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { loginUser } = useUser()
  const [googleStatus, setGoogleStatus] = useState('')
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data) => {
    try {
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
      setError('root', { message: error.message || 'Login failed. Please check your credentials.' });
    }
  };

  const handleGoogleSuccess = (authResult) => {
    clearErrors('root')
    if (authResult?.requiresVerification) {
      setGoogleStatus(`Account authorized. Redirecting to email verification...`)
      setTimeout(() => {
        navigate('/verify-email', { state: { email: authResult.user.email } })
      }, 1000)
      return;
    }

    if (authResult?.user) {
      setGoogleStatus(`Authenticated as ${authResult.user.fullName} (${authResult.user.email}). Exchanging session...`)
      setTimeout(() => {
        loginUser(authResult.user)
        const destination = location.state?.from?.pathname || '/dashboard'
        navigate(destination, { replace: true })
      }, 1000)
    }
  }

  const handleGoogleError = (errorMessage) => {
    setGoogleStatus('')
    setError('root', { message: errorMessage })
  }

  return (
    <div className="w-full">
      {/* Top Capsule / Pill Signup Link */}
      <div className="mb-6 md:mb-7 flex justify-center">
        <Link 
          to="/signup" 
          className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[#14151A]/90 border border-brand-orange/30 hover:border-brand-orange/60 shadow-lg shadow-black/40 backdrop-blur-sm transition-all group cursor-pointer"
        >
          <User className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-xs sm:text-sm text-gray-300">New here?</span>
          <span className="w-px h-3.5 bg-gray-700/80 mx-0.5"></span>
          <span className="text-xs sm:text-sm font-medium text-brand-orange group-hover:text-brand-orange-hover flex items-center gap-1 transition-colors">
            Create your account <ChevronRight className="w-3.5 h-3.5 text-brand-orange group-hover:translate-x-0.5 transition-transform" />
          </span>
        </Link>
      </div>

      <div className="flex flex-col items-center text-center mb-8">
        <img src={logo} alt="SLD System" className="h-16 md:h-[90px] mb-4 md:mb-5" fetchPriority="high" loading="eager" />
        <h1 className="text-2xl md:text-3xl text-white mb-2 md:mb-3 font-medium">
          Welcome to <span className="text-brand-orange">SLD System</span>
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
          Please sign in to continue to your account and access the system.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {errors.root && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg text-center animate-shake">
            {errors.root.message}
          </div>
        )}

        {googleStatus && (
          <div className="bg-green-500/10 border border-green-500/50 text-green-400 text-sm p-3 rounded-lg flex items-center justify-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{googleStatus}</span>
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
          <Link to="/forgot-password" className="text-sm text-brand-orange hover:text-brand-orange-hover transition-colors">
            Forgot Password?
          </Link>
        </div>

        <Button type="submit" className="w-full mt-2" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : 'Login'}
        </Button>

        <div className="flex items-center gap-4 my-4">
          <div className="h-px bg-[#262833] flex-1"></div>
          <span className="text-sm text-gray-500 uppercase">OR</span>
          <div className="h-px bg-[#262833] flex-1"></div>
        </div>

        <SocialAuthButton 
          provider="google" 
          mode="signin"
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
        >
          Sign in with Google
        </SocialAuthButton>

        {/* Contact Us Block */}
        <div className="mt-5">
          <div className="relative mb-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-theme-border/60"></div>
            </div>
            <div className="relative flex justify-center text-[10px]">
              <span className="px-3 bg-theme-surface text-theme-muted font-semibold tracking-wider uppercase">CONTACT WITH US</span>
            </div>
          </div>
          
          <div className="text-left space-y-0.5 text-xs text-theme-muted">
            <p className="text-[#E55C41] font-medium mb-1">
              Having trouble signing in? Please contact:
            </p>
            <p className="text-white font-medium">Haroon Ahmad Rafiq</p>
            <p className="leading-snug">Head Office # SO-6 & 7, 2nd Floor, City Centre, Bank Road, Saddar-Rawalpindi</p>
            <p className="leading-snug">0321-5390007-8, 051-8315912</p>
            <p className="leading-snug">info@sldsystem.com</p>
          </div>
        </div>

      </form>
    </div>
  )
}

export default LoginForm
