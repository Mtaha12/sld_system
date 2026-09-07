import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, Lock, User, AtSign, Building, Phone, MapPin, Building2, CheckCircle2, ChevronRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import Input from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'
import SocialAuthButton from '../../../components/ui/SocialAuthButton'
import logo from '../../../assets/branding/logo/SLD_Logo.jpeg'
import { PAKISTAN_CITIES } from '../../../constants/cities'
import { signupSchema } from '../validation/authSchema'
import { authService } from '../services/authService'

const SignupForm = () => {
  const navigate = useNavigate()
  const [googleStatus, setGoogleStatus] = useState('')
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data) => {
    try {
      const response = await authService.signup(data)
      if (response.success) {
        navigate('/verify-email', { state: { email: data.email } })
      }
    } catch (error) {
      console.error('Signup failed', error)
      const apiErrors = error.response?.data?.errors;
      if (apiErrors && Array.isArray(apiErrors)) {
        apiErrors.forEach(err => {
          if (err.field && err.field !== 'all') {
            setError(err.field, { message: err.message });
          } else {
            setError('root', { message: err.message || 'Signup failed.' });
          }
        });
      } else {
        const errMsg = error.response?.data?.message || 'Signup failed. Please try again.';
        setError('root', { message: errMsg });
      }
    }
  }

  const handleGoogleSuccess = (authResult) => {
    clearErrors('root')
    if (authResult?.user) {
      setGoogleStatus(`Account authorized for ${authResult.user.fullName} (${authResult.user.email}). Redirecting...`)
      setTimeout(() => {
        navigate('/verify-email', { state: { email: authResult.user.email, isGoogleAuth: true } })
      }, 1000)
    }
  }

  const handleGoogleError = (errorMessage) => {
    setGoogleStatus('')
    setError('root', { message: errorMessage })
  }

  return (
    <div className="w-full">
      {/* Top Capsule / Pill Signin Link */}
      <div className="mb-6 md:mb-7 flex justify-center">
        <Link 
          to="/login" 
          className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[#14151A]/90 border border-brand-orange/30 hover:border-brand-orange/60 shadow-lg shadow-black/40 backdrop-blur-sm transition-all group cursor-pointer"
        >
          <User className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-xs sm:text-sm text-gray-300">Already have an account?</span>
          <span className="w-px h-3.5 bg-gray-700/80 mx-0.5"></span>
          <span className="text-xs sm:text-sm font-medium text-brand-orange group-hover:text-brand-orange-hover flex items-center gap-1 transition-colors">
            Sign in to your account <ChevronRight className="w-3.5 h-3.5 text-brand-orange group-hover:translate-x-0.5 transition-transform" />
          </span>
        </Link>
      </div>

      <div className="flex flex-col items-center text-center mb-8">
        <img src={logo} alt="SLD System" className="h-16 md:h-[90px] mb-4 md:mb-5" fetchPriority="high" loading="eager" />
        <h1 className="text-2xl md:text-3xl text-white mb-2 md:mb-3 font-medium">
          Create an <span className="text-brand-orange">account</span>
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
          Join SLD System to securely manage and access legal case information.
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-1">
            <Input
              type="text"
              placeholder="Full Name *"
              icon={User}
              variant="dark"
              error={errors.fullName}
              {...register('fullName')}
            />
          </div>

          <div className="sm:col-span-1">
            <Input
              type="text"
              placeholder="Username *"
              icon={AtSign}
              variant="dark"
              error={errors.username}
              {...register('username')}
            />
          </div>

          <div className="sm:col-span-2">
            <Input
              type="email"
              placeholder="Email Address *"
              icon={Mail}
              variant="dark"
              error={errors.email}
              {...register('email')}
            />
          </div>

          <div className="sm:col-span-1">
            <Input
              type="password"
              placeholder="Password *"
              icon={Lock}
              variant="dark"
              error={errors.password}
              {...register('password')}
            />
          </div>

          <div className="sm:col-span-1">
            <Input
              type="password"
              placeholder="Confirm Password *"
              icon={Lock}
              variant="dark"
              error={errors.confirmPassword}
              {...register('confirmPassword')}
            />
          </div>

          <div className="sm:col-span-1">
            <Input
              type="tel"
              placeholder="Contact Number *"
              icon={Phone}
              variant="dark"
              error={errors.contactNumber}
              {...register('contactNumber')}
            />
          </div>

          <div className="sm:col-span-1">
            <Input
              type="select"
              icon={Building2}
              variant="dark"
              error={errors.city}
              options={PAKISTAN_CITIES}
              {...register('city')}
            />
          </div>

          <div className="sm:col-span-2">
            <Input
              type="text"
              placeholder="Company Name *"
              icon={Building}
              variant="dark"
              error={errors.companyName}
              {...register('companyName')}
            />
          </div>

          <div className="sm:col-span-2">
            <Input
              type="text"
              placeholder="Address *"
              icon={MapPin}
              variant="dark"
              error={errors.address}
              {...register('address')}
            />
          </div>
        </div>

        <Button type="submit" className="w-full mt-2" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account...' : 'Sign up'}
        </Button>

        <div className="flex items-center gap-4 my-1">
          <div className="h-px bg-[#262833] flex-1"></div>
          <span className="text-sm text-gray-500 uppercase">OR</span>
          <div className="h-px bg-[#262833] flex-1"></div>
        </div>

        <SocialAuthButton 
          provider="google" 
          mode="signup"
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
        >
          Sign up with Google
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
              Having trouble signing up? Please contact:
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

export default SignupForm
