import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, X, Hash } from 'lucide-react';

/**
 * SearchableSectionSelect
 * Allows typing to write any section number directly (preventing tedious scrolling)
 * AND provides an instant filtered dropdown showing only numbers (without the word "Section").
 */
const SearchableSectionSelect = ({
  value = '',
  onChange,
  options = [],
  placeholder = 'Enter or select section #...',
  className = '',
  error = false,
  disabled = false,
  inputSize = 'default'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Normalize incoming value to clean string
  useEffect(() => {
    const clean = String(value || '').replace(/^Section\s+/i, '').replace(/^Sec\.?\s+/i, '').trim();
    setSearchTerm(clean);
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

  // Normalize options to clean numbers (remove "Section" or "Sec." prefix)
  const normalizedOptions = useMemo(() => {
    if (!Array.isArray(options)) return [];
    const seen = new Set();
    const result = [];

    for (const opt of options) {
      if (!opt) continue;
      const rawVal = typeof opt === 'string' ? opt : (opt.value ?? opt.label ?? '');
      const rawLabel = typeof opt === 'string' ? opt : (opt.label ?? opt.value ?? '');
      
      const cleanVal = String(rawVal).replace(/^Section\s+/i, '').replace(/^Sec\.?\s+/i, '').trim();
      const cleanLabel = String(rawLabel).replace(/^Section\s+/i, '').replace(/^Sec\.?\s+/i, '').trim();
      
      if (!cleanVal || cleanVal.toLowerCase() === 'select section' || seen.has(cleanVal.toLowerCase())) {
        continue;
      }
      seen.add(cleanVal.toLowerCase());
      result.push({
        value: cleanVal,
        label: cleanLabel || cleanVal
      });
    }

    return result;
  }, [options]);

  // Fast search filter - limit to top 100 for instant UI rendering
  const filteredOptions = useMemo(() => {
    const term = (searchTerm || '').trim().toLowerCase();
    if (!term) return normalizedOptions.slice(0, 100);
    
    const matches = [];
    for (let i = 0; i < normalizedOptions.length; i++) {
      const opt = normalizedOptions[i];
      if (opt.value.toLowerCase().includes(term) || opt.label.toLowerCase().includes(term)) {
        matches.push(opt);
        if (matches.length >= 100) break;
      }
    }
    return matches;
  }, [normalizedOptions, searchTerm]);

  const handleSelect = (cleanVal) => {
    setSearchTerm(cleanVal);
    onChange?.(cleanVal);
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    const nextVal = e.target.value.replace(/^Section\s+/i, '').replace(/^Sec\.?\s+/i, '');
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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions.length > 0 && isOpen) {
        handleSelect(filteredOptions[0].value);
      } else {
        onChange?.(searchTerm.trim());
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const isSmall = inputSize === 'sm';

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center w-full">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className={`w-full px-3 py-1.5 pr-14 rounded-lg text-sm ${isSmall ? 'h-[38px]' : 'h-[42px]'} transition-colors outline-none shadow-2xs border ${
            error 
              ? 'border-red-500' 
              : 'border-theme-border hover:border-brand-orange/40 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange'
          } bg-theme-surface text-theme-main placeholder-theme-disabled`}
        />

        <div className="absolute right-1.5 flex items-center gap-0.5 text-theme-muted">
          {searchTerm && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:text-red-500 transition-colors cursor-pointer rounded"
              title="Clear section"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 hover:text-brand-orange transition-colors cursor-pointer rounded"
            title="Toggle section numbers list"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand-orange' : ''}`} />
          </button>
        </div>
      </div>

      {/* Floating Dropdown showing only numbers */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-60 overflow-y-auto rounded-lg border border-theme-border bg-theme-surface shadow-xl animate-fadeIn">
          {filteredOptions.length > 0 ? (
            <div className="p-1 space-y-0.5">
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-theme-muted border-b border-theme-border/50 flex items-center justify-between">
                <span>Section Numbers</span>
                <span>{filteredOptions.length} visible</span>
              </div>
              {filteredOptions.map((opt) => {
                const isSelected = String(searchTerm).trim() === opt.value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    className={`px-3 py-1.5 text-xs font-mono rounded cursor-pointer transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-brand-orange text-white font-bold'
                        : 'text-theme-main hover:bg-theme-surface-hover'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <span className="text-[10px] uppercase font-sans tracking-wide">Selected</span>}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-3 text-center text-xs text-theme-muted">
              {searchTerm ? (
                <div>
                  <p>No predefined number for "{searchTerm}"</p>
                  <button
                    type="button"
                    onClick={() => handleSelect(searchTerm.trim())}
                    className="mt-1 text-brand-orange hover:underline font-bold text-xs cursor-pointer"
                  >
                    Use custom section "{searchTerm.trim()}"
                  </button>
                </div>
              ) : (
                'Type section number or select below'
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(SearchableSectionSelect);
