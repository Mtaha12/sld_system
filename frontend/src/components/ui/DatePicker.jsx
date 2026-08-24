import { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const currentYear = new Date().getFullYear();

const formatDate = (date) => {
  if (!date) return '';
  const d = date.getDate().toString().padStart(2, '0');
  const m = MONTHS[date.getMonth()].substring(0, 3);
  const y = date.getFullYear();
  return `${d} ${m} ${y}`;
};

const DatePicker = ({ 
  selectedDate, 
  onChange, 
  placeholder = "Select date",
  className = "",
  align = "left",
  disableFutureDates = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());
  const popoverRef = useRef(null);

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

  // Sync current month when selected date changes from outside
  useEffect(() => {
    if (selectedDate) {
      setCurrentMonth(new Date(selectedDate));
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
    onChange(newDate);
    setIsOpen(false);
  };

  const setToday = () => {
    setCurrentMonth(today);
    onChange(today);
    setIsOpen(false);
  };

  const clearDate = (e) => {
    e.stopPropagation();
    onChange(null);
    setCurrentMonth(new Date());
    setIsOpen(false);
  };

  const maxYear = disableFutureDates ? currentYear : currentYear + 20;
  const YEARS = Array.from({ length: 50 }, (_, i) => maxYear - 49 + i);

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
      selectedDate.getDate() === i && 
      selectedDate.getMonth() === currentMonth.getMonth() &&
      selectedDate.getFullYear() === currentMonth.getFullYear();
      
    const isToday = today.getDate() === i && 
      today.getMonth() === currentMonth.getMonth() &&
      today.getFullYear() === currentMonth.getFullYear();
      
    // Set hours to 0 to compare dates accurately without time component
    const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const isFutureDate = disableFutureDates && (dateOfCurrentDay > normalizedToday);

    days.push(
      <button
        key={i}
        onClick={() => !isFutureDate && handleDateSelect(i)}
        disabled={isFutureDate}
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors
          ${isSelected ? 'bg-brand-orange text-white font-semibold shadow-sm' : 
            isFutureDate ? 'text-gray-300 cursor-not-allowed opacity-50' :
            isToday ? 'bg-theme-surface-hover text-brand-orange font-semibold hover:bg-gray-200' : 
            'text-theme-main hover:bg-theme-surface-hover'}`}
      >
        {i}
      </button>
    );
  }

  return (
    <div className={`relative ${className}`} ref={popoverRef}>
      {/* Input Field */}
      <div 
        className="w-full relative cursor-pointer group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className={`w-full pl-3 pr-9 py-2.5 border rounded-lg text-sm transition-colors flex items-center bg-theme-surface h-[42px]
          ${isOpen ? 'border-brand-orange ring-1 ring-brand-orange' : 'border-theme-border hover:border-gray-300'}`}>
          <span className={selectedDate ? "text-theme-main" : "text-theme-disabled"}>
            {selectedDate ? formatDate(selectedDate) : placeholder}
          </span>
        </div>
        
        {selectedDate ? (
          <button 
            onClick={clearDate}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-disabled hover:text-theme-muted transition-colors p-0.5 rounded-full hover:bg-theme-surface-hover"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <CalendarIcon className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${isOpen ? 'text-brand-orange' : 'text-theme-disabled pointer-events-none'}`} />
        )}
      </div>

      {/* Popover Calendar */}
      {isOpen && (
        <div 
          className={`absolute top-full mt-2 bg-theme-surface border border-theme-border rounded-xl shadow-lg p-4 z-50 w-72 animate-in fade-in slide-in-from-top-2 duration-200 ${
            align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'
          }`}
          data-datepicker-popover="true"
        >
          
          {/* Header Controls */}
          <div className="flex items-center justify-between mb-4 gap-2">
            <button 
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-theme-surface-hover text-theme-muted transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex gap-1 flex-1">
              <select 
                value={currentMonth.getMonth()} 
                onChange={handleMonthChange}
                className="flex-1 p-1 text-sm font-medium bg-transparent border border-transparent hover:border-theme-border rounded cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-orange appearance-none text-center"
              >
                {MONTHS.map((month, index) => (
                  <option 
                    key={month} 
                    value={index}
                    disabled={disableFutureDates && currentMonth.getFullYear() === today.getFullYear() && index > today.getMonth()}
                  >
                    {month}
                  </option>
                ))}
              </select>
              <select 
                value={currentMonth.getFullYear()} 
                onChange={handleYearChange}
                className="flex-1 p-1 text-sm font-medium bg-transparent border border-transparent hover:border-theme-border rounded cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-orange appearance-none text-center"
              >
                {YEARS.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <button 
              onClick={handleNextMonth}
              disabled={isNextMonthDisabled}
              className={`p-1.5 rounded-lg transition-colors ${
                isNextMonthDisabled ? 'text-gray-300 cursor-not-allowed opacity-50' : 'hover:bg-theme-surface-hover text-theme-muted'
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
              onClick={clearDate}
              className="text-sm font-medium text-theme-muted hover:text-theme-main px-2 py-1 rounded hover:bg-theme-surface-hover transition-colors"
            >
              Clear
            </button>
            <button 
              onClick={setToday}
              className="text-sm font-medium text-brand-orange hover:text-[#D44E35] px-2 py-1 rounded hover:bg-orange-50 transition-colors"
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
