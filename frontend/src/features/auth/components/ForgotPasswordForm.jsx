import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { Mail, Lock, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import Input from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'
import logo from '../../../assets/branding/logo/SLD_Logo.png'
import { forgotPasswordSchema, resetPasswordSchema } from '../validation/authSchema'
import { authService } from '../services/authService'
import { useCountdown } from '../../../hooks/useCountdown'

const ForgotPasswordForm = () => {
  const [step, setStep] = useState('request') // 'request' | 'otp' | 'newPassword' | 'success'
  const [email, setEmail] = useState('')
  const [verifiedToken, setVerifiedToken] = useState('')
  const [apiError, setApiError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [otpStatus, setOtpStatus] = useState('idle') // 'idle' | 'success' | 'error'

  // OTP State
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [expireTimer, setExpireTimer] = useCountdown(299) // 4:59
  const [resendTimer, setResendTimer] = useCountdown(30)
  const inputRefs = useRef([])

  // Request Form Hook
  const {
    register: registerRequest,
    handleSubmit: handleSubmitRequest,
    formState: { errors: errorsRequest, isSubmitting: isSubmittingRequest },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
  })

  // Reset Password Form Hook
  const {
    register: registerReset,
    handleSubmit: handleSubmitReset,
    formState: { errors: errorsReset, isSubmitting: isSubmittingReset },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
  })

  // 1. Submit Request OTP
  const onSubmitRequest = async (data) => {
    setApiError('')
    try {
      const response = await authService.forgotPassword(data)
      if (response.success) {
        const resolvedEmail = response.email || data.identifier
        setEmail(resolvedEmail)
        setOtp(['', '', '', '', '', ''])
        setOtpStatus('idle')
        setExpireTimer(299)
        setResendTimer(30)
        setStep('otp')
      } else {
        setApiError(response.message || 'Unable to process password reset. Please try again.')
      }
    } catch (error) {
      console.error('Forgot password request error', error)
      setApiError(error.response?.data?.message || 'Failed to send OTP. Please check your details and try again.')
    }
  }

  // OTP Helpers
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return // digits only
    if (otpStatus === 'error') setOtpStatus('idle')
    setApiError('')

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-advance to next input box
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    if (otpStatus === 'error') setOtpStatus('idle')
    setApiError('')
    const pastedData = e.clipboardData.getData('text').slice(0, 6).replace(/\D/g, '')
    if (pastedData) {
      const newOtp = [...otp]
      for (let i = 0; i < pastedData.length; i++) {
        newOtp[i] = pastedData[i]
      }
      setOtp(newOtp)
      const focusIndex = pastedData.length < 6 ? pastedData.length : 5
      inputRefs.current[focusIndex]?.focus()
    }
  }

  const handleResendOtp = async () => {
    setResendTimer(30)
    setExpireTimer(299)
    setApiError('')
    setOtpStatus('idle')
    setOtp(['', '', '', '', '', ''])
    try {
      await authService.forgotPassword({ identifier: email })
    } catch (error) {
      console.error('Failed to resend reset OTP', error)
      setApiError(error.response?.data?.message || 'Failed to resend OTP. Please try again.')
    }
  }

  // 2. Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length < 6) return

    setIsVerifying(true)
    setApiError('')

    try {
      const response = await authService.verifyResetOtp({ email, otp: code })
      if (response.success) {
        setOtpStatus('success')
        setVerifiedToken(response.resetToken || code)
        await new Promise((resolve) => setTimeout(resolve, 600))
        setIsVerifying(false)
        setStep('newPassword')
      } else {
        setOtpStatus('error')
        setApiError(response.message || 'Invalid or expired OTP code.')
        setIsVerifying(false)
      }
    } catch (error) {
      console.error('OTP verification error', error)
      setOtpStatus('error')
      setApiError(error.response?.data?.message || 'Verification failed: OTP code is invalid or has expired.')
      setIsVerifying(false)
    }
  }

  // 3. Submit New Password
  const onSubmitResetPassword = async (data) => {
    setApiError('')
    try {
      const response = await authService.resetPassword({
        email,
        token: verifiedToken,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword
      })

      if (response.success) {
        setStep('success')
      } else {
        setApiError(response.message || 'Failed to reset password. Please try again.')
      }
    } catch (error) {
      console.error('Password reset error', error)
      setApiError(error.response?.data?.message || 'Failed to reset password. Please verify the code and try again.')
    }
  }

  // ----------------------------------------------------
  // STEP 4: Success Screen
  // ----------------------------------------------------
  if (step === 'success') {
    return (
      <div className="w-full flex flex-col items-center">
        <div className="flex flex-col items-center text-center mb-8 w-full max-w-sm">
          <img src={logo} alt="SLD System" className="h-16 md:h-[102px] mb-6 md:mb-8" fetchPriority="high" loading="eager" />
          
          <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-500 mb-6 animate-scale-in">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h1 className="text-2xl md:text-3xl text-white mb-2 md:mb-4 font-medium">
            Password Reset <span className="text-brand-orange">Successful!</span>
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed px-2">
            Your password has been updated securely. You can now log in to your account with your new password.
          </p>
        </div>

        <div className="w-full max-w-sm">
          <Link to="/login" className="w-full">
            <Button variant="primary" className="w-full">
              Back to Login
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // ----------------------------------------------------
  // STEP 3: Set New Password Screen (Only after OTP verified)
  // ----------------------------------------------------
  if (step === 'newPassword') {
    return (
      <div className="w-full flex flex-col items-center">
        <div className="flex flex-col items-center text-center mb-8 w-full max-w-sm">
          <img src={logo} alt="SLD System" className="h-16 md:h-[102px] mb-6 md:mb-8" fetchPriority="high" loading="eager" />
          
          <h1 className="text-2xl md:text-3xl text-white mb-2 md:mb-4 font-medium">
            Set New <span className="text-brand-orange">Password</span>
          </h1>
          <p className="text-gray-400 text-sm px-4">
            Enter your new password below. Make sure it is at least 8 characters long.
          </p>
        </div>

        <form onSubmit={handleSubmitReset(onSubmitResetPassword)} className="w-full flex flex-col gap-5 max-w-sm">
          {apiError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          <Input
            type="password"
            placeholder="New Password *"
            icon={Lock}
            variant="dark"
            error={errorsReset.newPassword}
            {...registerReset('newPassword')}
          />

          <Input
            type="password"
            placeholder="Confirm Password *"
            icon={Lock}
            variant="dark"
            error={errorsReset.confirmPassword}
            {...registerReset('confirmPassword')}
          />

          <Button type="submit" className="w-full mt-2" disabled={isSubmittingReset}>
            {isSubmittingReset ? 'Updating Password...' : 'Reset Password'}
          </Button>

          <div className="flex justify-start pt-2">
            <Link
              to="/login"
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
              Cancel & Back to Login
            </Link>
          </div>
        </form>
      </div>
    )
  }

  // ----------------------------------------------------
  // STEP 2: Enter OTP Screen
  // ----------------------------------------------------
  if (step === 'otp') {
    return (
      <div className="w-full flex flex-col items-center">
        <div className="flex flex-col items-center text-center mb-8 w-full max-w-sm">
          <img src={logo} alt="SLD System" className="h-16 md:h-[102px] mb-6 md:mb-8" fetchPriority="high" loading="eager" />
          
          <button 
            type="button"
            onClick={() => { setStep('request'); setApiError(''); }}
            className="flex items-center text-gray-400 hover:text-white transition-colors text-sm mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Change Email
          </button>

          <h1 className="text-2xl md:text-3xl text-white mb-2 md:mb-4 font-medium">
            Enter <span className="text-brand-orange">OTP</span>
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            We&apos;ve sent a 6-digit verification code to<br />
            <span className="text-gray-200 font-medium break-all">{email}</span>
          </p>
        </div>

        <form onSubmit={handleVerifyOtp} className="w-full max-w-sm flex flex-col">
          {apiError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          <label className="text-sm text-gray-300 mb-3">Enter 6-digit OTP Code</label>
          
          <div className="flex gap-2 sm:gap-3 justify-between mb-6">
            {otp.map((digit, index) => {
              let stateClasses = 'border-[#262833] focus:border-brand-orange focus:ring-1 focus:ring-brand-orange'
              if (otpStatus === 'success') stateClasses = 'border-green-500 text-green-400'
              else if (otpStatus === 'error') stateClasses = 'border-red-500 text-red-500 animate-shake'

              return (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  onPaste={handleOtpPaste}
                  className={`flex-1 w-full min-w-0 h-12 sm:h-[3.25rem] max-w-[3.25rem] bg-[#14151A] border rounded-xl text-center text-xl text-white font-medium focus:outline-none focus:scale-105 transition-all duration-200 ${stateClasses}`}
                />
              )
            })}
          </div>

          <div className="text-center mb-6">
            <span className="text-sm text-gray-400">
              Code expires in <span className="text-brand-orange font-medium">{formatTime(expireTimer)}</span>
            </span>
          </div>

          <div className="bg-[#14151A] border border-[#262833] rounded-2xl p-4 flex items-center gap-4 mb-8">
            <div className="w-10 h-10 rounded-full bg-[#1A1C23] flex items-center justify-center text-brand-orange">
              <Mail size={18} />
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-gray-300 text-sm mb-0.5">Didn&apos;t receive the code?</span>
              {resendTimer > 0 ? (
                <span className="text-gray-500 text-sm">
                  Resend OTP in <span className="text-brand-orange font-medium">{formatTime(resendTimer)}</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="text-brand-orange text-sm font-medium hover:underline text-left focus:outline-none"
                >
                  Resend OTP Code
                </button>
              )}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full mb-8"
            disabled={isVerifying || otp.join('').length < 6}
          >
            {isVerifying ? 'Verifying...' : 'Verify OTP'}
          </Button>

          <div className="flex justify-start">
            <Link
              to="/login"
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    )
  }

  // ----------------------------------------------------
  // STEP 1: Request OTP Screen
  // ----------------------------------------------------
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
          No worries! Enter your registered email address and we&apos;ll send an OTP to reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmitRequest(onSubmitRequest)} className="w-full flex flex-col gap-5 max-w-sm">
        {apiError && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        <Input
          type="text"
          placeholder="Email or Username *"
          icon={Mail}
          variant="dark"
          error={errorsRequest.identifier}
          {...registerRequest('identifier')}
        />

        <Button type="submit" className="w-full" disabled={isSubmittingRequest}>
          {isSubmittingRequest ? 'Sending OTP...' : 'Send OTP'}
        </Button>

        
      </form>
    </div>
  )
}

export default ForgotPasswordForm
