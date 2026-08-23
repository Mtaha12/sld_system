import { forwardRef } from 'react';

const Button = forwardRef(({ className = '', variant = 'primary', size = 'default', children, ...props }, ref) => {
  const baseStyles = 'flex items-center justify-center font-medium transition-colors duration-200 focus:outline-none';
  
  const variants = {
    primary: 'bg-brand-orange hover:bg-[#D44E35] text-white',
    'admin-primary': 'bg-[#641E16] hover:bg-[#4A1610] text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white shadow-sm border border-green-600',
    outline: 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 shadow-sm',
    'outline-dark': 'bg-[#14151A] border border-[#262833] hover:bg-[#1C1E26] text-gray-300',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-700',
  };

  const sizes = {
    default: 'py-3.5 px-6 rounded-xl text-base',
    md: 'py-2.5 px-6 rounded-xl text-sm gap-2',
    sm: 'py-2 px-3 rounded-lg text-sm gap-2',
    icon: 'p-2 rounded-lg',
  };

  return (
    <button 
      ref={ref} 
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.default} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
