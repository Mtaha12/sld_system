import React from 'react';
import SearchableCombobox from '../../../components/ui/SearchableCombobox';

/**
 * SearchableLawSelect
 * Allows typing to search/write a law AND clicking the dropdown button
 * to browse all available laws loaded from the database with highlighted matching words.
 */
const SearchableLawSelect = ({
  value = '',
  onChange,
  options = [],
  placeholder = 'Select or enter Law/Statute...',
  className = '',
  error = false,
  disabled = false,
  inputSize = 'sm'
}) => {
  return (
    <SearchableCombobox
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      className={className}
      error={error}
      disabled={disabled}
      inputSize={inputSize}
      allowCustom={true}
    />
  );
};

export default React.memo(SearchableLawSelect);
