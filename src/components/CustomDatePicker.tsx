import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface CustomDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  align?: 'left' | 'right';
  placeholder?: string;
  allowClear?: boolean;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  align = 'left',
  placeholder = 'Select Date',
  allowClear = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Parse current value or use today
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = value ? new Date(value) : new Date();
    if (isNaN(d.getTime())) {
      const today = new Date();
      return new Date(today.getFullYear(), today.getMonth(), 1);
    }
    const parts = value.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
    }
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Sync currentMonth if value changes externally
  useEffect(() => {
    if (value && !isOpen) {
      const parts = value.split('-');
      if (parts.length === 3) {
        setCurrentMonth(new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1));
      }
    }
  }, [value, isOpen]);

  // Handle outside click & Escape key for desktop
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!isMobile && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobile]);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleSelectDate = (day: number) => {
    const yyyy = currentMonth.getFullYear();
    const mm = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  // Safely display the selected date
  let displayString = '';
  if (value) {
    const parts = value.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      if (!isNaN(d.getTime())) {
        displayString = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    }
  }

  // Calculate local today string YYYY-MM-DD
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const renderCalendarContent = () => (
    <>
      {/* Header with Navigation and Close Button */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="text-sm font-bold text-zinc-800 dark:text-white select-none">
          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          {isMobile && (
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors ml-1"
              aria-label="Close calendar"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
      
      {/* Days of Week */}
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-xs font-bold text-zinc-400 dark:text-zinc-500 py-1">{d}</div>
        ))}
      </div>
      
      {/* Dates Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {blanks.map(b => (
          <div key={`blank-${b}`} className="h-8 w-8" />
        ))}
        {days.map(d => {
          const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const isSelected = dateStr === value;
          const isToday = dateStr === todayStr;
          
          return (
            <button
              key={d}
              type="button"
              onClick={() => handleSelectDate(d)}
              className={`h-8 w-8 rounded-full text-sm font-medium transition-colors flex items-center justify-center mx-auto
                ${isSelected 
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30 font-bold' 
                  : isToday 
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-500/30' 
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }
              `}
            >
              {d}
            </button>
          );
        })}
      </div>

      {/* Footer Actions */}
      <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs font-bold">
        <button
          type="button"
          onClick={() => {
            onChange(todayStr);
            setIsOpen(false);
          }}
          className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors py-1.5 px-2.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
        >
          Today
        </button>
        {allowClear && value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setIsOpen(false);
            }}
            className="text-zinc-400 hover:text-rose-500 dark:text-zinc-500 dark:hover:text-rose-400 transition-colors py-1.5 px-2.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10"
          >
            Clear
          </button>
        )}
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors py-1.5 px-2.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          Close
        </button>
      </div>
    </>
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-2.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-left dark:border-zinc-800 dark:bg-zinc-900 shadow-sm hover:border-emerald-500/50 transition-colors"
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarIcon className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
          <span className={`text-sm font-semibold truncate ${value ? 'text-zinc-800 dark:text-zinc-200' : 'text-zinc-400 dark:text-zinc-500'}`}>
            {displayString || placeholder}
          </span>
        </div>
      </button>

      {isOpen && (
        isMobile ? (
          typeof document !== 'undefined' && createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in duration-150">
              {/* Click backdrop to close */}
              <div
                className="fixed inset-0"
                onClick={() => setIsOpen(false)}
              />
              <div className="relative z-10 w-full max-w-[340px] rounded-2xl border border-zinc-200 bg-white p-4.5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 animate-in zoom-in-95 duration-150">
                {renderCalendarContent()}
              </div>
            </div>,
            document.body
          )
        ) : (
          <div
            className={`absolute top-full mt-2 z-50 w-80 rounded-2xl border border-zinc-200 bg-white p-4.5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 animate-in zoom-in-95 duration-150 ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
          >
            {renderCalendarContent()}
          </div>
        )
      )}
    </div>
  );
};
