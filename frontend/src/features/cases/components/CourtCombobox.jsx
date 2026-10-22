import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, X, Check } from 'lucide-react';

/**
 * Highlights matching query terms within text
 */
const highlightMatch = (text, query) => {
  if (!query || !query.trim() || !text) return text;
  const q = query.trim();
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = String(text).split(regex);

  if (parts.length === 1) return text;

  return parts.map((part, i) =>
    regex.test(part) ? (
      <span
        key={i}
        className="font-bold text-brand-orange bg-brand-orange/15 px-0.5 rounded inline-block"
      >
        {part}
      </span>
    ) : (
      part
    )
  );
};

/**
 * Combobox for Court selection and custom entry:
 * - Allows typing any custom court name directly
 * - Smart search with highlighted matching words
 * - Prioritizes results starting with the search term, then containing it
 * - Wide, non-truncating dropdown menu for full readability
 */
const CourtCombobox = ({
  value = '',
  onChange,
  options = [],
  placeholder = 'Select or write court name...',
  error,
  disabled = false,
  id = 'court-combobox-input',
  name = 'court',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Normalize options list (filter out placeholder labels like "Select Court")
  const normalizedOptions = useMemo(() => {
    if (!Array.isArray(options)) return [];
    const seen = new Set();
    const result = [];

    for (const opt of options) {
      if (!opt) continue;
      const val = typeof opt === 'string' ? opt.trim() : (opt.value || opt.label || '').trim();
      const label = typeof opt === 'object' && opt.label ? opt.label.trim() : val;
      if (!val || val.toLowerCase().startsWith('select ') || val.toLowerCase().startsWith('choose ')) {
        continue;
      }
      const key = val.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ label, value: val });
      }
    }

    return result;
  }, [options]);

  // Filter and sort options based on typed input
  const filteredOptions = useMemo(() => {
    const q = (value || '').trim().toLowerCase();
    if (!q) return normalizedOptions;

    const matches = normalizedOptions.filter(
      (opt) =>
        opt.value.toLowerCase().includes(q) ||
        opt.label.toLowerCase().includes(q)
    );

    // Smart relevance sort:
    // 1. Label/value starts with query (e.g. "Lahore High Court" for "lahore")
    // 2. Contains query as a separate word (e.g. "Tribunal, Lahore")
    // 3. Contains query anywhere
    const wordRegex = new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');

    return matches.sort((a, b) => {
      const aText = (a.label || a.value).toLowerCase();
      const bText = (b.label || b.value).toLowerCase();

      const aStarts = aText.startsWith(q);
      const bStarts = bText.startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      const aHasWord = wordRegex.test(aText);
      const bHasWord = wordRegex.test(bText);
      if (aHasWord && !bHasWord) return -1;
      if (!aHasWord && bHasWord) return 1;

      return aText.localeCompare(bText);
    });
  }, [normalizedOptions, value]);

  // Check if current value exactly matches an option
  const hasExactMatch = useMemo(() => {
    const q = (value || '').trim().toLowerCase();
    if (!q) return false;
    return normalizedOptions.some((opt) => opt.value.toLowerCase() === q);
  }, [normalizedOptions, value]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSelect = (selectedVal) => {
    if (onChange) {
      onChange(selectedVal);
    }
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleClear = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onChange) {
      onChange('');
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsOpen((prev) => !prev);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          id={id}
          name={name}
          disabled={disabled}
          value={value || ''}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => {
            if (onChange) onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsOpen(false);
            } else if (e.key === 'ArrowDown' && !isOpen) {
              setIsOpen(true);
            }
          }}
          className={`w-full bg-white dark:bg-zinc-900 border ${
            error
              ? 'border-red-500'
              : 'border-gray-200 dark:border-zinc-800 hover:border-brand-orange/40'
          } text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange focus:outline-none shadow-2xs transition-colors px-3 py-2 pr-14 rounded-lg text-sm h-[38px]`}
        />

        {/* Right Action Icons (Clear + Dropdown Toggle) */}
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 z-10">
          {Boolean(value) && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              onClick={handleClear}
              title="Clear court"
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={handleToggle}
            title={isOpen ? "Close court list" : "Show all courts"}
            className="p-1 text-gray-400 hover:text-brand-orange rounded transition-colors cursor-pointer disabled:opacity-50"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-brand-orange' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Dropdown Menu Popup: comfortable width with text wrapping and highlighted matches */}
      {isOpen && !disabled && (
        <div className="absolute left-0 min-w-full sm:min-w-[360px] max-w-[500px] top-full mt-1 max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl z-50 py-1 divide-y divide-gray-100 dark:divide-zinc-800/60 animate-in fade-in duration-150">
          {/* Custom typed option if user typed something new */}
          {Boolean((value || '').trim()) && !hasExactMatch && (
            <div
              onClick={() => handleSelect((value || '').trim())}
              className="px-3 py-2 text-xs text-brand-orange hover:bg-brand-orange/10 cursor-pointer flex items-center justify-between font-semibold"
            >
              <span className="pr-2 break-words">Use typed: &ldquo;{value}&rdquo;</span>
              <span className="text-[10px] bg-brand-orange/20 px-1.5 py-0.5 rounded text-brand-orange shrink-0">Custom</span>
            </div>
          )}

          {/* Filtered Court Options List */}
          <div className="py-0.5">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected =
                  (value || '').trim().toLowerCase() === opt.value.trim().toLowerCase();
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    title={opt.label || opt.value}
                    className={`px-3 py-2 text-xs cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-brand-orange/10 text-brand-orange font-semibold'
                        : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span className="break-words whitespace-normal leading-snug">
                      {highlightMatch(opt.label || opt.value, value)}
                    </span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-brand-orange shrink-0" />
                    )}
                  </div>
                );
              })
            ) : (
              <div className="px-3 py-3 text-xs text-center text-gray-400">
                No matching court found for &ldquo;{value}&rdquo;. Your typed text will be saved.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(CourtCombobox);
