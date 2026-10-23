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
 * Global SearchableCombobox:
 * - Direct text typing with real-time filtering
 * - Highlights matching words in the dropdown
 * - Displays "Use typed: [text]" with Custom badge when user types custom text (if allowCustom !== false)
 * - Full Keyboard navigation: ArrowDown / ArrowUp to navigate, Enter to select, Escape to close
 * - Mouse selection and clear (X) button
 * - Compatible with direct onChange(value) and event-like onChange({ target: { name, value } })
 */
const SearchableCombobox = ({
  value = '',
  onChange,
  options = [],
  placeholder = 'Select or write...',
  error,
  disabled = false,
  allowCustom = true,
  id = 'searchable-combobox-input',
  name = 'combobox',
  className = '',
  inputSize = 'sm', // 'sm' | 'default'
  variant = 'light', // 'light' | 'theme'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Normalize options list (supports strings or objects { label, value })
  const normalizedOptions = useMemo(() => {
    if (!Array.isArray(options)) return [];
    const seen = new Set();
    const result = [];

    for (const opt of options) {
      if (opt === undefined || opt === null) continue;
      const isObj = typeof opt === 'object';
      const rawVal = isObj ? (opt.value !== undefined ? opt.value : opt.label) : opt;
      const val = String(rawVal ?? '').trim();
      const label = isObj && opt.label !== undefined ? String(opt.label).trim() : val;

      // Filter duplicate placeholder entries (e.g. "Select...", "Choose...") unless it's an explicit "All" filter option
      if (
        !val &&
        (label.toLowerCase().startsWith('select ') || label.toLowerCase().startsWith('choose '))
      ) {
        continue;
      }

      const key = `${val.toLowerCase()}___${label.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ label: label || val, value: val });
      }
    }

    return result;
  }, [options]);

  // Find currently selected option's display label if available
  const selectedLabel = useMemo(() => {
    const strVal = String(value ?? '').trim().toLowerCase();
    if (!strVal) return '';
    const match = normalizedOptions.find((opt) => opt.value.toLowerCase() === strVal);
    return match ? match.label : String(value ?? '');
  }, [normalizedOptions, value]);

  // Filter and sort options based on typed input
  const filteredOptions = useMemo(() => {
    const q = String(value ?? '').trim().toLowerCase();
    if (!q) return normalizedOptions;

    const matches = normalizedOptions.filter(
      (opt) =>
        opt.value.toLowerCase().includes(q) ||
        opt.label.toLowerCase().includes(q)
    );

    // Smart relevance sort:
    // 1. Label/value starts with query
    // 2. Contains query as a separate word
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

      return aText.localeCompare(bText, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [normalizedOptions, value]);

  // Check if current value exactly matches an existing option
  const hasExactMatch = useMemo(() => {
    const q = String(value ?? '').trim().toLowerCase();
    if (!q) return false;
    return normalizedOptions.some(
      (opt) => opt.value.toLowerCase() === q || opt.label.toLowerCase() === q
    );
  }, [normalizedOptions, value]);

  // Reset or initialize highlighted index when options or open state changes
  useEffect(() => {
    if (isOpen && filteredOptions.length > 0) {
      const q = String(value ?? '').trim().toLowerCase();
      const matchIdx = filteredOptions.findIndex(
        (opt) => opt.value.toLowerCase() === q || opt.label.toLowerCase() === q
      );
      setHighlightedIndex(matchIdx >= 0 ? matchIdx : 0);
    } else {
      setHighlightedIndex(-1);
    }
  }, [isOpen, filteredOptions, value]);

  // Scroll active item into view when navigating via arrow keys
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-combobox-item]');
      if (items && items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

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

  const triggerChange = (selectedVal) => {
    if (!onChange) return;
    // Call with direct string value
    onChange(selectedVal);
    // Also support event-like object for react-hook-form or traditional handlers if expected
    if (typeof onChange === 'function' && onChange.length > 0) {
      try {
        onChange({ target: { name, value: selectedVal } });
      } catch {
        // onChange already handled direct value
      }
    }
  };

  const handleSelect = (selectedVal) => {
    triggerChange(selectedVal);
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleClear = (e) => {
    e.preventDefault();
    e.stopPropagation();
    triggerChange('');
    setHighlightedIndex(-1);
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

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else if (filteredOptions.length > 0) {
        setHighlightedIndex((prev) => (prev + 1 >= filteredOptions.length ? 0 : prev + 1));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else if (filteredOptions.length > 0) {
        setHighlightedIndex((prev) => (prev - 1 < 0 ? filteredOptions.length - 1 : prev - 1));
      }
    } else if (e.key === 'Enter') {
      if (isOpen) {
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          e.preventDefault();
          handleSelect(filteredOptions[highlightedIndex].value);
        } else if (Boolean(String(value ?? '').trim())) {
          e.preventDefault();
          setIsOpen(false);
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  const heightClass = inputSize === 'sm' ? 'h-[38px] py-2 text-sm' : 'h-[42px] py-2.5 text-sm';

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          id={id}
          name={name}
          disabled={disabled}
          value={value ?? ''}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => {
            triggerChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className={`w-full bg-white dark:bg-zinc-900 border ${
            error
              ? 'border-red-500'
              : 'border-gray-200 dark:border-zinc-800 hover:border-brand-orange/40'
          } text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange focus:outline-none shadow-2xs transition-colors px-3 pr-14 rounded-lg ${heightClass}`}
        />

        {/* Right Action Icons (Clear + Dropdown Toggle) */}
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 z-10">
          {Boolean(String(value ?? '')) && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              onClick={handleClear}
              title="Clear selection"
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
            title={isOpen ? 'Close list' : 'Show all options'}
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

      {/* Dropdown Menu Popup */}
      {isOpen && !disabled && (
        <div
          ref={listRef}
          className="absolute left-0 min-w-full sm:min-w-[340px] max-w-[540px] top-full mt-1 max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl z-50 py-1 divide-y divide-gray-100 dark:divide-zinc-800/60 animate-in fade-in duration-150"
        >
          {/* Custom typed option if user typed something new and allowCustom is true */}
          {allowCustom && Boolean(String(value ?? '').trim()) && !hasExactMatch && (
            <div
              onClick={() => handleSelect(String(value ?? '').trim())}
              className="px-3 py-2 text-xs text-brand-orange hover:bg-brand-orange/10 cursor-pointer flex items-center justify-between font-semibold"
            >
              <span className="pr-2 break-words">Use typed: &ldquo;{value}&rdquo;</span>
              <span className="text-[10px] bg-brand-orange/20 px-1.5 py-0.5 rounded text-brand-orange shrink-0">
                Custom
              </span>
            </div>
          )}

          {/* Filtered Options List */}
          <div className="py-0.5">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, optIdx) => {
                const isSelected =
                  String(value ?? '').trim().toLowerCase() === opt.value.trim().toLowerCase();
                const isHighlighted = optIdx === highlightedIndex;

                return (
                  <div
                    key={`${opt.value}-${optIdx}`}
                    data-combobox-item
                    onClick={() => handleSelect(opt.value)}
                    onMouseEnter={() => setHighlightedIndex(optIdx)}
                    title={opt.label || opt.value}
                    className={`px-3 py-2 text-xs cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                      isHighlighted
                        ? 'bg-brand-orange/15 text-brand-orange font-medium'
                        : isSelected
                        ? 'bg-brand-orange/10 text-brand-orange font-semibold'
                        : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span className="break-words whitespace-normal leading-snug">
                      {highlightMatch(opt.label || opt.value, String(value ?? ''))}
                    </span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-brand-orange shrink-0" />
                    )}
                  </div>
                );
              })
            ) : (
              <div className="px-3 py-3 text-xs text-center text-gray-400">
                No matching options for &ldquo;{value}&rdquo;.{allowCustom ? ' Your typed text will be saved.' : ''}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(SearchableCombobox);
