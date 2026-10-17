import { forwardRef, useState, memo, useMemo } from 'react'
import { Eye, EyeOff } from 'lucide-react'

const SelectOptions = memo(({ options, variant }) => {
  const optClass = variant === 'dark'
    ? 'bg-[#14151A] text-gray-100 py-1'
    : variant === 'light'
    ? 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 py-1'
    : 'bg-theme-surface text-theme-main py-1';

  // Guarantee options are cleanly ordered: keep placeholders pinned at top, sort rest alphabetically/naturally
  const sortedOptions = useMemo(() => {
    if (!Array.isArray(options) || options.length === 0) return [];
    
    const placeholders = [];
    const regular = [];
    const seen = new Set();

    for (const opt of options) {
      if (!opt) continue;
      const key = String(opt.value ?? '');
      if (seen.has(key)) continue;
      seen.add(key);

      const isPlaceholder = opt.value === '' || opt.value === 'all' || 
        String(opt.label || '').toLowerCase().startsWith('select ') || 
        String(opt.label || '').toLowerCase().startsWith('choose ');
      if (isPlaceholder) {
        placeholders.push(opt);
      } else {
        regular.push(opt);
      }
    }

    regular.sort((a, b) => 
      String(a.label || a.value || '').localeCompare(
        String(b.label || b.value || ''), 
        undefined, 
        { numeric: true, sensitivity: 'base' }
      )
    );

    return [...placeholders, ...regular];
  }, [options]);

  return (
    <>
      {sortedOptions.map((opt) => (
        <option key={opt.value} value={opt.value} className={optClass}>
          {opt.label}
        </option>
      ))}
    </>
  );
});

const Input = forwardRef(({ className = '', type, icon: Icon, error, options, variant = 'theme', inputSize = 'default', ...props }, ref) => {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

  const variants = {
    theme: `bg-theme-surface border ${error ? 'border-red-500' : 'border-theme-border hover:border-brand-orange/40'} text-theme-main placeholder-theme-disabled focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-colors shadow-2xs`,
    light: `bg-white dark:bg-zinc-900 border ${error ? 'border-red-500' : 'border-gray-200 dark:border-zinc-800 hover:border-brand-orange/40'} text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange shadow-2xs transition-colors`,
    dark: `bg-[#14151A] border ${error ? 'border-red-500' : 'border-[#262833] hover:border-brand-orange/40'} text-gray-100 placeholder-gray-500 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-colors shadow-2xs`
  };

  const sizes = {
    default: 'px-4 py-2.5 rounded-xl text-sm',
    sm: 'px-3 py-2 rounded-lg text-sm h-[38px]'
  };

  const commonClasses = `w-full focus:outline-none transition-colors ${Icon ? 'pl-11' : ''} ${isPassword ? 'pr-12' : ''} ${type === 'select' ? 'pr-10' : ''} ${variants[variant] || variants.theme} ${sizes[inputSize] || sizes.default} ${className}`

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="relative">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none z-10">
            <Icon size={18} />
          </div>
        )}
        
        {type === 'select' ? (
          <div className="relative w-full">
            <select
              className={`${commonClasses} appearance-none cursor-pointer pr-9`}
              ref={ref}
              {...props}
            >
              <SelectOptions options={options} variant={variant} />
            </select>
            {/* Custom dropdown arrow */}
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-theme-muted flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8l4 4 4-4" />
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

