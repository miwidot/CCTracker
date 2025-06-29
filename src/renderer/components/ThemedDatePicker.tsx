import React from 'react';
import DatePicker from 'react-datepicker';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../hooks/useTranslation';
import 'react-datepicker/dist/react-datepicker.css';

interface ThemedDatePickerProps {
  selected: Date;
  onChange: (date: Date | null) => void;
  className?: string;
  placeholder?: string;
}

export const ThemedDatePicker: React.FC<ThemedDatePickerProps> = ({
  selected,
  onChange,
  className = '',
  placeholder
}) => {
  const { t } = useTranslation();

  return (
    <div className="themed-datepicker-wrapper">
      <DatePicker
        selected={selected}
        onChange={onChange}
        dateFormat="yyyy-MM-dd"
        placeholderText={placeholder ?? t('dateRange.selectDate')}
        className={`px-3 py-1 text-sm border border-[var(--border-color)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] theme-transition w-full ${className}`}
        calendarClassName="themed-datepicker-calendar"
        popperClassName="themed-datepicker-popper"
        wrapperClassName="themed-datepicker-input-wrapper"
        showPopperArrow={false}
        autoComplete="off"
      />
      <CalendarDaysIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)] pointer-events-none" />
    </div>
  );
};