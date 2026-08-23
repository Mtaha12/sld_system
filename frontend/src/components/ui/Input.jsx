import { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

const Input = forwardRef(({ className = '', type, icon: Icon, error, options, variant = 'dark', ...props }, ref) => {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

  const variants = {
    dark: `bg-[#14151A] border ${error ? 'border-red-500' : 'border-[#262833]'} text-gray-100 placeholder-gray-500 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange`,
    light: `bg-white border ${error ? 'border-red-500' : 'border-gray-200'} text-gray-900 placeholder-gray-400 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange shadow-sm`
  };

  const commonClasses = `w-full rounded-xl px-4 py-3.5 focus:outline-none transition-colors ${Icon ? 'pl-11' : ''} ${isPassword ? 'pr-12' : ''} ${variants[variant] || variants.dark} ${className}`

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="relative">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none z-10">
            <Icon size={20} />
          </div>
        )}
        
        {type === 'select' ? (
          <div className="relative">
            <select
              className={`${commonClasses} appearance-none cursor-pointer`}
              ref={ref}
              {...props}
            >
              {options?.map((opt) => (
                <option key={opt.value} value={opt.value} className={variant === 'light' ? 'bg-white text-gray-900' : 'bg-[#14151A] text-gray-100'}>
                  {opt.label}
                </option>
              ))}
            </select>
            {/* Custom dropdown arrow */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        ) : (
          <div className="relative">
            <input
              type={inputType}
              className={commonClasses}
              ref={ref}
              {...props}
            />
            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors focus:outline-none"
                tabIndex="-1"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            )}
          </div>
        )}
      </div>
      {error && <span className="text-sm text-red-500 ml-1">{error.message}</span>}
    </div>
  )
})

Input.displayName = 'Input'
export default Input
