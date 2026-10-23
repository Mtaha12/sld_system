import React, { useMemo } from 'react';
import SearchableCombobox from './SearchableCombobox';

/**
 * SearchableSectionSelect
 * Allows typing to write any section number directly AND provides instant filtered
 * dropdown showing numbers with matching word highlights.
 */
const SearchableSectionSelect = ({
  value = '',
  onChange,
  options = [],
  placeholder = 'Enter or select section #...',
  className = '',
  error = false,
  disabled = false,
  inputSize = 'sm'
}) => {
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

  const cleanValue = String(value || '').replace(/^Section\s+/i, '').replace(/^Sec\.?\s+/i, '').trim();

  return (
    <SearchableCombobox
      value={cleanValue}
      onChange={onChange}
      options={normalizedOptions}
      placeholder={placeholder}
      className={className}
      error={error}
      disabled={disabled}
      inputSize={inputSize}
      allowCustom={true}
    />
  );
};

export default React.memo(SearchableSectionSelect);
