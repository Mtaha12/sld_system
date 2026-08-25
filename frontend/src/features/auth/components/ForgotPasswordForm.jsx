import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft } from 'lucide-react'
import Input from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'
import SocialAuthButton from '../../../components/ui/SocialAuthButton'
import AuthSupportLink from '../../../components/ui/AuthSupportLink'
import logo from '../../../assets/branding/logo/Logo_Dark_No_Bg.png'
import { forgotPasswordSchema } from '../validation/authSchema'
import { authService } from '../services/authService'

const ForgotPasswordForm = () => {
  const [isSuccess, setIsSuccess] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data) => {
    try {
      const response = await authService.forgotPassword(data)
      if (response.success) {
        setIsSuccess(true)
      }
    } catch (error) {
      console.error('Forgot password failed', error)
    }
  }

  if (isSuccess) {
    return (
      <div className="w-full flex flex-col items-center">
        <div className="flex flex-col items-center text-center mb-8 w-full max-w-sm">
          <img src={logo} alt="SLD System" className="h-16 md:h-[102px] mb-6 md:mb-8" fetchPriority="high" loading="eager" />
          <h1 className="text-2xl md:text-3xl text-white mb-2 md:mb-4 font-medium">
            Check your <span className="text-brand-orange">email</span>
          </h1>
          <p className="text-gray-400 text-sm">
            We&apos;ve sent a password reset link to your email address.
          </p>
        </div>
        <Link to="/login" className="w-full">
          <Button variant="outline" className="w-full">
            Back to Login
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col items-center">
      <div className="flex flex-col items-center text-center mb-8 w-full max-w-sm">
        <img src={logo} alt="SLD System" className="h-16 md:h-[102px] mb-6 md:mb-8" fetchPriority="high" loading="eager" />
        
        <Link to="/login" className="flex items-center text-gray-400 hover:text-white transition-colors text-sm mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Login
        </Link>

          <h1 className="text-2xl md:text-3xl text-white mb-2 md:mb-4 font-medium">
            Forgot <span className="text-brand-orange">Password?</span>
          </h1>
          <p className="text-gray-400 text-sm px-4">
            No worries! Enter your registered email address and we&apos;ll send you a link to reset your password.
          </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="w-full flex flex-col gap-5 max-w-sm">
        <Input
          type="text"
          placeholder="Email or Username *"
          icon={Mail}
          variant="dark"
          error={errors.identifier}
          {...register('identifier')}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Sending...' : 'Send Reset Link'}
        </Button>

        <div className="flex items-center gap-4 my-2">
          <div className="h-px bg-[#262833] flex-1"></div>
          <span className="text-sm text-gray-500 uppercase">OR</span>
          <div className="h-px bg-[#262833] flex-1"></div>
        </div>

        <SocialAuthButton provider="google">
          Reset with Google
        </SocialAuthButton>

        <AuthSupportLink text="Still having trouble?" />
      </form>
    </div>
  )
}

export default ForgotPasswordForm
