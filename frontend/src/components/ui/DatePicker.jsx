import { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const currentYear = new Date().getFullYear();

const toIsoDateString = (date) => {
  if (!date || isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatDate = (date) => {
  if (!date) return '';
  if (typeof date === 'string') {
    const parsed = parseManualDate(date);
    if (!parsed) return date;
    date = parsed;
  }
  const d = date.getDate().toString().padStart(2, '0');
  const m = MONTHS[date.getMonth()].substring(0, 3);
  const y = date.getFullYear();
  return `${d} ${m} ${y}`;
};

const parseManualDate = (str) => {
  if (!str) return null;
  if (str instanceof Date && !isNaN(str.getTime())) return str;
  if (typeof str !== 'string') return null;
  const trimmed = str.trim();
  if (!trimmed) return null;

  // 1. Try pure 8 continuous digits (e.g. 20241015, 15102024, 05102024)
  if (/^\d{8}$/.test(trimmed)) {
    const p1_4 = parseInt(trimmed.slice(0, 4), 10);
    const p5_6 = parseInt(trimmed.slice(4, 6), 10);
    const p7_8 = parseInt(trimmed.slice(6, 8), 10);

    // Try YYYYMMDD if starts with 19xx or 20xx
    if (p1_4 >= 1900 && p1_4 <= 2099 && p5_6 >= 1 && p5_6 <= 12 && p7_8 >= 1 && p7_8 <= 31) {
      const d = new Date(p1_4, p5_6 - 1, p7_8);
      if (!isNaN(d.getTime()) && d.getDate() === p7_8 && d.getMonth() === p5_6 - 1) {
        return d;
      }
    }

    // Try DDMMYYYY or MMDDYYYY (ends with 4-digit year)
    const pLast4 = parseInt(trimmed.slice(4, 8), 10);
    const pFirst2 = parseInt(trimmed.slice(0, 2), 10);
    const pMid2 = parseInt(trimmed.slice(2, 4), 10);

    if (pLast4 >= 1900 && pLast4 <= 2099) {
      let day = pFirst2;
      let month = pMid2 - 1;
      if (pFirst2 <= 12 && pMid2 > 12) {
        month = pFirst2 - 1;
        day = pMid2;
      }
      const d = new Date(pLast4, month, day);
      if (!isNaN(d.getTime()) && d.getDate() === day && d.getMonth() === month) {
        return d;
      }
    }
  }

  // 2. Try pure 6 continuous digits DDMMYY (e.g. 151024 -> 15 Oct 2024)
  if (/^\d{6}$/.test(trimmed)) {
    const p1_2 = parseInt(trimmed.slice(0, 2), 10);
    const p3_4 = parseInt(trimmed.slice(2, 4), 10);
    const p5_6 = parseInt(trimmed.slice(4, 6), 10);
    const yr = p5_6 < 50 ? 2000 + p5_6 : 1900 + p5_6;
    if (p3_4 >= 1 && p3_4 <= 12 && p1_2 >= 1 && p1_2 <= 31) {
      const d = new Date(yr, p3_4 - 1, p1_2);
      if (!isNaN(d.getTime()) && d.getDate() === p1_2) {
        return d;
      }
    }
  }

  // 3. Try standard YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const ymdMatch = trimmed.match(/^(\d{4})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime()) && d.getDate() === day && d.getMonth() === month) {
      return d;
    }
  }

  // 4. Try DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{4})$/);
  if (dmyMatch) {
    let day = parseInt(dmyMatch[1], 10);
    let month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    if (month > 11 && day <= 12) {
      const temp = day;
      day = month + 1;
      month = temp - 1;
    }
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime()) && d.getDate() === day && d.getMonth() === month) {
      return d;
    }
  }

  // 5. Try DD/MM/YY or DD-MM-YY (2-digit year)
  const dmyShortMatch = trimmed.match(/^(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{2})$/);
  if (dmyShortMatch) {
    const day = parseInt(dmyShortMatch[1], 10);
    const month = parseInt(dmyShortMatch[2], 10) - 1;
    const rawYear = parseInt(dmyShortMatch[3], 10);
    const year = rawYear < 50 ? 2000 + rawYear : 1900 + rawYear;
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime()) && d.getDate() === day && d.getMonth() === month) {
      return d;
    }
  }

  // 6. Try DD Month YYYY (e.g. 15 Oct 2026, 15-Oct-2026, Oct 15, 2026)
  const wordMatch = trimmed.match(/^(\d{1,2})[- \/\.]([a-zA-Z]{3,9})[- \/\.](\d{4})$/);
  if (wordMatch) {
    const day = parseInt(wordMatch[1], 10);
    const monthStr = wordMatch[2].toLowerCase();
    const monthIdx = MONTHS.findIndex(m => m.toLowerCase().startsWith(monthStr));
    const year = parseInt(wordMatch[3], 10);
    if (monthIdx !== -1) {
      const d = new Date(year, monthIdx, day);
      if (!isNaN(d.getTime()) && d.getDate() === day) {
        return d;
      }
    }
  }

  // 7. Try Month DD, YYYY (e.g. October 15, 2024 or Oct 15 2024)
  const monthFirstMatch = trimmed.match(/^([a-zA-Z]{3,9})[- \/\.](\d{1,2})(?:st|nd|rd|th)?,?[- \/\.](\d{4})$/);
  if (monthFirstMatch) {
    const monthStr = monthFirstMatch[1].toLowerCase();
    const monthIdx = MONTHS.findIndex(m => m.toLowerCase().startsWith(monthStr));
    const day = parseInt(monthFirstMatch[2], 10);
    const year = parseInt(monthFirstMatch[3], 10);
    if (monthIdx !== -1) {
      const d = new Date(year, monthIdx, day);
      if (!isNaN(d.getTime()) && d.getDate() === day) {
        return d;
      }
    }
  }

  // 8. Try standard Date.parse
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1900 && parsed.getFullYear() < 2100) {
    return parsed;
  }

  return null;
};

