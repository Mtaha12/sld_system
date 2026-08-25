import { forwardRef } from 'react';

const Button = forwardRef(({ className = '', variant = 'primary', size = 'default', children, ...props }, ref) => {
  const baseStyles = 'flex items-center justify-center font-medium transition-colors duration-200 focus:outline-none';
  
  const variants = {
    primary: 'bg-brand-orange hover:bg-brand-orange-hover text-white',
    'admin-primary': 'bg-brand-maroon hover:bg-brand-maroon-hover text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white shadow-sm border border-green-600',
    outline: 'bg-theme-surface border border-theme-border hover:bg-theme-surface-alt text-theme-main shadow-sm',
    'outline-dark': 'bg-brand-dark-surface border border-brand-dark-border hover:bg-brand-dark-hover text-gray-300',
    ghost: 'bg-transparent hover:bg-theme-surface-hover text-theme-main',
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
