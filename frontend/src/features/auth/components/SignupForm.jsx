import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, Lock, User, AtSign, Building, Phone, MapPin, Building2, ChevronRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import Input from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'
import logo from '../../../assets/branding/logo/SLD_Logo.png'
import { PAKISTAN_CITIES } from '../../../constants/cities'
import { signupSchema } from '../validation/authSchema'
import { authService } from '../services/authService'
import { settingService } from '../../../services/settingService'

const SignupForm = () => {
  const navigate = useNavigate()
  const [cityOptions, setCityOptions] = useState(PAKISTAN_CITIES)

  useEffect(() => {
    let isMounted = true
    settingService.getCities({ status: 'active', limit: 1000 })
      .then(res => {
        if (isMounted && res?.data && Array.isArray(res.data) && res.data.length > 0) {
          const fetchedCities = res.data.map(c => ({
            value: c.name,
            label: c.name
          }))
          setCityOptions([
            { value: '', label: 'Select City *' },
            ...fetchedCities
          ])
        }
      })
      .catch(err => {
        console.warn('Could not load dynamic cities, falling back to static list:', err)
      })
    return () => { isMounted = false }
  }, [])
  const {
    register,
    handleSubmit,
    setError,
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

  return (
    <div className="w-full">
      <div className="flex flex-col items-center text-center mb-7">
        <img src={logo} alt="SLD System" className="h-16 md:h-[90px] mb-4 md:mb-5" fetchPriority="high" loading="eager" />
        <h1 className="text-2xl md:text-3xl text-white mb-2 md:mb-3 font-bold tracking-tight">
          Create an <span className="text-brand-orange">account</span>
        </h1>
        <p className="text-slate-300 text-sm leading-relaxed max-w-sm">
          Join SLD System to securely manage and access legal case information.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {errors.root && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-lg text-center animate-shake">
            {errors.root.message}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              options={cityOptions}
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

        <Button type="submit" className="w-full mt-2 font-bold text-sm h-11" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account...' : 'Sign up'}
        </Button>

        {/* Login Account Link Card (Positioned where Google signup was) */}
        <div className="mt-1 p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="text-left w-full sm:w-auto">
            <span className="text-xs text-slate-400 block font-medium">Already have an account?</span>
            <span className="text-xs font-bold text-slate-100">Sign in to your SLD workspace</span>
          </div>
          <Link
            to="/login"
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <span>Login to Account</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Contact Us Block */}
        <div className="mt-4 p-4 rounded-xl bg-slate-900/60 border border-slate-700/60">
          <div className="relative mb-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700/80"></div>
            </div>
            <div className="relative flex justify-center text-[10px]">
              <span className="px-3 bg-slate-900 text-slate-400 font-bold tracking-wider uppercase">CONTACT WITH US</span>
            </div>
          </div>
          
          <div className="text-left space-y-2 text-xs text-slate-300">
            <p className="text-brand-orange font-semibold mb-1">
              Having trouble signing up? Please contact:
            </p>
            <div className="space-y-0.5 border-b border-slate-700/50 pb-2">
              <p className="text-white font-semibold">Haroon Ahmad Rafiq</p>
              <p className="text-slate-400 leading-snug">Head Office # SO-6 & 7, 2nd Floor, City Centre, Bank Road, Saddar-Rawalpindi</p>
              <p className="text-slate-400 leading-snug">0321-5390007-8, 051-8315912 • info@sldsystem.com</p>
            </div>
            <div className="space-y-0.5 pt-0.5">
              <p className="text-white font-semibold">Abdul Sami Abbasi <span className="text-[11px] font-normal text-slate-400">(Sales Manager)</span></p>
              <p className="text-slate-400 leading-snug">Karachi Branch Office No. 408, 4th Floor, Al-Ayesha Chambers, Sharar-e-Iraq, Near Passport Office, Saddar-Karachi</p>
              <p className="text-slate-400 leading-snug">0325-8986393 • sami@sldsystem.com</p>
            </div>
          </div>
        </div>

      </form>
    </div>
  )
}

export default SignupForm
