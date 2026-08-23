import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { User, Lock } from 'lucide-react'
import Input from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'
import SocialAuthButton from '../../../components/ui/SocialAuthButton'
import AuthSupportLink from '../../../components/ui/AuthSupportLink'
import logo from '../../../assets/branding/logo/Logo_Dark_No_Bg.png'
import { loginSchema } from '../validation/authSchema'
import { authService } from '../services/authService'

const LoginForm = () => {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data) => {
    try {
      await authService.login(data)
      if (data.identifier === 'admin' && data.password === 'admin123') {
        navigate('/dashboard')
      } else {
        setError('root', { message: 'Invalid credentials. Try admin / admin123' })
      }
    } catch (error) {
      console.error('Login failed', error)
      setError('root', { message: 'Login failed. Please try again.' })
    }
  }

  return (
    <div className="w-full">
      <div className="flex flex-col items-center text-center mb-10">
        <img src={logo} alt="SLD System" className="h-16 md:h-[102px] mb-6 md:mb-8" fetchPriority="high" loading="eager" />
        <h1 className="text-2xl md:text-3xl text-white mb-2 md:mb-3 font-medium">
          Sign in to <span className="text-brand-orange">SLD System</span>
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
          Welcome to SLD System, please enter your login details below to access the system.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {errors.root && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg text-center animate-shake">
            {errors.root.message}
          </div>
        )}
        <Input
          type="text"
          placeholder="Email or Username *"
          icon={User}
          error={errors.identifier}
          {...register('identifier')}
        />

        <Input
          type="password"
          placeholder="Password *"
          icon={Lock}
          error={errors.password}
          {...register('password')}
        />

        <div className="flex justify-end w-full">
          <Link to="/forgot-password" className="text-sm text-brand-orange hover:text-[#D44E35] transition-colors">
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

        <SocialAuthButton provider="google">
          Sign in with Google
        </SocialAuthButton>

        <AuthSupportLink action="signin" />
      </form>
    </div>
  )
}

export default LoginForm