// Helper: Determine if typed text forms a complete date ready for instant live auto-correction
const shouldAutoFormatLive = (val) => {
  const trimmed = (val || '').trim();
  if (/^\d{8}$/.test(trimmed) || /^\d{6}$/.test(trimmed)) {
    return true;
  }
  if (/^\d{1,2}[\/\-\.\s]\d{1,2}[\/\-\.\s]\d{4}$/.test(trimmed)) {
    return true;
  }
  if (/^\d{4}[\/\-\.\s]\d{1,2}[\/\-\.\s]\d{2}$/.test(trimmed)) {
    return true;
  }
  if (/^\d{1,2}[\/\-\.\s]\d{1,2}[\/\-\.\s]\d{2}$/.test(trimmed)) {
    return true;
  }
  return false;
};

const DatePicker = ({ 
  selectedDate, 
  onChange, 
  placeholder = "Select or enter date (e.g. YYYY-MM-DD or DD/MM/YYYY)",
  className = "",
  align = "left",
  disableFutureDates = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (selectedDate) {
      const p = parseManualDate(selectedDate);
      if (p) return p;
    }
    return new Date();
  });
  const [inputValue, setInputValue] = useState(() => {
    if (!selectedDate) return '';
    return typeof selectedDate === 'string' ? selectedDate : toIsoDateString(selectedDate);
  });
  const popoverRef = useRef(null);
  const isFocusedRef = useRef(false);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Sync internal input value and current month when selectedDate changes externally
  useEffect(() => {
    if (isFocusedRef.current) return; // Do not overwrite text while user is actively typing!
    if (selectedDate) {
      const parsed = parseManualDate(selectedDate);
      if (parsed) {
        setCurrentMonth(parsed);
        const strVal = typeof selectedDate === 'string' && selectedDate.trim() 
          ? selectedDate 
          : toIsoDateString(parsed);
        setInputValue(strVal);
      } else if (typeof selectedDate === 'string') {
        setInputValue(selectedDate);
      }
    } else {
      setInputValue('');
    }
  }, [selectedDate]);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const today = new Date();

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleMonthChange = (e) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), parseInt(e.target.value), 1));
  };

  const handleYearChange = (e) => {
    setCurrentMonth(new Date(parseInt(e.target.value), currentMonth.getMonth(), 1));
  };

  const handleDateSelect = (day) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const iso = toIsoDateString(newDate);
    onChange?.(iso);
    setInputValue(iso);
    setIsOpen(false);
  };

  const handleManualInputChange = (e) => {
    const val = e.target.value;

    // Live auto-format when user finishes typing a recognizable date (e.g. 8 continuous digits, 6 digits, or completed delimited date)
    if (shouldAutoFormatLive(val)) {
      const parsed = parseManualDate(val);
      if (parsed) {
        const iso = toIsoDateString(parsed);
        setInputValue(iso);
        setCurrentMonth(parsed);
        onChange?.(iso);
        return;
      }
    }

    setInputValue(val);
    const parsed = parseManualDate(val);
    if (parsed) {
      setCurrentMonth(parsed);
      const iso = toIsoDateString(parsed);
      onChange?.(iso);
    } else {
      onChange?.(val);
    }
  };

  const handleInputPaste = (e) => {
    const text = e.clipboardData?.getData('text') || '';
    if (!text) return;
    const parsed = parseManualDate(text);
    if (parsed) {
      e.preventDefault();
      const iso = toIsoDateString(parsed);
      setInputValue(iso);
      setCurrentMonth(parsed);
      onChange?.(iso);
    }
  };

  const handleInputBlur = () => {
    isFocusedRef.current = false;
    const trimmed = inputValue.trim();
    if (!trimmed) {
      onChange?.('');
      setInputValue('');
      return;
    }
    const parsed = parseManualDate(trimmed);
    if (parsed) {
      const iso = toIsoDateString(parsed);
      setInputValue(iso);
      setCurrentMonth(parsed);
      onChange?.(iso);
    } else {
      onChange?.(trimmed);
    }
  };

  const setToday = () => {
    setCurrentMonth(today);
    const iso = toIsoDateString(today);
    onChange?.(iso);
    setInputValue(iso);
    setIsOpen(false);
  };

  const clearDate = (e) => {
    e.stopPropagation();
    onChange?.('');
    setInputValue('');
    setCurrentMonth(new Date());
    setIsOpen(false);
  };

  // Comprehensive Pakistan legal research year range: 1947 to currentYear + 10
  // Sorted in clean, convenient descending order (latest year first for fast legal search)
  const startYear = 1947;
  const endYear = disableFutureDates ? currentYear : currentYear + 10;
  const YEARS = useMemo(() => {
    const list = [];
    for (let y = endYear; y >= startYear; y--) {
      list.push(y);
    }
    return list;
  }, [endYear]);

  const isNextMonthDisabled = disableFutureDates && 
    (currentMonth.getFullYear() > today.getFullYear() || 
    (currentMonth.getFullYear() === today.getFullYear() && currentMonth.getMonth() >= today.getMonth()));

  // Generate calendar days
  const days = [];
  // Empty slots for previous month
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
  }
  // Actual days
  for (let i = 1; i <= daysInMonth; i++) {
    const dateOfCurrentDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
    
    const isSelected = selectedDate && 
      new Date(selectedDate).getDate() === i && 
      new Date(selectedDate).getMonth() === currentMonth.getMonth() &&
      new Date(selectedDate).getFullYear() === currentMonth.getFullYear();
      
    const isToday = today.getDate() === i && 
      today.getMonth() === currentMonth.getMonth() &&
      today.getFullYear() === currentMonth.getFullYear();
      
    // Set hours to 0 to compare dates accurately without time component
    const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const isFutureDate = disableFutureDates && (dateOfCurrentDay > normalizedToday);

    days.push(
      <button
        key={i}
        type="button"
        onClick={() => !isFutureDate && handleDateSelect(i)}
        disabled={isFutureDate}
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors
          ${isSelected ? 'bg-brand-orange text-white font-semibold shadow-sm' : 
            isFutureDate ? 'text-theme-disabled cursor-not-allowed opacity-50' :
            isToday ? 'bg-theme-surface-hover text-brand-orange font-semibold hover:bg-theme-surface-alt' : 
            'text-theme-main hover:bg-theme-surface-hover'}`}
      >
        {i}
      </button>
    );
  }

  return (
    <div className={`relative ${className}`} ref={popoverRef}>
      {/* Input Field: supports manual typing, live auto-correction, paste, AND table calendar selection */}
      <div className="w-full relative group">
        <input
          type="text"
          value={inputValue}
          onFocus={() => { isFocusedRef.current = true; }}
          onChange={handleManualInputChange}
          onPaste={handleInputPaste}
          onBlur={handleInputBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleInputBlur();
              setIsOpen(false);
            }
          }}
          placeholder={placeholder}
          className={`w-full pl-3 pr-16 py-2 border rounded-lg text-sm transition-colors bg-theme-surface text-theme-main h-[38px] focus:outline-none ${
            isOpen ? 'border-brand-orange ring-1 ring-brand-orange' : 'border-theme-border hover:border-theme-border-hover'
          }`}
        />
        
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {inputValue && (
            <button 
              type="button"
              onClick={clearDate}
              className="text-theme-disabled hover:text-theme-muted transition-colors p-1 rounded-full hover:bg-theme-surface-hover cursor-pointer"
              title="Clear date"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 text-theme-disabled hover:text-brand-orange transition-colors cursor-pointer rounded"
            title="Open calendar picker"
          >
            <CalendarIcon className={`w-4 h-4 ${isOpen ? 'text-brand-orange' : 'text-theme-disabled'}`} />
          </button>
        </div>
      </div>

      {/* Popover Calendar */}
      {isOpen && (
        <div 
          className={`absolute top-full mt-2 bg-theme-surface border border-theme-border rounded-xl shadow-xl p-4 z-50 w-76 animate-in fade-in slide-in-from-top-2 duration-200 ${
            align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'
          }`}
          data-datepicker-popover="true"
        >
          
          {/* Header Controls with Attractive Ordered Dropdowns */}
          <div className="flex items-center justify-between mb-4 gap-2">
            <button 
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-theme-surface-hover text-theme-muted hover:text-theme-main transition-colors shrink-0"
              title="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex gap-1.5 flex-1 min-w-0">
              {/* Month Dropdown */}
              <div className="relative flex-1 min-w-0">
                <select 
                  value={currentMonth.getMonth()} 
                  onChange={handleMonthChange}
                  className="w-full pl-2 pr-6 py-1.5 text-xs font-semibold bg-theme-surface-hover/80 hover:bg-theme-surface-hover border border-theme-border/70 hover:border-brand-orange/50 rounded-lg cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-orange appearance-none text-theme-main transition-colors shadow-2xs"
                >
                  {MONTHS.map((month, index) => (
                    <option 
                      key={month} 
                      value={index}
                      disabled={disableFutureDates && currentMonth.getFullYear() === today.getFullYear() && index > today.getMonth()}
                      className="bg-theme-surface text-theme-main py-1"
                    >
                      {month}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-1.5 top-1/2 -translate-y-1/2 text-theme-disabled pointer-events-none" />
              </div>

              {/* Year Dropdown */}
              <div className="relative flex-1 min-w-0">
                <select 
                  value={currentMonth.getFullYear()} 
                  onChange={handleYearChange}
                  className="w-full pl-2 pr-6 py-1.5 text-xs font-semibold bg-theme-surface-hover/80 hover:bg-theme-surface-hover border border-theme-border/70 hover:border-brand-orange/50 rounded-lg cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-orange appearance-none text-theme-main transition-colors shadow-2xs"
                >
                  {YEARS.map(year => (
                    <option key={year} value={year} className="bg-theme-surface text-theme-main py-1">
                      {year}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-1.5 top-1/2 -translate-y-1/2 text-theme-disabled pointer-events-none" />
              </div>
            </div>

            <button 
              type="button"
              onClick={handleNextMonth}
              disabled={isNextMonthDisabled}
              className={`p-1.5 rounded-lg transition-colors ${
                isNextMonthDisabled ? 'text-theme-disabled cursor-not-allowed opacity-50' : 'hover:bg-theme-surface-hover text-theme-muted'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days Header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-theme-disabled w-8 h-8 flex items-center justify-center">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days}
          </div>

          {/* Footer Actions */}
          <div className="mt-4 pt-3 border-t border-theme-border/50 flex justify-between items-center">
            <button 
              type="button"
              onClick={clearDate}
              className="text-sm font-medium text-theme-muted hover:text-theme-main px-2 py-1 rounded hover:bg-theme-surface-hover transition-colors"
            >
              Clear
            </button>
            <button 
              type="button"
              onClick={setToday}
              className="text-sm font-medium text-brand-orange hover:text-[#D44E35] px-2 py-1 rounded hover:bg-orange-50 dark:hover:bg-brand-orange/10 transition-colors"
            >
              Today
            </button>
          </div>

        </div>
      )}
    </div>
  );
};

export default DatePicker;
