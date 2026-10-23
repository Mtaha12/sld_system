import React from 'react';
import SearchableCombobox from './SearchableCombobox';

/**
 * Combobox for Court selection and custom entry:
 * Re-uses SearchableCombobox with full keyboard navigation (ArrowDown/Up + Enter),
 * real-time filtering, match highlighting, and custom text typing.
 */
const CourtCombobox = (props) => {
  return (
    <SearchableCombobox 
      placeholder="Select or write court name..." 
      id="caselaw-court-combobox"
      name="court"
      {...props} 
    />
  );
};

export default React.memo(CourtCombobox);
