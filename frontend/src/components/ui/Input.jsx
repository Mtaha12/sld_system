import { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

const Input = forwardRef(({ className = '', type, icon: Icon, error, options, variant = 'theme', inputSize = 'default', ...props }, ref) => {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

  const variants = {
    theme: `bg-theme-surface border ${error ? 'border-red-500' : 'border-theme-border'} text-theme-main placeholder-theme-disabled focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-colors shadow-sm`,
    light: `bg-white dark:bg-zinc-900 border ${error ? 'border-red-500' : 'border-gray-200 dark:border-zinc-800'} text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange shadow-sm`,
    dark: `bg-[#14151A] border ${error ? 'border-red-500' : 'border-[#262833]'} text-gray-100 placeholder-gray-500 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange`
  };

  const sizes = {
    default: 'px-4 py-2.5 rounded-xl text-sm',
    sm: 'px-3 py-2 rounded-lg text-sm h-[38px]'
  };

  const commonClasses = `w-full focus:outline-none transition-colors ${Icon ? 'pl-11' : ''} ${isPassword ? 'pr-12' : ''} ${variants[variant] || variants.theme} ${sizes[inputSize] || sizes.default} ${className}`

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="relative">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none z-10">
            <Icon size={18} />
          </div>
        )}
        
        {type === 'select' ? (
          <div className="relative">
            <select
              className={`${commonClasses} appearance-none cursor-pointer`}
              ref={ref}
              {...props}
            >
              {options?.map((opt) => {
                const optClass = variant === 'dark'
                  ? 'bg-[#14151A] text-gray-100'
                  : variant === 'light'
                  ? 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100'
                  : 'bg-theme-surface text-theme-main';
                return (
                  <option key={opt.value} value={opt.value} className={optClass}>
                    {opt.label}
                  </option>
                );
              })}
            </select>
            {/* Custom dropdown arrow */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-theme-muted">
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
                className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-muted hover:text-gray-300 transition-colors focus:outline-none"
                tabIndex="-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            )}
          </div>
        )}
      </div>
      {error && <span className="text-xs text-red-500 ml-1">{error.message}</span>}
    </div>
  )
})

Input.displayName = 'Input'
export default Input

