import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, Lock, User, AtSign, Building, Phone, MapPin, Building2 } from 'lucide-react'
import Input from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'
import SocialAuthButton from '../../../components/ui/SocialAuthButton'
import AuthSupportLink from '../../../components/ui/AuthSupportLink'
import logo from '../../../assets/branding/logo/Logo_Dark_No_Bg.png'
import { useNavigate } from 'react-router-dom'
import { PAKISTAN_CITIES } from '../../../constants/cities'
import { signupSchema } from '../validation/authSchema'
import { authService } from '../services/authService'

const SignupForm = () => {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
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
    }
  }

  return (
    <div className="w-full">
      <div className="flex flex-col items-center text-center mb-8">
        <img src={logo} alt="SLD System" className="h-16 md:h-[102px] mb-4 md:mb-6" fetchPriority="high" loading="eager" />
        <h1 className="text-2xl md:text-3xl text-white mb-2 md:mb-3 font-medium">
          Create an <span className="text-brand-orange">account</span>
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
          Join SLD System to securely manage and access legal case information.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
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
        </div>

        <Button type="submit" className="w-full mt-2" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account...' : 'Sign up'}
        </Button>

        <div className="flex items-center gap-4 my-1">
          <div className="h-px bg-[#262833] flex-1"></div>
          <span className="text-sm text-gray-500 uppercase">OR</span>
          <div className="h-px bg-[#262833] flex-1"></div>
        </div>

        <SocialAuthButton provider="google">
          Sign up with Google
        </SocialAuthButton>

        <AuthSupportLink action="signup" />
      </form>
    </div>
  )
}

export default SignupForm
