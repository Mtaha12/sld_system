import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, X } from 'lucide-react';

/**
 * SearchableLawSelect
 * Allows typing to search/write a law AND clicking the dropdown button
 * to browse all available laws loaded from the database.
 */
const SearchableLawSelect = ({
  value = '',
  onChange,
  options = [],
  placeholder = 'Select or enter Law/Statute...',
  className = '',
  error = false,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Filter options based on user typing
  const filteredOptions = useMemo(() => {
    const term = (searchTerm || '').trim().toLowerCase();
    if (!term) return options;
    return options.filter((opt) => {
      const label = typeof opt === 'string' ? opt : (opt.label || opt.value || '');
      return label.toLowerCase().includes(term);
    });
  }, [options, searchTerm]);

  const handleSelect = (item) => {
    const val = typeof item === 'string' ? item : (item.value ?? item.label ?? '');
    setSearchTerm(val);
    onChange?.(val);
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    const nextVal = e.target.value;
    setSearchTerm(nextVal);
    onChange?.(nextVal);
    if (!isOpen) setIsOpen(true);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSearchTerm('');
    onChange?.('');
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center w-full">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className={`w-full px-3.5 py-2 pr-16 rounded-lg text-sm h-[38px] transition-colors outline-none shadow-2xs border ${
            error 
              ? 'border-red-500' 
              : 'border-slate-200/90 dark:border-slate-700 hover:border-brand-orange/40 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange'
          } bg-white dark:bg-[#1a2234] text-gray-800 dark:text-gray-100 placeholder-gray-400`}
        />

        <div className="absolute right-2 flex items-center gap-1 text-slate-400">
          {searchTerm && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:text-red-500 transition-colors cursor-pointer rounded"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="p-1 hover:text-brand-orange transition-colors cursor-pointer rounded"
            title="Toggle laws dropdown"
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand-orange' : ''}`} />
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-slate-700 shadow-xl py-1 text-xs no-scrollbar animate-fade-in">
          {filteredOptions.length === 0 ? (
            <div className="px-3.5 py-2.5 text-slate-400 italic text-center">
              No matching laws found in database
            </div>
          ) : (
            filteredOptions.map((opt, idx) => {
              const label = typeof opt === 'string' ? opt : (opt.label || opt.value);
              const val = typeof opt === 'string' ? opt : (opt.value || opt.label);
              const isSelected = searchTerm.trim().toLowerCase() === String(val).trim().toLowerCase();

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={`w-full text-left px-3.5 py-2 transition-colors cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-brand-orange/15 text-brand-orange font-bold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span className="truncate">{label}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(SearchableLawSelect);
