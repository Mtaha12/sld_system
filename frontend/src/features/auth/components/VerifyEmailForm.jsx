import { useState, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Mail, ArrowLeft } from 'lucide-react'
import Button from '../../../components/ui/Button'
import logo from '../../../assets/branding/logo/Logo_Dark_No_Bg.png'
import { authService } from '../services/authService'
import { useCountdown } from '../../../hooks/useCountdown'

const VerifyEmailForm = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const email = location.state?.email || 'user@email.com'

  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [expireTimer] = useCountdown(299) // 4:59
  const [resendTimer, setResendTimer] = useCountdown(28)
  const inputRefs = useRef([])
  const [isVerifying, setIsVerifying] = useState(false)
  const [status, setStatus] = useState('idle') // 'idle' | 'success' | 'error'

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return // only numbers

    if (status === 'error') setStatus('idle')

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-advance
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    if (status === 'error') setStatus('idle')
    const pastedData = e.clipboardData.getData('text').slice(0, 6).replace(/\D/g, '')
    if (pastedData) {
      const newOtp = [...otp]
      for (let i = 0; i < pastedData.length; i++) {
        newOtp[i] = pastedData[i]
      }
      setOtp(newOtp)
      // Focus the next empty input, or the last one
      const focusIndex = pastedData.length < 6 ? pastedData.length : 5
      inputRefs.current[focusIndex]?.focus()
    }
  }

  const handleResend = async () => {
    setResendTimer(30)
    try {
      await authService.resendVerificationCode(email)
    } catch (error) {
      console.error('Failed to resend code', error)
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length < 6) return

    setIsVerifying(true)
    
    try {
      const response = await authService.verifyEmail(code)
      if (response.success) {
        setStatus('success')
        await new Promise((resolve) => setTimeout(resolve, 800))
        setIsVerifying(false)
        navigate('/payment-instructions', { state: { email } })
      } else {
        setStatus('error')
        setIsVerifying(false)
        setTimeout(() => setStatus('idle'), 1500)
      }
    } catch (error) {
      console.error('Verification failed', error)
      setStatus('error')
      setIsVerifying(false)
      setTimeout(() => setStatus('idle'), 1500)
    }
  }

  return (
    <div className="w-full flex flex-col items-center">
      <div className="flex flex-col items-center text-center mb-8 w-full max-w-sm">
        <img src={logo} alt="SLD System" className="h-16 md:h-[102px] mb-6 md:mb-8" fetchPriority="high" loading="eager" />
        <h1 className="text-2xl md:text-3xl text-white mb-2 md:mb-4 font-medium">
          Verify your <span className="text-brand-orange">email</span>
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          We&apos;ve sent a 6-digit verification code to<br />
          <span className="text-gray-200">{email}</span>
        </p>
      </div>

      <form onSubmit={handleVerify} className="w-full max-w-sm flex flex-col">
        <label className="text-sm text-gray-300 mb-3">Enter OTP</label>
        
        <div className="flex gap-2 sm:gap-3 justify-between mb-6">
          {otp.map((digit, index) => {
            let stateClasses = 'border-[#262833] focus:border-brand-orange focus:ring-1 focus:ring-brand-orange'
            if (status === 'success') stateClasses = 'border-brand-green text-brand-green'
            else if (status === 'error') stateClasses = 'border-red-500 text-red-500 animate-shake'

            return (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
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
                Resend code in <span className="text-brand-orange font-medium">{formatTime(resendTimer)}</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="text-brand-orange text-sm font-medium hover:underline text-left focus:outline-none"
              >
                Resend Code
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
            to="/signup"
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            Back to sign up
          </Link>
        </div>
      </form>
    </div>
  )
}

export default VerifyEmailForm
