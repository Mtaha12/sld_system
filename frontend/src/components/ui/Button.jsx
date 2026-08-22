import { forwardRef } from 'react'

const Button = forwardRef(({ className = '', variant = 'primary', children, ...props }, ref) => {
  const baseStyles = 'flex items-center justify-center font-medium transition-colors duration-200'
  const variants = {
    primary: 'bg-brand-orange hover:bg-[#D44E35] text-white py-3.5 px-6 rounded-xl',
    outline:
      'bg-[#14151A] border border-[#262833] hover:bg-[#1C1E26] text-gray-300 py-3.5 px-6 rounded-xl',
    ghost: 'bg-transparent hover:bg-[#1A1C23] text-gray-300 py-2 px-4 rounded-lg',
  }

  return (
    <button ref={ref} className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
})

Button.displayName = 'Button'
export default Button
